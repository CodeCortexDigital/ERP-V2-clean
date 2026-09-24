"""AI assistant DB query tools.

Each tool is a plain Python function that queries the school database and
returns a small, serialisable result the LLM can use to answer the user.
Tools are intentionally read-only and limited in row count to keep context
small and latency low.

Every tool takes an `AIContext` as its first argument. Access control lives in
one place — `call_tool` — which checks the caller's role against the roles the
tool was registered with. Inside the tools, `ctx.scope_tenant` restricts rows to
the caller's school and `ctx.scope_classes` restricts teachers to their classes.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any, Callable

from django.conf import settings
from django.db.models import Count, Q
from django.utils import timezone

from services.core.accounts.decorators import _get_parent_student_ids
from services.education.students.models import Student, Certificate
from services.education.finance.models import Invoice, Payslip
from services.education.attendance.models import AttendanceRecord
from services.education.exams.models import Exam
from services.education.academics.models import Homework, TimetableEntry, Teacher
from services.education.behaviour.models import BehaviourRating, Observation
from services.core.user_notifications.models import Notification

from .context import AIContext

logger = logging.getLogger("erp.ai")

# Role groups used when registering tools.
ADMIN = ("admin",)
FINANCE = ("admin", "accountant")
SCHOOL_READ = ("admin", "accountant", "teacher")  # teachers are class-scoped
ACADEMIC_READ = ("admin", "teacher")               # teachers are class-scoped
SELF_SERVICE = ("student", "parent", "teacher")
FAMILY = ("student", "parent")
EVERYONE = ("admin", "accountant", "teacher", "student", "parent")

# Keys stripped from tool results before they are sent to an external LLM
# unless settings.AI_SHARE_CONTACT_INFO is True.
CONTACT_KEYS = {"phone", "guardian_phone", "email", "cnic", "address"}


@dataclass
class ToolSpec:
    name: str
    func: Callable
    description: str
    roles: tuple[str, ...]
    properties: dict
    required: tuple[str, ...] = ()

    def schema(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "parameters": {
                "type": "object",
                "properties": self.properties,
                "required": list(self.required),
            },
        }


REGISTRY: dict[str, ToolSpec] = {}


def ai_tool(description: str, roles: tuple[str, ...], properties: dict | None = None, required=()):
    def register(func):
        REGISTRY[func.__name__] = ToolSpec(
            name=func.__name__,
            func=func,
            description=description,
            roles=tuple(roles),
            properties=properties or {},
            required=tuple(required),
        )
        return func
    return register


def _limit(value, default: int, maximum: int) -> int:
    try:
        return max(1, min(int(value), maximum))
    except (TypeError, ValueError):
        return default


def _natural_key(text: str):
    return [int(p) if p.isdigit() else p.lower() for p in re.split(r"(\d+)", text or "")]


def _str(desc):
    return {"type": "string", "description": desc}


def _int(desc):
    return {"type": "integer", "description": desc}


LIMIT = _int("Max rows to return.")


# ---------------------------------------------------------------------------
# Shared querysets
# ---------------------------------------------------------------------------

def _students(ctx: AIContext):
    qs = ctx.scope_tenant(Student.objects.all(), "tenant")
    return ctx.scope_classes(qs, "current_class_id")


def _find_student(ctx: AIContext, key: str):
    return (
        _students(ctx)
        .filter(Q(student_id__iexact=key) | Q(full_name__icontains=key))
        .select_related("current_class", "current_section")
        .first()
    )


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


def _invoice_due(i: Invoice) -> float:
    return (
        float(i.amount)
        + float(i.opening_balance or 0)
        - float(i.discount_amount or 0)
        + float(i.late_fee_amount or 0)
        - float(i.paid_amount or 0)
    )


def _exam_row(e: Exam) -> dict:
    return {
        "exam_code": e.exam_code,
        "title": e.title,
        "type": e.exam_type,
        "class": e.class_ref.name if e.class_ref_id else None,
        "subject": e.subject.name if e.subject_id else None,
        "total_marks": e.total_marks,
        "exam_date": str(e.exam_date),
        "published": e.is_published,
    }


def _homework_row(h: Homework) -> dict:
    return {
        "title": h.title,
        "class": h.class_ref.name if h.class_ref_id else (h.class_name or None),
        "subject": h.subject_name or None,
        "due_date": str(h.due_date) if h.due_date else None,
        "description": (h.description or "")[:200],
    }


# ---------------------------------------------------------------------------
# School-wide tools (staff; teachers are limited to their own classes)
# ---------------------------------------------------------------------------

@ai_tool("Get active student count grouped by class (strength per class).", SCHOOL_READ)
def student_strength_by_class(ctx: AIContext) -> dict:
    base = _students(ctx)
    qs = (
        base.filter(is_active=True)
        .values("current_class__name")
        .annotate(count=Count("id"))
        .order_by("current_class__name")
    )
    rows = [{"class": r["current_class__name"] or "Unassigned", "count": r["count"]} for r in qs]
    rows.sort(key=lambda r: _natural_key(r["class"]))  # Grade 5 before Grade 10
    return {
        "strength": rows,
        "total_students": sum(r["count"] for r in rows),
        "inactive_students": base.filter(is_active=False).count(),
    }


@ai_tool(
    "Search enrolled students by name, student id, guardian or class.",
    SCHOOL_READ,
    {"query": _str("Name / id / guardian search text."), "class_name": _str("Optional class filter."), "limit": LIMIT},
)
def search_students(ctx: AIContext, query: str = "", class_name: str = "", limit: int = 20) -> dict:
    qs = _students(ctx).filter(is_active=True)
    if query:
        qs = qs.filter(
            Q(full_name__icontains=query)
            | Q(student_id__icontains=query)
            | Q(guardian_name__icontains=query)
            | Q(father_name__icontains=query)
        )
    if class_name:
        qs = qs.filter(current_class__name__icontains=class_name)
    total = qs.count()
    rows = qs.select_related("current_class", "current_section")[: _limit(limit, 20, 50)]
    return {"count": total, "students": [_student_summary(s) for s in rows]}


@ai_tool(
    "Full profile for one student; includes outstanding fee balance for admin/accountant.",
    SCHOOL_READ,
    {"student_id": _str("Student id or name.")},
    required=("student_id",),
)
def student_detail(ctx: AIContext, student_id: str) -> dict:
    s = _find_student(ctx, student_id)
    if not s:
        return {"found": False}
    out = {"found": True, "profile": _student_summary(s)}
    if ctx.is_staff:
        invoices = Invoice.objects.filter(student=s).exclude(status="cancelled").order_by("-due_date")[:10]
        out["outstanding_balance"] = round(
            sum(max(_invoice_due(i), 0) for i in invoices if i.status in ("issued", "overdue", "partial")), 2
        )
        out["recent_invoices"] = [
            {
                "invoice_number": i.invoice_number,
                "amount": float(i.amount),
                "paid": float(i.paid_amount or 0),
                "status": i.status,
                "due_date": str(i.due_date),
            }
            for i in invoices
        ]
    return out


@ai_tool(
    "List students with past-due balances (fee defaulters).",
    FINANCE,
    {"class_name": _str("Optional class filter."), "limit": LIMIT},
)
def fee_defaulters(ctx: AIContext, class_name: str = "", limit: int = 20) -> dict:
    qs = ctx.scope_tenant(
        Invoice.objects.filter(due_date__lt=timezone.localdate(), status__in=["issued", "overdue", "partial"]),
        "student__tenant",
    ).select_related("student", "student__current_class").order_by("due_date")
    if class_name:
        qs = qs.filter(student__current_class__name__icontains=class_name)
    out = []
    for i in qs[: _limit(limit, 20, 50)]:
        due = _invoice_due(i)
        if due <= 0:
            continue
        out.append({
            "student_id": i.student.student_id,
            "name": i.student.full_name,
            "class": i.student.current_class.name if i.student.current_class_id else None,
            "status": i.status,
            "amount_due": round(due, 2),
            "due_date": str(i.due_date),
        })
    return {"count": len(out), "defaulters": out}


@ai_tool("Overall finance stats: billed, collected, outstanding, invoice counts by status.", FINANCE)
def finance_summary(ctx: AIContext) -> dict:
    invoices = ctx.scope_tenant(Invoice.objects.exclude(status="cancelled"), "student__tenant")
    total = collected = outstanding = 0.0
    for i in invoices:
        total += float(i.amount)
        collected += float(i.paid_amount or 0)
        if i.status in ("issued", "overdue", "partial"):
            outstanding += float(i.amount) - float(i.paid_amount or 0)
    by_status = dict(invoices.order_by().values("status").annotate(c=Count("id")).values_list("status", "c"))
    return {
        "total_billed": round(total, 2),
        "total_collected": round(collected, 2),
        "total_outstanding": round(outstanding, 2),
        "invoices_by_status": by_status,
    }


@ai_tool(
    "Attendance for today (or the latest marked day) for the school, a class or one student.",
    ACADEMIC_READ,
    {"class_name": _str("Class name filter."), "student_id": _str("Student id or name.")},
)
def attendance_stats(ctx: AIContext, class_name: str = "", student_id: str = "") -> dict:
    today = timezone.localdate()
    qs = ctx.scope_tenant(AttendanceRecord.objects.exclude(status="holiday"), "tenant")
    qs = ctx.scope_classes(qs, "student__current_class_id")

    date_label = f"Today ({today.strftime('%d %b %Y')})"
    if qs.filter(date=today).exists():
        qs = qs.filter(date=today)
    else:
        latest = qs.order_by("-date").values_list("date", flat=True).first()
        if latest:
            qs = qs.filter(date=latest)
            date_label = f"Latest Marked Date ({latest.strftime('%d %b %Y')})"
        else:
            date_label = "All Time"

    if student_id:
        stu = _find_student(ctx, student_id)
        if not stu:
            return {"found": False}
        qs = qs.filter(student=stu)
        scope = f"{stu.full_name} ({date_label})"
    elif class_name:
        qs = qs.filter(student__current_class__name__icontains=class_name)
        scope = f"Class {class_name} ({date_label})"
    else:
        scope = date_label if ctx.role != "teacher" else f"My classes ({date_label})"

    total = qs.count()
    present = qs.filter(status__in=["present", "late"]).count()
    return {
        "found": True,
        "scope": scope,
        "date_label": date_label,
        "total_records": total,
        "present": present,
        "absent": qs.filter(status="absent").count(),
        "late": qs.filter(status="late").count(),
        "attendance_percentage": round((present / total) * 100, 1) if total else 0.0,
        "absent_students": list(
            qs.filter(status="absent").values_list("student__full_name", flat=True)[:15]
        ),
    }


@ai_tool(
    "List exams, optionally filtered by class or subject.",
    ACADEMIC_READ,
    {"class_name": _str("Class filter."), "subject": _str("Subject filter."), "limit": LIMIT},
)
def list_exams(ctx: AIContext, class_name: str = "", subject: str = "", limit: int = 15) -> dict:
    qs = ctx.scope_tenant(Exam.objects.all(), "tenant")
    qs = ctx.scope_classes(qs, "class_ref_id").select_related("class_ref", "subject").order_by("-exam_date")
    if class_name:
        qs = qs.filter(class_ref__name__icontains=class_name)
    if subject:
        qs = qs.filter(subject__name__icontains=subject)
    total = qs.count()
    return {"count": total, "exams": [_exam_row(e) for e in qs[: _limit(limit, 15, 30)]]}


@ai_tool(
    "List homework, optionally filtered by class or subject.",
    ACADEMIC_READ,
    {"class_name": _str("Optional class filter."), "subject": _str("Optional subject filter."), "limit": LIMIT},
)
def admin_homework(ctx: AIContext, class_name: str = "", subject: str = "", limit: int = 20) -> dict:
    qs = ctx.scope_tenant(Homework.objects.all(), "class_ref__tenant")
    qs = ctx.scope_classes(qs, "class_ref_id").select_related("class_ref").order_by("-created_at")
    if class_name:
        qs = qs.filter(Q(class_ref__name__icontains=class_name) | Q(class_name__icontains=class_name))
    if subject:
        qs = qs.filter(Q(subject_name__icontains=subject) | Q(title__icontains=subject))
    total = qs.count()
    return {"count": total, "homework": [_homework_row(h) for h in qs[: _limit(limit, 20, 50)]]}


@ai_tool(
    "Recent behaviour ratings, optionally filtered by class.",
    ACADEMIC_READ,
    {"class_name": _str("Optional class filter."), "limit": LIMIT},
)
def admin_behaviour(ctx: AIContext, class_name: str = "", limit: int = 20) -> dict:
    qs = ctx.scope_tenant(BehaviourRating.objects.all(), "student__tenant")
    qs = ctx.scope_classes(qs, "student__current_class_id")
    qs = qs.select_related("student", "student__current_class").order_by("-term")
    if class_name:
        qs = qs.filter(student__current_class__name__icontains=class_name)
    total = qs.count()
    return {
        "count": total,
        "ratings": [
            {
                "student": r.student.full_name if r.student_id else None,
                "class": r.student.current_class.name if r.student_id and r.student.current_class_id else None,
                "term": r.term,
                "domain": r.domain,
                "ratings": r.ratings,
                "comments": (r.comments or "")[:200],
            }
            for r in qs[: _limit(limit, 20, 50)]
        ],
    }


@ai_tool(
    "List issued certificates, optionally filtered by recipient type or template.",
    ADMIN,
    {"recipient_type": _str("e.g. student / teacher / staff."), "limit": LIMIT},
)
def admin_certificates(ctx: AIContext, recipient_type: str = "", limit: int = 20) -> dict:
    qs = Certificate.objects.all().order_by("-issue_date")
    if ctx.tenant is not None:
        # Certificate has no tenant FK; keep ones issued to people in this school.
        names = list(_students(ctx).values_list("full_name", flat=True)) + list(
            ctx.scope_tenant(Teacher.objects.all(), "tenant").values_list("full_name", flat=True)
        )
        qs = qs.filter(recipient_name__in=names)
    if recipient_type:
        qs = qs.filter(Q(recipient_type__iexact=recipient_type) | Q(template__icontains=recipient_type))
    total = qs.count()
    return {
        "count": total,
        "certificates": [
            {
                "title": c.template,
                "type": c.recipient_type,
                "recipient": c.recipient_name,
                "issued_on": str(c.issue_date) if c.issue_date else None,
            }
            for c in qs[: _limit(limit, 20, 50)]
        ],
    }


@ai_tool("Staff headcount and payroll status (payslips paid / pending).", FINANCE)
def staff_payroll_overview(ctx: AIContext) -> dict:
    teachers = ctx.scope_tenant(Teacher.objects.all(), "tenant")
    slips = ctx.scope_tenant(Payslip.objects.all(), "employee__tenant")
    return {
        "total_staff": teachers.count(),
        "active_staff": teachers.filter(is_active=True).count(),
        "payslips_total": slips.count(),
        "payslips_paid": slips.filter(status="paid").count(),
        "payslips_pending": slips.filter(status__in=["pending", "partial"]).count(),
    }


# ---------------------------------------------------------------------------
# Self-service tools — every "my_*" tool resolves the caller's own data only.
# No cross-user data can ever be returned, regardless of what the model asks.
# ---------------------------------------------------------------------------

def _self_student_ids(ctx: AIContext) -> list:
    if ctx.role == "student":
        s = Student.objects.filter(email=ctx.user.email).first()
        return [s.id] if s else []
    if ctx.role == "parent":
        return list(_get_parent_student_ids(ctx.user))
    return []


def _self_class_ids(ctx: AIContext) -> list:
    if ctx.role == "teacher":
        return ctx.teacher_class_ids
    return list(
        Student.objects.filter(id__in=_self_student_ids(ctx)).values_list("current_class_id", flat=True)
    )


@ai_tool(
    "Attendance % for the caller's own record (student), their children (parent) or their classes (teacher).",
    SELF_SERVICE,
)
def my_attendance(ctx: AIContext) -> dict:
    qs = AttendanceRecord.objects.exclude(status="holiday")
    if ctx.role == "teacher":
        if not ctx.teacher_class_ids:
            return {"found": False, "reason": "No assigned class."}
        qs = qs.filter(student__current_class_id__in=ctx.teacher_class_ids)
        label = "my classes"
    else:
        ids = _self_student_ids(ctx)
        if not ids:
            return {"found": False, "reason": "No linked student record."}
        qs = qs.filter(student_id__in=ids)
        label = "my record" if ctx.role == "student" else "linked children"
    total = qs.count()
    present = qs.filter(status__in=["present", "late"]).count()
    return {
        "found": True,
        "scope": label,
        "total_records": total,
        "present": present,
        "absent": qs.filter(status="absent").count(),
        "attendance_percentage": round((present / total) * 100, 1) if total else 0.0,
    }


@ai_tool("Outstanding fees for the caller's own record or their linked children.", FAMILY)
def my_fees(ctx: AIContext) -> dict:
    ids = _self_student_ids(ctx)
    if not ids:
        return {"found": False, "reason": "No linked student."}
    qs = Invoice.objects.filter(student_id__in=ids).exclude(status__in=["cancelled", "paid"]).order_by("due_date")
    unpaid, total_due = [], 0.0
    for i in qs[:10]:
        due = _invoice_due(i)
        if due <= 0:
            continue
        total_due += due
        unpaid.append({
            "invoice_number": i.invoice_number,
            "amount": float(i.amount),
            "paid": float(i.paid_amount or 0),
            "amount_due": round(due, 2),
            "status": i.status,
            "due_date": str(i.due_date),
        })
    return {"found": True, "outstanding_balance": round(total_due, 2), "unpaid_invoices": unpaid}


@ai_tool("Exams for the caller's class / child's class / teacher's classes.", SELF_SERVICE, {"limit": LIMIT})
def my_exams(ctx: AIContext, limit: int = 15) -> dict:
    cids = _self_class_ids(ctx)
    if not cids:
        return {"found": False, "reason": "No linked class."}
    qs = Exam.objects.filter(class_ref_id__in=cids).select_related("class_ref", "subject").order_by("-exam_date")
    total = qs.count()
    return {"found": True, "count": total, "exams": [_exam_row(e) for e in qs[: _limit(limit, 15, 30)]]}


@ai_tool("Homework assigned to the caller's class / child's class / teacher's classes.", SELF_SERVICE, {"limit": LIMIT})
def my_homework(ctx: AIContext, limit: int = 15) -> dict:
    cids = _self_class_ids(ctx)
    if not cids:
        return {"found": False, "reason": "No linked class."}
    qs = Homework.objects.filter(class_ref_id__in=cids).select_related("class_ref").order_by("-created_at")
    total = qs.count()
    return {"found": True, "count": total, "homework": [_homework_row(h) for h in qs[: _limit(limit, 15, 30)]]}


@ai_tool("Timetable periods for the caller's class / child / teacher.", SELF_SERVICE, {"limit": LIMIT})
def my_timetable(ctx: AIContext, limit: int = 40) -> dict:
    qs = TimetableEntry.objects.select_related(
        "class_subject__class_ref", "class_subject__subject", "teacher", "period"
    ).order_by("day_of_week", "period__period_number", "period__start_time")
    if ctx.role == "teacher":
        qs = qs.filter(teacher__email=ctx.user.email)
    else:
        cids = _self_class_ids(ctx)
        if not cids:
            return {"found": False, "reason": "No linked student."}
        qs = qs.filter(class_subject__class_ref_id__in=cids)
    total = qs.count()
    return {
        "found": True,
        "count": total,
        "entries": [
            {
                "day": e.day_of_week,
                "period": e.period.name if e.period_id else None,
                "class": e.class_subject.class_ref.name if e.class_subject_id else None,
                "subject": e.class_subject.subject.name if e.class_subject_id else None,
                "teacher": e.teacher.full_name if e.teacher_id else None,
            }
            for e in qs[: _limit(limit, 40, 60)]
        ],
    }


@ai_tool("Behaviour ratings & observations for the caller's own record / child / classes.", SELF_SERVICE)
def my_behaviour(ctx: AIContext) -> dict:
    if ctx.role == "teacher":
        if not ctx.teacher_class_ids:
            return {"found": False, "reason": "No assigned class."}
        flt = {"student__current_class_id__in": ctx.teacher_class_ids}
    else:
        ids = _self_student_ids(ctx)
        if not ids:
            return {"found": False, "reason": "No linked student."}
        flt = {"student_id__in": ids}
    ratings = BehaviourRating.objects.filter(**flt).select_related("student").order_by("-term")[:10]
    obs = Observation.objects.filter(**flt).select_related("student").order_by("-date")[:10]
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


@ai_tool("Certificates awarded to the caller's own record or child.", FAMILY)
def my_certificates(ctx: AIContext) -> dict:
    ids = _self_student_ids(ctx)
    if not ids:
        return {"found": False, "reason": "No linked student."}
    names = list(Student.objects.filter(id__in=ids).values_list("full_name", flat=True))
    qs = Certificate.objects.filter(recipient_name__in=names).order_by("-issue_date")[:20]
    rows = [
        {
            "title": c.template,
            "type": c.recipient_type,
            "recipient": c.recipient_name,
            "issued_on": str(c.issue_date) if c.issue_date else None,
        }
        for c in qs
    ]
    return {"found": True, "count": len(rows), "certificates": rows}


@ai_tool("Recent in-app notifications for the logged-in user.", EVERYONE, {"limit": LIMIT})
def my_notifications(ctx: AIContext, limit: int = 15) -> dict:
    qs = Notification.objects.filter(recipient=ctx.user).order_by("-created_at")
    rows = list(qs[: _limit(limit, 15, 30)])
    return {
        "found": True,
        "unread": qs.filter(is_read=False).count(),
        "count": len(rows),
        "notifications": [
            {
                "title": n.title,
                "message": (n.message or "")[:200],
                "type": n.notification_type,
                "is_read": n.is_read,
                "created_at": str(n.created_at),
            }
            for n in rows
        ],
    }


# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

_JSON_TYPES = {"string": str, "integer": int, "number": (int, float), "boolean": bool}


class ToolNotAllowed(Exception):
    pass


def get_tools_for_role(role: str | None) -> list[dict[str, Any]]:
    """Provider-neutral schemas ({name, description, parameters}) the role may use."""
    return [spec.schema() for spec in REGISTRY.values() if role in spec.roles]


def call_tool(name: str, arguments: dict | None, ctx: AIContext) -> Any:
    """Run a tool on behalf of `ctx`. Raises ToolNotAllowed for role violations;
    other failures are returned as {"error": ...} so the model can recover."""
    spec = REGISTRY.get(name)
    if spec is None:
        return {"error": f"Unknown tool {name}"}
    if ctx.role not in spec.roles:
        raise ToolNotAllowed(f"Role {ctx.role!r} may not call {name}")
    # Drop arguments the tool does not declare (models sometimes invent them)
    # and reject ones of the wrong type (e.g. truncated streamed input).
    args = {k: v for k, v in (arguments or {}).items() if k in spec.properties}
    for key, value in list(args.items()):
        expected = _JSON_TYPES.get(spec.properties[key].get("type"))
        if expected is int and isinstance(value, str) and value.strip().isdigit():
            args[key] = value = int(value)
        if expected and (not isinstance(value, expected) or (expected is int and isinstance(value, bool))):
            return {"error": f"Invalid value for '{key}'."}
    missing = [k for k in spec.required if k not in args]
    if missing:
        return {"error": f"Missing required argument(s): {', '.join(missing)}."}
    try:
        return spec.func(ctx, **args)
    except Exception:
        logger.exception("AI tool %s failed", name)
        return {"error": f"Tool {name} failed to run."}


def redact_for_llm(result: Any) -> Any:
    """Strip contact details from tool output before it leaves for an external LLM."""
    if getattr(settings, "AI_SHARE_CONTACT_INFO", False):
        return result
    if isinstance(result, dict):
        return {k: ("[hidden]" if k in CONTACT_KEYS and v else redact_for_llm(v)) for k, v in result.items()}
    if isinstance(result, list):
        return [redact_for_llm(v) for v in result]
    return result
