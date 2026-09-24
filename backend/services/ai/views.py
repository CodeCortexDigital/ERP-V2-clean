"""AI assistant endpoints.

POST   /api/v1/ai/chat/                      JSON answer
POST   /api/v1/ai/chat/stream/               Server-Sent Events answer
       body: {"message": "...", "conversation_id": "<uuid>"?}
       (legacy body {"messages": [{role, content}, ...]} is still accepted)
GET    /api/v1/ai/conversations/             caller's conversations
GET    /api/v1/ai/conversations/<id>/        one conversation with messages
PATCH  /api/v1/ai/conversations/<id>/        rename {"title": "..."}
DELETE /api/v1/ai/conversations/<id>/
POST   /api/v1/ai/messages/<id>/feedback/    {"rating": 1 | -1, "note": "..."}

The caller's role and school are derived server-side (see AIContext) and never
read from the request body. When no LLM provider is configured, or the provider
call fails, answers come from the keyword-matching fallback in offline.py.
"""
from __future__ import annotations

import json
import logging
import time

from asgiref.sync import sync_to_async
from django.http import StreamingHttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .agent import run_agent
from .context import AIContext
from .llm import LLMError, get_llm_client
from .models import AIConversation, AIMessage
from .offline import offline_answer
from .permissions import HasAIRole
from .quota import AIQuotaExceeded, check_rate_limit, check_token_budget, feature_enabled, record_usage

logger = logging.getLogger("erp.ai")

FEATURE = "ai_chat"
MAX_HISTORY = 20
MAX_MESSAGE_CHARS = 4000


class ChatRequestError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def _prepare(request):
    """Validate the request, enforce limits and persist the user turn.

    Returns (ctx, conversation, history) where history is [{role, content}] ending
    with the new user message.
    """
    ctx = AIContext.from_request(request)
    if not feature_enabled(FEATURE, ctx):
        raise ChatRequestError("The AI assistant is turned off for your school.", 403)

    data = request.data if isinstance(request.data, dict) else {}
    text = data.get("message")
    legacy = data.get("messages")
    if text is None and isinstance(legacy, list) and legacy:
        last = legacy[-1] if isinstance(legacy[-1], dict) else {}
        if last.get("role") != "user":
            raise ChatRequestError("last message must be a user message")
        text = last.get("content")
    if not isinstance(text, str) or not text.strip():
        raise ChatRequestError("message required")
    text = text.strip()[:MAX_MESSAGE_CHARS]

    try:
        check_rate_limit(ctx, FEATURE)
        check_token_budget(ctx)
    except AIQuotaExceeded as exc:
        raise ChatRequestError(str(exc), 429) from exc

    conversation = None
    conv_id = data.get("conversation_id")
    if conv_id:
        conversation = AIConversation.objects.filter(id=conv_id, user=ctx.user).first() if _is_uuid(conv_id) else None
        if conversation is None:
            raise ChatRequestError("Conversation not found.", 404)
    else:
        conversation = AIConversation.objects.create(
            user=ctx.user, tenant=ctx.tenant, role=ctx.role or "", title=text[:80],
        )

    if conv_id:
        prior = list(conversation.messages.order_by("-created_at")[:MAX_HISTORY])[::-1]
        history = [{"role": m.role, "content": m.content} for m in prior]
    else:
        history = _legacy_history(legacy)
    AIMessage.objects.create(conversation=conversation, role="user", content=text)
    history.append({"role": "user", "content": text})
    return ctx, conversation, _alternate(history)


def _legacy_history(messages) -> list:
    """Earlier turns sent by an older client (text only, capped)."""
    out = []
    for m in (messages or [])[:-1][-MAX_HISTORY:]:
        if isinstance(m, dict) and m.get("role") in ("user", "assistant") and isinstance(m.get("content"), str):
            out.append({"role": m["role"], "content": m["content"][:MAX_MESSAGE_CHARS]})
    return out


def _alternate(history: list) -> list:
    """Merge consecutive same-role turns and drop leading assistant turns."""
    out = []
    for m in history:
        if out and out[-1]["role"] == m["role"]:
            out[-1] = {"role": m["role"], "content": out[-1]["content"] + "\n\n" + m["content"]}
        elif out or m["role"] == "user":
            out.append(dict(m))
    return out


def _is_uuid(value) -> bool:
    import uuid
    try:
        uuid.UUID(str(value))
        return True
    except ValueError:
        return False


