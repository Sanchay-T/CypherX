"""Dependency providers for custom entity services."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from apps.domain.services.custom_entities import CustomEntityService
from apps.infra.db.session import get_db_session


async def get_custom_entity_service(
    session: AsyncSession = Depends(get_db_session),
) -> CustomEntityService:
    return CustomEntityService(session)
