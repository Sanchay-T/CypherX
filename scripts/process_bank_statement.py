#!/usr/bin/env python3
"""
Bank Statement OCR to CSV Processor
Iteratively processes first page until perfect, then processes entire PDF
"""

import asyncio
import csv
import io
import re
import sys
from pathlib import Path

# Add project root to path
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from apps.domain.services.mistral import MistralOcrOptions, MistralOcrService
from apps.infra.clients.mistral_vertex import MistralVertexClient
from scripts.mistral_ocr_to_excel import (
    extract_transaction_tables,
    resolve_model_path,
    _augment_transaction_columns
)
import pandas as pd
from PyPDF2 import PdfReader, PdfWriter


def extract_page_chunk(pdf_path: str, start_page: int, end_page: int) -> bytes:
    """Extract a range of pages from the PDF (0-indexed)"""
    pdf_reader = PdfReader(pdf_path)
    pdf_writer = PdfWriter()

    for page_idx in range(start_page, min(end_page, len(pdf_reader.pages))):
        pdf_writer.add_page(pdf_reader.pages[page_idx])

    # Write to bytes
    output = io.BytesIO()
    pdf_writer.write(output)
    output.seek(0)

    return output.read()


async def call_mistral_ocr_direct(pdf_bytes: bytes) -> dict:
    """
    Call Mistral OCR service directly (not via HTTP endpoint)

    Args:
        pdf_bytes: PDF file content as bytes

    Returns:
        MistralOcrResponse object
    """
    model_path = resolve_model_path()
    client = MistralVertexClient(model_path=model_path)
    service = MistralOcrService(client)

    response = await service.analyze(document=pdf_bytes, options=MistralOcrOptions())
    return response


def parse_bank_statement_table(markdown: str) -> pd.DataFrame:
    """
    Custom parser for bank statement tables that may have header issues
    """
    lines = [line.rstrip() for line in markdown.splitlines() if line.strip().startswith("|")]

    if not lines:
        return pd.DataFrame()

    # Find the header row - look for row with "DATE" keywords
    header_idx = None
    for i, line in enumerate(lines):
        lower_line = line.lower()
        if "date" in lower_line and ("withdrawal" in lower_line or "deposit" in lower_line or "debit" in lower_line or "credit" in lower_line):
            header_idx = i
            break

    if header_idx is None:
        return pd.DataFrame()

    # Skip separator line if present
    data_start_idx = header_idx + 1
    if data_start_idx < len(lines) and set(lines[data_start_idx].strip()) <= {"|", ":", "-", " "}:
        data_start_idx += 1

    # Parse header
    header_line = lines[header_idx]
    headers = [cell.strip() for cell in header_line.strip("|").split("|")]

    # Parse data rows
    rows = []
    for line in lines[data_start_idx:]:
        if not line.strip() or set(line.strip()) <= {"|", ":", "-", " "}:
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        # Pad or trim to match header length
        if len(cells) < len(headers):
            cells.extend([""] * (len(headers) - len(cells)))
        elif len(cells) > len(headers):
            cells = cells[:len(headers)]
        rows.append(cells)

    if not rows:
        return pd.DataFrame()

    return pd.DataFrame(rows, columns=headers)


async def process_first_page(pdf_path: str) -> tuple[pd.DataFrame, str]:
    """
    Process only the first page and return dataframe and debug info

    Returns:
        tuple of (dataframe, debug_info)
    """
    print(f"📄 Loading PDF: {pdf_path}")

    # Extract just the first page
    print(f"   Extracting first page...")
    first_page_bytes = extract_page_chunk(pdf_path, 0, 1)

    print(f"✅ First page extracted ({len(first_page_bytes)} bytes)")

    # Call Mistral OCR
    print(f"\n🤖 Calling Mistral OCR (first page only)...")
    ocr_response = await call_mistral_ocr_direct(first_page_bytes)

    # Extract markdown
    if not ocr_response.pages:
        raise ValueError("No pages in OCR response")

    print(f"   📄 Received {len(ocr_response.pages)} page(s)")
    print(f"   📝 Markdown length: {len(ocr_response.pages[0].markdown)} characters")

    print(f"✅ OCR completed")
    print(f"   Pages processed: {ocr_response.usage.pages_processed}")
    print(f"   Model: {ocr_response.model}")

    # Extract tables using custom logic to handle this specific bank format
    print(f"\n📊 Extracting transaction tables...")
    markdown = ocr_response.pages[0].markdown

    # First try the standard extraction
    tables = extract_transaction_tables(markdown)

    if not tables:
        # Try manual extraction for this specific format
        print(f"   Standard extraction failed, trying manual parsing...")
        df = parse_bank_statement_table(markdown)
        if df.empty:
            print(f"⚠️ No tables found on first page")
            return pd.DataFrame(), f"No tables found\n\nMarkdown:\n{markdown}"
        tables = [df]

    print(f"   Found {len(tables)} table(s)")

    # Use the first table
    df = tables[0]
    df = _augment_transaction_columns(df)

    print(f"   Table has {len(df)} rows and {len(df.columns)} columns")
    print(f"   Columns: {list(df.columns)}")

    # Create debug info
    debug_info = f"""
=== FIRST PAGE OCR RESULTS ===
Model: {ocr_response.model}
Pages processed: {ocr_response.usage.pages_processed}

=== MARKDOWN ===
{markdown}

=== EXTRACTED TABLE ===
Rows: {len(df)}
Columns: {list(df.columns)}

{df.to_string()}
"""

    return df, debug_info


