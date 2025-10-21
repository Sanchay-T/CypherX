"""Endpoints for financial intelligence analysis."""

import asyncio
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from apps.api.dependencies.financial_intelligence import get_financial_intelligence_service
from apps.domain.services.financial_intelligence import FinancialIntelligenceService

router = APIRouter(prefix="/ai/financial", tags=["ai", "financial"])


@router.post("/analyze")
async def analyze_statement(
    file: UploadFile = File(...),
    service: FinancialIntelligenceService = Depends(get_financial_intelligence_service),
):
    """Upload a bank statement and start financial analysis."""
    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Only PDF uploads are supported")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file upload")

    # Create job first
    job_id = await service.create_job(
        file_name=file.filename or "statement.pdf",
        file_path=Path("temp"),  # Will be updated after saving
    )

    # Save the file to the job directory (reuse existing statement processing structure)
    job_dir = service._job_dir(job_id)
    pdf_path = job_dir / (file.filename or "statement.pdf")
    with open(pdf_path, "wb") as f:
        f.write(data)

    # Update job with correct file path
    async with service._session_factory() as session:
        from apps.domain.repositories import FinancialAnalysisJobRepository

        repo = FinancialAnalysisJobRepository(session)
        await repo.update_fields(job_id, file_path=str(pdf_path))
        await session.commit()

    # Run analysis in background
    asyncio.create_task(service.analyze_statement(job_id))

    # Return job info
    job = await service.get_job(job_id)
    return job


@router.get("/")
async def list_analyses(
    service: FinancialIntelligenceService = Depends(get_financial_intelligence_service),
):
    """List all financial analysis jobs."""
    jobs = await service.list_jobs()
    return {"jobs": jobs}


@router.get("/{job_id}")
async def get_analysis(
    job_id: str,
    service: FinancialIntelligenceService = Depends(get_financial_intelligence_service),
):
    """Get details of a specific financial analysis."""
    try:
        job = await service.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc


@router.get("/{job_id}/insights")
async def get_insights(
    job_id: str,
    service: FinancialIntelligenceService = Depends(get_financial_intelligence_service),
):
    """Get AI-generated insights for a financial analysis."""
    try:
        job = await service.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        if job["status"] != "completed":
            raise HTTPException(status_code=400, detail="Analysis not yet completed")

        return {
            "ai_insights": job.get("ai_insights", []),
            "recommendations": job.get("recommendations", {}),
            "risk_assessment": job.get("risk_assessment", {}),
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
