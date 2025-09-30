"""Endpoints for statement processing pipeline."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from apps.api.dependencies.statements import get_statement_pipeline
from apps.domain.services.statements import StatementPipelineService

router = APIRouter(prefix="/ai/statements", tags=["ai"])


@router.post("/normalize")
async def normalize_statement(
    file: UploadFile = File(...),
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
        prompt=report_prompt,
        template=report_template,
    )
    return job


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
