"""AI assistant chat endpoint.

POST /api/v1/ai/chat/
Body: { "messages": [ { "role": "user", "content": "..." } ] }

Uses OpenAI function-calling (when OPENAI_API_KEY is set) to answer natural-
language questions about the school's data. Falls back to direct tool execution
based on keyword matching when no API key is configured.
"""
from __future__ import annotations

import json
import os
import re

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_http_methods

from .tools import (
    get_tools_for_role, call_tool,
    student_strength_by_class, search_students, student_detail,
    fee_defaulters, finance_summary, attendance_stats, list_exams,
    admin_homework, admin_behaviour, admin_certificates,
    my_attendance, my_fees, my_exams, my_homework,
    my_timetable, my_behaviour, my_certificates, my_notifications,
)
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


def _openai_answer(client, messages: list, user, role: str | None) -> str:
    """Run OpenAI function-calling with tool definitions and return text reply."""
    tools = get_tools_for_role(role)
    tool_defs = [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t.get("description", ""),
                "parameters": t.get("parameters", {"type": "object", "properties": {}}),
            },
        }
        for t in tools
    ]

    system_msg = {"role": "system", "content": _system_prompt_for(role)}
    req = [system_msg] + messages

    response = client.chat.completions.create(
        model=MODEL,
        messages=req,
        tools=tool_defs if tool_defs else None,
        tool_choice="auto" if tool_defs else None,
    )

    msg = response.choices[0].message

    if msg.tool_calls:
        for tc in msg.tool_calls:
            fn_name = tc.function.name
            try:
                fn_args = json.loads(tc.function.arguments)
            except json.JSONDecodeError:
                fn_args = {}
            result = call_tool(fn_name, user, role, **fn_args)
            req.append(tc.message)
            req.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(result, default=str),
            })
        final = client.chat.completions.create(
            model=MODEL,
            messages=req,
        )
        return final.choices[0].message.content or "No response."
    return msg.content or "No response."


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
    if not role:
        role = payload.get("role", None)

    client = _openai_client()
    has_openai = client is not None

    last = (messages or [{}])[-1]
    query = (last.get("content") or "").strip().lower()

    # Try OpenAI if available, fall back to offline
    if has_openai:
        try:
            reply = _openai_answer(client, messages, user, role)
            return JsonResponse({"reply": reply, "offline": False})
        except Exception:
            pass  # fall through to offline

    reply = _offline_tool_answer(query, user, role)
    return JsonResponse({"reply": reply, "offline": not has_openai})


