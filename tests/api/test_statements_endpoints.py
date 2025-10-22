import asyncio
from pathlib import Path

import pytest

SAMPLES_DIR = Path(__file__).resolve().parents[2] / "public" / "samples"
AXIS_PDF = SAMPLES_DIR / "axis.pdf"


@pytest.mark.anyio
async def test_mistral_ocr_endpoint_is_alive(api_client):
    response = await api_client.post(
        "/ai/mistral/ocr",
        files={"file": ("axis.pdf", AXIS_PDF.read_bytes(), "application/pdf")},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["usage"]["pages_processed"] >= 1
    assert payload["aggregated_markdown"]


@pytest.mark.anyio
async def test_full_statement_pipeline_flow(api_client):
    create = await api_client.post(
        "/ai/statements/normalize",
        files={"file": ("axis.pdf", AXIS_PDF.read_bytes(), "application/pdf")},
        data={"bank_name": "AXIS", "financial_year": "2022-2023"},
    )
    assert create.status_code == 200
    job_id = create.json()["job_id"]

    for _ in range(60):
        status_resp = await api_client.get(f"/ai/statements/{job_id}")
        assert status_resp.status_code == 200
        status_payload = status_resp.json()
        if status_payload["status"] == "completed":
            break
        await asyncio.sleep(1.5)
    else:
        pytest.fail("Statement job did not complete in time")

    result = status_payload["result"]
    assert result["excel"]["download_token"]
    assert result["report"]["pdf_path"]

    token = result["excel"]["download_token"]
    excel_resp = await api_client.get(f"/ai/statements/{job_id}/excel", params={"token": token})
    assert excel_resp.status_code == 200
    assert excel_resp.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument"
    )


@pytest.mark.anyio
async def test_legacy_only_endpoint(api_client):
    response = await api_client.post(
        "/ai/statements/legacy-normalize",
        files={"file": ("axis.pdf", AXIS_PDF.read_bytes(), "application/pdf")},
        data={
            "bank_name": "AXIS",
            "start_date": "01-04-2022",
            "end_date": "31-03-2023",
        },
    )

    assert response.status_code == 200
    export_path = Path(response.headers["x-legacy-export-path"])
    assert export_path.exists()
