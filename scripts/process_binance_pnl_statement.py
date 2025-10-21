#!/usr/bin/env python
"""CLI helper to parse a Binance P2P PnL statement PDF."""

from __future__ import annotations

import argparse
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from apps.domain.services.binance_pnl_parser import parse_binance_pnl_statement


def main() -> None:
    parser = argparse.ArgumentParser(description="Parse a Binance P2P PnL PDF.")
    parser.add_argument("pdf_path", type=Path, help="Path to the Binance statement PDF.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("tmp/binance_pnl_exports"),
        help="Directory where the combined CSV will be written.",
    )
    args = parser.parse_args()

    statement = parse_binance_pnl_statement(args.pdf_path)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    csv_path = args.output_dir / f"{args.pdf_path.stem}_table.csv"
    statement.to_csv(csv_path)

    print(f"Parsed statement saved to {csv_path}")


if __name__ == "__main__":
    main()
