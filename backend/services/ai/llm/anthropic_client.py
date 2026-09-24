"""Anthropic (Claude) Messages API adapter."""
from __future__ import annotations

import json
import logging
from typing import Iterator

from .base import LLMClient, LLMError, LLMTurn, StreamEvent, ToolCall, Usage

logger = logging.getLogger("erp.ai")

# Server-side refusal fallback: a declined request is re-run on Anthropic's
# recommended fallback model inside the same call.
FALLBACK_BETA = "server-side-fallback-2026-07-01"


class AnthropicClient(LLMClient):
    provider = "anthropic"

    def __init__(self, api_key: str, fast_model: str, smart_model: str, effort: str = "medium",
                 timeout: float = 120):
        super().__init__(fast_model, smart_model)
        import anthropic
        self._anthropic = anthropic
        self.client = anthropic.Anthropic(api_key=api_key or None, timeout=timeout, max_retries=2)
        self.effort = effort

    def _request(self, system, messages, tools, tier, max_tokens, eager=False):
        req = {
            "model": self.model_for(tier),
            "max_tokens": max_tokens,
            "system": system,
            "messages": list(messages),
            # Caches the stable prefix (tools + system + earlier turns).
            "cache_control": {"type": "ephemeral"},
            "output_config": {"effort": self.effort},
            "betas": [FALLBACK_BETA],
            "fallbacks": "default",
        }
        if tools:
            req["tools"] = [
                {"name": t["name"], "description": t["description"], "input_schema": t["parameters"],
                 **({"eager_input_streaming": True} if eager else {})}
                for t in tools
            ]
        return req

    def respond(self, *, system, messages, tools, tier="fast") -> LLMTurn:
        try:
            msg = self.client.beta.messages.create(**self._request(system, messages, tools, tier, 16000))
        except self._anthropic.APIError as exc:
            raise LLMError(str(exc)) from exc
        return _turn(msg)

    def stream(self, *, system, messages, tools, tier="fast") -> Iterator[StreamEvent]:
        req = self._request(system, messages, tools, tier, 64000, eager=True)
        for attempt in range(3):
            emitted = False
            try:
                with self.client.beta.messages.stream(**req) as s:
                    for event in s:
                        if event.type == "text":
                            emitted = True
                            yield StreamEvent("text", text=event.text)
                    msg = s.get_final_message()
                yield StreamEvent("done", turn=_turn(msg))
                return
            except ValueError:
                # Streamed tool input that could not be parsed at all. Nothing was
                # executed; re-issue the turn unless text already reached the user.
                if emitted or attempt == 2:
                    raise LLMError("Model produced an unreadable tool call.")
                logger.warning("Unparseable streamed tool input; retrying turn")
            except self._anthropic.APIError as exc:
                raise LLMError(str(exc)) from exc

    def structured(self, *, system, prompt, schema, tier="smart"):
        req = self._request(system, [{"role": "user", "content": prompt}], [], tier, 16000)
        req["output_config"] = {**req["output_config"], "format": {"type": "json_schema", "schema": schema}}
        try:
            msg = self.client.beta.messages.create(**req)
        except self._anthropic.APIError as exc:
            raise LLMError(str(exc)) from exc
        if msg.stop_reason == "refusal":
            raise LLMError("The model declined this request.")
        if msg.stop_reason == "max_tokens":
            raise LLMError("The response was cut off.")
        text = next((b.text for b in msg.content if b.type == "text"), "")
        try:
            return json.loads(text), _turn(msg).usage, msg.model
        except json.JSONDecodeError as exc:
            raise LLMError("Model returned invalid JSON.") from exc

    def assistant_turn(self, turn: LLMTurn) -> dict:
        # Full content (thinking, tool_use and fallback blocks) must be echoed back.
        return {"role": "assistant", "content": turn.raw.content}

    def tool_results(self, results) -> list[dict]:
        # All results for one turn go back in a single user message.
        return [{
            "role": "user",
            "content": [
                {"type": "tool_result", "tool_use_id": call.id, "content": content,
                 **({"is_error": True} if is_error else {})}
                for call, content, is_error in results
            ],
        }]


def _turn(msg) -> LLMTurn:
    refused = msg.stop_reason == "refusal"
    truncated = msg.stop_reason == "max_tokens"
    calls = []
    if not refused:
        calls = [ToolCall(b.id, b.name, b.input if isinstance(b.input, dict) else {})
                 for b in msg.content if b.type == "tool_use"]
    u = msg.usage
    return LLMTurn(
        text="".join(b.text for b in msg.content if b.type == "text"),
        tool_calls=calls,
        usage=Usage(
            input_tokens=(u.input_tokens or 0) + (u.cache_creation_input_tokens or 0) + (u.cache_read_input_tokens or 0),
            output_tokens=u.output_tokens or 0,
            cached_input_tokens=u.cache_read_input_tokens or 0,
        ),
        model=msg.model,
        refused=refused,
        truncated=truncated,
        raw=msg,
    )
