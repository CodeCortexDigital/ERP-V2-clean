"""AI assistant DB query tools.

Each tool is a plain Python function that queries the school database and
returns a small, serialisable result the LLM can use to answer the user.
Tools are intentionally read-only and limited in row count to keep context
small and latency low.
"""
from __future__ import annotations

from typing import Any

from django.db.models import Count, Q

from services.education.students.models import Student
from services.education.finance.models import Invoice, FeeStructure
from services.education.attendance.models import AttendanceRecord
from services.education.exams.models import Exam


def _student_summary(s: Student) -> dict:
    return {
        "student_id": s.student_id,
        "name": s.full_name,
        "class": s.current_class.name if s.current_class_id else None,
        "section": s.current_section.name if s.current_section_id else None,
        "gender": s.gender,
        "is_active": s.is_active,
        "guardian_name": s.guardian_name,
        "phone": s.phone,
    }


def search_students(query: str = "", class_name: str = "", limit: int = 20) -> dict:
    """Search students by name, student id, or guardian. Optionally filter by class name."""
    qs = Student.objects.filter(is_active=True)
    if query:
        qs = qs.filter(
            Q(full_name__icontains=query)
            | Q(student_id__icontains=query)
            | Q(guardian_name__icontains=query)
            | Q(father_name__icontains=query)
        )
    if class_name:
        qs = qs.filter(current_class__name__icontains=class_name)
    qs = qs.select_related("current_class", "current_section")[: max(1, min(limit, 50))]
    return {"count": qs.count(), "students": [_student_summary(s) for s in qs]}


def student_detail(student_id: str) -> dict:
    """Get full profile + fee standing for a single student by student_id or name."""
    s = (
        Student.objects.filter(
            Q(student_id__iexact=student_id) | Q(full_name__icontains=student_id)
        )
        .select_related("current_class", "current_section")
        .first()
    )
    if not s:
        return {"found": False}
    invoices = Invoice.objects.filter(student=s).exclude(status="cancelled").order_by("-due_date")[:10]
    total_due = sum(float(i.amount) - float(i.paid_amount or 0) for i in invoices if i.status in ("issued", "overdue", "partial"))
    return {
        "found": True,
        "profile": _student_summary(s),
        "outstanding_balance": round(total_due, 2),
        "recent_invoices": [
            {
                "invoice_number": i.invoice_number,
                "amount": float(i.amount),
                "paid": float(i.paid_amount or 0),
                "status": i.status,
                "due_date": str(i.due_date),
            }
            for i in invoices
        ],
    }


def fee_defaulters(class_name: str = "", limit: int = 20) -> dict:
    """List students with unpaid/overdue/partial invoices (fee defaulters)."""
    qs = (
        Invoice.objects.exclude(status__in=["paid", "cancelled", "draft"])
        .select_related("student", "student__current_class", "student__current_section")
        .order_by("due_date")
    )
    if class_name:
        qs = qs.filter(student__current_class__name__icontains=class_name)
    qs = qs[: max(1, min(limit, 50))]
    out = []
    for i in qs:
        due = float(i.amount) - float(i.paid_amount or 0)
        if due <= 0:
            continue
        out.append(
            {
                "student_id": i.student.student_id,
                "name": i.student.full_name,
                "class": i.student.current_class.name if i.student.current_class_id else None,
                "status": i.status,
                "amount_due": round(due, 2),
                "due_date": str(i.due_date),
            }
        )
    return {"count": len(out), "defaulters": out}


def finance_summary() -> dict:
    """High-level finance stats: total billed, collected, outstanding, paid count."""
    invoices = Invoice.objects.exclude(status="cancelled")
    total = sum(float(i.amount) for i in invoices)
    collected = sum(float(i.paid_amount or 0) for i in invoices)
    outstanding = sum(
        float(i.amount) - float(i.paid_amount or 0)
        for i in invoices
        if i.status in ("issued", "overdue", "partial")
    )
    by_status = dict(
        invoices.values_list("status").order_by("status").annotate(c=Count("id")).values_list("status", "c")
    )
    return {
        "total_billed": round(total, 2),
        "total_collected": round(collected, 2),
        "total_outstanding": round(outstanding, 2),
        "invoices_by_status": by_status,
    }


