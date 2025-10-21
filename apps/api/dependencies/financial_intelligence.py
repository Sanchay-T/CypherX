"""Dependency injection for financial intelligence services."""

from functools import lru_cache
from pathlib import Path

from apps.domain.services.financial_intelligence import FinancialIntelligenceService
from apps.infra.db.session import async_session_factory


@lru_cache(maxsize=1)
def get_financial_intelligence_service() -> FinancialIntelligenceService:
    workspace = Path(".cypherx/jobs").resolve()
    return FinancialIntelligenceService(
        session_factory=async_session_factory,
        workspace_dir=workspace,
    )
