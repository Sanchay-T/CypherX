"""Endpoints for PDF verification pipeline."""

import asyncio
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from apps.api.dependencies.pdf_verification import get_pdf_verification_service, get_verification_report_service
from apps.domain.services.pdf_verification import PdfVerificationService
from apps.domain.services.pdf_verification_report import PdfVerificationReportService

router = APIRouter(prefix="/ai/pdf/verify", tags=["ai", "verification"])


@router.post("/")
async def upload_and_verify_pdf(
    file: UploadFile = File(...),
    service: PdfVerificationService = Depends(get_pdf_verification_service),
):
    """Upload a PDF and start verification process."""
    if file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(status_code=415, detail="Only PDF uploads are supported")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file upload")

    # Create job first
    job_id = await service.create_job(
        file_name=file.filename or "document.pdf",
        file_path=Path("temp"),  # Will be updated after saving
    )

    # Save the file
    job_dir = service._job_dir(job_id)
    pdf_path = job_dir / (file.filename or "document.pdf")
    with open(pdf_path, "wb") as f:
        f.write(data)

    # Update job with correct file path
    async with service._session_factory() as session:
        from apps.domain.repositories import PdfVerificationJobRepository

        repo = PdfVerificationJobRepository(session)
        await repo.update_fields(job_id, file_path=str(pdf_path))
        await session.commit()

    # Run verification in background
    asyncio.create_task(service.run_verification(job_id))

    # Return job info
    job = await service.get_job(job_id)
    return job


@router.get("/")
async def list_verification_jobs(
    service: PdfVerificationService = Depends(get_pdf_verification_service),
):
    """List all PDF verification jobs."""
    jobs = await service.list_jobs()
    return {"jobs": jobs}


@router.get("/{job_id}")
async def get_verification_job(
    job_id: str,
    service: PdfVerificationService = Depends(get_pdf_verification_service),
):
    """Get details of a specific verification job."""
    try:
        job = await service.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job
    except Exception as exc:
        raise HTTPException(status_code=404, detail="Job not found") from exc


@router.get("/{job_id}/report")
async def download_verification_report(
    job_id: str,
    service: PdfVerificationService = Depends(get_pdf_verification_service),
    report_service: PdfVerificationReportService = Depends(get_verification_report_service),
):
    """Download or generate the verification report PDF."""
    try:
        job = await service.get_job(job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        if job["status"] != "completed":
            raise HTTPException(status_code=400, detail="Verification not yet completed")

        # Check if report already exists
        report_path = Path(service._job_dir(job_id)) / "verification_report.pdf"

        if not report_path.exists():
            # Generate report on-demand
            report_service.generate_report(
                job_id=str(job_id),
                file_name=job["file_name"],
                risk_score=job["risk_score"] or 0,
                verdict=job["overall_verdict"] or "unknown",
                findings=job.get("findings") or [],
                metadata=job.get("metadata") or {},
                output_path=report_path,
            )

            # Update job with report path
            async with service._session_factory() as session:
                from apps.domain.repositories import PdfVerificationJobRepository

                repo = PdfVerificationJobRepository(session)
                await repo.update_fields(job_id, report_path=str(report_path))
                await session.commit()

        return FileResponse(
            report_path,
            media_type="application/pdf",
            filename=f"verification_report_{job_id}.pdf",
        )

    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Report file not found") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(exc)}") from exc
