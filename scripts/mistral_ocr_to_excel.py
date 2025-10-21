#!/usr/bin/env python3
from __future__ import annotations

"""
Utility script to run the Mistral OCR pipeline on large PDFs while respecting the
30 MB request limit, normalise the markdown tables, and export the results to Excel/CSV.
"""

import argparse
import asyncio
import json
import logging
import os
import re
import sys
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Iterable, Iterator, Sequence, Tuple

import pandas as pd
from PyPDF2 import PdfReader, PdfWriter

# Ensure the project root is importable when running the script directly.
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from apps.domain.schemas.mistral import MistralOcrResponse
from apps.domain.services.mistral import MistralOcrOptions, MistralOcrService
from apps.infra.clients.mistral_vertex import MistralVertexClient

# Keep a 5 MB buffer below the documented 30 MB base64 limit to avoid boundary failures.
DEFAULT_REQUEST_LIMIT = 25 * 1024 * 1024

LOGGER = logging.getLogger("mistral_ocr_to_excel")

AMOUNT_DIRECTION_RE = re.compile(r"(-?\d[\d,]*(?:\.\d+)?)\s*\((Dr|Cr)\)", re.IGNORECASE)
COLUMN_NORMALISERS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"^s\.?\s*no", re.IGNORECASE), "S.No"),
    (re.compile(r"^serial\s*no", re.IGNORECASE), "S.No"),
    (re.compile(r"^tran.*date$", re.IGNORECASE), "Date"),
    (re.compile(r"^date$", re.IGNORECASE), "Date"),
    (re.compile(r"^transaction.*id$", re.IGNORECASE), "Transaction Id"),
    (re.compile(r"^(particulars|remarks|narration)$", re.IGNORECASE), "Remarks"),
    (re.compile(r"^amount", re.IGNORECASE), "Amount(Rs.)"),
    (re.compile(r"^balance", re.IGNORECASE), "Balance(Rs.)"),
]


def resolve_model_path() -> str:
    """Determine the Vertex model path from environment variables or app settings."""
    env_path = os.environ.get("MISTRAL_MODEL_PATH")
    if env_path:
        return env_path.removesuffix(":rawPredict")

    project = os.environ.get("MISTRAL_PROJECT_ID") or os.environ.get("CLAUDE_VERTEX_PROJECT_ID")
    if project:
        location = os.environ.get("MISTRAL_LOCATION") or os.environ.get("CLAUDE_VERTEX_LOCATION") or "us-central1"
        model = os.environ.get("MISTRAL_MODEL") or "mistral-ocr-2505"
        base_host = "https://aiplatform.googleapis.com" if location == "global" else f"https://{location}-aiplatform.googleapis.com"
        return (
            f"{base_host}/v1/projects/{project}/locations/{location}/"
            f"publishers/mistralai/models/{model}"
        )

    try:
        from apps.core.config import Settings  # imported lazily to avoid optional dependency issues
    except Exception as exc:  # pragma: no cover - best effort fallback for scripts
        raise RuntimeError(
            "Unable to resolve Mistral model path. "
            "Set MISTRAL_MODEL_PATH or MISTRAL_PROJECT_ID / CLAUDE_VERTEX_PROJECT_ID in your environment."
        ) from exc

    settings = Settings()
    return settings.mistral_model_path


@dataclass(frozen=True)
class PdfChunk:
    """In-memory representation of a PDF fragment ready for OCR."""

    pages: Sequence[int]
    payload: bytes


def _serialise_pages(pages: Sequence) -> bytes:
    """Write the provided PyPDF2 PageObjects to bytes."""
    buffer = BytesIO()
    writer = PdfWriter()
    for page in pages:
        writer.add_page(page)
    writer.write(buffer)
    return buffer.getvalue()


