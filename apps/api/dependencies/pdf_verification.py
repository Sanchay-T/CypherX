"""Dependency injection for PDF verification services."""

from functools import lru_cache
from pathlib import Path

from apps.domain.services.pdf_verification import PdfVerificationService
from apps.domain.services.pdf_verification_report import PdfVerificationReportService
from apps.infra.db.session import async_session_factory


@lru_cache(maxsize=1)
def get_verification_report_service() -> PdfVerificationReportService:
    return PdfVerificationReportService()


@lru_cache(maxsize=1)
def get_pdf_verification_service() -> PdfVerificationService:
    workspace = Path(".cypherx/verification_jobs").resolve()
    return PdfVerificationService(
        session_factory=async_session_factory,
        workspace_dir=workspace,
    )
