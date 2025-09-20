"""Pydantic models for AI-generated statement reports."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ReportChart(BaseModel):
    """Represents a chart suggestion for the PDF report."""

    title: str
    description: str | None = None
    chart_type: str = Field(default="bar")
    metrics: list[str] = Field(default_factory=list)


class ReportSection(BaseModel):
    """Single narrative block within the report."""

    heading: str
    summary: str
    bullet_points: list[str] = Field(default_factory=list)
    highlight_transactions: list[str] = Field(default_factory=list)


class ReportPlan(BaseModel):
    """Structured plan returned by the LLM tool call."""

    headline: str
    executive_summary: str
    sections: list[ReportSection] = Field(default_factory=list)
    charts: list[ReportChart] = Field(default_factory=list)
    include_tables: bool = Field(default=True)