def _answer_events(ctx, conversation, history, *, stream):
    """Run the agent (or the offline fallback) and persist the assistant turn.

    Yields agent events; the final event is {"type": "done", ...} with the reply.
    """
    started = time.monotonic()
    llm = get_llm_client()
    reply, offline, usage, model, tool_log = None, True, None, "", []
    if llm is not None:
        try:
            for event in run_agent(ctx, history, llm, stream=stream):
                if event["type"] == "done":
                    res = event["result"]
                    reply, usage, model, tool_log, offline = res.reply, res.usage, res.model, res.tool_log, False
                else:
                    yield event
        except LLMError:
            logger.exception("LLM chat failed; using offline fallback")
        except Exception:
            logger.exception("AI agent crashed; using offline fallback")
    if reply is None:
        reply = offline_answer(history[-1]["content"], ctx)

    msg = AIMessage.objects.create(
        conversation=conversation, role="assistant", content=reply, tool_calls=tool_log,
        provider=llm.provider if llm and not offline else "", model=model, offline=offline,
        input_tokens=usage.input_tokens if usage else 0,
        output_tokens=usage.output_tokens if usage else 0,
        cached_input_tokens=usage.cached_input_tokens if usage else 0,
        latency_ms=int((time.monotonic() - started) * 1000),
    )
    conversation.save(update_fields=["updated_at"])
    if usage:
        record_usage(ctx, FEATURE, llm.provider, model, usage)
    yield {"type": "done", "reply": reply, "offline": offline,
           "conversation_id": str(conversation.id), "message_id": str(msg.id)}


@api_view(["POST"])
@permission_classes([HasAIRole])
def ai_chat(request):
    try:
        ctx, conversation, history = _prepare(request)
    except ChatRequestError as exc:
        return Response({"error": str(exc)}, status=exc.status)
    done = None
    for event in _answer_events(ctx, conversation, history, stream=False):
        if event["type"] == "done":
            done = event
    done.pop("type")
    return Response(done)


@api_view(["POST"])
@permission_classes([HasAIRole])
def ai_chat_stream(request):
    try:
        ctx, conversation, history = _prepare(request)
    except ChatRequestError as exc:
        return Response({"error": str(exc)}, status=exc.status)

    events = _answer_events(ctx, conversation, history, stream=True)
    response = StreamingHttpResponse(_sse(events), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"  # stop nginx-style proxies from buffering
    return response


async def _sse(events):
    """Async wrapper so ASGI servers flush each event as it is produced
    (Django buffers synchronous iterators under ASGI)."""
    sentinel = object()
    next_event = sync_to_async(next, thread_sensitive=True)
    while True:
        try:
            event = await next_event(events, sentinel)
        except Exception:
            logger.exception("AI stream failed")
            event = {"type": "error", "message": "Something went wrong. Please try again."}
            yield f"data: {json.dumps(event)}\n\n"
            return
        if event is sentinel:
            return
        yield f"data: {json.dumps(event, default=str)}\n\n"


# ---------------------------------------------------------------------------
# Conversation history & feedback
# ---------------------------------------------------------------------------

def _conversation_json(c: AIConversation) -> dict:
    return {"id": str(c.id), "title": c.title, "created_at": c.created_at, "updated_at": c.updated_at}


def _message_json(m: AIMessage) -> dict:
    return {"id": str(m.id), "role": m.role, "content": m.content, "offline": m.offline,
            "feedback": m.feedback, "created_at": m.created_at}


@api_view(["GET"])
@permission_classes([HasAIRole])
def conversation_list(request):
    qs = AIConversation.objects.filter(user=request.user)[:50]
    return Response([_conversation_json(c) for c in qs])


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([HasAIRole])
def conversation_detail(request, conversation_id):
    conversation = AIConversation.objects.filter(id=conversation_id, user=request.user).first()
    if conversation is None:
        return Response({"error": "Conversation not found."}, status=404)
    if request.method == "DELETE":
        conversation.delete()
        return Response(status=204)
    if request.method == "PATCH":
        title = request.data.get("title") if isinstance(request.data, dict) else None
        if not isinstance(title, str) or not title.strip():
            return Response({"error": "title required"}, status=400)
        conversation.title = title.strip()[:200]
        conversation.save(update_fields=["title", "updated_at"])
    data = _conversation_json(conversation)
    data["messages"] = [_message_json(m) for m in conversation.messages.all()]
    return Response(data)


@api_view(["POST"])
@permission_classes([HasAIRole])
def message_feedback(request, message_id):
    msg = AIMessage.objects.filter(
        id=message_id, role="assistant", conversation__user=request.user
    ).first()
    if msg is None:
        return Response({"error": "Message not found."}, status=404)
    data = request.data if isinstance(request.data, dict) else {}
    rating = data.get("rating")
    if rating not in (1, -1, None):
        return Response({"error": "rating must be 1, -1 or null"}, status=400)
    msg.feedback = rating
    msg.feedback_note = str(data.get("note") or "")[:500]
    msg.save(update_fields=["feedback", "feedback_note"])
    return Response({"id": str(msg.id), "feedback": msg.feedback})