def _estimate_base64_size(raw_bytes: int) -> int:
    """Return the number of bytes required to represent `raw_bytes` as base64."""
    return 4 * ((raw_bytes + 2) // 3)


def split_pdf(path: Path, max_bytes: int = DEFAULT_REQUEST_LIMIT) -> Iterator[PdfChunk]:
    """
    Yield PDF fragments whose encoded size stays under the configured limit.

    Args:
        path: Source PDF path.
        max_bytes: Maximum base64-encoded payload size allowed by the OCR endpoint.
    """
    reader = PdfReader(str(path))
    total_pages = len(reader.pages)
    if total_pages == 0:
        raise ValueError(f"No pages detected in {path}")

    current_pages = []
    current_indices = []

    for page_idx in range(total_pages):
        page = reader.pages[page_idx]
        tentative_pages = [*current_pages, page]
        chunk_bytes = _serialise_pages(tentative_pages)

        if chunk_bytes and _estimate_base64_size(len(chunk_bytes)) > max_bytes and current_pages:
            payload = _serialise_pages(current_pages)
            yield PdfChunk(pages=tuple(current_indices), payload=payload)
            current_pages = [page]
            current_indices = [page_idx]
        else:
            current_pages = tentative_pages
            current_indices = [*current_indices, page_idx]

    if current_pages:
        payload = _serialise_pages(current_pages)
        if _estimate_base64_size(len(payload)) > max_bytes:
            raise ValueError(
                f"Single page exceeds request limit (base64 size { _estimate_base64_size(len(payload)) } bytes > {max_bytes} bytes). "
                "Recompress the PDF or rasterise to smaller chunks."
            )
        yield PdfChunk(pages=tuple(current_indices), payload=payload)


def _split_markdown_tables(markdown: str) -> Iterator[list[str]]:
    """Yield contiguous groups of markdown lines that look like tables."""
    lines = [line.rstrip() for line in markdown.splitlines()]
    current: list[str] = []

    for raw in lines:
        line = raw.rstrip()
        if line.startswith("|"):
            current.append(line)
        elif current:
            stripped = line.strip()
            if stripped:
                # Continuation of the previous row/cell due to markdown wrapping
                current[-1] = f"{current[-1]} {stripped}"
            else:
                yield current
                current = []
        # Ignore non-table lines when not inside a table
    if current:
        yield current


def _parse_table_lines(table_lines: Sequence[str]) -> pd.DataFrame | None:
    """Convert raw table lines into a DataFrame."""
    if len(table_lines) < 2:
        return None

    header_line = table_lines[0]
    separator_idx = 1 if len(table_lines) > 1 and set(table_lines[1]) <= {"|", ":", "-", " "} else None

    if separator_idx is not None:
        data_lines = table_lines[separator_idx + 1 :]
    else:
        data_lines = table_lines[1:]

    headers = [cell.strip().replace("<br>", " ").replace("  ", " ") for cell in header_line.strip("|").split("|")]
    rows: list[list[str]] = []

    for raw_line in data_lines:
        stripped = raw_line.strip()
        if not stripped or stripped.strip("|") == "":
            continue
        cells = [cell.strip().replace("<br>", " ").replace("  ", " ") for cell in raw_line.strip("|").split("|")]
        if len(cells) < len(headers):
            cells.extend([""] * (len(headers) - len(cells)))
        elif len(cells) > len(headers):
            cells = cells[: len(headers)]
        rows.append(cells)

    if not rows:
        return None

    return pd.DataFrame(rows, columns=headers)


def extract_transaction_tables(markdown: str) -> list[pd.DataFrame]:
    """Parse all markdown tables and return those that resemble transaction ledgers."""
    tables: list[pd.DataFrame] = []
    for lines in _split_markdown_tables(markdown):
        frame = _parse_table_lines(lines)
        if frame is None:
            continue
        frame = _standardise_headers(frame)
        for column in frame.columns:
            if pd.api.types.is_object_dtype(frame[column]):
                frame[column] = frame[column].astype(str).str.strip()
        cleaned_frame = frame.replace(r"^$", pd.NA, regex=True)
        headers = [str(col).strip().lower() for col in frame.columns]
        has_date = any("date" in header for header in headers)
        has_amount = any("amount" in header or "debit" in header or "credit" in header for header in headers)
        has_balance = any("balance" in header for header in headers)
        if not (has_date and (has_amount or has_balance)):
            continue
        if cleaned_frame.dropna(axis=0, how="all").empty:
            continue
        tables.append(cleaned_frame)
    return tables


def _standardise_headers(df: pd.DataFrame) -> pd.DataFrame:
    """Normalise column names using a set of fuzzy regex rules."""

    rename_map: dict[str, str] = {}
    used_names = set(df.columns)
    for column in df.columns:
        normalised = column.strip()
        for pattern, replacement in COLUMN_NORMALISERS:
            if pattern.search(normalised):
                # Avoid clobbering an existing column with same name unless it's the same column
                if replacement in used_names and replacement != column:
                    continue
                rename_map[column] = replacement
                used_names.add(replacement)
                break
    if rename_map:
        df = df.rename(columns=rename_map)
    return df


def _normalise_numbers(df: pd.DataFrame, columns: Iterable[str]) -> pd.DataFrame:
    """Attempt to convert currency columns into floats."""

    for column in columns:
        if column not in df.columns:
            continue
        if pd.api.types.is_numeric_dtype(df[column]):
            continue
        cleaned = (
            df[column]
            .astype(str)
            .str.replace(",", "", regex=False)
            .str.strip()
            .replace({"": None, "None": None})
        )
        df[column] = cleaned.map(_safe_float)
    return df


def _safe_float(value: str | None) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _parse_amount_with_direction(value: str | float | int | None) -> Tuple[float | None, str | None]:
    if value is None:
        return None, None
    if isinstance(value, (int, float)):
        return float(value), None
    text = str(value).strip()
    if not text:
        return None, None
    match = AMOUNT_DIRECTION_RE.search(text)
    if match:
        number, direction = match.groups()
        number = float(number.replace(",", ""))
        return number, direction.upper()
    # Fall back to numeric conversion without direction
    numeric = _safe_float(text.replace("(Cr)", "").replace("(Dr)", "").strip())
    return numeric, None


def _augment_transaction_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Add Debit, Credit, and numeric Balance columns if textual columns exist."""

    if "Amount(Rs.)" in df.columns and "Debit" not in df.columns and "Credit" not in df.columns:
        debits: list[float | None] = []
        credits: list[float | None] = []
        for value in df["Amount(Rs.)"]:
            amount, direction = _parse_amount_with_direction(value)
            if amount is None:
                debits.append(None)
                credits.append(None)
            elif direction == "DR":
                debits.append(amount)
                credits.append(None)
            elif direction == "CR":
                debits.append(None)
                credits.append(amount)
            else:
                debits.append(None)
                credits.append(amount)
        df.insert(len(df.columns), "Debit", debits)
        df.insert(len(df.columns), "Credit", credits)

    if "Balance(Rs.)" in df.columns and "Balance" not in df.columns:
        balances: list[float | None] = []
        for value in df["Balance(Rs.)"]:
            amount, direction = _parse_amount_with_direction(value)
            if amount is None:
                balances.append(None)
            elif direction == "DR":
                balances.append(-amount)
            else:  # treat CR or None as positive balance
                balances.append(amount)
        df.insert(len(df.columns), "Balance", balances)

    return df


async def run_ocr(pdf_path: Path, *, max_bytes: int) -> list[MistralOcrResponse]:
    """Chunk the PDF, invoke the OCR service for each fragment, and collect responses."""
    model_path = resolve_model_path()
    client = MistralVertexClient(model_path=model_path)
    service = MistralOcrService(client)

    responses: list[MistralOcrResponse] = []

    for chunk in split_pdf(pdf_path, max_bytes=max_bytes):
        raw_size_mb = len(chunk.payload) / (1024 * 1024)
        b64_size_mb = _estimate_base64_size(len(chunk.payload)) / (1024 * 1024)
        LOGGER.info(
            "Processing pages %s (chunk size: %.2f MB raw / %.2f MB base64)",
            chunk.pages,
            raw_size_mb,
            b64_size_mb,
        )
        response = await service.analyze(document=chunk.payload, options=MistralOcrOptions())
        responses.append(response)

    return responses


def load_responses_from_json(path: Path) -> list[MistralOcrResponse]:
    """Load pre-recorded raw response JSON dumps."""
    data = json.loads(path.read_text())
    body = data.get("response", {}).get("body")
    if not body:
        raise ValueError(f"No OCR body found in {path}")

    base64_size = data.get("request", {}).get("payload", {}).get("document", {}).get("document_url", "")
    base64_size = len(base64_size) if isinstance(base64_size, str) else 0

    return [
        MistralOcrResponse.from_vertex(body, base64_size=base64_size, page_cost_rate=0.1, size_cost_rate=0.05)
    ]


def collect_tables(responses: Sequence[MistralOcrResponse]) -> pd.DataFrame:
    """Extract tabular data from OCR responses and stitch into a single DataFrame."""
    tables: list[pd.DataFrame] = []

    for response in responses:
        for page in response.pages:
            page_tables = extract_transaction_tables(page.markdown)
            for df in page_tables:
                df.insert(0, "Page", page.index)
                df.insert(1, "Model", response.model or "mistral-ocr")
                df = _augment_transaction_columns(df)
                tables.append(df)

    tables = [df for df in tables if not df.empty and not df.dropna(axis=0, how="all").empty]

    if not tables:
        raise ValueError("No markdown tables detected in the OCR output.")

    combined = pd.concat(tables, ignore_index=True)
    numeric_columns = [col for col in ["Debit", "Credit", "Balance"] if col in combined.columns]
    combined = _normalise_numbers(combined, numeric_columns)
    return combined


def export_dataframe(df: pd.DataFrame, output: Path) -> None:
    """Persist the combined dataframe as Excel or CSV depending on the extension."""
    output.parent.mkdir(parents=True, exist_ok=True)

    if output.suffix.lower() == ".csv":
        df.to_csv(output, index=False)
    else:
        df.to_excel(output, index=False)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_path", type=Path, help="PDF to analyse or JSON file containing a recorded response.")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("mistral_ocr_output.xlsx"),
        help="Where to write the extracted table (default: %(default)s).",
    )
    parser.add_argument(
        "--max-bytes",
        type=int,
        default=DEFAULT_REQUEST_LIMIT,
        help="Maximum base64 payload size per OCR request in bytes (default: %(default)s).",
    )
    parser.add_argument(
        "--from-json",
        action="store_true",
        help="Treat input_path as a recorded raw response JSON instead of a PDF.",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=("DEBUG", "INFO", "WARNING", "ERROR"),
        help="Set the log verbosity (default: %(default)s).",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper()),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    input_path: Path = args.input_path.expanduser().resolve()
    if not input_path.exists():
        raise SystemExit(f"Input path not found: {input_path}")

    if args.from_json:
        responses = load_responses_from_json(input_path)
    else:
        responses = asyncio.run(run_ocr(input_path, max_bytes=args.max_bytes))

    df = collect_tables(responses)
    export_dataframe(df, args.output.resolve())
    LOGGER.info("Exported %d rows to %s", len(df), args.output)


if __name__ == "__main__":
    main()
