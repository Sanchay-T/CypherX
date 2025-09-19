"""Pydantic models for interacting with Google Gemini on Vertex AI."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


class GeminiFileData(BaseModel):
    """Reference to a file stored in Cloud Storage."""

    model_config = ConfigDict(populate_by_name=True)

    mime_type: str = Field(alias="mimeType")
    file_uri: str | None = Field(default=None, alias="fileUri")
    data: str | None = None


class GeminiInlineData(BaseModel):
    """Inline binary payload encoded as base64."""

    model_config = ConfigDict(populate_by_name=True)

    mime_type: str = Field(alias="mimeType")
    data: str


class GeminiPart(BaseModel):
    """Supported Gemini part types (text, inline, file)."""

    model_config = ConfigDict(populate_by_name=True, extra="allow")

    text: str | None = None
    file_data: GeminiFileData | None = Field(default=None, alias="fileData")
    inline_data: GeminiInlineData | None = Field(default=None, alias="inlineData")

    @model_validator(mode="after")
    def ensure_payload(self) -> "GeminiPart":
        if not (self.text or self.file_data or self.inline_data):
            raise ValueError("Gemini part requires text, fileData, or inlineData")
        return self


class GeminiContent(BaseModel):
    """Conversation turn."""

    model_config = ConfigDict(populate_by_name=True)

    role: str
    parts: list[GeminiPart] = Field(min_length=1)


class GeminiSafetySetting(BaseModel):
    """Optional safety settings that mirror Vertex API schema."""

    model_config = ConfigDict(populate_by_name=True)

    category: str
    threshold: str


class GeminiGenerationConfig(BaseModel):
    """Controls for generation parameters."""

    model_config = ConfigDict(populate_by_name=True)

    temperature: float | None = None
    top_p: float | None = Field(default=None, alias="topP")
    top_k: int | None = Field(default=None, alias="topK")
    max_output_tokens: int | None = Field(default=None, alias="maxOutputTokens")


class GeminiGenerateRequest(BaseModel):
    """Request payload for Gemini :generateContent."""

    model_config = ConfigDict(populate_by_name=True)

    contents: list[GeminiContent] = Field(min_length=1)
    system_instruction: GeminiContent | None = Field(
        default=None, alias="systemInstruction"
    )
    safety_settings: list[GeminiSafetySetting] | None = Field(
        default=None, alias="safetySettings"
    )
    generation_config: GeminiGenerationConfig | None = Field(
        default=None, alias="generationConfig"
    )
    tools: list[dict[str, Any]] | None = None
    tool_config: dict[str, Any] | None = Field(default=None, alias="toolConfig")

    def to_vertex_payload(self) -> dict[str, Any]:
        return self.model_dump(by_alias=True, exclude_none=True)


class GeminiGenerateResponse(BaseModel):
    """Response payload for Gemini generateContent."""

    model_config = ConfigDict(extra="allow")


class GeminiEmbeddingInstance(BaseModel):
    """Input instance for embedding prediction."""

    model_config = ConfigDict(populate_by_name=True)

    content: str


class GeminiEmbeddingRequest(BaseModel):
    """Embedding request payload for Gemini embeddings."""

    model_config = ConfigDict(populate_by_name=True)

    instances: list[GeminiEmbeddingInstance] = Field(min_length=1)
    parameters: dict[str, Any] | None = None

    def to_vertex_payload(self) -> dict[str, Any]:
        return self.model_dump(by_alias=True, exclude_none=True)


class GeminiEmbeddingPrediction(BaseModel):
    """Single embedding vector response."""

    values: list[float]


class GeminiEmbeddingResponse(BaseModel):
    """Embedding response payload."""

    model_config = ConfigDict(extra="allow")

    predictions: list[GeminiEmbeddingPrediction]
