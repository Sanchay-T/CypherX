"""Database-backed service for managing custom entities."""

from __future__ import annotations

import logging
import re
import uuid
from collections import Counter
from collections.abc import Sequence
from pathlib import Path
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from apps.domain.models import CustomEntity
from apps.domain.repositories import EntityRepository


LOGGER = logging.getLogger(__name__)


class CustomEntityService:
    """Business logic for creating, listing, and matching custom entities."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = EntityRepository(session)

    # ------------------------------------------------------------------
    # CRUD operations
    # ------------------------------------------------------------------
    async def list_entities(self) -> list[CustomEntity]:
        return await self._repo.list_entities()

    async def get_entity(self, entity_id: uuid.UUID) -> CustomEntity | None:
        return await self._repo.get(entity_id)

    async def create_entity(
        self,
        *,
        name: str,
        entity_type: str,
        aliases: Sequence[str] | None = None,
    ) -> CustomEntity:
        normalised_aliases = self._normalise_aliases(aliases)

        existing = await self._repo.get_by_name(name=name)
        if existing:
            raise ValueError("Entity with this name already exists")

        try:
            entity = await self._repo.create(
                name=name,
                entity_type=entity_type,
                aliases=normalised_aliases,
            )
            await self._session.commit()
        except Exception:
            await self._session.rollback()
            raise

        await self._session.refresh(entity)
        LOGGER.info("Created custom entity %s (%s)", entity.name, entity.type)
        return entity

    async def update_entity(
        self,
        entity_id: uuid.UUID,
        *,
        name: str | None = None,
        entity_type: str | None = None,
        aliases: Sequence[str] | None = None,
    ) -> CustomEntity | None:
        entity = await self._repo.get(entity_id)
        if not entity:
            return None

        if name and name != entity.name:
            existing = await self._repo.get_by_name(name=name)
            if existing and existing.id != entity.id:
                raise ValueError("Another entity with this name already exists")

        normalised_aliases = None if aliases is None else self._normalise_aliases(aliases)

        try:
            await self._repo.update(
                entity,
                name=name,
                entity_type=entity_type,
                aliases=normalised_aliases,
            )
            await self._session.commit()
        except Exception:
            await self._session.rollback()
            raise

        await self._session.refresh(entity)
        LOGGER.info("Updated custom entity %s", entity.id)
        return entity

    async def delete_entity(self, entity_id: uuid.UUID) -> bool:
        entity = await self._repo.get(entity_id)
        if not entity:
            return False

        try:
            await self._repo.delete(entity)
            await self._session.commit()
        except Exception:
            await self._session.rollback()
            raise

        LOGGER.info("Deleted custom entity %s", entity_id)
        return True

    # ------------------------------------------------------------------
    # Matching utilities
    # ------------------------------------------------------------------
    async def match_entities_batch(
        self,
        descriptions: Sequence[str],
        *,
        increment_counters: bool = True,
    ) -> dict[str, str]:
        entities = await self.match_entities_with_entities(
            descriptions,
            increment_counters=increment_counters,
        )
        return {
            description: entity.name if entity else ""
            for description, entity in entities.items()
        }

    async def match_entities_with_entities(
        self,
        descriptions: Sequence[str],
        *,
        increment_counters: bool = True,
    ) -> dict[str, CustomEntity | None]:
        """Return matching ``CustomEntity`` objects for descriptions."""

        if not descriptions:
            return {}

        entities = await self._repo.list_entities()
        if not entities:
            return {description: None for description in descriptions}

        matches: dict[str, CustomEntity | None] = {}
        counter: Counter[uuid.UUID] = Counter()

        for description in descriptions:
            entity = self._match_single(description, entities)
            matches[description] = entity
            if entity and increment_counters:
                if entity.id is None:
                    LOGGER.warning(
                        "Skipping match counter increment for entity %s without primary key",
                        entity,
                    )
                    continue
                counter[entity.id] += 1

        if increment_counters and counter:
            try:
                await self._repo.increment_match_counts(counter)
                await self._session.commit()
            except Exception:
                await self._session.rollback()
                raise

        return matches

    async def initialize_demo_data(self) -> list[CustomEntity]:
        """Populate the database with a curated demo dataset."""

        existing = await self._repo.list_entities()
        if existing:
            return existing

        demo_entities = [
            {"name": "Sanchay", "type": "person", "aliases": ["Sanchay Gupta", "S Gupta", "sanchay"]},
            {"name": "Business A", "type": "company", "aliases": ["Business A Pvt Ltd", "BusinessA"]},
            {"name": "Rajat Traders", "type": "business", "aliases": ["Rajat Trading Co", "Rajat Traders Pvt Ltd"]},
            {"name": "Amazon India", "type": "company", "aliases": ["Amazon Pay", "AMZN", "Amazon"]},
            {"name": "Arkabiswas", "type": "person", "aliases": ["Arka Biswas", "arkabiswas"]},
        ]

        created: list[CustomEntity] = []
        try:
            for entry in demo_entities:
                entity = await self._repo.create(
                    name=entry["name"],
                    entity_type=entry["type"],
                    aliases=entry["aliases"],
                )
                created.append(entity)
            await self._session.commit()
        except Exception:
            await self._session.rollback()
            raise

        for entity in created:
            await self._session.refresh(entity)
        LOGGER.info("Initialised %d demo entities", len(created))
        return created

    async def preview_matches(
        self,
        *,
        name: str,
        aliases: Sequence[str],
        statements_dir: Path,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Preview where a prospective entity would match existing statement exports."""

        import pandas as pd  # Local import to avoid hard dependency during tests

        if not statements_dir.exists():
            return []

        aliases = self._normalise_aliases(aliases)
        matches: list[dict[str, Any]] = []

        for job_dir in sorted(statements_dir.iterdir(), reverse=True):
            if not job_dir.is_dir():
                continue
            excel_file = job_dir / "statement.xlsx"
            if not excel_file.exists():
                continue

            try:
                df = pd.read_excel(excel_file, sheet_name="Transactions")
            except Exception as exc:
                LOGGER.warning("Preview failed for %s: %s", excel_file, exc)
                continue

            if "Description" not in df.columns:
                continue

            for _, row in df.iterrows():
                description = str(row.get("Description", ""))
                if not description:
                    continue
                if not self._would_match(name, aliases, description):
                    continue

                matches.append(
                    {
                        "job_id": job_dir.name,
                        "description": description,
                        "amount": row.get("Debit", 0) or row.get("Credit", 0),
                        "date": row.get("Value Date", ""),
                        "matched_text": self._highlight_match(name, aliases, description),
                    }
                )

                if len(matches) >= limit:
                    return matches

        return matches

    # ------------------------------------------------------------------
    # Helper methods
    # ------------------------------------------------------------------
    @staticmethod
    def serialize(entity: CustomEntity) -> dict[str, Any]:
        return {
            "id": str(entity.id),
            "name": entity.name,
            "type": entity.type,
            "aliases": entity.aliases,
            "match_count": entity.match_count,
            "created_at": entity.created_at,
            "updated_at": entity.updated_at,
        }

    @staticmethod
    def _normalise_aliases(aliases: Sequence[str] | None) -> list[str]:
        if not aliases:
            return []
        unique = []
        seen = set()
        for alias in aliases:
            cleaned = alias.strip()
            if cleaned and cleaned.lower() not in seen:
                unique.append(cleaned)
                seen.add(cleaned.lower())
        return unique

    def _match_single(
        self,
        description: str,
        entities: Sequence[CustomEntity],
    ) -> Optional[CustomEntity]:
        if not description:
            return None
        description_lower = description.lower()
        best_entity: CustomEntity | None = None
        best_score = 0.0

        for entity in entities:
            if entity.name.lower() in description_lower:
                return entity
            for alias in entity.aliases or []:
                if alias.lower() in description_lower:
                    return entity

            score = self._fuzzy_similarity(entity.name, description)
            if score > best_score and score > 0.75:
                best_entity = entity
                best_score = score

            for alias in entity.aliases or []:
                score = self._fuzzy_similarity(alias, description)
                if score > best_score and score > 0.75:
                    best_entity = entity
                    best_score = score

        return best_entity

    @staticmethod
    def _fuzzy_similarity(name: str, description: str) -> float:
        name_lower = name.lower()
        desc_lower = description.lower()

        if name_lower in desc_lower:
            return 1.0

        name_words = set(re.findall(r"\w+", name_lower))
        desc_words = set(re.findall(r"\w+", desc_lower))
        if not name_words or not desc_words:
            return 0.0

        intersection = name_words.intersection(desc_words)
        union = name_words.union(desc_words)
        return len(intersection) / len(union) if union else 0.0

    @staticmethod
    def _would_match(name: str, aliases: Sequence[str], description: str) -> bool:
        desc_lower = description.lower()
        if name.lower() in desc_lower:
            return True
        return any(alias.lower() in desc_lower for alias in aliases)

    @staticmethod
    def _highlight_match(name: str, aliases: Sequence[str], description: str) -> str:
        desc_lower = description.lower()
        name_lower = name.lower()
        if name_lower in desc_lower:
            idx = desc_lower.find(name_lower)
            return f"{description[:idx]}**{description[idx:idx + len(name)]}**{description[idx + len(name):]}"
        for alias in aliases:
            alias_lower = alias.lower()
            if alias_lower in desc_lower:
                idx = desc_lower.find(alias_lower)
                return f"{description[:idx]}**{description[idx:idx + len(alias)]}**{description[idx + len(alias):]}"
        return description


def serialize_entities(entities: Sequence[CustomEntity]) -> list[dict[str, Any]]:
    """Helper to serialise a collection of entities for API responses."""

    return [CustomEntityService.serialize(entity) for entity in entities]
