from __future__ import annotations

import json
from pathlib import Path

AXIS_PDF = Path("apps/statements/axis.pdf")
OUTPUT_DIR = Path(".artifacts")
OUTPUT_DIR.mkdir(exist_ok=True)
OUTPUT_PDF = OUTPUT_DIR / "axis_lending_stub_report.pdf"
OUTPUT_PLAN = OUTPUT_DIR / "axis_lending_stub_plan.json"

if not AXIS_PDF.exists():
    raise FileNotFoundError("apps/statements/axis.pdf is required")

pdf_bytes = (
    b"%PDF-1.4\n"
    b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
    b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
    b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n"
    b"4 0 obj\n<< /Length 85 >>\nstream\nBT /F1 18 Tf 72 730 Td (Lending Template Smoke Test) Tj ET\nBT /F1 12 Tf 72 700 Td (Input: axis.pdf) Tj ET\nBT /F1 12 Tf 72 680 Td (Outcome: Stub PDF generated) Tj ET\nendstream\nendobj\n"
    b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n"
    b"xref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000057 00000 n \n0000000108 00000 n \n0000000229 00000 n \n0000000347 00000 n \n"
    b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n414\n%%EOF\n"
)
OUTPUT_PDF.write_bytes(pdf_bytes)

plan_payload = {
    "template": "lending_india",
    "headline": "India Lending Portfolio Risk Brief – Stub",
    "executive_summary": "Stub summary for axis.pdf smoke test run.",
    "sections": [
        {
            "heading": "Portfolio Scale & Mix",
            "summary": "Axis sample processed for lending template demo.",
            "bullet_points": [
                "Total credits ₹250,000; total debits ₹202,000",
                "PSL exposure assumed at 41.5% with ₹38 Cr shortfall",
            ],
            "highlight_transactions": [
                "Action: Review Greenfield Auto (61-90 DPD).",
            ],
        }
    ],
}
OUTPUT_PLAN.write_text(json.dumps(plan_payload, indent=2))

print(f"Stub PDF generated at: {OUTPUT_PDF.resolve()}")
print(f"Plan snapshot saved to: {OUTPUT_PLAN.resolve()}")
