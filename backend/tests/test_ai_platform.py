"""AI platform tests (docs/AI_UPGRADE_TODO.md, Phase 1): agent loop, provider
adapters, conversations, streaming, limits and usage metering."""
import json
from types import SimpleNamespace
from unittest import mock

import pytest
from asgiref.sync import async_to_sync
from django.core.cache import cache
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from services.ai.agent import MAX_TOOL_ROUNDS, REFUSAL_REPLY, run_agent
from services.ai.context import AIContext
from services.ai.llm.base import LLMClient, LLMTurn, StreamEvent, ToolCall, Usage
from services.ai.models import AIConversation, AIMessage, AIUsage
from tests.conftest import UserFactory


# ---------------------------------------------------------------------------
# A scripted LLM used across AI tests
# ---------------------------------------------------------------------------

def text_turn(text, **kw):
    return LLMTurn(text=text, tool_calls=[], usage=Usage(10, 5, 2), model="fake-1", **kw)


def tool_turn(name, args, call_id="c1"):
    return LLMTurn(text="", tool_calls=[ToolCall(call_id, name, args)], usage=Usage(10, 5), model="fake-1")


class FakeLLM(LLMClient):
    provider = "fake"

    def __init__(self, turns):
        super().__init__("fake-fast", "fake-smart")
        self.turns = list(turns)
        self.calls = []

    def respond(self, *, system, messages, tools, tier="fast"):
        self.calls.append({"system": system, "messages": list(messages), "tools": tools})
        return self.turns.pop(0)

    def stream(self, *, system, messages, tools, tier="fast"):
        turn = self.respond(system=system, messages=messages, tools=tools, tier=tier)
        for word in turn.text.split():
            yield StreamEvent("text", text=word + " ")
        yield StreamEvent("done", turn=turn)

    structured_results: list = []

    def structured(self, *, system, prompt, schema, tier="smart"):
        self.calls.append({"system": system, "prompt": prompt, "schema": schema})
        return self.structured_results.pop(0), Usage(100, 50), "fake-smart"

    def assistant_turn(self, turn):
        return {"role": "assistant", "tool_calls": [c.name for c in turn.tool_calls]}

    def tool_results(self, results):
        return [{"role": "tool", "id": c.id, "content": content, "is_error": err} for c, content, err in results]


async def _collect(response) -> str:
    # The SSE body is an async iterator (so ASGI servers flush each event).
    return "".join([c.decode() if isinstance(c, bytes) else c async for c in response.streaming_content])


def _admin_ctx():
    return AIContext(user=UserFactory(is_superuser=True), role="admin", tenant=None)


def _client(user):
    c = APIClient()
    c.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")
    return c


@pytest.fixture(autouse=True)
def _clean(settings):
    settings.OPENAI_API_KEY = ""
    settings.ANTHROPIC_API_KEY = ""
    settings.AI_PROVIDER = ""
    settings.AI_RATE_LIMIT = 30
    settings.AI_TENANT_MONTHLY_TOKENS = 0
    cache.clear()


