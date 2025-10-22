#!/usr/bin/env python3
"""
FINAL: Process entire 118-page PDF with correct 7-column mapping
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
    for i in range(start, min(end, len(reader.pages))):
        writer.add_page(reader.pages[i])
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def parse_table_from_markdown(markdown: str, page_num: int) -> pd.DataFrame:
    """Parse table with correct 7-column structure"""
    lines = [l for l in markdown.split('\n') if l.strip().startswith('|')]

    if not lines:
        return pd.DataFrame()

    # Correct column names based on bank statement structure
    headers = ["Transaction Date", "Value Date", "Narration", "Chq/Ref Number", "Withdrawal", "Deposit", "Balance"]

    rows = []
    for line in lines:
        # Skip separator lines
        if set(line.replace('|', '').replace('-', '').replace(':', '').strip()) == set():
            continue

        cells = [c.strip() for c in line.strip('|').split('|')]

        # Mistral gives us 6 data columns (missing Chq/Ref Number in most cases)
        # Insert empty Chq/Ref Number column after Narration
        if len(cells) == 6:
            cells = cells[:3] + [''] + cells[3:]

        # Ensure correct number of columns
        while len(cells) < len(headers):
            cells.append('')
        if len(cells) > len(headers):
            cells = cells[:len(headers)]

        rows.append(cells)

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows, columns=headers)
    df.insert(0, 'Page', page_num)

    return df


async def process_full_pdf():
    pdf_path = Path("data/raw_statements/OpTransactionHistoryUX501-09-2025 (2) (2).pdf")

    print("=" * 80)
    print("PROCESSING FULL 118-PAGE BANK STATEMENT")
    print("=" * 80)

    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    print(f"\nTotal pages: {total_pages}")

    # Process in chunks of 25 pages (Mistral limit is 30)
    chunk_size = 25
    all_tables = []

    model_path = resolve_model_path()
    client = MistralVertexClient(model_path=model_path)
    service = MistralOcrService(client)

    for start_page in range(0, total_pages, chunk_size):
        end_page = min(start_page + chunk_size, total_pages)
        print(f"\n🔄 Processing pages {start_page + 1}-{end_page}...")

        # Extract chunk
        chunk_bytes = extract_pages(str(pdf_path), start_page, end_page)
        print(f"   Chunk size: {len(chunk_bytes) / 1024 / 1024:.2f} MB")

        # Run OCR
        print(f"   Running Mistral OCR...")
        ocr_response = await service.analyze(document=chunk_bytes, options=MistralOcrOptions())
        print(f"   OCR complete: {len(ocr_response.pages)} pages processed")

        # Extract tables from each page
        chunk_transactions = 0
        for page_idx, page in enumerate(ocr_response.pages):
            actual_page_num = start_page + page_idx + 1
            df = parse_table_from_markdown(page.markdown, actual_page_num)

            if not df.empty:
                all_tables.append(df)
                chunk_transactions += len(df)

        print(f"   ✅ Extracted {chunk_transactions} transactions from this chunk")

    if not all_tables:
        print("\n❌ No transactions found in PDF!")
        return

    # Combine all tables
    print(f"\n📊 Combining {len(all_tables)} tables...")
    combined_df = pd.concat(all_tables, ignore_index=True)

    print(f"\n✅ EXTRACTION COMPLETE!")
    print(f"   Total transactions: {len(combined_df)}")
    print(f"   Pages processed: {combined_df['Page'].nunique()}")
    print(f"   Columns: {list(combined_df.columns)}")

    # Verify all 7 columns present
    expected_cols = ["Transaction Date", "Value Date", "Narration", "Chq/Ref Number", "Withdrawal", "Deposit", "Balance"]
    missing = set(expected_cols) - set(combined_df.columns)
    if missing:
        print(f"\n⚠️ Missing columns: {missing}")
    else:
        print(f"   ✅ All 7 required columns present!")

    # Save CSV
    output_path = Path("data/processed_exports/full_statement_complete.csv")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    combined_df.to_csv(output_path, index=False)
    print(f"\n💾 Saved to {output_path}")

    # Show sample
    print(f"\nFirst 5 transactions:")
    print(combined_df.head(5).to_string())

    print("\n" + "=" * 80)
    print("🎉 COMPLETE!")
    print("=" * 80)

    return combined_df


if __name__ == "__main__":
    asyncio.run(process_full_pdf())
