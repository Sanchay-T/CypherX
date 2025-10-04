"""Utility script to import legacy JSON custom entities into the database."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from apps.domain.repositories import EntityRepository
from apps.infra.db.session import async_session_factory


LEGACY_STORE = Path(".cypherx/custom_entities.json")


async def migrate() -> None:
    if not LEGACY_STORE.exists():
        print("No legacy custom entity store found. Nothing to migrate.")
        return

    with LEGACY_STORE.open("r", encoding="utf-8") as handle:
        raw_entities = json.load(handle) or []

    if not raw_entities:
        print("Legacy custom entity store is empty. Nothing to migrate.")
        return

    async with async_session_factory() as session:
        repo = EntityRepository(session)
        created = 0
        skipped = 0

        for payload in raw_entities:
            name = str(payload.get("name", "")).strip()
            entity_type = str(payload.get("type", "")).strip() or "company"
            aliases = payload.get("aliases") or []
            match_count = int(payload.get("match_count") or 0)

            if not name:
                skipped += 1
                continue

            existing = await repo.get_by_name(name=name)
            if existing:
                skipped += 1
                continue

            entity = await repo.create(name=name, entity_type=entity_type, aliases=aliases)
            entity.match_count = match_count
            created += 1

        await session.commit()

    print(f"Migrated {created} custom entities. Skipped {skipped} entries.")


if __name__ == "__main__":
    asyncio.run(migrate())
