#!/usr/bin/env python
"""CLI helper to parse a capital gain statement PDF, export CSVs, and re-check layout."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from apps.domain.services.capital_gain_parser import parse_capital_gain_statement


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract structured data from a capital gain PDF.")
    parser.add_argument("pdf_path", type=Path, help="Path to the capital gain statement PDF.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("tmp/capital_gain_exports"),
        help="Directory where CSV outputs will be written.",
    )
    args = parser.parse_args()

    statement = parse_capital_gain_statement(args.pdf_path)
    stem = args.pdf_path.stem.replace(" ", "_")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    combined_path = args.output_dir / f"{stem}_combined.csv"
    statement.to_combined_csv(combined_path)

    issues = statement.cross_check_against_pdf(args.pdf_path)
    if issues:
        print("Cross-check found the following issues:")
        for issue in issues:
            print(f" - {issue}")
    else:
        print(f"Cross-check passed for {args.pdf_path.name}. Combined CSV: {combined_path}")


if __name__ == "__main__":
    main()