# ---------------------------------------------------------------------------
# Agent loop (P1.3)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestAgentLoop:
    def test_multi_round_tools_then_answer(self):
        llm = FakeLLM([
            tool_turn("finance_summary", {}),
            tool_turn("fee_defaulters", {"limit": "5"}, "c2"),
            text_turn("All good."),
        ])
        events = list(run_agent(_admin_ctx(), [{"role": "user", "content": "fees?"}], llm))
        kinds = [e["type"] for e in events]
        assert kinds == ["tool_start", "tool_end", "tool_start", "tool_end", "done"]
        result = events[-1]["result"]
        assert result.reply == "All good."
        assert [t["name"] for t in result.tool_log] == ["finance_summary", "fee_defaulters"]
        assert result.usage.input_tokens == 30 and result.usage.cached_input_tokens == 2

    def test_invalid_argument_reported_to_model(self):
        llm = FakeLLM([tool_turn("search_students", {"limit": "lots"}), text_turn("ok")])
        list(run_agent(_admin_ctx(), [{"role": "user", "content": "x"}], llm))
        tool_msg = llm.calls[1]["messages"][-1]
        assert "Invalid value" in tool_msg["content"] and tool_msg["is_error"]

    def test_stops_after_max_rounds(self):
        turns = [tool_turn("finance_summary", {}, f"c{i}") for i in range(MAX_TOOL_ROUNDS + 1)]
        llm = FakeLLM(turns)
        events = list(run_agent(_admin_ctx(), [{"role": "user", "content": "loop"}], llm))
        assert len(llm.calls) == MAX_TOOL_ROUNDS + 1
        assert "couldn't finish" in events[-1]["result"].reply
        # Tools stay defined on the final round (history contains tool calls).
        assert llm.calls[-1]["tools"]

    def test_refusal(self):
        llm = FakeLLM([text_turn("", refused=True)])
        events = list(run_agent(_admin_ctx(), [{"role": "user", "content": "x"}], llm))
        assert events[-1]["result"].reply == REFUSAL_REPLY

    def test_streaming_emits_tokens(self):
        llm = FakeLLM([text_turn("hello there")])
        events = list(run_agent(_admin_ctx(), [{"role": "user", "content": "hi"}], llm, stream=True))
        assert "".join(e["text"] for e in events if e["type"] == "token").strip() == "hello there"


# ---------------------------------------------------------------------------
# Provider adapters (P1.1)
# ---------------------------------------------------------------------------

class TestAnthropicAdapter:
    def _client(self):
        from services.ai.llm.anthropic_client import AnthropicClient
        return AnthropicClient("test-key", fast_model="claude-opus-5", smart_model="claude-opus-5")

    def _message(self, content, stop_reason="end_turn"):
        return SimpleNamespace(
            content=content, stop_reason=stop_reason, model="claude-opus-5",
            usage=SimpleNamespace(input_tokens=100, output_tokens=20,
                                  cache_creation_input_tokens=0, cache_read_input_tokens=900),
        )

    def test_request_shape_and_tool_parsing(self):
        client = self._client()
        msg = self._message([
            SimpleNamespace(type="thinking", thinking=""),
            SimpleNamespace(type="tool_use", id="tu_1", name="finance_summary", input={}),
        ], stop_reason="tool_use")
        with mock.patch.object(client.client.beta.messages, "create", return_value=msg) as create:
            turn = client.respond(system="sys", messages=[{"role": "user", "content": "hi"}],
                                  tools=[{"name": "finance_summary", "description": "d",
                                          "parameters": {"type": "object", "properties": {}}}])
        req = create.call_args.kwargs
        assert req["model"] == "claude-opus-5"
        assert req["cache_control"] == {"type": "ephemeral"}
        assert req["fallbacks"] == "default" and req["betas"] == ["server-side-fallback-2026-07-01"]
        assert req["tools"][0]["input_schema"] == {"type": "object", "properties": {}}
        assert turn.tool_calls == [ToolCall("tu_1", "finance_summary", {})]
        assert turn.usage.input_tokens == 1000 and turn.usage.cached_input_tokens == 900
        # Full content (incl. thinking) is echoed back; results go in one user message.
        assert client.assistant_turn(turn)["content"] is msg.content
        results = client.tool_results([(turn.tool_calls[0], "{}", False), (ToolCall("tu_2", "x", {}), "err", True)])
        assert len(results) == 1 and results[0]["role"] == "user"
        assert results[0]["content"][1] == {"type": "tool_result", "tool_use_id": "tu_2", "content": "err", "is_error": True}

    def test_refusal_runs_no_tools(self):
        client = self._client()
        msg = self._message([SimpleNamespace(type="tool_use", id="t", name="x", input={})], stop_reason="refusal")
        with mock.patch.object(client.client.beta.messages, "create", return_value=msg):
            turn = client.respond(system="s", messages=[], tools=[])
        assert turn.refused and turn.tool_calls == []


