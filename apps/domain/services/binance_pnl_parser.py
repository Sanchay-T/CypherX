"""Parser for Binance P2P Profit & Loss statements."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

import pandas as pd
import pdfplumber


@dataclass
class BinancePnlStatement:
    """Structured representation of a Binance P2P P&L statement."""

    header: dict[str, str]
    table: pd.DataFrame

    def to_csv(self, output_path: Path) -> None:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        self.table.to_csv(output_path, index=False)


def parse_binance_pnl_statement(pdf_path: Path) -> BinancePnlStatement:
    """Parse a Binance P2P P&L PDF into header metadata and a table."""

    with pdfplumber.open(pdf_path) as pdf_reader:
        if not pdf_reader.pages:
            raise ValueError(f"No pages found in PDF: {pdf_path}")

        page = pdf_reader.pages[0]
        words = page.extract_words(x_tolerance=1, y_tolerance=1, keep_blank_chars=False)
        page_text = page.extract_text() or ""

    header = _extract_header(page_text)
    table = _parse_table(words)

    return BinancePnlStatement(header=header, table=table)


def _extract_header(page_text: str) -> dict[str, str]:
    header_map = {
        "name": "",
        "address": "",
        "user_id": "",
        "email": "",
        "period": "",
    }

    for raw_line in page_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if "Name:" in line:
            name_part, _, remainder = line.partition("Address:")
            header_map["name"] = name_part.replace("Name:", "", 1).strip()
            header_map["address"] = remainder.strip()
            continue

        if line.startswith("Address:"):
            header_map["address"] = line.replace("Address:", "", 1).strip()
            continue

        if "User ID:" in line:
            user_part, sep, period_part = line.partition("Period (UTC+0):")
            header_map["user_id"] = user_part.replace("User ID:", "", 1).strip()
            if sep:
                header_map["period"] = period_part.strip()
            continue

        if line.startswith("Email:"):
            header_map["email"] = line.replace("Email:", "", 1).strip()
            continue

        if line.startswith("Period (UTC+0):"):
            header_map["period"] = line.replace("Period (UTC+0):", "", 1).strip()

    return header_map


def _parse_table(words: Sequence[dict[str, float | str]]) -> pd.DataFrame:
    col_centers = [
        115.2,
        180.7,
        245.1,
        331.2,
        392.6,
        452.8,
        515.4,
        588.5,
        635.4,
        682.5,
        729.6,
        776.7,
    ]
    col_names = [
        "Crypto Token",
        "Fiat Currency",
        "Buy Orders",
        "Total Buy Quantity",
        "Total Buy Amount",
        "Buy Transaction Fee",
        "Sell Orders",
        "Total Sell Quantity",
        "Total Sell Amount",
        "Sell Transaction Fee",
        "Total Transaction Fee",
        "PnL",
    ]
    period_col = "Period"

    def _nearest_column(center: float) -> str:
        idx = min(range(len(col_centers)), key=lambda i: abs(col_centers[i] - center))
        return col_names[idx]

    data_rows: dict[float, list[dict[str, float | str]]] = {}
    period_tokens: list[dict[str, float | str]] = []

    for w in words:
        if w["top"] < 230:
            continue
        if w["x0"] <= 90:
            period_tokens.append(w)
            continue
        key = round(w["top"], 1)
        data_rows.setdefault(key, []).append(w)

    if not data_rows:
        return pd.DataFrame(columns=[period_col] + col_names)

    rows: list[dict[str, str]] = []

    for key in sorted(data_rows):
        row = {name: "" for name in col_names}

        tokens = sorted(data_rows[key], key=lambda item: item["x0"])
        for token in tokens:
            center = (token["x0"] + token["x1"]) / 2
            column = _nearest_column(center)
            row[column] = (row[column] + " " + token["text"]).strip()

        period_candidates = [
            token
            for token in period_tokens
            if abs(token["top"] - key) <= 4.0
        ]
        if period_candidates:
            period_text = " ".join(
                t["text"] for t in sorted(period_candidates, key=lambda item: item["x0"])
            )
            period_text = period_text.replace(" ", "")
            if period_text.endswith("-"):
                period_text = period_text[:-1]
            row[period_col] = period_text
        else:
            row[period_col] = ""

        rows.append(row)

    for row in rows:
        if not row[period_col] and row["Crypto Token"]:
            row[period_col] = row["Crypto Token"]

    columns = [period_col] + col_names
    df = pd.DataFrame(rows, columns=columns)
    return df
