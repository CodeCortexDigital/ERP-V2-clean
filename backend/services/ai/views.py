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
from django.views.decorators.http import require_POST, require_http_methods

from .tools import get_tools_for_role, call_tool
from services.core.accounts.decorators import get_user_role

SYSTEM_PROMPTS = {
    "admin": (
        "You are CodeCortex, the in-app AI assistant for an ERP school management "
        "system. You help admins and staff query school data: students, fees/finance, "
        "attendance, exams/results, homework, behaviour, certificates and "
        "notifications. Use the provided tools to fetch real data and answer "
        "concisely in plain language. Always base answers on tool results, never "
        "invent numbers. If a tool returns no data, say so clearly."
    ),
    "teacher": (
        "You are CodeCortex, the in-app AI assistant for teachers in an ERP school "
        "management system. You may ask about YOUR OWN class/subject data and YOUR "
        "OWN profile only — never about other teachers' data. For questions about a "
        "specific student use the my_* tools, which already scope to your class. Use "
        "the tools to fetch real data and answer concisely. Never invent numbers."
    ),
    "student": (
        "You are CodeCortex, the in-app AI assistant for a student. You may ONLY "
        "answer questions about the student's OWN data: their attendance, fees, "
        "exams, homework, timetable, behaviour, certificates and notifications. "
        "NEVER discuss other students. Use the my_* tools (they already return only "
        "this student's data) and answer concisely in friendly language."
    ),
    "parent": (
        "You are CodeCortex, the in-app AI assistant for a parent/guardian. You "
        "may ONLY answer questions about the parent's OWN linked child(ren): their "
        "attendance, fees, exams, homework, behaviour, certificates and "
        "notifications. NEVER discuss other students. Use the my_* tools and answer "
        "concisely in friendly language."
    ),
}

DEFAULT_SYSTEM = SYSTEM_PROMPTS["admin"]


def _system_prompt_for(role):
    return SYSTEM_PROMPTS.get(role, DEFAULT_SYSTEM)

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

    user = getattr(request, "user", None)
    role = get_user_role(user) if user and getattr(user, "is_authenticated", False) else None
    tools = get_tools_for_role(role)

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

    history = [{"role": "system", "content": _system_prompt_for(role)}] + messages

    try:
        resp = client.chat.completions.create(
            model=MODEL, messages=history, tools=tools, tool_choice="auto"
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
                result = call_tool(tc.function.name, args, user=user)
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


@csrf_exempt
@require_http_methods(["POST"])
def generate_timetable(request):
    """Stub endpoint for timetable generation — delegates to the frontend's
    local GA algorithm so the dev UI never sees a 404."""
    return JsonResponse({
        "generated": True,
        "generations_run": 1,
        "fitness_score": 1.0,
        "note": "Backend GA stub — full generation runs in the browser.",
    })
