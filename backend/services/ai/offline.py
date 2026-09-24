"""Keyword-matching fallback used when no LLM provider is configured or the
provider call fails. Goes through the same role-gated tools as the LLM path."""
from __future__ import annotations

import contextvars
import json
import re

from services.core.tenants.localization import school_locale

from .context import AIContext
from .tools import ToolNotAllowed, call_tool

# ---------------------------------------------------------------------------
# Offline fallback — keyword intent matching over the same role-gated tools.
# ---------------------------------------------------------------------------

# The asking school's currency, set per answer by offline_answer().
_LOCALE = contextvars.ContextVar('offline_locale', default=None)


def _m(amount) -> str:
    """Money in the school's currency, e.g. 'Rs 2,028,500' or '€ 1,234.50'."""
    loc = _LOCALE.get() or school_locale(None)
    return f"{loc['currency_symbol']} {float(amount or 0):,.{loc['currency_decimals']}f}"


def _run(ctx: AIContext, name: str, **args):
    """Call a tool; returns None if the caller's role may not use it."""
    try:
        return call_tool(name, args, ctx)
    except ToolNotAllowed:
        return None


def _bullets(rows, fmt, empty):
    lines = [f"  • {fmt(r)}" for r in rows]
    return "\n".join(lines) if lines else f"  • {empty}"


def _fmt_strength(d):
    return (
        f"📊 **Student Population Summary**\n"
        f"  - Total Active Students: {d['total_students']}\n"
        f"  - Total Inactive Students: {d['inactive_students']}\n\n"
        f"🏫 **Strength by Class:**\n"
        + _bullets(d["strength"], lambda r: f"{r['class']}: {r['count']} students", "No students found.")
    )


def _fmt_search(d):
    if not d.get("students"):
        return "No active students found matching your query."
    return f"🔍 **Student Directory Search ({d['count']} students):**\n" + _bullets(
        d["students"][:20], lambda s: f"{s['name']} (ID: {s['student_id']} | Class: {s['class'] or 'N/A'})", ""
    )


def _fmt_finance(fin, dfl):
    return (
        f"💰 **Financial & Fee Overview**\n"
        f"  - Total Billed: {_m(fin['total_billed'])}\n"
        f"  - Total Fee Collected: {_m(fin['total_collected'])}\n"
        f"  - Total Outstanding Due: {_m(fin['total_outstanding'])}\n\n"
        f"⚠️ **Fee Defaulters ({dfl['count']}):**\n"
        + _bullets(dfl["defaulters"][:10], lambda r: f"{r['name']} ({r['class']}): {_m(r['amount_due'])} due",
                   "No fee defaulters found. All student fees are clear!")
    )


def _fmt_attendance(d):
    if not d.get("found") or not d.get("total_records"):
        return "No attendance records found for today."
    absent = d.get("absent_students") or []
    absent_str = ("\n  - Absent Students:\n" + "\n".join(f"    • {n}" for n in absent)) if absent \
        else "\n  - Absent Students: None (All marked students present today!)"
    return (
        f"📋 **Attendance Summary - {d['date_label']}**\n"
        f"  - Scope: {d['scope']}\n"
        f"  - Total Marked: {d['total_records']}\n"
        f"  - Present: {d['present']} ({d['attendance_percentage']}%)\n"
        f"  - Absent: {d['absent']}\n"
        f"  - Late: {d['late']}{absent_str}"
    )


def _fmt_student(d):
    p = d["profile"]
    text = (
        f"👤 **Student Profile:** {p['name']} (ID: {p['student_id']})\n"
        f"  - Class: {p['class']} | Section: {p['section']}\n"
        f"  - Guardian: {p['guardian_name']} | Phone: {p['phone']}"
    )
    if "outstanding_balance" in d:
        text += f"\n  - Outstanding Fee Balance: {_m(d['outstanding_balance'])}"
    return text


def _fmt_payroll(d):
    return (
        f"👨‍🏫 **Staff & Payroll Overview**\n"
        f"  - Total Staff / Employees: {d['total_staff']} (Active: {d['active_staff']})\n"
        f"  - Total Payslips Generated: {d['payslips_total']}\n"
        f"  - Paid Payslips: {d['payslips_paid']}\n"
        f"  - Pending / Unpaid Payslips: {d['payslips_pending']}"
    )


def _fmt_self(name, d):
    if not d.get("found"):
        return d.get("reason", "No data found for your account.")
    if name == "my_attendance":
        return (f"Attendance ({d['scope']}): {d['present']}/{d['total_records']} present "
                f"({d['attendance_percentage']}%). Absent: {d['absent']}.")
    if name == "my_fees":
        return f"Your fee summary — Total due: {_m(d['outstanding_balance'])}\n" + _bullets(
            d["unpaid_invoices"], lambda i: f"{i['invoice_number']}: {_m(i['amount_due'])} due {i['due_date']} ({i['status']})",
            "No unpaid invoices.")
    if name == "my_exams":
        return f"Exams ({d['count']}):\n" + _bullets(
            d["exams"], lambda e: f"{e['title']} — {e['subject'] or 'General'} on {e['exam_date']}", "No exams found.")
    if name == "my_homework":
        return f"Homework ({d['count']}):\n" + _bullets(
            d["homework"], lambda h: f"{h['title']} ({h['subject'] or 'General'}, due {h['due_date'] or 'n/a'})", "No homework.")
    if name == "my_timetable":
        return f"Timetable ({d['count']} entries):\n" + _bullets(
            d["entries"], lambda e: f"{e['day']}: {e['subject']} ({e['period']}) — {e['teacher']}", "No entries.")
    if name == "my_behaviour":
        return "Behaviour records:\n" + _bullets(
            d["ratings"], lambda r: f"{r['student']}: {r['domain']} ({r['term']})", "No records.")
    if name == "my_certificates":
        return f"Certificates ({d['count']}):\n" + _bullets(
            d["certificates"], lambda c: f"{c['title']} ({c['issued_on']})", "No certificates.")
    if name == "my_notifications":
        return f"Notifications ({d['unread']} unread):\n" + _bullets(
            d["notifications"], lambda n: f"{'📩 ' if not n['is_read'] else ''}{n['title']}: {n['message'][:80]}",
            "No notifications.")
    return json.dumps(d, default=str)[:1500]