class TestOpenAIAdapter:
    def test_stream_accumulates_tool_call_fragments(self):
        from services.ai.llm.openai_client import OpenAIClient
        client = OpenAIClient("k", fast_model="gpt-4o-mini", smart_model="gpt-4o-mini")

        def chunk(tool=None, content=None, finish=None, usage=None):
            delta = SimpleNamespace(content=content, tool_calls=[tool] if tool else None)
            return SimpleNamespace(model="gpt-4o-mini", usage=usage,
                                   choices=[SimpleNamespace(delta=delta, finish_reason=finish)])

        fn = lambda name, args: SimpleNamespace(name=name, arguments=args)  # noqa: E731
        chunks = [
            chunk(tool=SimpleNamespace(index=0, id="call_1", function=fn("search_", '{"que'))),
            chunk(tool=SimpleNamespace(index=0, id=None, function=fn("students", 'ry": "Ali"}'))),
            chunk(finish="tool_calls"),
            SimpleNamespace(model="gpt-4o-mini", choices=[], usage=SimpleNamespace(
                prompt_tokens=50, completion_tokens=7, prompt_tokens_details=None)),
        ]
        with mock.patch.object(client.client.chat.completions, "create", return_value=iter(chunks)):
            events = list(client.stream(system="s", messages=[], tools=[]))
        turn = events[-1].turn
        assert turn.tool_calls == [ToolCall("call_1", "search_students", {"query": "Ali"})]
        assert turn.usage.input_tokens == 50
        assert client.assistant_turn(turn)["tool_calls"][0]["function"]["name"] == "search_students"


def test_factory_selects_provider(settings):
    from services.ai.llm import get_llm_client
    settings.OPENAI_API_KEY, settings.ANTHROPIC_API_KEY, settings.AI_PROVIDER = "", "", ""
    assert get_llm_client() is None
    settings.ANTHROPIC_API_KEY = "a"
    assert get_llm_client().provider == "anthropic"
    settings.OPENAI_API_KEY, settings.OPENAI_MODEL = "o", "gpt-custom"
    client = get_llm_client()
    assert client.provider == "openai" and client.model_for("fast") == "gpt-custom"
    settings.AI_PROVIDER = "anthropic"
    assert get_llm_client().model_for("smart") == "claude-opus-5"