def attendance_stats(class_name: str = "", student_id: str = "") -> dict:
    """Attendance percentage for a class or a single student."""
    qs = AttendanceRecord.objects.exclude(status="holiday")
    label = None
    if student_id:
        stu = Student.objects.filter(
            Q(student_id__iexact=student_id) | Q(full_name__icontains=student_id)
        ).first()
        if not stu:
            return {"found": False}
        qs = qs.filter(student=stu)
        label = stu.full_name
    elif class_name:
        qs = qs.filter(student__current_class__name__icontains=class_name)
        label = class_name
    total = qs.count()
    present = qs.filter(status__in=["present", "late"]).count()
    absent = qs.filter(status="absent").count()
    pct = round((present / total) * 100, 1) if total else 0.0
    return {
        "scope": label,
        "total_records": total,
        "present": present,
        "absent": absent,
        "attendance_percentage": pct,
    }


def list_exams(class_name: str = "", subject: str = "", limit: int = 15) -> dict:
    """List exams, optionally filtered by class or subject."""
    qs = Exam.objects.all().select_related("class_ref", "subject").order_by("-exam_date")
    if class_name:
        qs = qs.filter(class_ref__name__icontains=class_name)
    if subject:
        qs = qs.filter(subject__name__icontains=subject)
    qs = qs[: max(1, min(limit, 30))]
    return {
        "count": qs.count(),
        "exams": [
            {
                "exam_code": e.exam_code,
                "title": e.title,
                "type": e.exam_type,
                "class": e.class_ref.name if e.class_ref_id else None,
                "subject": e.subject.name if e.subject_id else None,
                "total_marks": e.total_marks,
                "exam_date": str(e.exam_date),
                "published": e.is_published,
            }
            for e in qs
        ],
    }


TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_students",
            "description": "Search enrolled students by name, student id, guardian or class.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Name / id / guardian search text."},
                    "class_name": {"type": "string", "description": "Optional class filter."},
                    "limit": {"type": "integer", "description": "Max rows (default 20)."},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "student_detail",
            "description": "Full profile + outstanding fee balance for one student.",
            "parameters": {
                "type": "object",
                "properties": {"student_id": {"type": "string", "description": "Student id or name."}},
                "required": ["student_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fee_defaulters",
            "description": "List students with unpaid / overdue / partial invoices.",
            "parameters": {
                "type": "object",
                "properties": {
                    "class_name": {"type": "string", "description": "Optional class filter."},
                    "limit": {"type": "integer", "description": "Max rows (default 20)."},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "finance_summary",
            "description": "Overall finance stats: billed, collected, outstanding, counts by status.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "attendance_stats",
            "description": "Attendance percentage for a class or a single student.",
            "parameters": {
                "type": "object",
                "properties": {
                    "class_name": {"type": "string", "description": "Class name filter."},
                    "student_id": {"type": "string", "description": "Student id or name."},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_exams",
            "description": "List exams filtered by class or subject.",
            "parameters": {
                "type": "object",
                "properties": {
                    "class_name": {"type": "string", "description": "Class filter."},
                    "subject": {"type": "string", "description": "Subject filter."},
                    "limit": {"type": "integer", "description": "Max rows (default 15)."},
                },
                "required": [],
            },
        },
    },
]


def call_tool(name: str, arguments: dict) -> Any:
    """Dispatch a tool call by name. Returns a JSON-serialisable value."""
    func = {
        "search_students": search_students,
        "student_detail": student_detail,
        "fee_defaulters": fee_defaulters,
        "finance_summary": finance_summary,
        "attendance_stats": attendance_stats,
        "list_exams": list_exams,
    }.get(name)
    if not func:
        return {"error": f"Unknown tool {name}"}
    return func(**(arguments or {}))