SELF_INTENTS = [
    (("attendance", "absent", "hazri", "present"), "my_attendance"),
    (("fee", "dues", "outstanding", "balance"), "my_fees"),
    (("exam", "result", "marks", "test"), "my_exams"),
    (("homework", "assignment", " hw", "kaam"), "my_homework"),
    (("timetable", "time table", "schedule", "period"), "my_timetable"),
    (("behaviour", "behavior", "conduct"), "my_behaviour"),
    (("certificate",), "my_certificates"),
    (("notification", "alert", "notice"), "my_notifications"),
]

NOT_ALLOWED = "Sorry, that information isn't available for your account."


def offline_answer(query: str, ctx: AIContext) -> str:
    _LOCALE.set(school_locale(ctx.tenant))
    q = query.strip().lower()
    school_wide = ctx.role in ("admin", "accountant") or (ctx.role == "teacher" and "my " not in q)

    if school_wide:
        if "strength" in q or "students in each class" in q:
            d = _run(ctx, "student_strength_by_class")
            return _fmt_strength(d) if d else NOT_ALLOWED

        if _match_any(q, ["search student", "find student", "lookup student", "search / find students"]):
            name = re.sub(r"search / find students|search student|find student|lookup student", "", q).strip()
            d = _run(ctx, "search_students", query=name)
            return _fmt_search(d) if d else NOT_ALLOWED

        if _match_any(q, ["finance", "defaulter", "fee overview", "collection"]):
            fin, dfl = _run(ctx, "finance_summary"), _run(ctx, "fee_defaulters")
            return _fmt_finance(fin, dfl) if fin and dfl else NOT_ALLOWED

        if _match_any(q, ["student profile", "outstanding balance", "profile of", "info about"]):
            key = _extract_name(query)
            if key:
                d = _run(ctx, "student_detail", student_id=key)
                if d is None:
                    return NOT_ALLOWED
                if d.get("found"):
                    return _fmt_student(d)
            return "Please specify a student name or ID (e.g. 'student profile Abdullah')."

        if _match_any(q, ["payroll", "salary", "salaries", "payslip", "staff", "employee"]):
            d = _run(ctx, "staff_payroll_overview")
            return _fmt_payroll(d) if d else NOT_ALLOWED

        if _match_any(q, ["attendance", "absent", "present", "hazri"]):
            d = _run(ctx, "attendance_stats", class_name=_extract_class(query))
            if d is not None:
                return _fmt_attendance(d)

        if _match_any(q, ["exam", "homework", "behaviour", "certificate"]):
            parts = []
            ex = _run(ctx, "list_exams", limit=5)
            if ex:
                parts.append(f"📝 **Exams ({ex['count']}):**\n" + _bullets(
                    ex["exams"], lambda e: f"{e['title']} ({e['type']}) - {e['exam_date']}", "No exams scheduled."))
            hw = _run(ctx, "admin_homework", limit=5)
            if hw:
                parts.append(f"📖 **Homework ({hw['count']}):**\n" + _bullets(
                    hw["homework"], lambda h: f"{h['title']} (Class {h['class']})", "No active homework."))
            cert = _run(ctx, "admin_certificates", limit=5)
            if cert:
                parts.append(f"📜 **Certificates ({cert['count']}):**\n" + _bullets(
                    cert["certificates"], lambda c: f"{c['title']} → {c['recipient']}", "No certificates."))
            if parts:
                return "\n\n".join(parts)

    for keywords, tool in SELF_INTENTS:
        if _match_any(q, list(keywords)):
            d = _run(ctx, tool)
            if d is not None:
                return _fmt_self(tool, d)

    return _help_text(ctx.role)


def _help_text(role):
    if role in ("admin", "accountant"):
        tips = ["'How many students are absent today?'", "'Show fee defaulters'",
                "'Student strength in each class'", "'Staff & payroll overview'", "'Exam schedule'"]
    else:
        tips = ["'My attendance'", "'My fees & dues'", "'My exams'", "'My timetable'", "'My notifications'"]
    return "Hi! I'm CodeCortex, your ERP AI assistant. Try:\n" + "\n".join(f"• {t}" for t in tips)


def _match_any(text: str, patterns: list[str]) -> bool:
    return any(p in text for p in patterns)


def _extract_class(text: str) -> str:
    m = re.search(r"(?:class|grade|standard)\s*[:#]?\s*(\d+[a-zA-Z]*)", text, re.IGNORECASE)
    return m.group(1) if m else ""


def _extract_name(text: str) -> str:
    stop = {"student", "profile", "outstanding", "balance", "info", "about", "of", "show",
            "the", "for", "detail", "details", "&"}
    tokens = [t for t in text.split() if t.lower() not in stop and len(t) > 2]
    return " ".join(tokens[-3:])
