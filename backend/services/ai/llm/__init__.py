"""LLM provider selection.

AI_PROVIDER picks the adapter ("openai" or "anthropic"); when unset, the first
provider with an API key configured is used. AI_MODEL_FAST / AI_MODEL_SMART
override the provider's default models.
"""
from __future__ import annotations

import logging

from django.conf import settings

from .base import LLMClient, LLMError, LLMTurn, StreamEvent, ToolCall, Usage

logger = logging.getLogger("erp.ai")

DEFAULT_MODELS = {
    "openai": {"fast": "gpt-4o-mini", "smart": "gpt-4o-mini"},
    "anthropic": {"fast": "claude-opus-5", "smart": "claude-opus-5"},
}

__all__ = ["LLMClient", "LLMError", "LLMTurn", "StreamEvent", "ToolCall", "Usage", "get_llm_client"]


def _provider() -> str:
    explicit = (getattr(settings, "AI_PROVIDER", "") or "").lower()
    if explicit:
        return explicit
    if getattr(settings, "OPENAI_API_KEY", ""):
        return "openai"
    if getattr(settings, "ANTHROPIC_API_KEY", ""):
        return "anthropic"
    return ""


def get_llm_client() -> LLMClient | None:
    """The configured client, or None when no provider is configured/installed."""
    provider = _provider()
    if provider not in DEFAULT_MODELS:
        if provider:
            logger.error("Unknown AI_PROVIDER %r", provider)
        return None
    defaults = dict(DEFAULT_MODELS[provider])
    if provider == "openai" and getattr(settings, "OPENAI_MODEL", ""):
        defaults = {"fast": settings.OPENAI_MODEL, "smart": settings.OPENAI_MODEL}
    fast = getattr(settings, "AI_MODEL_FAST", "") or defaults["fast"]
    smart = getattr(settings, "AI_MODEL_SMART", "") or defaults["smart"]
    try:
        if provider == "openai":
            key = getattr(settings, "OPENAI_API_KEY", "")
            if not key:
                return None
            from .openai_client import OpenAIClient
            return OpenAIClient(key, fast_model=fast, smart_model=smart)
        key = getattr(settings, "ANTHROPIC_API_KEY", "")
        if not key:
            return None
        from .anthropic_client import AnthropicClient
        return AnthropicClient(key, fast_model=fast, smart_model=smart,
                               effort=getattr(settings, "AI_CLAUDE_EFFORT", "medium"))
    except ImportError:
        logger.error("SDK for AI provider %r is not installed", provider)
        return None
