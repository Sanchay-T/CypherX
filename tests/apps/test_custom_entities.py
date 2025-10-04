"""Integration tests for the custom entity service."""

from __future__ import annotations

import uuid

import pytest

from apps.domain.services.custom_entities import CustomEntityService


@pytest.mark.asyncio
async def test_custom_entity_crud(db_session):
    service = CustomEntityService(db_session)

    name = f"Entity-{uuid.uuid4().hex[:8]}"
    created = await service.create_entity(name=name, entity_type="company", aliases=["Alias A"])

    listed = await service.list_entities()
    assert any(entity.id == created.id for entity in listed)

    fetched = await service.get_entity(created.id)
    assert fetched is not None
    assert fetched.name == name

    updated = await service.update_entity(
        created.id,
        name=f"{name}-updated",
        aliases=["Alias B", "Alias C"],
    )
    assert updated is not None
    assert updated.name.endswith("-updated")
    assert len(updated.aliases) == 2

    deleted = await service.delete_entity(created.id)
    assert deleted is True

    refetched = await service.get_entity(created.id)
    assert refetched is None
