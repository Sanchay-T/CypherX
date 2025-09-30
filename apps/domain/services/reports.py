"""AI-powered report generation for bank statements."""

from __future__ import annotations

import json
import logging
import math
from datetime import datetime
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from openai import OpenAI
from openai.types.responses import ResponseFunctionToolCall
from pydantic import ValidationError
from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from apps.core.config import settings
from apps.domain.schemas.reports import ReportPlan
from apps.infra.clients.openai_client import build_report_tool_schema, get_openai_client

LOGGER = logging.getLogger(__name__)


DEFAULT_TEMPLATE_KEY = "standard"

REPORT_TEMPLATE_CONFIG: dict[str, dict[str, str]] = {
    "standard": {
        "system_prompt": (
            "You are CypherX's reporting co-pilot. Analyse bank statement ledgers and propose an executive"
            " PDF report layout with concise wording."
        ),
        "default_instructions": "Focus on cash flow health, risk flags, and customer insights.",
    },
    "lending_india": {
        "system_prompt": (
            "You are CypherX's India lending portfolio analyst. Provide RBI-ready insight on asset quality, PSL"
            " compliance, collateral adequacy, liquidity gaps, and supervisory actions. Keep the tone concise"
            " and surface actions before context."
        ),
        "default_instructions": (
            "Prioritise GNPA/NNPA movement, SMA 0/1/2 pipeline, PSL progress, collateral coverage, liquidity"
            " stress, and compliance breaches. Deliver explicit Action or Monitor call-outs for each section."
        ),
    },
}


def _normalise_number_series(series: pd.Series) -> pd.Series:
    return (
        series.astype(str)
        .str.replace(",", "", regex=False)
        .str.extract(r"([-+]?[0-9]*\.?[0-9]+)")[0]
        .astype(float)
    )


def _generate_chart_images(
    *,
    preview: list[dict[str, Any]],
    workspace: Path,
) -> list[dict[str, str]]:
    if not preview:
        return []

    df = pd.DataFrame(preview)
    if df.empty:
        return []

    columns = {col: col.lower().strip().replace(" ", "_") for col in df.columns}
    df = df.rename(columns=columns)

    for candidate in ["credit", "debit", "balance", "credits", "debits", "amount"]:
        if candidate in df.columns:
            try:
                df[candidate] = _normalise_number_series(df[candidate])
            except Exception:  # pragma: no cover - resilient parsing
                df[candidate] = pd.to_numeric(df[candidate], errors="coerce")

    charts_dir = workspace / "charts"
    charts_dir.mkdir(parents=True, exist_ok=True)
    charts: list[dict[str, str]] = []

    date_col = next(
        (col for col in ("value_date", "tran_date", "date") if col in df.columns),
        None,
    )

    def _save_current_fig(path: Path) -> None:
        plt.savefig(path, dpi=220, transparent=True, bbox_inches="tight")
        plt.close()

    if date_col and {"credit", "debit"}.issubset(df.columns):
        try:
            df_dates = df.copy()
            df_dates["parsed_date"] = pd.to_datetime(
                df_dates[date_col], dayfirst=True, errors="coerce"
            )
            df_dates = df_dates.dropna(subset=["parsed_date"])
            if not df_dates.empty:
                grouped = (
                    df_dates.groupby("parsed_date", as_index=False)[["credit", "debit"]]
                    .sum()
                    .sort_values("parsed_date")
                )
                grouped["net"] = grouped["credit"] - grouped["debit"]
                if not grouped.empty:
                    plt.figure(figsize=(6.1, 3.1))
                    colors = ["#15803d" if val >= 0 else "#dc2626" for val in grouped["net"]]
                    plt.bar(grouped["parsed_date"].dt.strftime("%d %b"), grouped["net"], color=colors)
                    plt.title("Daily Net Cashflow", fontsize=9, pad=8)
                    plt.ylabel("₹", fontsize=8)
                    plt.xticks(rotation=45, fontsize=7)
                    plt.yticks(fontsize=7)
                    plt.grid(axis="y", linestyle="--", linewidth=0.4, alpha=0.35)
                    plt.tight_layout()
                    path = charts_dir / "net_cashflow.png"
                    _save_current_fig(path)
                    charts.append(
                        {
                            "title": "Daily Net Cashflow",
                            "path": str(path),
                            "description": "Net inflow vs outflow across the sampled period.",
                        }
                    )
        except Exception:  # pragma: no cover - defensive
            plt.close("all")

    if {"credit", "debit"}.issubset(df.columns):
        credit_total = float(df["credit"].fillna(0).sum())
        debit_total = float(df["debit"].fillna(0).sum())
        if credit_total > 0 or debit_total > 0:
            plt.figure(figsize=(3.4, 3.4))
            plt.pie(
                [max(credit_total, 0.01), max(debit_total, 0.01)],
                labels=["Credits", "Debits"],
                colors=["#1d4ed8", "#93c5fd"],
                autopct="%1.1f%%",
                startangle=135,
                textprops={"fontsize": 8},
            )
            plt.title("Credit vs Debit Mix", fontsize=9, pad=6)
            plt.tight_layout()
            path = charts_dir / "credit_debit_pie.png"
            _save_current_fig(path)
            charts.append(
                {
                    "title": "Credit vs Debit Mix",
                    "path": str(path),
                    "description": "Share of total credits against debits in the preview window.",
                }
            )

    if "balance" in df.columns:
        try:
            df_balance = df.copy()
            if date_col:
                df_balance["parsed_date"] = pd.to_datetime(
                    df_balance[date_col], dayfirst=True, errors="coerce"
                )
                df_balance = df_balance.dropna(subset=["parsed_date"])
                df_balance = df_balance.sort_values("parsed_date")
            if not df_balance.empty:
                plt.figure(figsize=(6.1, 2.8))
                if date_col and "parsed_date" in df_balance:
                    x_axis = df_balance["parsed_date"]
                    plt.plot(x_axis, df_balance["balance"], color="#1d4ed8", linewidth=2)
                    plt.xticks(rotation=45, fontsize=7)
                else:
                    plt.plot(df_balance["balance"].reset_index(drop=True), color="#1d4ed8", linewidth=2)
                    plt.xticks(fontsize=7)
                plt.yticks(fontsize=7)
                plt.grid(axis="y", linestyle="--", linewidth=0.4, alpha=0.35)
                plt.title("Balance Trend", fontsize=9, pad=6)
                plt.tight_layout()
                path = charts_dir / "balance_trend.png"
                _save_current_fig(path)
                charts.append(
                    {
                        "title": "Balance Trend",
                        "path": str(path),
                        "description": "Running balance trajectory derived from the preview rows.",
                    }
                )
        except Exception:  # pragma: no cover - defensive
            plt.close("all")

    return charts


