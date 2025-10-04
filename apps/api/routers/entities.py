"""REST endpoints for managing custom entities."""

from __future__ import annotations

import io
from pathlib import Path
from typing import List
from uuid import UUID

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from apps.api.dependencies.entities import get_custom_entity_service
from apps.domain.schemas.entities import EntityCreate, EntityResponse, EntityUpdate
from apps.domain.services.custom_entities import CustomEntityService


router = APIRouter(prefix="/ai/entities", tags=["entities"])

STATEMENTS_DIR = Path(".cypherx/jobs")


async def _update_all_statement_entities(service: CustomEntityService) -> int:
    """Update historical statement exports with the latest entity matches."""

    if not STATEMENTS_DIR.exists():
        return 0

    updated = 0

    for job_dir in STATEMENTS_DIR.iterdir():
        if not job_dir.is_dir():
            continue

        excel_file = job_dir / "statement.xlsx"
        if not excel_file.exists():
            continue

        try:
            df = pd.read_excel(excel_file, sheet_name="Transactions")
        except Exception:
            continue

        if "Description" not in df.columns:
            continue

        descriptions = [str(desc).strip() for desc in df["Description"].dropna().tolist()]
        if not descriptions:
            continue

        matches = await service.match_entities_batch(
            descriptions,
            increment_counters=False,
        )

        df["Entity"] = df["Description"].map(lambda value: matches.get(str(value).strip(), "") or "-")

        try:
            with pd.ExcelWriter(
                excel_file,
                engine="openpyxl",
                mode="a",
                if_sheet_exists="replace",
            ) as writer:
                df.to_excel(writer, sheet_name="Transactions", index=False)
        except Exception:
            continue

        updated += 1

    return updated


@router.post("/", response_model=EntityResponse, status_code=status.HTTP_201_CREATED)
async def create_entity(
    payload: EntityCreate,
    service: CustomEntityService = Depends(get_custom_entity_service),
) -> EntityResponse:
    try:
        entity = await service.create_entity(
            name=payload.name,
            entity_type=payload.type,
            aliases=payload.aliases,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    await _update_all_statement_entities(service)
    return EntityResponse.model_validate(entity)


@router.get("/", response_model=List[EntityResponse])
async def list_entities(
    service: CustomEntityService = Depends(get_custom_entity_service),
) -> list[EntityResponse]:
    entities = await service.list_entities()
    return [EntityResponse.model_validate(entity) for entity in entities]


@router.get("/{entity_id}", response_model=EntityResponse)
async def get_entity(
    entity_id: UUID,
    service: CustomEntityService = Depends(get_custom_entity_service),
) -> EntityResponse:
    entity = await service.get_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    return EntityResponse.model_validate(entity)


@router.put("/{entity_id}", response_model=EntityResponse)
async def update_entity(
    entity_id: UUID,
    payload: EntityUpdate,
    service: CustomEntityService = Depends(get_custom_entity_service),
) -> EntityResponse:
    try:
        entity = await service.update_entity(
            entity_id,
            name=payload.name,
            entity_type=payload.type,
            aliases=payload.aliases,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")

    await _update_all_statement_entities(service)
    return EntityResponse.model_validate(entity)


@router.delete("/{entity_id}")
async def delete_entity(
    entity_id: UUID,
    service: CustomEntityService = Depends(get_custom_entity_service),
) -> dict[str, str]:
    success = await service.delete_entity(entity_id)
    if not success:
        raise HTTPException(status_code=404, detail="Entity not found")

    await _update_all_statement_entities(service)

    return {"message": "Entity deleted successfully"}


@router.post("/preview")
async def preview_entity_matches(
    payload: EntityCreate,
    service: CustomEntityService = Depends(get_custom_entity_service),
) -> dict[str, object]:
    matches = await service.preview_matches(
        name=payload.name,
        aliases=payload.aliases,
        statements_dir=STATEMENTS_DIR,
    )
    return {
        "name": payload.name,
        "total_matches": len(matches),
        "sample_matches": matches[:10],
    }


@router.post("/init-demo", response_model=List[EntityResponse])
async def initialize_demo_data(
    service: CustomEntityService = Depends(get_custom_entity_service),
) -> list[EntityResponse]:
    entities = await service.initialize_demo_data()
    return [EntityResponse.model_validate(entity) for entity in entities]


@router.post("/bulk-import")
async def bulk_import_entities(
    file: UploadFile = File(...),
    service: CustomEntityService = Depends(get_custom_entity_service),
) -> dict[str, object]:
    content = await file.read()

    if file.filename.endswith(".csv"):
        df = pd.read_csv(io.BytesIO(content))
    elif file.filename.endswith((".xlsx", ".xls")):
        df = pd.read_excel(io.BytesIO(content))
    else:
        raise HTTPException(status_code=400, detail="File must be CSV or Excel (.xlsx, .xls)")

    # Normalise column names to make the importer case/whitespace agnostic.
    df.columns = [str(column).strip().lower() for column in df.columns]

    required_cols = {"name", "type"}
    if not required_cols.issubset(df.columns):
        raise HTTPException(
            status_code=400,
            detail="File must contain columns: name, type. Optional column: aliases",
        )

    alias_column = None
    for candidate in ("aliases", "alias", "aliases_list"):
        if candidate in df.columns:
            alias_column = candidate
            break

    imported: list[str] = []
    skipped: list[str] = []

    for _, row in df.iterrows():
        name = str(row.get("name", "")).strip()
        entity_type = str(row.get("type", "")).strip()
        aliases_raw = row.get(alias_column, "") if alias_column else ""
        aliases: list[str] = []
        if aliases_raw and str(aliases_raw).lower() != "nan":
            normalised_aliases = str(aliases_raw).replace(";", ",")
            aliases = [alias.strip() for alias in normalised_aliases.split(",") if alias.strip()]

        if not name or not entity_type:
            skipped.append(f"{name or 'Unknown'} (missing required fields)")
            continue

        try:
            await service.create_entity(name=name, entity_type=entity_type, aliases=aliases)
        except ValueError as exc:
            skipped.append(f"{name} ({exc})")
            continue

        imported.append(name)

    if imported:
        await _update_all_statement_entities(service)

    return {
        "message": f"Imported {len(imported)} entities",
        "imported": imported,
        "skipped": skipped,
        "total": len(df),
    }