async def process_entire_pdf(pdf_path: str) -> pd.DataFrame:
    """
    Process entire PDF in chunks of 25 pages to respect Mistral's 30-page limit

    Returns:
        Combined dataframe with all transactions
    """
    print(f"\n📄 Processing ENTIRE PDF: {pdf_path}")

    # Get total page count
    reader = PdfReader(pdf_path)
    total_pages = len(reader.pages)
    print(f"   Total pages: {total_pages}")

    # Process in chunks of 25 pages
    chunk_size = 25
    all_tables = []

    model_path = resolve_model_path()
    client = MistralVertexClient(model_path=model_path)
    service = MistralOcrService(client)

    for start_page in range(0, total_pages, chunk_size):
        end_page = min(start_page + chunk_size, total_pages)
        print(f"\n🔄 Processing pages {start_page + 1}-{end_page}...")

        # Extract chunk
        chunk_bytes = extract_page_chunk(pdf_path, start_page, end_page)
        print(f"   Chunk size: {len(chunk_bytes) / 1024 / 1024:.2f} MB")

        # OCR the chunk
        ocr_response = await service.analyze(document=chunk_bytes, options=MistralOcrOptions())

        # Extract tables from all pages in this chunk
        chunk_tables_count = 0
        for page_idx, page in enumerate(ocr_response.pages):
            # Try standard extraction first
            page_tables = extract_transaction_tables(page.markdown)

            # If that fails, use custom parser
            if not page_tables:
                custom_table = parse_bank_statement_table(page.markdown)
                if not custom_table.empty:
                    page_tables = [custom_table]

            for table in page_tables:
                table.insert(0, "Page", start_page + page_idx + 1)
                table = _augment_transaction_columns(table)
                all_tables.append(table)
                chunk_tables_count += 1

        print(f"   ✅ Extracted {chunk_tables_count} table(s) from this chunk")

    if not all_tables:
        raise ValueError("No transaction tables found in PDF")

    # Combine all tables
    print(f"\n📊 Combining {len(all_tables)} tables...")
    combined_df = pd.concat(all_tables, ignore_index=True)
    print(f"   Total rows: {len(combined_df)}")
    print(f"   Columns: {list(combined_df.columns)}")

    return combined_df


async def main():
    """Main execution"""
    pdf_path = "/Users/sanchay/Documents/projects/cyphersol/CypherX/OpTransactionHistoryUX501-09-2025 (2) (2).pdf"

    # Verify PDF exists
    if not Path(pdf_path).exists():
        print(f"❌ PDF not found: {pdf_path}")
        return

    print("=" * 80)
    print("BANK STATEMENT OCR TO CSV PROCESSOR")
    print("=" * 80)
    print(f"\nTarget PDF: {pdf_path}")
    print("\n" + "=" * 80)
    print("PHASE 1: FIRST PAGE PROCESSING (ITERATION MODE)")
    print("=" * 80)

    # Process first page
    df, debug_info = await process_first_page(pdf_path)

    # Save outputs
    output_dir = Path("/Users/sanchay/Documents/projects/cyphersol/CypherX/tmp")
    output_dir.mkdir(exist_ok=True)

    csv_file = output_dir / "first_page_output.csv"
    debug_file = output_dir / "first_page_debug.txt"

    df.to_csv(csv_file, index=False)
    debug_file.write_text(debug_info)

    print(f"\n💾 Output files saved:")
    print(f"   CSV: {csv_file}")
    print(f"   Debug: {debug_file}")

    print("\n" + "=" * 80)
    print("✅ FIRST PAGE PROCESSING COMPLETE")
    print("=" * 80)
    print(f"\n✅ First page extraction successful with {len(df)} transactions!")
    print(f"   Columns: {list(df.columns)}")

    # Process entire PDF
    print("\n" + "=" * 80)
    print("PHASE 2: PROCESSING ENTIRE PDF (118 pages)")
    print("=" * 80)
    full_df = await process_entire_pdf(pdf_path)
    full_csv_file = output_dir / "full_statement_output.csv"
    full_df.to_csv(full_csv_file, index=False)
    print(f"\n💾 Full CSV saved: {full_csv_file}")
    print(f"   Total transactions: {len(full_df)}")
    print(f"   Total pages processed: {full_df['Page'].nunique() if 'Page' in full_df.columns else 'N/A'}")

    print("\n" + "=" * 80)
    print("🎉 COMPLETE! All transactions extracted to CSV")
    print("=" * 80)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
