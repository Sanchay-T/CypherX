"""Dependency injection for statement pipeline services."""

from functools import lru_cache
from pathlib import Path

from apps.core.config import settings
from apps.domain.services.mistral import MistralOcrService
from apps.domain.services.reports import AiReportService
from apps.domain.services.statements import StatementPipelineService
from apps.api.dependencies.mistral import get_mistral_service
from apps.infra.jobs.store import store


@lru_cache(maxsize=1)
def get_report_service() -> AiReportService:
    return AiReportService()


@lru_cache(maxsize=1)
def get_statement_pipeline() -> StatementPipelineService:
    mistral_service: MistralOcrService = get_mistral_service()
    report_service = get_report_service()
    workspace = Path(".cypherx/jobs").resolve()
    return StatementPipelineService(
        mistral_service=mistral_service,
        report_service=report_service,
        job_store=store,
        workspace_dir=workspace,
    )
