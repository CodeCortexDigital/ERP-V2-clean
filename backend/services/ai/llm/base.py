"""Provider-neutral LLM interface.

Conversation history is kept in the provider's native message format, because
each provider has its own shape for tool calls and tool results. The agent loop
never builds those shapes itself — it asks the client via `assistant_turn()` and
`tool_results()`. Plain user/assistant text turns ({"role", "content": str}) are
accepted by every provider as-is.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Iterator


class LLMError(Exception):
    """The provider call failed (network, auth, rate limit, bad response)."""


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict


@dataclass
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0
    cached_input_tokens: int = 0

    def add(self, other: "Usage") -> None:
        self.input_tokens += other.input_tokens
        self.output_tokens += other.output_tokens
        self.cached_input_tokens += other.cached_input_tokens


@dataclass
class LLMTurn:
    """One model response."""
    text: str
    tool_calls: list[ToolCall]
    usage: Usage
    model: str
    refused: bool = False
    truncated: bool = False
    raw: Any = field(default=None, repr=False)


@dataclass
class StreamEvent:
    """`type` is "text" (with `text`) or "done" (with `turn`)."""
    type: str
    text: str = ""
    turn: LLMTurn | None = None


class LLMClient(ABC):
    provider: str = ""

    def __init__(self, fast_model: str, smart_model: str):
        self.models = {"fast": fast_model, "smart": smart_model}

    def model_for(self, tier: str) -> str:
        return self.models.get(tier) or self.models["smart"]

    @abstractmethod
    def respond(self, *, system: str, messages: list, tools: list[dict], tier: str = "fast") -> LLMTurn:
        """One model call. `tools` are neutral schemas: {name, description, parameters}."""

    @abstractmethod
    def stream(self, *, system: str, messages: list, tools: list[dict], tier: str = "fast") -> Iterator[StreamEvent]:
        """Like respond(), yielding text deltas and finally a "done" event with the turn."""

    @abstractmethod
    def structured(self, *, system: str, prompt: str, schema: dict, tier: str = "smart") -> tuple[dict, Usage, str]:
        """Return (object validating against `schema`, usage, model).

        `schema` must list every property in `required` and set
        additionalProperties: false (required by OpenAI strict mode)."""

    @abstractmethod
    def assistant_turn(self, turn: LLMTurn) -> dict:
        """Native message recording `turn` (including its tool calls) in history."""

    @abstractmethod
    def tool_results(self, results: list[tuple[ToolCall, str, bool]]) -> list[dict]:
        """Native message(s) carrying (call, content, is_error) results back to the model."""
