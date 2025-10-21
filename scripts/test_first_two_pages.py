#!/usr/bin/env python3
"""
Test: Extract first 2 pages together to see full table structure
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
from io import BytesIO


def extract_pages(pdf_path: str, start: int, end: int) -> bytes:
    """Extract pages"""
    reader = PdfReader(pdf_path)
    writer = PdfWriter()
    for i in range(start, end):
        writer.add_page(reader.pages[i])

    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


async def check_structure():
    pdf_path = "/Users/sanchay/Documents/projects/cyphersol/CypherX/OpTransactionHistoryUX501-09-2025 (2) (2).pdf"

    print("Extracting pages 1-2...")
    pages_bytes = extract_pages(pdf_path, 0, 2)

    print("Running Mistral OCR...")
    model_path = resolve_model_path()
    client = MistralVertexClient(model_path=model_path)
    service = MistralOcrService(client)

    ocr_response = await service.analyze(document=pages_bytes, options=MistralOcrOptions())

    print(f"\n=== PAGE 1 ===")
    print(ocr_response.pages[0].markdown[:500])

    print(f"\n\n=== PAGE 2 ===")
    print(ocr_response.pages[1].markdown)

    # Count columns in page 2
    lines = ocr_response.pages[1].markdown.split('\n')
    table_lines = [l for l in lines if l.strip().startswith('|')]
    if table_lines:
        print(f"\n\nPage 2 first table line:")
        print(table_lines[0])
        cells = [c.strip() for c in table_lines[0].strip('|').split('|')]
        print(f"Number of cells: {len(cells)}")
        print(f"Cells: {cells}")


if __name__ == "__main__":
    asyncio.run(check_structure())
