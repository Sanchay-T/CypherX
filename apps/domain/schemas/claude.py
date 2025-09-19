"""Pydantic models for interacting with Claude Sonnet 4 on Vertex AI."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


ClaudeRole = Literal["user", "assistant"]
ClaudeBlockType = Literal["text"]


class ClaudeTextBlock(BaseModel):
    """Single piece of Claude message content."""

    type: ClaudeBlockType = "text"
    text: str = Field(min_length=1)


class ClaudeMessage(BaseModel):
    """Claude message wrapper for chat interactions."""

    role: ClaudeRole
    content: list[ClaudeTextBlock] = Field(min_length=1)


class ClaudeChatRequest(BaseModel):
    """Standard chat request payload for Claude Sonnet 4."""

    messages: list[ClaudeMessage] = Field(min_length=1)
    system: str | list[ClaudeTextBlock] | None = None
    max_tokens: int = Field(default=1024, ge=1, le=64000)
    temperature: float | None = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float | None = Field(default=0.999, ge=0.0, le=1.0)
    top_k: int | None = Field(default=None, ge=1, le=500)
    stop_sequences: list[str] | None = Field(default=None, max_length=4)
    metadata: dict[str, Any] | None = None

    def to_vertex_payload(self) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "anthropic_version": "vertex-2023-10-16",
            "messages": [message.model_dump(mode="json") for message in self.messages],
            "max_tokens": self.max_tokens,
        }

        if self.system is not None:
            payload["system"] = self.system
        if self.temperature is not None:
            payload["temperature"] = self.temperature
        if self.top_p is not None:
            payload["top_p"] = self.top_p
        if self.top_k is not None:
            payload["top_k"] = self.top_k
        if self.stop_sequences:
            payload["stop_sequences"] = self.stop_sequences
        if self.metadata:
            payload["metadata"] = self.metadata

        return payload


class ClaudeUsage(BaseModel):
    """Token usage metadata."""

    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None


class ClaudeChatResponse(BaseModel):
    """Response payload returned by Claude Sonnet 4."""

    model_config = ConfigDict(extra="allow")

    id: str | None = None
    model: str | None = None
    content: list[ClaudeTextBlock] = Field(default_factory=list)
    stop_reason: str | None = None
    stop_sequence: str | None = None
    usage: ClaudeUsage | None = None
