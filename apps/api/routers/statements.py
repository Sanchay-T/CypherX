"""Endpoints for statement processing pipeline."""

import json
import shutil
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from apps.api.dependencies.statements import get_statement_pipeline
from apps.domain.services.statements import StatementPipelineService
from apps.legacy_bridge.adapter import run_legacy

router = APIRouter(prefix="/ai/statements", tags=["ai"])


@router.post("/normalize")
async def normalize_statement(
    file: UploadFile = File(...),
    bank_name: str | None = Form(default=None),
    password: str | None = Form(default=None),
    financial_year: str | None = Form(default=None),
    report_prompt: str | None = Form(default=None),
    report_template: str | None = Form(default=None),
    pipeline: StatementPipelineService = Depends(get_statement_pipeline),
):
    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Only PDF uploads are supported")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file upload")

    job = await pipeline.create_job(
        file_bytes=data,
        file_name=file.filename or "statement.pdf",
        bank_name=bank_name,
        password=password,
        financial_year=financial_year,
        prompt=report_prompt,
        template=report_template,
    )
    return job


@router.get("/")
async def list_statement_jobs(pipeline: StatementPipelineService = Depends(get_statement_pipeline)):
    """List all statement processing jobs."""
    jobs = await pipeline.list_jobs()
    return {"jobs": jobs}


@router.get("/{job_id}")
async def get_statement_job(job_id: str, pipeline: StatementPipelineService = Depends(get_statement_pipeline)):
    try:
        job = await pipeline.get_job(job_id)
        return job
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc


@router.get("/{job_id}/excel")
async def download_excel(job_id: str, token: str, pipeline: StatementPipelineService = Depends(get_statement_pipeline)):
    try:
        path = await pipeline.read_excel(job_id, token)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail="Invalid download token") from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FileResponse(path, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename=path.name)


@router.get("/{job_id}/report")
async def download_report(job_id: str, pipeline: StatementPipelineService = Depends(get_statement_pipeline)):
    try:
        path = await pipeline.read_report(job_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FileResponse(path, media_type="application/pdf", filename=path.name)


@router.get("/{job_id}/excel-data")
async def get_excel_data(job_id: str, token: str, pipeline: StatementPipelineService = Depends(get_statement_pipeline)):
    """Return the complete Excel file structure as JSON for frontend display."""
    try:
        excel_data = await pipeline.get_excel_data(job_id, token)
        return excel_data
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail="Invalid download token") from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/legacy-normalize")
async def legacy_normalize_statement(
    file: UploadFile = File(...),
    bank_name: str | None = Form(default=None),
    start_date: str | None = Form(default=None),
    end_date: str | None = Form(default=None),
):
    """Run only the legacy extraction pipeline and return the generated Excel."""
    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Only PDF uploads are supported")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="Empty file upload")

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            tmp_dir = Path(tmpdir)
            filename = file.filename or "statement.pdf"
            pdf_path = tmp_dir / filename
            pdf_path.write_bytes(payload)

            excel_path, summary = run_legacy(
                [str(pdf_path)],
                ocr=False,
                bank_names=[bank_name] if bank_name else None,
                start_dates=[start_date] if start_date else None,
                end_dates=[end_date] if end_date else None,
            )

            exports_dir = Path(".cypherx/legacy_exports")
            exports_dir.mkdir(parents=True, exist_ok=True)

            export_name = f"{pdf_path.stem}_{uuid.uuid4().hex[:8]}.xlsx"
            final_excel_path = exports_dir / export_name
            shutil.copy(excel_path, final_excel_path)

            summary_path = final_excel_path.with_suffix(".json")
            summary_path.write_text(json.dumps(summary, indent=2))

    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - guard legacy adapter failures
        raise HTTPException(status_code=502, detail=f"Legacy extraction failed: {exc}") from exc

    response = FileResponse(
        final_excel_path,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=final_excel_path.name,
    )
    response.headers["X-Legacy-Export-Path"] = str(final_excel_path)
    response.headers["X-Legacy-Summary-Path"] = str(summary_path)
    if bank_name:
        response.headers["X-Legacy-Bank-Name"] = bank_name
    if start_date:
        response.headers["X-Legacy-Start-Date"] = start_date
    if end_date:
        response.headers["X-Legacy-End-Date"] = end_date
    return response
