#!/usr/bin/env python
"""Parse Mistral OCR markdown tables into transaction CSV output.

This script expects the OCR response JSON emitted by the `/ai/mistral/ocr`
endpoint. It extracts the per-page markdown tables, normalises each transaction,
computes missing running balances, and writes a CSV with the required columns:

    Transaction Date, Value Date, Narration, Check Number,
    Withdrawal, Deposit, Balance

Usage:
    python scripts/parse_mistral_statement.py \
        --input data/ocr_exports/ocr_first_two_pages.json \
        --output data/processed_exports/transactions_first_two_pages.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Iterable, List, Optional

# Precompiled patterns for performance and clarity.
DATE_PATTERN = re.compile(r"\d{2}/\d{2}/\d{4}")
AMOUNT_PATTERN = re.compile(r"-?\d[\d,]*\.?\d*")


@dataclass
class TransactionRow:
    """Structured representation of a single table row."""

    transaction_date: str
    value_date: str
    narration: str
    check_number: str
    withdrawal: Decimal
    deposit: Decimal
    balance: Optional[Decimal]
    balance_source: str  # 'ocr' or 'computed'


def has_balance_marker(text: str) -> bool:
    """Return True if the string ends with a credit/debit marker."""
    if not text:
        return False
    upper = text.upper()
    return "CR" in upper or "DR" in upper


def looks_like_amount(text: str) -> bool:
    """Return True if the string is likely an amount."""
    text = text.strip()
    if not text or text in {"-", "--"}:
        return False
    cleaned = text.replace(",", "")
    return bool(re.fullmatch(r"-?\d+(?:\.\d+)?", cleaned))


def parse_decimal(text: str | None) -> Optional[Decimal]:
    """Parse a decimal value from a string, ignoring stray characters."""
    if text is None:
        return None
    stripped = text.strip()
    if not stripped or stripped in {"-", "--"}:
        return None
    match = AMOUNT_PATTERN.search(stripped.replace(",", ""))
    if not match:
        return None
    return Decimal(match.group())


def parse_balance(text: str | None) -> Optional[Decimal]:
    """Parse a balance value, respecting Cr/Dr suffixes if present."""
    if text is None:
        return None
    stripped = text.strip()
    if not stripped:
        return None
    lowered = stripped.lower()
    sign = 1
    if lowered.endswith("cr"):
        stripped = stripped[:-2]
    elif lowered.endswith("dr"):
        stripped = stripped[:-2]
        sign = -1
    else:
        # No explicit credit/debit marker detected.
        return None
    value = parse_decimal(stripped)
    if value is None:
        return None
    return sign * value


def normalise_narration(text: str) -> str:
    """Collapse internal whitespace for narration consistency."""
    return " ".join(text.split())


def parse_markdown_rows(pages: Iterable[dict]) -> List[TransactionRow]:
    """Extract TransactionRow entries from page markdown."""

    transactions: List[TransactionRow] = []

    for page_index, page in enumerate(pages):
        markdown = page.get("markdown") or ""
        for raw_line in markdown.splitlines():
            line = raw_line.strip()
            if not line.startswith("|"):
                continue

            # Extract cell content, removing the leading and trailing separators.
            cells = [cell.strip() for cell in line.split("|")[1:-1]]
            if not cells:
                continue

            # Skip separator rows and headers.
            if all(set(cell) <= {"-", ":", ""} for cell in cells):
                continue
            if not DATE_PATTERN.match(cells[0]):
                continue
            if len(cells) < 6:
                continue

            transaction_date = cells[0]
            value_date = cells[1]
            narration = normalise_narration(cells[2])

            check_number = ""

            column_count = len(cells)
            if column_count >= 7:
                raw_check = cells[3]
                raw_withdrawal = cells[4]
                raw_deposit = cells[5]
                balance_str = cells[6]
            elif column_count == 6:
                raw_check = cells[3]
                raw_withdrawal = cells[3]
                raw_deposit = cells[4]
                balance_str = cells[5]
            elif column_count == 5:
                potential_balance = cells[4]
                if has_balance_marker(potential_balance):
                    balance_str = potential_balance
                    raw_check_candidate = cells[3]
                    sanitized_candidate = raw_check_candidate.replace(",", "").replace(" ", "")
                    if sanitized_candidate.isdigit() and "." not in sanitized_candidate:
                        raw_check = raw_check_candidate
                        raw_withdrawal = ""
                        raw_deposit = ""
                    else:
                        raw_check = ""
                        raw_withdrawal = raw_check_candidate
                        raw_deposit = ""
                else:
                    raw_check = cells[3]
                    raw_withdrawal = cells[4]
                    raw_deposit = ""
                    balance_str = ""
            else:
                continue

            sanitized_check = raw_check.replace(",", "").replace(" ", "")
            if not raw_check.strip():
                is_check_number = False
            elif sanitized_check.isdigit():
                is_check_number = True
            elif parse_decimal(raw_check) is None:
                is_check_number = True
            else:
                is_check_number = False

            narration_upper = narration.upper()

            if is_check_number:
                check_number = raw_check
                amount = parse_decimal(raw_deposit)
                if amount is None or amount == Decimal("0"):
                    amount = parse_decimal(raw_withdrawal) or Decimal("0")
                deposit_keywords = (
                    "DEP",
                    "DEPOSIT",
                    "RTGS",
                    "NEFT",
                    "CREDIT",
                    "PPF",
                    "FD INT",
                    "TD INT",
                    "RD INT",
                    "IMPS CR",
                )
                if any(keyword in narration_upper for keyword in deposit_keywords):
                    withdrawal_amount = Decimal("0")
                    deposit_amount = amount
                else:
                    withdrawal_amount = amount
                    deposit_amount = Decimal("0")
            else:
                withdrawal_amount = parse_decimal(raw_withdrawal) or Decimal("0")
                deposit_amount = parse_decimal(raw_deposit) or Decimal("0")

            balance_value = parse_balance(balance_str)

            if not is_check_number and deposit_amount and balance_value is not None and raw_deposit == balance_str:
                deposit_amount = Decimal("0")

            # Avoid double-counting when the balance column also carries deposit text.
            if (
                check_number
                and balance_value is not None
                and column_count >= 7
                and withdrawal_amount != Decimal("0")
                and deposit_amount != Decimal("0")
            ):
                deposit_amount = Decimal("0")

            if balance_value is None:
                # OCR occasionally misses the balance and leaves the last column
                # as a naked amount. Treat that as deposit if we have not already.
                if deposit_amount == Decimal("0"):
                    if not is_check_number:
                        deposit_amount = parse_decimal(balance_str) or Decimal("0")
                else:
                    if withdrawal_amount == Decimal("0") and not is_check_number:
                        withdrawal_amount = deposit_amount
                        deposit_amount = Decimal("0")

            transactions.append(
                TransactionRow(
                    transaction_date=transaction_date,
                    value_date=value_date,
                    narration=narration,
                    check_number=check_number,
                    withdrawal=withdrawal_amount,
                    deposit=deposit_amount,
                    balance=balance_value,
                    balance_source="ocr" if balance_value is not None else "missing",
                )
            )

    return transactions


def compute_running_balances(rows: List[TransactionRow]) -> None:
    """Fill in missing balances by iterating chronologically."""

    if not rows:
        return

    # The OCR output is typically newest-to-oldest; reverse for chronological order.
    chronological = list(reversed(rows))

    current_balance: Optional[Decimal] = None
    for row in chronological:
        if current_balance is None:
            if row.balance is None:
                raise ValueError(
                    "Unable to seed running balance: earliest row has no OCR balance."
                )
            current_balance = row.balance
        else:
            expected = (current_balance + row.deposit - row.withdrawal).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

            if row.balance is None:
                row.balance = expected
                row.balance_source = "computed"
            else:
                # Prefer the OCR-provided balance even if our running total diverges.
                expected = row.balance
            current_balance = row.balance

    # Restore original order (newest-first) while keeping computed balances.
    rows[:] = list(reversed(chronological))


def format_amount(value: Decimal) -> str:
    """Format Decimal values with two decimal places."""
    return f"{value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)}"


def write_csv(rows: Iterable[TransactionRow], output_path: Path) -> None:
    """Serialise rows to CSV with the required column order."""
    fields = [
        "Transaction Date",
        "Value Date",
        "Narration",
        "Check Number",
        "Withdrawal",
        "Deposit",
        "Balance",
    ]
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            balance = row.balance if row.balance is not None else Decimal("0")
            writer.writerow(
                {
                    "Transaction Date": row.transaction_date,
                    "Value Date": row.value_date,
                    "Narration": row.narration,
                    "Check Number": row.check_number,
                    "Withdrawal": format_amount(row.withdrawal),
                    "Deposit": format_amount(row.deposit),
                    "Balance": format_amount(balance),
                }
            )


def load_ocr_payload(path: Path) -> dict:
    """Load OCR JSON from disk."""
    content = path.read_text(encoding="utf-8")
    return json.loads(content)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, required=True, help="OCR JSON path")
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Destination CSV path",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    payload = load_ocr_payload(args.input)
    pages = payload.get("pages") or []

    rows = parse_markdown_rows(pages)
    if not rows:
        raise SystemExit("No table rows detected in OCR payload.")

    compute_running_balances(rows)
    write_csv(rows, args.output)


if __name__ == "__main__":
    main()