# ---------------------------------------------------------------------------
# Endpoints: conversations, streaming, limits, usage (P1.4 – P1.6)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestChatEndpoints:
    def test_conversation_is_persisted_and_continued(self):
        admin = UserFactory(is_superuser=True)
        client = _client(admin)
        llm = FakeLLM([text_turn("first answer"), text_turn("second answer")])
        with mock.patch("services.ai.views.get_llm_client", return_value=llm):
            r1 = client.post("/api/v1/ai/chat/", {"message": "hello"}, format="json").json()
            r2 = client.post("/api/v1/ai/chat/", {"message": "and?", "conversation_id": r1["conversation_id"]},
                             format="json").json()
        assert r1["reply"] == "first answer" and r1["offline"] is False
        assert r2["conversation_id"] == r1["conversation_id"]
        # Second call saw the earlier turns from the DB.
        assert [m["content"] for m in llm.calls[1]["messages"]] == ["hello", "first answer", "and?"]
        conv = AIConversation.objects.get(id=r1["conversation_id"])
        assert list(conv.messages.values_list("role", flat=True)) == ["user", "assistant", "user", "assistant"]
        usage = AIUsage.objects.get(user=admin)
        assert usage.requests == 2 and usage.input_tokens == 20 and usage.model == "fake-1"

    def test_cannot_use_someone_elses_conversation(self):
        owner = UserFactory(is_superuser=True)
        conv = AIConversation.objects.create(user=owner, title="x")
        res = _client(UserFactory(is_superuser=True)).post(
            "/api/v1/ai/chat/", {"message": "hi", "conversation_id": str(conv.id)}, format="json")
        assert res.status_code == 404
        res = _client(UserFactory(is_superuser=True)).get(f"/api/v1/ai/conversations/{conv.id}/")
        assert res.status_code == 404

    def test_offline_when_llm_fails(self):
        from services.ai.llm import LLMError

        class Broken(FakeLLM):
            def respond(self, **kw):
                raise LLMError("down")

        with mock.patch("services.ai.views.get_llm_client", return_value=Broken([])):
            res = _client(UserFactory(is_superuser=True)).post(
                "/api/v1/ai/chat/", {"message": "finance summary"}, format="json").json()
        assert res["offline"] is True and "Total Billed" in res["reply"]

    def test_stream_endpoint_emits_sse(self):
        llm = FakeLLM([tool_turn("finance_summary", {}), text_turn("Collected it all")])
        with mock.patch("services.ai.views.get_llm_client", return_value=llm):
            res = _client(UserFactory(is_superuser=True)).post(
                "/api/v1/ai/chat/stream/", {"message": "fees"}, format="json")
            body = async_to_sync(_collect)(res)
        assert res["Content-Type"] == "text/event-stream"
        events = [json.loads(line[6:]) for line in body.splitlines() if line.startswith("data: ")]
        types = [e["type"] for e in events]
        assert types[0] == "tool_start" and types[-1] == "done"
        assert "token" in types
        assert events[-1]["reply"] == "Collected it all"

    def test_stream_accepts_browser_accept_header(self, settings):
        # Browsers send Accept: text/event-stream; DRF must not answer 406.
        client = _client(UserFactory(is_superuser=True))
        res = client.post("/api/v1/ai/chat/stream/", {"message": "finance summary"}, format="json",
                          HTTP_ACCEPT="text/event-stream")
        assert res.status_code == 200
        assert "Total Billed" in async_to_sync(_collect)(res)
        # Errors still come back as readable JSON under the same header.
        settings.AI_RATE_LIMIT = 1
        err = client.post("/api/v1/ai/chat/stream/", {"message": "hi"}, format="json",
                          HTTP_ACCEPT="text/event-stream")
        assert err.status_code == 429 and "limit" in json.loads(err.content)["error"]

    def test_rate_limit(self, settings):
        settings.AI_RATE_LIMIT = 2
        client = _client(UserFactory(is_superuser=True))
        codes = [client.post("/api/v1/ai/chat/", {"message": "hi"}, format="json").status_code for _ in range(3)]
        assert codes == [200, 200, 429]

    def test_monthly_token_cap(self, settings):
        from django.utils import timezone
        settings.AI_TENANT_MONTHLY_TOKENS = 100
        user = UserFactory(is_superuser=True)
        AIUsage.objects.create(user=user, date=timezone.localdate(), feature="ai_chat", input_tokens=90, output_tokens=20)
        res = _client(user).post("/api/v1/ai/chat/", {"message": "hi"}, format="json")
        assert res.status_code == 429

    def test_feature_flag_can_disable_chat(self):
        from services.core.features.models import FeatureFlag
        FeatureFlag.objects.create(name="ai_chat", is_enabled=False)
        res = _client(UserFactory(is_superuser=True)).post("/api/v1/ai/chat/", {"message": "hi"}, format="json")
        assert res.status_code == 403

    def test_legacy_messages_body_still_works(self):
        res = _client(UserFactory(is_superuser=True)).post(
            "/api/v1/ai/chat/", {"messages": [{"role": "user", "content": "finance summary"}]}, format="json")
        assert res.status_code == 200 and "Total Billed" in res.json()["reply"]

    def test_feedback_and_rename(self):
        user = UserFactory(is_superuser=True)
        client = _client(user)
        r = client.post("/api/v1/ai/chat/", {"message": "hi"}, format="json").json()
        fb = client.post(f"/api/v1/ai/messages/{r['message_id']}/feedback/", {"rating": -1, "note": "wrong"}, format="json")
        assert fb.status_code == 200 and AIMessage.objects.get(id=r["message_id"]).feedback == -1
        ren = client.patch(f"/api/v1/ai/conversations/{r['conversation_id']}/", {"title": "Fees"}, format="json")
        assert ren.json()["title"] == "Fees" and len(ren.json()["messages"]) == 2
        assert client.get("/api/v1/ai/conversations/").json()[0]["title"] == "Fees"
        assert client.delete(f"/api/v1/ai/conversations/{r['conversation_id']}/").status_code == 204
