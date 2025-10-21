from pathlib import Path
import sys

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from apps.domain.services.binance_pnl_parser import parse_binance_pnl_statement

PDF_PATH = Path("Statements/Share_statements/Unstructured/binancepnl__unstructure_share_statement.pdf")


def test_binance_pnl_parser_extracts_table_and_header():
    statement = parse_binance_pnl_statement(PDF_PATH)

    assert statement.header["name"] == "SATISH CHANDRA"
    assert statement.header["user_id"] == "300689928"
    assert statement.header["email"] == "satish_776@yahoo.co.in"
    assert statement.header["period"] == "2024-05-01 to 2025-03-31"

    expected_columns = [
        "Period",
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

    pd.testing.assert_index_equal(statement.table.columns, pd.Index(expected_columns))
    assert len(statement.table) == 7

    first_data_row = statement.table.iloc[1]
    assert first_data_row["Period"] == "2024-05-01-2025-03-31"
    assert first_data_row["Crypto Token"] == "FDUSD"
    assert first_data_row["Fiat Currency"] == "INR"
    assert first_data_row["Total Buy Amount"] == "67000.00"
    assert first_data_row["Total Sell Amount"] == "0.00"
