"""AI feature flags, rate limits, token caps and usage recording."""
from __future__ import annotations

from django.conf import settings
from django.core.cache import cache
from django.db.models import F, Sum
from django.utils import timezone

from services.core.features.services import evaluate_flag, get_flag_record

from .context import AIContext
from .llm.base import Usage
from .models import AIUsage


class AIQuotaExceeded(Exception):
    def __init__(self, message: str, retry_after: int | None = None):
        super().__init__(message)
        self.retry_after = retry_after


def feature_enabled(name: str, ctx: AIContext) -> bool:
    """AI features are on unless a FeatureFlag record (global or per-tenant)
    exists for `name` and evaluates to off — so existing deploys keep working."""
    flag = get_flag_record(name, tenant=ctx.tenant)
    return True if flag is None else evaluate_flag(flag, tenant=ctx.tenant, user=ctx.user)


def check_rate_limit(ctx: AIContext, feature: str) -> None:
    """Fixed-window per-user request limit (AI_RATE_LIMIT requests / AI_RATE_WINDOW seconds)."""
    limit = getattr(settings, "AI_RATE_LIMIT", 30)
    window = getattr(settings, "AI_RATE_WINDOW", 600)
    if not limit:
        return
    bucket = int(timezone.now().timestamp()) // window
    key = f"ai:rl:{feature}:{ctx.user.pk}:{bucket}"
    if cache.add(key, 1, window):
        return
    try:
        count = cache.incr(key)
    except ValueError:  # expired between add() and incr()
        cache.set(key, 1, window)
        return
    if count > limit:
        raise AIQuotaExceeded(
            f"You've reached the limit of {limit} AI requests. Please try again shortly.",
            retry_after=window - int(timezone.now().timestamp()) % window,
        )


def check_token_budget(ctx: AIContext) -> None:
    """Monthly token cap per school (AI_TENANT_MONTHLY_TOKENS; 0 = unlimited)."""
    cap = getattr(settings, "AI_TENANT_MONTHLY_TOKENS", 0)
    if not cap:
        return
    today = timezone.localdate()
    qs = AIUsage.objects.filter(date__gte=today.replace(day=1))
    qs = qs.filter(tenant=ctx.tenant) if ctx.tenant is not None else qs.filter(tenant__isnull=True)
    used = qs.aggregate(t=Sum(F("input_tokens") + F("output_tokens")))["t"] or 0
    if used >= cap:
        raise AIQuotaExceeded("Your school's monthly AI allowance has been used up.")


def record_usage(ctx: AIContext, feature: str, provider: str, model: str, usage: Usage) -> None:
    row, _ = AIUsage.objects.get_or_create(
        tenant=ctx.tenant, user=ctx.user, date=timezone.localdate(),
        feature=feature, model=model or "", defaults={"provider": provider},
    )
    AIUsage.objects.filter(pk=row.pk).update(
        requests=F("requests") + 1,
        input_tokens=F("input_tokens") + usage.input_tokens,
        output_tokens=F("output_tokens") + usage.output_tokens,
        cached_input_tokens=F("cached_input_tokens") + usage.cached_input_tokens,
    )
