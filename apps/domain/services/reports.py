"""AI-powered report generation for bank statements."""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from openai import OpenAI
from openai.types.responses import ResponseFunctionToolCall
from pydantic import ValidationError
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from apps.core.config import settings
from apps.domain.schemas.reports import ReportPlan
from apps.infra.clients.openai_client import build_report_tool_schema, get_openai_client

LOGGER = logging.getLogger(__name__)


class AiReportService:
    """Uses OpenAI function-calling to draft custom PDF summaries."""

    def __init__(self, client: OpenAI | None = None) -> None:
        self._client = client or get_openai_client()

    def available(self) -> bool:
        return self._client is not None

    def _call_llm(self, *, statement_summary: dict[str, Any], prompt: str | None) -> ReportPlan | None:
        if not self._client:
            return None

        system_prompt = (
            "You are CypherX's reporting co-pilot. Analyse bank statement ledgers and propose an executive"
            " PDF report layout with concise wording."
        )

        user_payload = {
            "summary": statement_summary,
            "instructions": prompt or "Focus on cash flow health, risk flags, and customer insights.",
        }

        tool = build_report_tool_schema()

        response = self._client.responses.create(
            model=settings.openai_model,
            input=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": json.dumps(user_payload, ensure_ascii=False),
                },
            ],
            tools=[tool],
        )

        for block in response.output or []:
            if isinstance(block, ResponseFunctionToolCall):
                arguments = block.arguments
                if isinstance(arguments, str):
                    try:
                        data = json.loads(arguments)
                        return ReportPlan.model_validate(data)
                    except (json.JSONDecodeError, ValidationError) as exc:
                        LOGGER.warning("Failed to parse report tool call: %s", exc)
        return None

    def _template_environment(self) -> Environment:
        template_dir = Path(__file__).resolve().parents[2] / "templates"
        env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(["html", "xml"]),
        )

        def format_inr(value: float | int | str | None) -> str:
            if value is None:
                return "—"
            try:
                amount = float(str(value).replace(",", ""))
            except ValueError:
                return str(value)
            return f"₹{amount:,.2f}".replace(",", "X").replace("X", ",")

        env.filters["inr"] = format_inr
        return env

    def generate_pdf(
        self,
        *,
        plan: ReportPlan,
        output_path: Path,
        context_overrides: dict[str, Any],
    ) -> Path:
        env = self._template_environment()
        template = env.get_template("statement_report.html")

        context = {
            "headline": plan.headline,
            "executive_summary": plan.executive_summary,
            "sections": [section.model_dump() for section in plan.sections],
            "charts": [chart.model_dump() for chart in plan.charts],
        }
        context.update(context_overrides)

        html = template.render(**context)
        HTML(string=html, base_url=str(output_path.parent)).write_pdf(str(output_path))
        return output_path

    def build_report(
        self,
        *,
        statement_summary: dict[str, Any],
        prompt: str | None,
        workspace: Path,
    ) -> dict[str, Any] | None:
        if not self.available():
            return None

        plan = self._call_llm(statement_summary=statement_summary, prompt=prompt)
        if not plan:
            return None

        workspace.mkdir(parents=True, exist_ok=True)
        pdf_path = workspace / "custom_report.pdf"
        template_context = self._build_template_context(plan=plan, summary=statement_summary)
        self.generate_pdf(plan=plan, output_path=pdf_path, context_overrides=template_context)
        return {
            "plan": plan.model_dump(),
            "pdf_path": str(pdf_path),
        }

    def _build_template_context(
        self,
        *,
        plan: ReportPlan,
        summary: dict[str, Any],
    ) -> dict[str, Any]:
        preview = summary.get("preview") or {}
        sample_rows = []
        if isinstance(preview, dict):
            sample_rows = preview.get("transactions") or []
        totals = preview.get("totals") if isinstance(preview, dict) else {}

        try:
            credits = float(str((totals or {}).get("credits", 0)).replace(",", ""))
        except ValueError:
            credits = 0.0
        try:
            debits = float(str((totals or {}).get("debits", 0)).replace(",", ""))
        except ValueError:
            debits = 0.0
        net = credits - debits

        key_metrics = [
            {"label": "Total credits", "value": credits, "format": "inr"},
            {"label": "Total debits", "value": debits, "format": "inr"},
            {
                "label": "Net cashflow",
                "value": net,
                "note": "Positive indicates net inflow",
                "format": "inr",
            },
            {
                "label": "Pages processed",
                "value": summary.get("ocr_usage", {}).get("pages_processed", 0),
                "format": "number",
            },
        ]

        pdfs = summary.get("pdfs") or []
        prepared_for = summary.get("prepared_for")
        if not prepared_for and pdfs:
            prepared_for = Path(pdfs[0]).stem.replace("_", " ").title()
        prepared_for = prepared_for or "Stakeholder"

        period = summary.get("period")
        if not period and sample_rows:
            dates = []
            for row in sample_rows:
                for key in ("Value Date", "Tran Date", "Date"):
                    value = row.get(key)
                    if value:
                        try:
                            dates.append(datetime.strptime(str(value), "%d-%m-%Y"))
                        except ValueError:
                            try:
                                dates.append(datetime.strptime(str(value), "%d/%m/%Y"))
                            except ValueError:
                                continue
                        break
            if dates:
                dates.sort()
                period = f"{dates[0].strftime('%d %b %Y')} – {dates[-1].strftime('%d %b %Y')}"
        period = period or "Not specified"
        generated_at = datetime.now().strftime("%d %b %Y, %I:%M %p")

        transaction_sample: dict[str, Any] | None = None
        if sample_rows:
            headers = list(sample_rows[0].keys())
            rows = [[row.get(header, "") for header in headers] for row in sample_rows[:8]]
            transaction_sample = {"headers": headers, "rows": rows}

        return {
            "prepared_for": prepared_for,
            "period": period,
            "generated_at": generated_at,
            "key_metrics": key_metrics,
            "transaction_sample": transaction_sample,
        }
