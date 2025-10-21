"""PDF verification service for detecting document tampering."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from apps.domain.repositories import PdfVerificationJobRepository

try:
    import pikepdf
except ImportError:
    pikepdf = None  # type: ignore

LOGGER = logging.getLogger(__name__)


@dataclass
class VerificationFinding:
    """Single verification finding."""

    type: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    status: str  # PASS, FAIL
    details: str
    evidence: dict[str, Any] | None = None


class PdfVerificationService:
    """Service for verifying PDF document authenticity and detecting tampering."""

    # Suspicious editing software
    SUSPICIOUS_TOOLS = [
        "Photoshop",
        "GIMP",
        "Paint",
        "Acrobat Pro",
        "PDFEdit",
        "Adobe Illustrator",
        "Inkscape",
        "CorelDRAW",
        "Pixelmator",
    ]

    # Expected banking software
    BANK_SOFTWARE = [
        "Finacle",
        "SAP",
        "Oracle",
        "Flexcube",
        "BaNCS",
        "Temenos",
        "FIS",
        "TCS BaNCS",
        "Infosys Finacle",
        "iReport",
        "JasperReports",
    ]

    # Risk score weights
    SEVERITY_WEIGHTS = {
        "CRITICAL": 40,
        "HIGH": 25,
        "MEDIUM": 15,
        "LOW": 5,
    }

    def __init__(
        self,
        *,
        session_factory: async_sessionmaker[AsyncSession],
        workspace_dir: Path,
    ) -> None:
        self._session_factory = session_factory
        self._workspace = workspace_dir
        self._workspace.mkdir(parents=True, exist_ok=True)

    def _job_dir(self, job_id: uuid.UUID) -> Path:
        """Get job directory for storing files."""
        job_dir = self._workspace / str(job_id)
        job_dir.mkdir(parents=True, exist_ok=True)
        return job_dir

    async def create_job(
        self,
        *,
        file_name: str,
        file_path: Path,
    ) -> uuid.UUID:
        """Create a new verification job."""
        async with self._session_factory() as session:
            repo = PdfVerificationJobRepository(session)
            job = await repo.create_job(
                file_name=file_name,
                file_path=str(file_path),
                payload={"file_name": file_name},
                status="queued",
            )
            await session.commit()
            LOGGER.info(f"Created PDF verification job {job.id} for file: {file_name}")
            return job.id

    async def run_verification(self, job_id: uuid.UUID) -> None:
        """Run all verification checks on a PDF."""
        if pikepdf is None:
            raise RuntimeError("pikepdf library is not installed. Install it with: pip install pikepdf")

        async with self._session_factory() as session:
            repo = PdfVerificationJobRepository(session)

            # Update status to running
            await repo.update_fields(job_id, status="running")
            await session.commit()

            try:
                job = await repo.get(job_id)
                if not job or not job.file_path:
                    raise ValueError(f"Job {job_id} not found or missing file path")

                file_path = Path(job.file_path)
                if not file_path.exists():
                    raise FileNotFoundError(f"PDF file not found: {file_path}")

                # Run all verification checks
                findings = self._verify_pdf(file_path)

                # Calculate risk score
                risk_score = self._calculate_risk_score(findings)

                # Determine overall verdict
                verdict = self._determine_verdict(risk_score)

                # Extract metadata for storage
                metadata = self._extract_metadata(file_path)

                # Update job with results
                await repo.update_fields(
                    job_id,
                    status="completed",
                    risk_score=risk_score,
                    overall_verdict=verdict,
                    findings=[f.__dict__ for f in findings],
                    pdf_metadata=metadata,
                    result={
                        "risk_score": risk_score,
                        "verdict": verdict,
                        "total_findings": len(findings),
                        "critical_findings": sum(1 for f in findings if f.severity == "CRITICAL"),
                        "high_findings": sum(1 for f in findings if f.severity == "HIGH"),
                    },
                )
                await session.commit()

                LOGGER.info(f"PDF verification job {job_id} completed: {verdict} (risk score: {risk_score})")

            except Exception as e:
                LOGGER.exception(f"PDF verification job {job_id} failed")
                await repo.update_fields(
                    job_id,
                    status="failed",
                    error=str(e),
                )
                await session.commit()
                raise

    def _verify_pdf(self, pdf_path: Path) -> list[VerificationFinding]:
        """Run all PDF verification checks."""
        findings: list[VerificationFinding] = []

        try:
            pdf = pikepdf.open(pdf_path)
            metadata = pdf.docinfo

            # Check 1: Creation vs Modification date
            finding = self._check_modification_date(metadata)
            if finding:
                findings.append(finding)

            # Check 2: Software used - check for suspicious editing tools
            finding = self._check_suspicious_software(metadata)
            if finding:
                findings.append(finding)

            # Check 3: Expected bank software
            finding = self._check_bank_software(metadata)
            if finding:
                findings.append(finding)

            # Check 4: PDF version and structure
            finding = self._check_pdf_structure(pdf)
            if finding:
                findings.append(finding)

            # Check 5: Encryption/Security
            finding = self._check_encryption(pdf)
            if finding:
                findings.append(finding)

            pdf.close()

        except Exception as e:
            LOGGER.error(f"Error verifying PDF: {e}")
            findings.append(
                VerificationFinding(
                    type="PDF_READ_ERROR",
                    severity="HIGH",
                    status="FAIL",
                    details=f"Failed to read or parse PDF: {str(e)}",
                )
            )

        return findings

    def _check_modification_date(self, metadata: dict) -> VerificationFinding | None:
        """Check if document was modified after creation."""
        created = metadata.get("/CreationDate")
        modified = metadata.get("/ModDate")

        if created and modified and str(modified) != str(created):
            return VerificationFinding(
                type="MODIFIED_AFTER_CREATION",
                severity="HIGH",
                status="FAIL",
                details=f"Document was modified after creation. Created: {created}, Modified: {modified}",
                evidence={"created": str(created), "modified": str(modified)},
            )

        return VerificationFinding(
            type="MODIFICATION_CHECK",
            severity="LOW",
            status="PASS",
            details="No post-creation modifications detected",
            evidence={"created": str(created) if created else "N/A", "modified": str(modified) if modified else "N/A"},
        )

    def _check_suspicious_software(self, metadata: dict) -> VerificationFinding | None:
        """Check for suspicious editing software."""
        creator = str(metadata.get("/Creator", ""))
        producer = str(metadata.get("/Producer", ""))

        suspicious_found = []
        for tool in self.SUSPICIOUS_TOOLS:
            if tool.lower() in creator.lower() or tool.lower() in producer.lower():
                suspicious_found.append(tool)

        if suspicious_found:
            return VerificationFinding(
                type="SUSPICIOUS_SOFTWARE",
                severity="CRITICAL",
                status="FAIL",
                details=f"Document created/edited with suspicious software: {', '.join(suspicious_found)}. Creator: {creator}, Producer: {producer}",
                evidence={"creator": creator, "producer": producer, "suspicious_tools": suspicious_found},
            )

        return VerificationFinding(
            type="SOFTWARE_CHECK",
            severity="LOW",
            status="PASS",
            details="No suspicious editing software detected",
            evidence={"creator": creator, "producer": producer},
        )

    def _check_bank_software(self, metadata: dict) -> VerificationFinding | None:
        """Check if document was generated by standard banking software."""
        creator = str(metadata.get("/Creator", ""))
        producer = str(metadata.get("/Producer", ""))

        bank_software_found = []
        for sw in self.BANK_SOFTWARE:
            if sw.lower() in creator.lower() or sw.lower() in producer.lower():
                bank_software_found.append(sw)

        if not bank_software_found:
            return VerificationFinding(
                type="NON_BANK_SOFTWARE",
                severity="MEDIUM",
                status="FAIL",
                details=f"Document not generated by standard banking software. Creator: {creator}, Producer: {producer}",
                evidence={"creator": creator, "producer": producer},
            )

        return VerificationFinding(
            type="BANK_SOFTWARE_CHECK",
            severity="LOW",
            status="PASS",
            details=f"Document generated by recognized banking software: {', '.join(bank_software_found)}",
            evidence={"creator": creator, "producer": producer, "bank_software": bank_software_found},
        )

    def _check_pdf_structure(self, pdf: Any) -> VerificationFinding | None:
        """Check PDF version and basic structure."""
        try:
            version = f"{pdf.pdf_version[0]}.{pdf.pdf_version[1]}"

            # Very old or very new versions might be suspicious
            major, minor = pdf.pdf_version
            if major < 1 or (major == 1 and minor < 3):
                return VerificationFinding(
                    type="OLD_PDF_VERSION",
                    severity="LOW",
                    status="FAIL",
                    details=f"PDF version is very old: {version}. May indicate manipulation.",
                    evidence={"version": version},
                )

            return VerificationFinding(
                type="PDF_STRUCTURE_CHECK",
                severity="LOW",
                status="PASS",
                details=f"PDF structure is valid. Version: {version}",
                evidence={"version": version},
            )
        except Exception as e:
            return VerificationFinding(
                type="PDF_STRUCTURE_CHECK",
                severity="MEDIUM",
                status="FAIL",
                details=f"Unable to verify PDF structure: {str(e)}",
            )

    def _check_encryption(self, pdf: Any) -> VerificationFinding | None:
        """Check PDF encryption status."""
        try:
            is_encrypted = pdf.is_encrypted

            if is_encrypted:
                return VerificationFinding(
                    type="ENCRYPTION_CHECK",
                    severity="LOW",
                    status="PASS",
                    details="Document is encrypted/password-protected",
                    evidence={"encrypted": True},
                )

            return VerificationFinding(
                type="ENCRYPTION_CHECK",
                severity="LOW",
                status="PASS",
                details="Document is not encrypted",
                evidence={"encrypted": False},
            )
        except Exception:
            return None

    def _extract_metadata(self, pdf_path: Path) -> dict[str, Any]:
        """Extract all PDF metadata for storage."""
        try:
            pdf = pikepdf.open(pdf_path)
            metadata = pdf.docinfo

            result = {
                "creator": str(metadata.get("/Creator", "")),
                "producer": str(metadata.get("/Producer", "")),
                "creation_date": str(metadata.get("/CreationDate", "")),
                "modification_date": str(metadata.get("/ModDate", "")),
                "title": str(metadata.get("/Title", "")),
                "author": str(metadata.get("/Author", "")),
                "subject": str(metadata.get("/Subject", "")),
                "pdf_version": f"{pdf.pdf_version[0]}.{pdf.pdf_version[1]}",
                "page_count": len(pdf.pages),
                "is_encrypted": pdf.is_encrypted,
                "file_size_bytes": pdf_path.stat().st_size,
            }

            pdf.close()
            return result
        except Exception as e:
            LOGGER.error(f"Error extracting metadata: {e}")
            return {"error": str(e)}

    def _calculate_risk_score(self, findings: list[VerificationFinding]) -> int:
        """Calculate overall risk score (0-100) based on findings."""
        score = 0
        for finding in findings:
            if finding.status == "FAIL":
                score += self.SEVERITY_WEIGHTS.get(finding.severity, 0)

        # Cap at 100
        return min(score, 100)

    def _determine_verdict(self, risk_score: int) -> str:
        """Determine overall verdict based on risk score."""
        if risk_score <= 30:
            return "verified"  # Green - authentic
        elif risk_score <= 60:
            return "suspicious"  # Yellow - needs review
        else:
            return "fraudulent"  # Red - clear tampering

    async def get_job(self, job_id: uuid.UUID) -> dict[str, Any] | None:
        """Get job details."""
        async with self._session_factory() as session:
            repo = PdfVerificationJobRepository(session)
            job = await repo.get(job_id)
            return job.as_dict() if job else None

    async def list_jobs(self, limit: int | None = None) -> list[dict[str, Any]]:
        """List all verification jobs."""
        async with self._session_factory() as session:
            repo = PdfVerificationJobRepository(session)
            jobs = await repo.list_jobs(limit=limit)
            return [job.as_dict() for job in jobs]