class AiReportService:
    """Uses OpenAI function-calling to draft custom PDF summaries."""

    def __init__(self, client: OpenAI | None = None) -> None:
        self._client = client or get_openai_client()

    def available(self) -> bool:
        return self._client is not None

    def _resolve_template_prompts(self, template: str | None) -> tuple[str, str, str]:
        key = (template or DEFAULT_TEMPLATE_KEY).lower()
        if key not in REPORT_TEMPLATE_CONFIG:
            key = DEFAULT_TEMPLATE_KEY
        config = REPORT_TEMPLATE_CONFIG[key]
        return key, config["system_prompt"], config["default_instructions"]

    def _call_llm(
        self,
        *,
        statement_summary: dict[str, Any],
        prompt: str | None,
        template: str | None,
    ) -> ReportPlan | None:
        if not self._client:
            return None

        key, system_prompt, default_instructions = self._resolve_template_prompts(template)

        user_payload = {
            "summary": statement_summary,
            "instructions": prompt or default_instructions,
            "template": key,
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
        template: str | None,
        workspace: Path,
    ) -> dict[str, Any] | None:
        if not self.available():
            return None

        plan = self._call_llm(statement_summary=statement_summary, prompt=prompt, template=template)
        if not plan:
            return None

        workspace.mkdir(parents=True, exist_ok=True)
        pdf_path = workspace / "custom_report.pdf"
        template_context = self._build_template_context(plan=plan, summary=statement_summary)
        preview_transactions = []
        preview_payload = statement_summary.get("preview")
        if isinstance(preview_payload, dict):
            preview_transactions = preview_payload.get("transactions") or []
        auto_charts = _generate_chart_images(preview=preview_transactions, workspace=workspace)
        if auto_charts:
            template_context["auto_charts"] = auto_charts
        self.generate_pdf(plan=plan, output_path=pdf_path, context_overrides=template_context)
        resolved_template, _, _ = self._resolve_template_prompts(template)
        return {
            "plan": plan.model_dump(),
            "pdf_path": str(pdf_path),
            "template": resolved_template,
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

        template_key = str(summary.get("template") or "custom").strip()
        template_name = template_key.replace("_", " ").title()

        return {
            "prepared_for": prepared_for,
            "period": period,
            "generated_at": generated_at,
            "key_metrics": key_metrics,
            "transaction_sample": transaction_sample,
            "template_name": template_name,
        }
