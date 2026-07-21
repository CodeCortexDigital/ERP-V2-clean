"""AI assistant DB query tools.

Each tool is a plain Python function that queries the school database and
returns a small, serialisable result the LLM can use to answer the user.
Tools are intentionally read-only and limited in row count to keep context
small and latency low.
"""
from __future__ import annotations

from typing import Any

from django.db.models import Count, Q

from services.core.accounts.decorators import (
    get_user_role,
    _get_parent_student_ids,
    _get_teacher_class_ids,
)
from services.education.students.models import Student
from services.education.finance.models import Invoice, FeeStructure
from services.education.attendance.models import AttendanceRecord
from services.education.exams.models import Exam
from services.education.academics.models import Homework, ClassSubject, TimetableEntry
from services.education.behaviour.models import BehaviourRating, Observation
from services.education.students.models import Certificate
from services.core.user_notifications.models import Notification


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


def student_strength_by_class() -> dict:
    """Get active student count grouped by class (strength per class)."""
    qs = (
        Student.objects.filter(is_active=True)
        .values("current_class__name")
        .annotate(count=Count("id"))
        .order_by("current_class__name")
    )
    rows = [
        {"class": item["current_class__name"] or "Unassigned", "count": item["count"]}
        for item in qs
    ]
    total = sum(r["count"] for r in rows)
    return {"strength": rows, "total_students": total}


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
    """List students with past-due balances (fee defaulters).
    Only invoices past their due date with pending balance are counted."""
    from django.utils import timezone
    today = timezone.localdate()
    qs = (
        Invoice.objects.filter(
            due_date__lt=today,
            status__in=["issued", "overdue", "partial"],
        )
        .select_related("student", "student__current_class", "student__current_section")
        .order_by("due_date")
    )
    if class_name:
        qs = qs.filter(student__current_class__name__icontains=class_name)
    qs = qs[: max(1, min(limit, 50))]
    out = []
    for i in qs:
        due = float(i.amount) + float(i.opening_balance or 0) - float(i.discount_amount or 0) + float(i.late_fee_amount or 0) - float(i.paid_amount or 0)
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