def _offline_tool_answer(query: str, user, role: str | None) -> str:
    """Answer common questions using direct tool calls when no OpenAI key."""
    q_clean = query.strip().lower()

    # --- 1. Exact Match: Student strength in each class ---
    if "strength" in q_clean or "students in each class" in q_clean or q_clean == "student strength in each class":
        from services.education.students.models import Student
        total_active = Student.objects.filter(is_active=True).count()
        total_inactive = Student.objects.filter(is_active=False).count()
        data = student_strength_by_class()
        lines = [f"  • {r['class']}: {r['count']} students" for r in data.get("strength", [])]
        return (
            f"📊 **Student Population Summary**\n"
            f"  - Total Active Students: {total_active}\n"
            f"  - Total Inactive Students: {total_inactive}\n\n"
            f"🏫 **Strength by Class:**\n" + "\n".join(lines)
        )

    # --- 2. Exact Match: Search / find students ---
    if "search / find students" in q_clean or "find student" in q_clean or "search student" in q_clean or "lookup student" in q_clean:
        name = q_clean.replace("search / find students", "").replace("search student", "").replace("find student", "").replace("lookup student", "").strip()
        data = search_students(query=name) if name else search_students(limit=15)
        if not data.get("students"):
            return "No active students found matching your query."
        lines = [f"  • {s['name']} (ID: {s['student_id']} | Class: {s['class'] or 'N/A'})" for s in data["students"]]
        return f"🔍 **Student Directory Search ({data['count']} active students):**\n" + "\n".join(lines[:20])

    # --- 3. Exact Match: Fee defaulters & finance summary ---
    if "fee defaulters & finance summary" in q_clean or "finance summary" in q_clean or "finance overview" in q_clean:
        f_data = finance_summary()
        def_data = fee_defaulters()
        def_lines = [f"  • {d['name']} ({d['class']}): Rs {d['amount_due']:,} due" for d in def_data.get("defaulters", [])[:10]]
        def_str = "\n".join(def_lines) if def_lines else "  • No fee defaulters found. All student fees are clear!"
        return (
            f"💰 **Financial & Fee Overview**\n"
            f"  - Total Billed: Rs {f_data['total_billed']:,}\n"
            f"  - Total Fee Collected: Rs {f_data['total_collected']:,}\n"
            f"  - Total Outstanding Due: Rs {f_data['total_outstanding']:,}\n\n"
            f"⚠️ **Fee Defaulters ({def_data['count']}):**\n{def_str}"
        )

    # --- 4. Exact Match: Attendance stats for a class or student / Today's Attendance ---
    if "attendance stats for a class or student" in q_clean or "absent" in q_clean or "present" in q_clean or "attendance" in q_clean or "hazri" in q_clean:
        cls = _extract_class(query)
        name = ""
        if _match_any(query, ["student named", "student name", "student id"]):
            name = _extract_name(query)
        data = attendance_stats(class_name=cls, student_id=name if name else "", date_mode="today")
        if data.get("found") is not False and data.get("total_records", 0) > 0:
            absent_list_str = ""
            if data.get("absent_students"):
                absent_list_str = "\n  - Absent Students:\n" + "\n".join([f"    • {n}" for n in data["absent_students"]])
            else:
                absent_list_str = "\n  - Absent Students: None (All marked students present today!)"

            return (
                f"📋 **Attendance Summary - {data.get('date_label', 'Today')}**\n"
                f"  - Scope: {data.get('scope', 'All School')}\n"
                f"  - Total Marked: {data['total_records']}\n"
                f"  - Present: {data['present']} ({data['attendance_percentage']}%)\n"
                f"  - Absent: {data['absent']}\n"
                f"  - Late: {data['late']}"
                f"{absent_list_str}"
            )
        return "No attendance records found for today."

    # --- 5. Exact Match: Exams, homework, behaviour, certificates ---
    if "exams, homework, behaviour, certificates" in q_clean or "exam" in q_clean or "homework" in q_clean or "behaviour" in q_clean or "certificate" in q_clean:
        ex_data = list_exams(limit=5)
        hw_data = admin_homework(limit=5)
        cert_data = admin_certificates()
        
        ex_str = "\n".join([f"  • {e['title']} ({e['type']}) - {e['exam_date']}" for e in ex_data.get("exams", [])[:5]]) or "  • No exams scheduled."
        hw_str = "\n".join([f"  • {h['title']} (Class {h['class']})" for h in hw_data.get("homework", [])[:5]]) or "  • No active homework."
        cert_str = "\n".join([f"  • {c['title']} → {c['recipient']}" for c in cert_data.get("certificates", [])[:5]]) or "  • No certificates."
        
        return (
            f"📚 **Exams, Homework & Certificates Overview**\n\n"
            f"📝 **Upcoming Exams ({ex_data.get('count', 0)}):**\n{ex_str}\n\n"
            f"📖 **Active Homework ({hw_data.get('count', 0)}):**\n{hw_str}\n\n"
            f"📜 **Issued Certificates ({cert_data.get('count', 0)}):**\n{cert_str}"
        )

    # --- 6. Exact Match: Student profile & outstanding balance ---
    if "student profile & outstanding balance" in q_clean or "student profile" in q_clean or "outstanding balance" in q_clean or "profile of" in q_clean or "info about" in q_clean:
        name_or_id = _extract_name(query) or _extract_class(query)
        if name_or_id and name_or_id.lower() not in ("student", "detail", "profile", "info", "balance"):
            data = student_detail(name_or_id)
            if data.get("found"):
                p = data["profile"]
                return (
                    f"👤 **Student Profile:** {p['name']} (ID: {p['student_id']})\n"
                    f"  - Class: {p['class']} | Section: {p['section']}\n"
                    f"  - Guardian: {p['guardian_name']} | Phone: {p['phone']}\n"
                    f"  - Outstanding Fee Balance: Rs {data['outstanding_balance']:,}"
                )
        # Default top defaulters overview if no student specified
        f_def = fee_defaulters(limit=5)
        def_lines = [f"  • {d['name']} ({d['class']}): Rs {d['amount_due']:,} due" for d in f_def.get("defaulters", [])]
        return (
            f"👤 **Student Profile & Outstanding Balance Lookup**\n"
            f"Please specify a student name or ID (e.g., 'show student Abdullah').\n\n"
            f"💡 **Top Students with Outstanding Balance:**\n" + ("\n".join(def_lines) if def_lines else "  • All student balances clear.")
        )

    # --- Teacher / Employee / Staff / Payroll queries ---
    if _match_any(q_clean, ["teacher", "employee", "staff", "salary", "salaries", "payables", "payroll"]):
        from services.education.academics.models import Teacher
        from services.education.finance.models import Payslip
        total_teachers = Teacher.objects.count()
        active_teachers = Teacher.objects.filter(is_active=True).count()
        total_payslips = Payslip.objects.count()
        paid_slips = Payslip.objects.filter(status='paid').count()
        pending_slips = Payslip.objects.filter(status__in=['pending', 'partial']).count()
        return (
            f"👨‍🏫 **Staff & Payroll Overview**\n"
            f"  - Total Staff / Employees: {total_teachers} (Active: {active_teachers})\n"
            f"  - Total Payslips Generated: {total_payslips}\n"
            f"  - Paid Payslips: {paid_slips}\n"
            f"  - Pending / Unpaid Payslips: {pending_slips}"
        )

    # --- homework ---
    if _match_any(query, ["homework", "assignment", "hw", "kaam"]):
        cls = _extract_class(query)
        subj = _extract_subject(query)
        data = admin_homework(class_name=cls, subject=subj)
        if data.get("homework"):
            lines = [f"  - {h['title']} (Class: {h['class']}, Due: {h['due_date']})" for h in data["homework"]]
            return f"Homework ({data['count']}):\n" + "\n".join(lines[:10])
        return "No homework found."

    # --- behaviour ---
    if _match_any(query, ["behaviour", "behavior", "conduct"]):
        cls = _extract_class(query)
        data = admin_behaviour(class_name=cls)
        if data.get("ratings"):
            lines = [f"  - {r['student']} ({r['class']}): {r['domain']}" for r in data["ratings"]]
            return f"Behaviour records ({data['count']}):\n" + "\n".join(lines[:10])
        return "No behaviour records found."

    # --- certificates ---
    if _match_any(query, ["certificate", "issued cert"]):
        data = admin_certificates()
        if data.get("certificates"):
            lines = [f"  - {c['title']} \u2192 {c['recipient']} ({c['issued_on']})" for c in data["certificates"]]
            return f"Certificates ({data['count']}):\n" + "\n".join(lines[:10])
        return "No certificates found."

    # --- 7. My- scoped queries (self-service for student/parent/teacher) ---
    if _match_any(q_clean, ["my attendance", "my absent", "my hazri"]):
        data = my_attendance(user)
        if data.get("found"):
            return (
                f"Your attendance: {data['present']}/{data['total']} present "
                f"({data['percentage']}%). Absent: {data['absent']}."
            )
        return data.get("reason", "No attendance data found for your account.")

    if _match_any(q_clean, ["my fee", "my fees", "my dues", "my outstanding", "my balance"]):
        data = my_fees(user)
        if data.get("found"):
            lines = [f"  - {inv['title']}: Rs {inv['amount']:,} (status: {inv['status']})" for inv in data.get("invoices", [])]
            return (
                f"Your fee summary — Total due: Rs {data['total_due']:,}\n" +
                ("\n".join(lines) if lines else "  No invoices.")
            )
        return data.get("reason", "No fee data found for your account.")

    if _match_any(q_clean, ["my exam", "my result", "my marks"]):
        data = my_exams(user)
        if data.get("found"):
            lines = [f"  - {e['subject']}: {e['marks']}/{e['max_marks']} ({e['grade']})" for e in data.get("results", [])]
            return (
                f"Your exam results ({data.get('count', 0)} subjects):\n" +
                ("\n".join(lines) if lines else "  No results yet.")
            )
        return data.get("reason", "No exam data found for your account.")

    if _match_any(q_clean, ["my homework", "my hw", "my assignment"]):
        data = my_homework(user)
        if data.get("found"):
            lines = [f"  - {h['title']} (Due: {h['due_date']})" for h in data.get("homework", [])]
            return f"Your homework ({data.get('count', 0)}):\n" + ("\n".join(lines) if lines else "  No homework.")
        return data.get("reason", "No homework found for your account.")

    if _match_any(q_clean, ["my timetable", "my schedule", "my time table"]):
        data = my_timetable(user)
        if data.get("found"):
            lines = [f"  {e['day']}: {e['subject']} ({e['period']}) — {e['teacher']}" for e in data.get("entries", [])]
            return f"Your timetable ({data.get('count', 0)} entries):\n" + ("\n".join(lines) if lines else "  No entries.")
        return data.get("reason", "No timetable found for your account.")

    if _match_any(q_clean, ["my behaviour", "my behavior", "my conduct"]):
        data = my_behaviour(user)
        if data.get("found"):
            lines = [f"  - {r.get('domain', 'N/A')}: {r.get('ratings', 'N/A')}" for r in data.get("ratings", [])]
            return f"Your behaviour records:\n" + ("\n".join(lines) if lines else "  No records.")
        return data.get("reason", "No behaviour data found for your account.")

    if _match_any(q_clean, ["my certificate", "my certificates", "my cert"]):
        data = my_certificates(user)
        if data.get("found"):
            lines = [f"  - {c['title']} ({c['issued_on']})" for c in data.get("certificates", [])]
            return f"Your certificates ({data.get('count', 0)}):\n" + ("\n".join(lines) if lines else "  No certificates.")
        return data.get("reason", "No certificates found for your account.")

    if _match_any(q_clean, ["my notification", "my notifications", "my alerts", "my notice"]):
        data = my_notifications(user)
        if data.get("found"):
            lines = [f"  {'📩' if not n['is_read'] else '  '} {n['title']}: {n['message'][:80]}" for n in data.get("notifications", [])]
            return f"Notifications ({data.get('unread', 0)} unread / {data.get('count', 0)} total):\n" + ("\n".join(lines) if lines else "  No notifications.")
        return data.get("reason", "No notifications found.")

    # --- 8. Other admin tools (timetable, notifications) ---
    if _match_any(q_clean, ["timetable", "schedule", "time table", "period"]):
        if role in ("student", "parent", "teacher"):
            data = my_timetable(user)
        else:
            return (
                "I can show timetables for your class. If you're a student, "
                "parent, or teacher, ask 'my timetable' and I'll fetch it."
            )
        if data.get("found"):
            lines = [f"  {e['day']}: {e['subject']} ({e['period']}) — {e['teacher']}" for e in data.get("entries", [])]
            return f"Timetable ({data.get('count', 0)} entries):\n" + ("\n".join(lines) if lines else "  No entries.")
        return data.get("reason", "No timetable available.")

    if _match_any(q_clean, ["notification", "notifications", "alerts", "notice"]):
        data = my_notifications(user)
        if data.get("found"):
            lines = [f"  {'📩' if not n['is_read'] else '  '} {n['title']}: {n['message'][:80]}" for n in data.get("notifications", [])]
            return f"Notifications ({data.get('unread', 0)} unread / {data.get('count', 0)} total):\n" + ("\n".join(lines) if lines else "  No notifications.")
        return "No notifications found."

    # --- generic fallback ---
    suggestions = [
        "• 'How many students are absent today?'",
        "• 'Show fee defaulters'",
        "• 'Student strength in each class'",
        "• 'Staff & payroll overview'",
        "• 'Exam schedule'",
    ]
    if role in ("student", "parent", "teacher"):
        suggestions = [
            "• 'My attendance'",
            "• 'My fees & dues'",
            "• 'My exam results'",
            "• 'My timetable'",
            "• 'My certificates'",
        ]
    return (
        f"Hi! I'm CodeCortex, your ERP AI assistant. "
        f"{'Ask me about school data' if not role else 'I can help you with your data'}. "
        f"Try:\n" + "\n".join(suggestions)
    )


def _match_any(text: str, patterns: list[str]) -> bool:
    return any(p in text for p in patterns)


def _extract_class(text: str) -> str:
    m = re.search(r'(?:class|grade|standard)\s*[:#]?\s*(\d+[a-zA-Z]*)', text, re.IGNORECASE)
    if m:
        return m.group(1)
    numbers = re.findall(r'\b\d+[a-zA-Z]?\b', text)
    return numbers[0] if numbers else ""


def _extract_name(text: str) -> str:
    stop = {"student", "strength", "class", "attendance", "fee", "detail",
            "profile", "info", "homework", "exam", "behaviour", "certificate"}
    tokens = text.split()
    meaningful = [t for t in tokens if t.lower() not in stop and len(t) > 2]
    return " ".join(meaningful[-3:]) if meaningful else ""


def _extract_subject(text: str) -> str:
    subjects = ["math", "english", "science", "hindi", "physics", "chemistry", "biology",
                "history", "geography", "computer", "sst", "social"]
    for s in subjects:
        if s in text:
            return s
    return ""


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
