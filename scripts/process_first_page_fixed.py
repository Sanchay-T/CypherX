#!/usr/bin/env python3
"""
FINAL VERSION: Process first page with correct column mapping including Balance
"""
import asyncio
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from apps.domain.services.mistral import MistralOcrOptions, MistralOcrService
from apps.infra.clients.mistral_vertex import MistralVertexClient
from scripts.mistral_ocr_to_excel import resolve_model_path
from PyPDF2 import PdfReader, PdfWriter
import pandas as pd
from io import BytesIO


def extract_pages(pdf_path: str, start: int, end: int) -> bytes:
    """Extract page range"""
    reader = PdfReader(pdf_path)
    writer = PdfWriter()
    for i in range(start, end):
        writer.add_page(reader.pages[i])
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


async def process_first_page():
    pdf_path = Path("data/raw_statements/OpTransactionHistoryUX501-09-2025 (2) (2).pdf")

    print("Extracting first 2 pages (to get full table structure)...")
    pages_bytes = extract_pages(str(pdf_path), 0, 2)

    print("Running Mistral OCR...")
    model_path = resolve_model_path()
    client = MistralVertexClient(model_path=model_path)
    service = MistralOcrService(client)

    ocr_response = await service.analyze(document=pages_bytes, options=MistralOcrOptions())

    # Process page 2 which has the Balance column
    print(f"\nProcessing page 2 (has Balance column)...")
    page2_markdown = ocr_response.pages[1].markdown

    # Parse table from page 2
    lines = [l for l in page2_markdown.split('\n') if l.strip().startswith('|')]

    if not lines:
        print("❌ No table found")
        return

    # First line is data (no header on continuation pages)
    # Structure: Trans Date | Value Date | Narration | Withdrawal | Deposit | Balance

    # Define correct column names based on actual PDF structure
    headers = ["Transaction Date", "Value Date", "Narration", "Chq/Ref Number", "Withdrawal", "Deposit", "Balance"]

    print(f"Column headers: {headers}")

    rows = []
    for line in lines:
        if not line.strip() or set(line.replace('|', '').replace('-', '').replace(':', '').strip()) == set():
            continue

        cells = [c.strip() for c in line.strip('|').split('|')]

        # Page 2 has 6 cells (no Chq/Ref column in data)
        # Map to 7 columns by inserting empty Chq column
        if len(cells) == 6:
            # Insert empty chq number column after narration
            cells = cells[:3] + [''] + cells[3:]

        while len(cells) < len(headers):
            cells.append('')
        if len(cells) > len(headers):
            cells = cells[:len(headers)]

        rows.append(cells)

    df = pd.DataFrame(rows, columns=headers)

    print(f"\n✅ Extracted {len(df)} rows, {len(df.columns)} columns")
    print(f"Columns: {list(df.columns)}")
    print(f"\nFirst 5 rows:")
    print(df.head(5).to_string())

    # Save CSV
    export_path = Path("data/processed_exports/first_page_final.csv")
    export_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(export_path, index=False)
    print(f"\n💾 Saved to {export_path}")

    # Verify all columns present
    expected_cols = ["Transaction Date", "Value Date", "Narration", "Chq/Ref Number", "Withdrawal", "Deposit", "Balance"]
    missing = set(expected_cols) - set(df.columns)
    if missing:
        print(f"\n⚠️ Missing columns: {missing}")
    else:
        print(f"\n✅ All 7 columns present!")

    return df


if __name__ == "__main__":
    asyncio.run(process_first_page())
