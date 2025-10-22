from pathlib import Path
import sys

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from apps.domain.services.capital_gain_parser import parse_capital_gain_statement

PDF_PATH = (
    ROOT
    / "data"
    / "raw_statements"
    / "Statements"
    / "Share_statements"
    / "Unstructured"
    / "Cpital Gain_unstructure_share_statement.pdf"
)


def test_capital_gain_parser_extracts_expected_tables():
    statement = parse_capital_gain_statement(PDF_PATH)

    assert statement.header["pan"] == "BNMPG2627K"
    assert statement.header["folio"] == "51024533934"
    assert statement.header["name"] == "VEDANTI PRAKASH GHADI"
    assert statement.header["status"] == "INDIVIDUAL"

    expected_summary = pd.DataFrame(
        [
            {
                "Scheme Name": "LIC MF Banking and PSU Fund - Regular Plan-Growth INF767K01535",
                "Count": "1",
                "Outflow Amount": "25,046.03",
                "Net Value": "14,351.98",
                "Grandfathered NAV": "21.5172",
                "Grandfathered Value": "0.00",
                "Short Term Gain": "0.00",
                "Long Term Gain With Index": "0.00",
                "Long Term Gain Without Index": "10,694.05",
            },
            {
                "Scheme Name": "Total",
                "Count": "",
                "Outflow Amount": "25,046.03",
                "Net Value": "14,351.98",
                "Grandfathered NAV": "",
                "Grandfathered Value": "0.00",
                "Short Term Gain": "0.00",
                "Long Term Gain With Index": "0.00",
                "Long Term Gain Without Index": "10,694.05",
            },
        ]
    )

    pd.testing.assert_frame_equal(statement.summary_table, expected_summary)

    section_a_columns = [
        "Trxn. Type",
        "Date",
        "Current Units",
        "Source Scheme Units",
        "Original Purchase Cost",
        "**Original Purchase Amount",
        "Grandfathered Nav as on 31/01/2018",
        "GrandFathered Cost Value",
        "IT Applicable NAV",
        "IT Applicable Cost Value",
    ]
    section_a_expected = pd.DataFrame(
        [
            {
                "Trxn. Type": "Purchase",
                "Date": "08-12-2015",
                "Current Units": "771.454",
                "Source Scheme Units": "771.454",
                "Original Purchase Cost": "18.6038",
                "**Original Purchase Amount": "14,351.98",
                "Grandfathered Nav as on 31/01/2018": "18.6038",
                "GrandFathered Cost Value": "14,351.98",
                "IT Applicable NAV": "18.6038",
                "IT Applicable Cost Value": "14,351.98",
            },
            {
                "Trxn. Type": "Total :",
                "Date": "",
                "Current Units": "771.454",
                "Source Scheme Units": "",
                "Original Purchase Cost": "",
                "**Original Purchase Amount": "14,351.98",
                "Grandfathered Nav as on 31/01/2018": "",
                "GrandFathered Cost Value": "14,351.98",
                "IT Applicable NAV": "",
                "IT Applicable Cost Value": "14,351.98",
            },
        ],
        columns=section_a_columns,
    )

    pd.testing.assert_frame_equal(
        statement.sections["Section A : Subscriptions"], section_a_expected
    )

    section_b_columns = [
        "IT Applicable NAV",
        "IT Applicable Cost Value",
        "Trxn. Type",
        "Date",
        "Units",
        "Amount",
        "Price",
        "Tax Perc",
        "Total Tax",
    ]
    section_b_expected = pd.DataFrame(
        [
            {
                "IT Applicable NAV": "18.6038",
                "IT Applicable Cost Value": "14,351.98",
                "Trxn. Type": "Redemption",
                "Date": "26-08-2024",
                "Units": "771.454",
                "Amount": "25,046.03",
                "Price": "32.4660",
                "Tax Perc": "0.00",
                "Total Tax": "0.00",
            },
            {
                "IT Applicable NAV": "",
                "IT Applicable Cost Value": "14,351.98",
                "Trxn. Type": "",
                "Date": "",
                "Units": "771.454",
                "Amount": "25,046.03",
                "Price": "",
                "Tax Perc": "",
                "Total Tax": "0.00",
            },
        ],
        columns=section_b_columns,
    )

    pd.testing.assert_frame_equal(
        statement.sections["Section B : Redemptions"], section_b_expected
    )

    section_c_columns = [
        "Tax Perc",
        "Total Tax",
        "Short Term",
        "Indexed Cost",
        "Long Term With Index",
        "Long Term Without Index",
    ]
    section_c_expected = pd.DataFrame(
        [
            {
                "Tax Perc": "0.00",
                "Total Tax": "0.00",
                "Short Term": "0.00",
                "Indexed Cost": "0.00",
                "Long Term With Index": "0.00",
                "Long Term Without Index": "10,694.05",
            },
            {
                "Tax Perc": "",
                "Total Tax": "0.00",
                "Short Term": "0.00",
                "Indexed Cost": "",
                "Long Term With Index": "0.00",
                "Long Term Without Index": "10,694.05",
            },
        ],
        columns=section_c_columns,
    )

    pd.testing.assert_frame_equal(
        statement.sections["Section C : Gains / Losses"], section_c_expected
    )

    issues = statement.cross_check_against_pdf(PDF_PATH)
    assert issues == []
