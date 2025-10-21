"""PDF verification report generator for management presentation."""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

LOGGER = logging.getLogger(__name__)


class PdfVerificationReportService:
    """Service for generating professional PDF verification reports."""

    def __init__(self) -> None:
        """Initialize the report service."""
        pass

    def _template_environment(self) -> Environment:
        """Set up Jinja2 template environment."""
        template_dir = Path(__file__).resolve().parents[2] / "templates"
        env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(["html", "xml"]),
        )

        # Custom filters
        def format_date(value: str | None) -> str:
            if not value:
                return "N/A"
            try:
                # Try to parse common PDF date formats
                if value.startswith("D:"):
                    # PDF format: D:YYYYMMDDHHmmSSOHH'mm'
                    date_str = value[2:16]  # Extract YYYYMMDDHHmmSS
                    dt = datetime.strptime(date_str, "%Y%m%d%H%M%S")
                    return dt.strftime("%B %d, %Y at %I:%M %p")
                return value
            except Exception:
                return value

        def severity_color(severity: str) -> str:
            """Get color for severity level."""
            colors = {
                "CRITICAL": "#dc2626",  # Red
                "HIGH": "#ea580c",  # Orange
                "MEDIUM": "#d97706",  # Amber
                "LOW": "#65a30d",  # Green
            }
            return colors.get(severity, "#6b7280")

        def status_icon(status: str) -> str:
            """Get icon for status."""
            return "✓" if status == "PASS" else "✗"

        env.filters["format_date"] = format_date
        env.filters["severity_color"] = severity_color
        env.filters["status_icon"] = status_icon
        return env

    def generate_report(
        self,
        *,
        job_id: str,
        file_name: str,
        risk_score: int,
        verdict: str,
        findings: list[dict[str, Any]],
        metadata: dict[str, Any],
        output_path: Path,
    ) -> Path:
        """Generate a professional PDF verification report.

        Args:
            job_id: Unique job identifier
            file_name: Name of the verified PDF file
            risk_score: Overall risk score (0-100)
            verdict: Overall verdict (verified, suspicious, fraudulent)
            findings: List of verification findings
            metadata: PDF metadata
            output_path: Where to save the generated report

        Returns:
            Path to the generated PDF report
        """
        env = self._template_environment()
        template = env.get_template("verification_report.html")

        # Prepare context data
        context = self._prepare_context(
            job_id=job_id,
            file_name=file_name,
            risk_score=risk_score,
            verdict=verdict,
            findings=findings,
            metadata=metadata,
        )

        # Render HTML and generate PDF
        html = template.render(**context)
        HTML(string=html, base_url=str(output_path.parent)).write_pdf(str(output_path))

        LOGGER.info(f"Generated verification report: {output_path}")
        return output_path

    def _prepare_context(
        self,
        *,
        job_id: str,
        file_name: str,
        risk_score: int,
        verdict: str,
        findings: list[dict[str, Any]],
        metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """Prepare template context data."""

        # Categorize findings
        critical_findings = [f for f in findings if f.get("severity") == "CRITICAL" and f.get("status") == "FAIL"]
        high_findings = [f for f in findings if f.get("severity") == "HIGH" and f.get("status") == "FAIL"]
        medium_findings = [f for f in findings if f.get("severity") == "MEDIUM" and f.get("status") == "FAIL"]
        passed_checks = [f for f in findings if f.get("status") == "PASS"]

        # Determine verdict styling
        verdict_styles = {
            "verified": {
                "color": "#15803d",
                "bg_color": "#dcfce7",
                "label": "✓ VERIFIED",
                "description": "No tampering detected. Document appears authentic.",
            },
            "suspicious": {
                "color": "#d97706",
                "bg_color": "#fef3c7",
                "label": "⚠ SUSPICIOUS",
                "description": "Minor inconsistencies found. Manual review recommended.",
            },
            "fraudulent": {
                "color": "#dc2626",
                "bg_color": "#fee2e2",
                "label": "✗ FRAUDULENT",
                "description": "Clear signs of manipulation detected. Document authenticity compromised.",
            },
        }

        verdict_info = verdict_styles.get(verdict, verdict_styles["suspicious"])

        # Executive summary
        executive_summary = self._generate_executive_summary(
            risk_score=risk_score,
            verdict=verdict,
            critical_count=len(critical_findings),
            high_count=len(high_findings),
            medium_count=len(medium_findings),
            metadata=metadata,
        )

        return {
            "job_id": job_id,
            "file_name": file_name,
            "risk_score": risk_score,
            "verdict": verdict,
            "verdict_label": verdict_info["label"],
            "verdict_description": verdict_info["description"],
            "verdict_color": verdict_info["color"],
            "verdict_bg_color": verdict_info["bg_color"],
            "timestamp": datetime.now().strftime("%B %d, %Y at %I:%M %p"),
            "executive_summary": executive_summary,
            "critical_findings": critical_findings,
            "high_findings": high_findings,
            "medium_findings": medium_findings,
            "all_findings": findings,
            "passed_checks": passed_checks,
            "metadata": metadata,
            "total_findings": len(findings),
            "failed_checks": len([f for f in findings if f.get("status") == "FAIL"]),
        }

    def _generate_executive_summary(
        self,
        *,
        risk_score: int,
        verdict: str,
        critical_count: int,
        high_count: int,
        medium_count: int,
        metadata: dict[str, Any],
    ) -> str:
        """Generate executive summary text."""
        summary_parts = []

        if verdict == "verified":
            summary_parts.append(
                f"The document has passed all critical verification checks with a low risk score of {risk_score}/100."
            )
            summary_parts.append("No signs of tampering or manipulation were detected.")
        elif verdict == "suspicious":
            summary_parts.append(
                f"The document has triggered {critical_count + high_count + medium_count} warning flags "
                f"with a moderate risk score of {risk_score}/100."
            )
            summary_parts.append("Manual review is recommended before accepting this document.")
        else:  # fraudulent
            summary_parts.append(
                f"The document has failed critical verification checks with a high risk score of {risk_score}/100."
            )
            if critical_count > 0:
                summary_parts.append(
                    f"{critical_count} CRITICAL issue(s) detected indicating clear signs of manipulation."
                )

        # Add software information
        creator = metadata.get("creator", "Unknown")
        producer = metadata.get("producer", "Unknown")
        if creator and creator != "Unknown":
            summary_parts.append(f"Document creator software: {creator}")

        return " ".join(summary_parts)
