"""AI assistant chat endpoint.

POST /api/v1/ai/chat/
Body: { "messages": [ { "role": "user", "content": "..." } ] }

Uses OpenAI function-calling to answer natural-language questions about the
school's data. If no API key is configured the endpoint returns a friendly
static fallback so the UI still works in development.
"""
from __future__ import annotations

import json
import os
from typing import Any

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .tools import TOOLS, call_tool

SYSTEM_PROMPT = (
    "You are CodeCortex, the in-app AI assistant for an ERP school management system. "
    "You help admins, teachers and staff query data about students, fees/finance, "
    "attendance and exams. Use the provided tools to fetch real data and answer "
    "concisely in plain language. Always base answers on tool results, never invent "
    "numbers. If a tool returns no data, say so clearly."
)

MODEL = getattr(settings, "OPENAI_MODEL", os.environ.get("OPENAI_MODEL", "gpt-4o-mini"))


def _openai_client():
    try:
        from openai import OpenAI
    except ImportError:
        return None
    key = getattr(settings, "OPENAI_API_KEY", os.environ.get("OPENAI_API_KEY"))
    if not key:
        return None
    return OpenAI(api_key=key)


@csrf_exempt
@require_POST
def ai_chat(request):
    try:
        payload = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    messages = payload.get("messages")
    if not isinstance(messages, list) or not messages:
        return JsonResponse({"error": "messages required"}, status=400)

    client = _openai_client()
    if client is None:
        return JsonResponse(
            {
                "reply": (
                    "AI assistant is running in offline mode (no OpenAI key configured). "
                    "I can still help — configure OPENAI_API_KEY in the backend .env to "
                    "enable live data answers."
                ),
                "offline": True,
            }
        )

    history = [{"role": "system", "content": SYSTEM_PROMPT}] + messages

    try:
        resp = client.chat.completions.create(
            model=MODEL, messages=history, tools=TOOLS, tool_choice="auto"
        )
        msg = resp.choices[0].message

        # Handle tool calls iteratively (single round is enough for our tools).
        if getattr(msg, "tool_calls", None):
            history.append(
                {
                    "role": "assistant",
                    "content": msg.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                        }
                        for tc in msg.tool_calls
                    ],
                }
            )
            for tc in msg.tool_calls:
                args = json.loads(tc.function.arguments or "{}")
                result = call_tool(tc.function.name, args)
                history.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "name": tc.function.name,
                        "content": json.dumps(result, default=str),
                    }
                )
            resp = client.chat.completions.create(model=MODEL, messages=history)
            reply = resp.choices[0].message.content
        else:
            reply = msg.content

        return JsonResponse({"reply": reply, "offline": False})
    except Exception as exc:  # pragma: no cover - network/provider errors
        return JsonResponse({"reply": f"AI request failed: {exc}", "offline": True}, status=200)
