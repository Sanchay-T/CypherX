"""Thin wrapper around the OpenAI Python SDK."""

from __future__ import annotations

from typing import Any

from openai import OpenAI

from apps.core.config import settings


def get_openai_client() -> OpenAI | None:
    if not settings.openai_enabled:
        return None
    return OpenAI(api_key=settings.openai_api_key)


def build_report_tool_schema() -> dict[str, Any]:
    return {
        "type": "function",
        "name": "create_statement_report",
        "description": "Produce a structured plan for a banking statement insights report.",
        "parameters": {
            "type": "object",
            "properties": {
                "headline": {"type": "string"},
                "executive_summary": {"type": "string"},
                "sections": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "heading": {"type": "string"},
                            "summary": {"type": "string"},
                            "bullet_points": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                            "highlight_transactions": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                        },
                        "required": ["heading", "summary"],
                    },
                },
                "charts": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "chart_type": {"type": "string"},
                            "metrics": {
                                "type": "array",
                                "items": {"type": "string"},
                            },
                        },
                        "required": ["title"],
                    },
                },
                "include_tables": {"type": "boolean", "default": True},
            },
            "required": ["headline", "executive_summary"],
        },
    }
