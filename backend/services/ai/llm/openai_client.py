"""OpenAI Chat Completions adapter."""
from __future__ import annotations

import json
from typing import Iterator

from .base import LLMClient, LLMError, LLMTurn, StreamEvent, ToolCall, Usage


class OpenAIClient(LLMClient):
    provider = "openai"

    def __init__(self, api_key: str, fast_model: str, smart_model: str, timeout: float = 60):
        super().__init__(fast_model, smart_model)
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key, timeout=timeout, max_retries=2)

    def _request(self, system, messages, tools, tier):
        req = {
            "model": self.model_for(tier),
            "messages": [{"role": "system", "content": system}] + list(messages),
        }
        if tools:
            req["tools"] = [{"type": "function", "function": t} for t in tools]
            req["tool_choice"] = "auto"
        return req

    def respond(self, *, system, messages, tools, tier="fast") -> LLMTurn:
        try:
            resp = self.client.chat.completions.create(**self._request(system, messages, tools, tier))
        except Exception as exc:
            raise LLMError(str(exc)) from exc
        choice = resp.choices[0]
        msg = choice.message
        calls = [ToolCall(tc.id, tc.function.name, _parse_args(tc.function.arguments)) for tc in (msg.tool_calls or [])]
        return LLMTurn(
            text=msg.content or "",
            tool_calls=calls,
            usage=_usage(resp.usage),
            model=resp.model,
            refused=bool(getattr(msg, "refusal", None)),
            truncated=choice.finish_reason == "length",
            raw=msg,
        )

    def stream(self, *, system, messages, tools, tier="fast") -> Iterator[StreamEvent]:
        req = self._request(system, messages, tools, tier)
        req.update(stream=True, stream_options={"include_usage": True})
        text, partial_calls, usage, model, finish = [], {}, Usage(), req["model"], None
        try:
            for chunk in self.client.chat.completions.create(**req):
                if chunk.usage:
                    usage = _usage(chunk.usage)
                model = chunk.model or model
                if not chunk.choices:
                    continue
                choice = chunk.choices[0]
                finish = choice.finish_reason or finish
                delta = choice.delta
                if delta.content:
                    text.append(delta.content)
                    yield StreamEvent("text", text=delta.content)
                for tc in delta.tool_calls or []:
                    slot = partial_calls.setdefault(tc.index, {"id": "", "name": "", "args": ""})
                    slot["id"] = tc.id or slot["id"]
                    if tc.function:
                        slot["name"] += tc.function.name or ""
                        slot["args"] += tc.function.arguments or ""
        except Exception as exc:
            raise LLMError(str(exc)) from exc
        calls = [ToolCall(c["id"], c["name"], _parse_args(c["args"])) for _, c in sorted(partial_calls.items())]
        turn = LLMTurn(text="".join(text), tool_calls=calls, usage=usage, model=model,
                       truncated=finish == "length")
        turn.raw = {"role": "assistant", "content": turn.text or None, "tool_calls": [
            {"id": c.id, "type": "function", "function": {"name": c.name, "arguments": json.dumps(c.arguments)}}
            for c in calls
        ]} if calls else {"role": "assistant", "content": turn.text}
        yield StreamEvent("done", turn=turn)

    def structured(self, *, system, prompt, schema, tier="smart"):
        try:
            resp = self.client.chat.completions.create(
                model=self.model_for(tier),
                messages=[{"role": "system", "content": system}, {"role": "user", "content": prompt}],
                response_format={"type": "json_schema",
                                 "json_schema": {"name": "result", "schema": schema, "strict": True}},
            )
        except Exception as exc:
            raise LLMError(str(exc)) from exc
        msg = resp.choices[0].message
        if getattr(msg, "refusal", None):
            raise LLMError("The model declined this request.")
        try:
            return json.loads(msg.content or "{}"), _usage(resp.usage), resp.model
        except json.JSONDecodeError as exc:
            raise LLMError("Model returned invalid JSON.") from exc

    def assistant_turn(self, turn: LLMTurn) -> dict:
        if isinstance(turn.raw, dict):
            return turn.raw
        if turn.raw is not None:
            return turn.raw.model_dump(exclude_none=True)
        return {"role": "assistant", "content": turn.text}

    def tool_results(self, results) -> list[dict]:
        return [{"role": "tool", "tool_call_id": call.id, "content": content} for call, content, _ in results]


def _parse_args(raw: str | None) -> dict:
    try:
        args = json.loads(raw or "{}")
    except json.JSONDecodeError:
        return {}
    return args if isinstance(args, dict) else {}


def _usage(u) -> Usage:
    if u is None:
        return Usage()
    details = getattr(u, "prompt_tokens_details", None)
    return Usage(
        input_tokens=u.prompt_tokens or 0,
        output_tokens=u.completion_tokens or 0,
        cached_input_tokens=(getattr(details, "cached_tokens", 0) or 0) if details else 0,
    )
