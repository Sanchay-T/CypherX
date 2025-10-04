"""Persistence helpers for custom entities and entity matches."""

from __future__ import annotations

import logging
import uuid
from collections.abc import Mapping, Sequence

import sqlalchemy as sa
from sqlalchemy import Select, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from apps.domain.models import CustomEntity, EntityMatch


LOGGER = logging.getLogger(__name__)


class EntityRepository:
    """Read/write helpers for ``CustomEntity`` and related tables."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_entities(self) -> list[CustomEntity]:
        stmt: Select[tuple[CustomEntity]] = select(CustomEntity).order_by(
            func.lower(CustomEntity.name)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get(self, entity_id: uuid.UUID) -> CustomEntity | None:
        return await self._session.get(CustomEntity, entity_id)

    async def get_by_name(self, *, name: str) -> CustomEntity | None:
        stmt: Select[tuple[CustomEntity]] = select(CustomEntity).where(
            func.lower(CustomEntity.name) == name.lower()
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        name: str,
        entity_type: str,
        aliases: Sequence[str] | None = None,
    ) -> CustomEntity:
        entity = CustomEntity(
            name=name.strip(),
            type=entity_type,
            aliases=list(aliases or []),
        )
        self._session.add(entity)
        await self._session.flush()
        return entity

    async def update(
        self,
        entity: CustomEntity,
        *,
        name: str | None = None,
        entity_type: str | None = None,
        aliases: Sequence[str] | None = None,
    ) -> CustomEntity:
        if name is not None:
            entity.name = name.strip()
        if entity_type is not None:
            entity.type = entity_type
        if aliases is not None:
            entity.aliases = list(aliases)
        await self._session.flush()
        return entity

    async def delete(self, entity: CustomEntity) -> None:
        await self._session.delete(entity)
        await self._session.flush()

    async def record_match(
        self,
        *,
        entity_id: uuid.UUID,
        statement_job_id: uuid.UUID,
        description: str,
        source: str,
    ) -> EntityMatch:
        match = EntityMatch(
            entity_id=entity_id,
            statement_job_id=statement_job_id,
            description=description,
            source=source,
        )
        self._session.add(match)
        await self._session.flush()
        return match

    async def increment_match_counts(
        self, increments: Mapping[uuid.UUID, int]
    ) -> None:
        if not increments:
            return
        valid_ids: list[uuid.UUID] = []
        deltas: dict[uuid.UUID, int] = {}
        skipped_entities: list[uuid.UUID | None] = []

        for entity_id, value in increments.items():
            if not value:
                continue
            if not entity_id:
                skipped_entities.append(entity_id)
                continue
            valid_ids.append(entity_id)
            deltas[entity_id] = value

        if skipped_entities:
            LOGGER.warning(
                "Skipping match count updates for entities without a primary key: %s",
                skipped_entities,
            )

        if not valid_ids:
            return

        stmt: Select[tuple[CustomEntity]] = select(CustomEntity).where(
            CustomEntity.id.in_(valid_ids)
        )
        result = await self._session.execute(stmt)
        entities = result.scalars().all()

        found_ids = {entity.id for entity in entities}
        missing_ids = set(valid_ids) - found_ids
        if missing_ids:
            LOGGER.warning(
                "Match count increment skipped for unknown entity ids: %s",
                sorted(missing_ids),
            )

        for entity in entities:
            increment = deltas.get(entity.id)
            if not increment:
                continue
            entity.match_count = (entity.match_count or 0) + increment

        await self._session.flush()
