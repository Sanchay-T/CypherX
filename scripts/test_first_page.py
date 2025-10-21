#!/usr/bin/env python3
"""
Simple script: Extract FIRST PAGE ONLY, run OCR, parse to CSV
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


def extract_first_page(pdf_path: str) -> bytes:
    """Extract ONLY first page"""
    reader = PdfReader(pdf_path)
    writer = PdfWriter()
    writer.add_page(reader.pages[0])

    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


async def run_ocr_first_page(pdf_path: str):
    """Run OCR on first page and save markdown"""
    print("Extracting first page...")
    first_page_bytes = extract_first_page(pdf_path)
    print(f"First page: {len(first_page_bytes)} bytes")

    print("\nRunning Mistral OCR...")
    model_path = resolve_model_path()
    client = MistralVertexClient(model_path=model_path)
    service = MistralOcrService(client)

    ocr_response = await service.analyze(document=first_page_bytes, options=MistralOcrOptions())

    markdown = ocr_response.pages[0].markdown
    print(f"OCR complete: {len(markdown)} characters")

    # Save markdown
    Path("tmp/page1_raw_markdown.txt").write_text(markdown)
    print("\n=== RAW MARKDOWN FROM MISTRAL ===")
    print(markdown)
    print("\n=== END MARKDOWN ===")

    # Now parse it
    print("\n\nParsing table...")
    df = parse_table_from_markdown(markdown)

    if not df.empty:
        print(f"\n✅ Extracted {len(df)} rows, {len(df.columns)} columns")
        print(f"Columns: {list(df.columns)}")
        print(f"\nFirst 3 rows:")
        print(df.head(3).to_string())

        # Save CSV
        df.to_csv("tmp/page1_output.csv", index=False)
        print(f"\n💾 Saved to tmp/page1_output.csv")
    else:
        print("❌ No table extracted")


def parse_table_from_markdown(markdown: str) -> pd.DataFrame:
    """Parse the table from markdown - use actual structure we see"""
    lines = markdown.strip().split('\n')

    # Find all table lines (lines with |)
    table_lines = []
    for line in lines:
        if '|' in line and line.strip().startswith('|'):
            table_lines.append(line)

    if not table_lines:
        return pd.DataFrame()

    print(f"\nFound {len(table_lines)} table lines")

    # Find the header row - the one with DATE, WITHDRAWAL, DEPOSIT keywords
    header_idx = None
    for i, line in enumerate(table_lines):
        lower = line.lower()
        if 'date' in lower and ('withdrawal' in lower or 'deposit' in lower):
            header_idx = i
            print(f"Header found at line {i}: {line}")
            break

    if header_idx is None:
        print("No header found")
        return pd.DataFrame()

    # Parse header
    header_line = table_lines[header_idx]
    headers = [cell.strip() for cell in header_line.strip('|').split('|')]
    print(f"Headers: {headers}")
    print(f"Number of header columns: {len(headers)}")

    # Skip separator line if exists
    data_start = header_idx + 1
    if data_start < len(table_lines):
        if set(table_lines[data_start].replace('|', '').replace('-', '').replace(':', '').strip()) == set():
            data_start += 1

    # Parse data rows
    rows = []
    for line in table_lines[data_start:]:
        # Skip empty or separator lines
        if not line.strip() or set(line.replace('|', '').replace('-', '').replace(':', '').strip()) == set():
            continue

        cells = [cell.strip() for cell in line.strip('|').split('|')]

        # Ensure same number of columns as headers
        while len(cells) < len(headers):
            cells.append('')
        if len(cells) > len(headers):
            cells = cells[:len(headers)]

        rows.append(cells)

    print(f"Parsed {len(rows)} data rows")

    if rows:
        print(f"First data row has {len(rows[0])} columns")
        print(f"First row: {rows[0]}")

    return pd.DataFrame(rows, columns=headers)


if __name__ == "__main__":
    pdf_path = "/Users/sanchay/Documents/projects/cyphersol/CypherX/OpTransactionHistoryUX501-09-2025 (2) (2).pdf"
    asyncio.run(run_ocr_first_page(pdf_path))
