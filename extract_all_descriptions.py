#!/usr/bin/env python3
"""
Extract ALL transaction descriptions from:
1. Already processed Excel files
2. Raw sample PDFs (process them fresh)

Build comprehensive dataset for pattern analysis
"""

import sys
from pathlib import Path
import pandas as pd
from collections import Counter
import json

# Add apps to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from apps.legacy_bridge.adapter import run_legacy


def extract_from_processed_jobs():
    """Extract from already processed jobs"""
    jobs_dir = Path(".cypherx/jobs")
    descriptions = []

    if not jobs_dir.exists():
        return descriptions

    print("📂 Loading from processed jobs...")
    for job_dir in jobs_dir.iterdir():
        if not job_dir.is_dir():
            continue

        excel_file = job_dir / "statement.xlsx"
        if not excel_file.exists():
            continue

        try:
            df = pd.read_excel(excel_file, sheet_name="Transactions")
            if "Description" in df.columns:
                descs = df["Description"].dropna().tolist()
                descriptions.extend([str(d).strip() for d in descs if str(d).strip()])
                print(f"   ✓ {job_dir.name[:16]}... ({len(descs)} descriptions)")
        except Exception as e:
            print(f"   ✗ {job_dir.name[:16]}... Error: {e}")

    return descriptions


def extract_from_sample_pdfs():
    """Process sample PDFs fresh to get more descriptions"""
    samples_dir = Path("public/samples")
    descriptions = []

    if not samples_dir.exists():
        print("\n⚠️  No samples directory found")
        return descriptions

    pdf_files = list(samples_dir.glob("*.pdf"))

    if not pdf_files:
        print("\n⚠️  No PDFs found in samples directory")
        return descriptions

    print(f"\n📄 Processing {len(pdf_files)} sample PDFs...")

    for pdf_file in pdf_files:
        print(f"\n   Processing: {pdf_file.name}")

        try:
            # Run legacy extraction
            excel_path, summary = run_legacy(
                pdf_paths=[str(pdf_file)],
                ocr=False,  # Skip OCR for speed
            )

            # Extract descriptions from sheets_data
            sheets_data = summary.get("sheets_data", {})
            transactions_sheet = sheets_data.get("Transactions", {})
            rows = transactions_sheet.get("data", [])

            desc_count = 0
            for row in rows:
                desc = row.get("Description", "")
                if desc and str(desc).strip():
                    descriptions.append(str(desc).strip())
                    desc_count += 1

            print(f"      ✓ Extracted {desc_count} descriptions")

        except Exception as e:
            print(f"      ✗ Error: {e}")
            continue

    return descriptions


def analyze_descriptions(descriptions):
    """Comprehensive analysis of all descriptions"""

    print("\n" + "="*70)
    print("🔬 COMPREHENSIVE DESCRIPTION ANALYSIS")
    print("="*70)

    total = len(descriptions)
    unique = len(set(descriptions))

    print(f"\n📊 Dataset Size:")
    print(f"   • Total descriptions: {total:,}")
    print(f"   • Unique descriptions: {unique:,}")
    print(f"   • Duplication rate: {(total-unique)/total*100:.1f}%")

    # Count occurrences
    occurrence_map = Counter(descriptions)

    # Sort by frequency
    most_common = occurrence_map.most_common(50)

    print(f"\n🔝 Top 50 Most Common Descriptions:")
    for i, (desc, count) in enumerate(most_common, 1):
        pct = count / total * 100
        print(f"   {i:2d}. [{count:4d} times, {pct:5.1f}%] {desc[:70]}")

    # Pattern analysis
    print(f"\n🔍 Pattern Analysis:")

    patterns = {
        "UPI transactions": 0,
        "NEFT transactions": 0,
        "IMPS transactions": 0,
        "RTGS transactions": 0,
        "ATM withdrawals": 0,
        "Interest credited": 0,
        "Opening/Closing balance": 0,
        "Charges/Fees": 0,
        "Technical codes": 0,
        "Others": 0,
    }

    for desc in set(descriptions):
        desc_upper = desc.upper()

        if "UPI" in desc_upper or "UPI-" in desc_upper:
            patterns["UPI transactions"] += occurrence_map[desc]
        elif "NEFT" in desc_upper:
            patterns["NEFT transactions"] += occurrence_map[desc]
        elif "IMPS" in desc_upper:
            patterns["IMPS transactions"] += occurrence_map[desc]
        elif "RTGS" in desc_upper:
            patterns["RTGS transactions"] += occurrence_map[desc]
        elif "ATM" in desc_upper and ("WDL" in desc_upper or "WITHDRAWAL" in desc_upper):
            patterns["ATM withdrawals"] += occurrence_map[desc]
        elif "INTEREST" in desc_upper and ("CREDIT" in desc_upper or "PAID" in desc_upper):
            patterns["Interest credited"] += occurrence_map[desc]
        elif any(x in desc_upper for x in ["OPENING", "CLOSING", "BALANCE"]):
            patterns["Opening/Closing balance"] += occurrence_map[desc]
        elif any(x in desc_upper for x in ["CHARGE", "FEE", "GST", "TDS"]):
            patterns["Charges/Fees"] += occurrence_map[desc]
        elif desc.startswith("tofor") or "int.pd:" in desc:
            patterns["Technical codes"] += occurrence_map[desc]
        else:
            patterns["Others"] += occurrence_map[desc]

    for pattern_name, count in patterns.items():
        pct = count / total * 100
        print(f"   • {pattern_name:25s}: {count:5d} ({pct:5.1f}%)")

    # Save all unique descriptions to file for manual review
    output_file = "all_unique_descriptions.txt"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"Total Descriptions: {total:,}\n")
        f.write(f"Unique Descriptions: {unique:,}\n")
        f.write(f"\n{'='*70}\n")
        f.write("All Unique Descriptions (sorted by frequency):\n")
        f.write(f"{'='*70}\n\n")

        for desc, count in occurrence_map.most_common():
            f.write(f"[{count:5d}x] {desc}\n")

    print(f"\n💾 Saved all unique descriptions to: {output_file}")

    return descriptions, occurrence_map


def main():
    print("="*70)
    print("📊 COMPREHENSIVE DESCRIPTION EXTRACTION")
    print("="*70)

    all_descriptions = []

    # Extract from processed jobs
    processed_descs = extract_from_processed_jobs()
    all_descriptions.extend(processed_descs)
    print(f"\n✓ From processed jobs: {len(processed_descs):,} descriptions")

    # Extract from sample PDFs
    sample_descs = extract_from_sample_pdfs()
    all_descriptions.extend(sample_descs)
    print(f"\n✓ From sample PDFs: {len(sample_descs):,} descriptions")

    if not all_descriptions:
        print("\n❌ No descriptions found!")
        return

    # Analyze
    analyze_descriptions(all_descriptions)

    print("\n" + "="*70)
    print("✅ EXTRACTION COMPLETE!")
    print("="*70)
    print("\nNext: Review all_unique_descriptions.txt to find more patterns")


if __name__ == "__main__":
    main()