def attendance_stats(class_name: str = "", student_id: str = "", date_mode: str = "today") -> dict:
    """Attendance percentage for today, a specific class, or a single student."""
    from django.utils import timezone
    today = timezone.localdate()
    
    qs = AttendanceRecord.objects.exclude(status="holiday")
    date_label = f"Today ({today.strftime('%d %b %Y')})"
    
    # Filter by date mode
    if date_mode == "today" or not date_mode:
        today_qs = qs.filter(date=today)
        if today_qs.exists():
            qs = today_qs
        else:
            # Fall back to latest date if today hasn't been marked yet
            latest_date = qs.order_by("-date").values_list("date", flat=True).first()
            if latest_date:
                qs = qs.filter(date=latest_date)
                date_label = f"Latest Marked Date ({latest_date.strftime('%d %b %Y')})"
            else:
                date_label = "All Time"

    label = None
    if student_id:
        stu = Student.objects.filter(
            Q(student_id__iexact=student_id) | Q(full_name__icontains=student_id)
        ).first()
        if not stu:
            return {"found": False}
        qs = qs.filter(student=stu)
        label = f"{stu.full_name} ({date_label})"
    elif class_name:
        qs = qs.filter(student__current_class__name__icontains=class_name)
        label = f"Class {class_name} ({date_label})"
    else:
        label = date_label

    total = qs.count()
    present = qs.filter(status__in=["present", "late"]).count()
    absent = qs.filter(status="absent").count()
    late = qs.filter(status="late").count()
    pct = round((present / total) * 100, 1) if total else 0.0

    absent_names = list(qs.filter(status="absent").select_related("student").values_list("student__full_name", flat=True)[:15])

    return {
        "found": True,
        "scope": label,
        "date_label": date_label,
        "total_records": total,
        "present": present,
        "absent": absent,
        "late": late,
        "attendance_percentage": pct,
        "absent_students": absent_names,
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


# ---------------------------------------------------------------------------
# SCOPE HELPERS — every "my"/self tool resolves the caller's own data only.
# No cross-user data can ever be returned, regardless of what the model asks.
# ---------------------------------------------------------------------------

def _resolve_self_student(user):
    """Return the single Student row the authenticated user is allowed to see."""
    role = get_user_role(user)
    if role == "student":
        return Student.objects.filter(email=user.email).first()
    if role == "parent":
        ids = _get_parent_student_ids(user)
        if not ids:
            return None
        return Student.objects.filter(id__in=ids).first()
    return None


def _self_student_ids(user):
    role = get_user_role(user)
    if role == "student":
        s = Student.objects.filter(email=user.email).first()
        return [s.id] if s else []
    if role == "parent":
        return _get_parent_student_ids(user)
    if role == "teacher":
        return list(
            Student.objects.filter(current_class_id__in=_get_teacher_class_ids(user)).values_list("id", flat=True)
        )
    return []


def my_attendance(user):
    """Attendance % for the caller's own student record (or their child/class)."""
    qs = AttendanceRecord.objects.exclude(status="holiday")
    if get_user_role(user) == "student":
        s = _resolve_self_student(user)
        if not s:
            return {"found": False, "reason": "No linked student record."}
        qs = qs.filter(student=s)
        label = s.full_name
    elif get_user_role(user) == "parent":
        ids = _self_student_ids(user)
        if not ids:
            return {"found": False, "reason": "No linked child."}
        qs = qs.filter(student_id__in=ids)
        label = "linked children"
    elif get_user_role(user) == "teacher":
        cids = _get_teacher_class_ids(user)
        if not cids:
            return {"found": False, "reason": "No assigned class."}
        qs = qs.filter(student__current_class_id__in=cids)
        label = "my class"
    else:
        return {"found": False, "reason": "Not applicable for this role."}
    total = qs.count()
    present = qs.filter(status__in=["present", "late"]).count()
    absent = qs.filter(status="absent").count()
    pct = round((present / total) * 100, 1) if total else 0.0
    return {
        "scope": label,
        "found": True,
        "total_records": total,
        "present": present,
        "absent": absent,
        "attendance_percentage": pct,
    }


def my_fees(user):
    """Outstanding fees for the caller's own student record (or their child)."""
    role = get_user_role(user)
    if role in ("student", "parent"):
        ids = _self_student_ids(user)
        if not ids:
            return {"found": False, "reason": "No linked student."}
        qs = Invoice.objects.filter(student_id__in=ids).exclude(status="cancelled")
    elif role == "teacher":
        return {"found": False, "reason": "Fee data is not available to teachers."}
    else:
        return {"found": False, "reason": "Not applicable for this role."}
    outstanding = []
    total_due = 0.0
    for i in qs.exclude(status="paid").order_by("due_date")[:10]:
        due = float(i.amount) - float(i.paid_amount or 0)
        if due <= 0:
            continue
        total_due += due
        outstanding.append(
            {
                "invoice_number": i.invoice_number,
                "amount": float(i.amount),
                "paid": float(i.paid_amount or 0),
                "status": i.status,
                "due_date": str(i.due_date),
            }
        )
    return {
        "found": True,
        "outstanding_balance": round(total_due, 2),
        "unpaid_invoices": outstanding,
    }


def my_exams(user, limit: int = 15):
    """Upcoming/published exams for the caller's class (student/parent/teacher)."""
    role = get_user_role(user)
    qs = Exam.objects.all().select_related("class_ref", "subject").order_by("-exam_date")
    if role in ("student", "parent"):
        ids = _self_student_ids(user)
        if not ids:
            return {"found": False, "reason": "No linked student."}
        classes = Student.objects.filter(id__in=ids).values_list("current_class_id", flat=True)
        qs = qs.filter(class_ref_id__in=classes)
    elif role == "teacher":
        cids = _get_teacher_class_ids(user)
        if not cids:
            return {"found": False, "reason": "No assigned class."}
        qs = qs.filter(class_ref_id__in=cids)
    else:
        return {"found": False, "reason": "Not applicable for this role."}
    qs = qs[: max(1, min(limit, 30))]
    return {
        "found": True,
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


def my_homework(user, limit: int = 15):
    """Homework assigned to the caller's class (student/parent/teacher)."""
    role = get_user_role(user)
    qs = Homework.objects.filter(class_ref__isnull=False).select_related(
        "class_ref"
    ).order_by("-created_at")
    if role in ("student", "parent"):
        ids = _self_student_ids(user)
        if not ids:
            return {"found": False, "reason": "No linked student."}
        classes = Student.objects.filter(id__in=ids).values_list("current_class_id", flat=True)
        qs = qs.filter(class_ref_id__in=classes)
    elif role == "teacher":
        cids = _get_teacher_class_ids(user)
        if not cids:
            return {"found": False, "reason": "No assigned class."}
        qs = qs.filter(class_ref_id__in=cids)
    else:
        return {"found": False, "reason": "Not applicable for this role."}
    qs = qs[: max(1, min(limit, 30))]
    return {
        "found": True,
        "count": qs.count(),
        "homework": [
            {
                "title": h.title,
                "class": h.class_ref.name if h.class_ref_id else None,
                "subject": h.subject.name if h.subject_id else None,
                "due_date": str(h.due_date) if h.due_date else None,
                "description": (h.description or "")[:200],
            }
            for h in qs
        ],
    }


def my_timetable(user, limit: int = 40):
    """Timetable periods for the caller's class (student/parent/teacher)."""
    role = get_user_role(user)
    qs = TimetableEntry.objects.select_related(
        "class_subject__class_ref", "class_subject__subject", "teacher", "period"
    ).order_by("day_of_week", "period__period_number", "period__start_time")
    if role in ("student", "parent"):
        ids = _self_student_ids(user)
        if not ids:
            return {"found": False, "reason": "No linked student."}
        classes = Student.objects.filter(id__in=ids).values_list("current_class_id", flat=True)
        qs = qs.filter(class_subject__class_ref_id__in=classes)
    elif role == "teacher":
        qs = qs.filter(teacher__email=user.email)
    else:
        return {"found": False, "reason": "Not applicable for this role."}
    qs = qs[: max(1, min(limit, 60))]
    return {
        "found": True,
        "count": qs.count(),
        "entries": [
            {
                "day": e.day_of_week,
                "period": e.period.name if e.period_id else None,
                "class": e.class_subject.class_ref.name if e.class_subject_id else None,
                "subject": e.class_subject.subject.name if e.class_subject_id else None,
                "teacher": e.teacher.full_name if e.teacher_id else None,
            }
            for e in qs
        ],
    }


def my_behaviour(user):
    """Behaviour ratings/observations for the caller's own student (or child)."""
    role = get_user_role(user)
    if role in ("student", "parent"):
        ids = _self_student_ids(user)
        if not ids:
            return {"found": False, "reason": "No linked student."}
        ratings = BehaviourRating.objects.filter(student_id__in=ids).order_by("-term")[:10]
        obs = Observation.objects.filter(student_id__in=ids).order_by("-date")[:10]
    elif role == "teacher":
        cids = _get_teacher_class_ids(user)
        if not cids:
            return {"found": False, "reason": "No assigned class."}
        ratings = BehaviourRating.objects.filter(
            student__current_class_id__in=cids
        ).order_by("-term")[:10]
        obs = Observation.objects.filter(
            student__current_class_id__in=cids
        ).order_by("-date")[:10]
    else:
        return {"found": False, "reason": "Not applicable for this role."}
    return {
        "found": True,
        "ratings": [
            {
                "student": r.student.full_name if r.student_id else None,
                "term": r.term,
                "domain": r.domain,
                "ratings": r.ratings,
                "comments": (r.comments or "")[:200],
                "rewards": r.rewards,
            }
            for r in ratings
        ],
        "observations": [
            {
                "student": o.student.full_name if o.student_id else None,
                "type": o.observation_type,
                "title": o.title,
                "date": str(o.date) if o.date else None,
                "severity": o.severity,
            }
            for o in obs
        ],
    }


def my_certificates(user):
    """Certificates awarded to the caller's own student (or child)."""
    role = get_user_role(user)
    if role in ("student", "parent"):
        ids = _self_student_ids(user)
        if not ids:
            return {"found": False, "reason": "No linked student."}
        names = list(
            Student.objects.filter(id__in=ids).values_list("full_name", flat=True)
        )
        qs = Certificate.objects.filter(
            recipient_name__in=names
        ).order_by("-issue_date")[:20]
    else:
        return {"found": False, "reason": "Not applicable for this role."}
    return {
        "found": True,
        "count": qs.count(),
        "certificates": [
            {
                "title": c.template,
                "type": c.recipient_type,
                "recipient": c.recipient_name,
                "issued_on": str(c.issue_date) if c.issue_date else None,
            }
            for c in qs
        ],
    }


def my_notifications(user, limit: int = 15):
    """Recent in-app notifications for the logged-in user."""
    role = get_user_role(user)
    if role in ("student", "parent", "teacher"):
        qs = Notification.objects.filter(recipient=user).order_by("-created_at")
    else:
        qs = Notification.objects.all().order_by("-created_at")
    qs = qs[: max(1, min(limit, 30))]
    return {
        "found": True,
        "unread": sum(1 for n in qs if not n.is_read),
        "count": qs.count(),
        "notifications": [
            {
                "title": n.title,
                "message": (n.message or "")[:200],
                "type": n.notification_type,
                "is_read": n.is_read,
                "created_at": str(n.created_at),
            }
            for n in qs
        ],
    }


# Admin/staff-wide tools (only offered to admin/teacher — see views.py).

def admin_homework(class_name: str = "", subject: str = "", limit: int = 20):
    """List homework across the school, optionally filtered by class or subject."""
    qs = Homework.objects.all().select_related("class_ref").order_by("-created_at")
    if class_name:
        qs = qs.filter(class_ref__name__icontains=class_name)
    if subject:
        qs = qs.filter(Q(subject_name__icontains=subject) | Q(title__icontains=subject))
    qs = qs[: max(1, min(limit, 50))]
    return {
        "count": qs.count(),
        "homework": [
            {
                "title": h.title,
                "class": h.class_ref.name if getattr(h, 'class_ref_id', None) else None,
                "subject": getattr(h, 'subject_name', 'General'),
                "due_date": str(h.due_date) if getattr(h, 'due_date', None) else None,
            }
            for h in qs
        ],
    }


def admin_behaviour(class_name: str = "", limit: int = 20):
    """Recent behaviour ratings, optionally filtered by class."""
    qs = BehaviourRating.objects.select_related(
        "student", "student__current_class"
    ).order_by("-term")
    if class_name:
        qs = qs.filter(student__current_class__name__icontains=class_name)
    qs = qs[: max(1, min(limit, 50))]
    return {
        "count": qs.count(),
        "ratings": [
            {
                "student": r.student.full_name if r.student_id else None,
                "class": r.student.current_class.name if r.student_id and r.student.current_class_id else None,
                "term": r.term,
                "domain": r.domain,
                "ratings": r.ratings,
                "comments": (r.comments or "")[:200],
            }
            for r in qs
        ],
    }


def admin_certificates(recipient_type: str = "", limit: int = 20):
    """List issued certificates, optionally filtered by recipient type."""
    qs = Certificate.objects.all().order_by("-issue_date")
    if recipient_type:
        qs = qs.filter(Q(recipient_type__iexact=recipient_type) | Q(certificate_type__icontains=recipient_type))
    qs = qs[: max(1, min(limit, 50))]
    return {
        "count": qs.count(),
        "certificates": [
            {
                "title": getattr(c, 'certificate_type', None) or getattr(c, 'title', 'Certificate'),
                "type": getattr(c, 'recipient_type', 'Student'),
                "recipient": getattr(c, 'recipient_name', None) or getattr(c, 'recipient_id', 'Recipient'),
                "issued_on": str(c.issue_date) if getattr(c, 'issue_date', None) else None,
            }
            for c in qs
        ],
    }


TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "student_strength_by_class",
            "description": "Get student count grouped by class (strength per class).",
            "parameters": {"type": "object", "properties": {}},
        },
    },
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
    {
        "type": "function",
        "function": {
            "name": "my_attendance",
            "description": "Attendance % for the caller's own record (student), their child (parent) or their class (teacher).",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "my_fees",
            "description": "Outstanding fees for the caller's own record or their linked child.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "my_exams",
            "description": "Exams for the caller's class / child.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "description": "Max rows (default 15)."}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "my_homework",
            "description": "Homework assigned to the caller's class / child.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "description": "Max rows (default 15)."}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "my_timetable",
            "description": "Timetable periods for the caller's class / child / teacher.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "description": "Max rows (default 40)."}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "my_behaviour",
            "description": "Behaviour ratings & observations for the caller's own record / child / class.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "my_certificates",
            "description": "Certificates awarded to the caller's own record or child.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "my_notifications",
            "description": "Recent in-app notifications for the logged-in user.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "description": "Max rows (default 15)."}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "admin_homework",
            "description": "List homework across the school, filtered by class or subject (staff only).",
            "parameters": {
                "type": "object",
                "properties": {
                    "class_name": {"type": "string", "description": "Optional class filter."},
                    "subject": {"type": "string", "description": "Optional subject filter."},
                    "limit": {"type": "integer", "description": "Max rows (default 20)."},
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "admin_behaviour",
            "description": "Recent behaviour ratings across the school, filtered by class (staff only).",
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
            "name": "admin_certificates",
            "description": "List issued certificates, filtered by recipient type (staff only).",
            "parameters": {
                "type": "object",
                "properties": {
                    "recipient_type": {"type": "string", "description": "e.g. student / teacher / staff."},
                    "limit": {"type": "integer", "description": "Max rows (default 20)."},
                },
                "required": [],
            },
        },
    },
]

# Which tool names are offered to which role. "my_*" tools enforce the
# caller's own scope internally, so even if the model is prompted to ask about
# someone else it can only ever read the caller's allowed rows.
SELF_TOOLS = {
    "my_attendance", "my_fees", "my_exams", "my_homework",
    "my_timetable", "my_behaviour", "my_certificates", "my_notifications",
}
ADMIN_TOOLS = {
    "search_students", "student_detail", "fee_defaulters", "finance_summary",
    "attendance_stats", "list_exams", "admin_homework", "admin_behaviour",
    "admin_certificates", "student_strength_by_class",
}


def get_tools_for_role(role: str | None) -> list[dict[str, Any]]:
    """Return only the tool schemas the given role is allowed to use."""
    if role in ("admin", "accountant"):
        allowed = SELF_TOOLS | ADMIN_TOOLS
    elif role == "teacher":
        allowed = SELF_TOOLS | ADMIN_TOOLS
    elif role in ("student", "parent"):
        allowed = set(SELF_TOOLS)
    else:
        allowed = set()
    return [t for t in TOOL_SCHEMAS if t["function"]["name"] in allowed]


def call_tool(name: str, arguments: dict, user=None) -> Any:
    """Dispatch a tool call by name. Self-scoped tools always receive `user`
    so they can only return data the caller is entitled to see."""
    if name in SELF_TOOLS and user is None:
        return {"error": "Authentication required for this tool."}
    func = {
        # admin / staff-wide
        "student_strength_by_class": student_strength_by_class,
        "search_students": search_students,
        "student_detail": student_detail,
        "fee_defaulters": fee_defaulters,
        "finance_summary": finance_summary,
        "attendance_stats": attendance_stats,
        "list_exams": list_exams,
        "admin_homework": admin_homework,
        "admin_behaviour": admin_behaviour,
        "admin_certificates": admin_certificates,
        # self-scoped (always receive `user`)
        "my_attendance": my_attendance,
        "my_fees": my_fees,
        "my_exams": my_exams,
        "my_homework": my_homework,
        "my_timetable": my_timetable,
        "my_behaviour": my_behaviour,
        "my_certificates": my_certificates,
        "my_notifications": my_notifications,
    }.get(name)
    if not func:
        return {"error": f"Unknown tool {name}"}
    if name in SELF_TOOLS:
        return func(user, **(arguments or {}))
    return func(**(arguments or {}))
