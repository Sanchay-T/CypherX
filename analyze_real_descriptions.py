#!/usr/bin/env python3
"""
Analyze real bank statement descriptions to find patterns
Build a pre-filter to skip transactions that will NEVER have entities
"""

import sys
import os
from pathlib import Path

# Add apps to path
sys.path.insert(0, str(Path(__file__).parent))

from apps.ocr.mistral import process_pdf_with_mistral
from apps.domain.services.statements import StatementService
import json
from collections import Counter
import re


def extract_all_descriptions(pdf_paths):
    """Extract all transaction descriptions from PDFs"""
    all_descriptions = []

    print("="*70)
    print("Extracting descriptions from real bank statements...")
    print("="*70)

    for pdf_path in pdf_paths:
        print(f"\n📄 Processing: {os.path.basename(pdf_path)}")

        try:
            # Use your existing OCR pipeline
            ocr_result = process_pdf_with_mistral(pdf_path)

            # Parse transactions
            service = StatementService()
            transactions = service.parse_statement(ocr_result)

            for txn in transactions:
                desc = txn.get("description", "").strip()
                if desc:
                    all_descriptions.append(desc)

            print(f"   ✓ Extracted {len(transactions)} transactions")

        except Exception as e:
            print(f"   ✗ Error: {e}")
            continue

    print(f"\n✓ Total descriptions extracted: {len(all_descriptions)}")
    return all_descriptions


def analyze_patterns(descriptions):
    """Analyze descriptions to find patterns for filtering"""

    print("\n" + "="*70)
    print("Analyzing Patterns...")
    print("="*70)

    # Common patterns that NEVER have entities
    negative_patterns = {
        "ATM": [],
        "INTEREST": [],
        "CHARGES": [],
        "FEE": [],
        "TAX": [],
        "DEBIT": [],
        "CREDIT": [],
        "WITHDRAWAL": [],
        "DEPOSIT": [],
        "TRANSFER": [],
        "BALANCE": [],
        "CASH": [],
        "CHEQUE": [],
        "REVERSAL": [],
        "REFUND": [],
        "MIN BAL": [],
    }

    # Positive patterns that MIGHT have entities
    positive_patterns = {
        "UPI": [],
        "NEFT": [],
        "IMPS": [],
        "RTGS": [],
        "POS": [],
        "SALARY": [],
        "PAYMENT": [],
    }

    # Categorize descriptions
    for desc in descriptions:
        desc_upper = desc.upper()

        # Check negative patterns
        for pattern in negative_patterns:
            if pattern in desc_upper and not any(pos in desc_upper for pos in ["UPI", "NEFT", "IMPS", "RTGS"]):
                negative_patterns[pattern].append(desc)
                break

        # Check positive patterns
        for pattern in positive_patterns:
            if pattern in desc_upper:
                positive_patterns[pattern].append(desc)
                break

    print("\n🚫 Descriptions that NEVER have entities (can skip):")
    skip_count = 0
    for pattern, descs in negative_patterns.items():
        if descs:
            print(f"\n   {pattern} ({len(descs)} occurrences):")
            for d in descs[:3]:  # Show first 3 examples
                print(f"      • {d}")
            if len(descs) > 3:
                print(f"      ... and {len(descs) - 3} more")
            skip_count += len(descs)

    print(f"\n✅ Descriptions that MIGHT have entities (need API call):")
    api_count = 0
    for pattern, descs in positive_patterns.items():
        if descs:
            print(f"\n   {pattern} ({len(descs)} occurrences):")
            for d in descs[:3]:
                print(f"      • {d}")
            if len(descs) > 3:
                print(f"      ... and {len(descs) - 3} more")
            api_count += len(descs)

    total = len(descriptions)
    savings_pct = (skip_count / total * 100) if total > 0 else 0

    print("\n" + "="*70)
    print("💰 Savings Analysis:")
    print(f"   • Total transactions: {total}")
    print(f"   • Can skip (no entities): {skip_count} ({savings_pct:.1f}%)")
    print(f"   • Need API call: {api_count} ({100-savings_pct:.1f}%)")
    print(f"   • Cost savings: {savings_pct:.1f}%")
    print("="*70)

    return negative_patterns, positive_patterns, skip_count, api_count


def build_filter_rules(negative_patterns):
    """Build regex patterns for fast filtering"""

    # Patterns that indicate NO entities
    skip_keywords = [
        r'\bATM\s+W(ITH)?D(RAWAL)?L?\b',
        r'\bCASH\s+W(ITH)?D(RAWAL)?L?\b',
        r'\bINTEREST\s+(CREDIT|DEBIT|PAID|EARNED)\b',
        r'\b(SERVICE|ANNUAL|PROCESSING)\s+(CHARGE|FEE)S?\b',
        r'\bMIN(IMUM)?\s+BAL(ANCE)?\b',
        r'\bSMS\s+CHARGES?\b',
        r'\bGST\b',
        r'\bTDS\b',
        r'\bREVERSAL\b',
        r'\b(DEBIT|CREDIT)\s+CARD\s+(CHARGE|FEE)S?\b',
        r'^\s*(OPENING|CLOSING)\s+BALANCE\s*$',
        r'^\s*BAL(ANCE)?\s*:',
        r'^\s*TOTAL\s*$',
        r'\bCHEQUE\s+(BOUNCE|RETURN)\b',
    ]

    # Compile regex
    filter_regex = re.compile('|'.join(skip_keywords), re.IGNORECASE)

    return filter_regex


def test_filter(descriptions, filter_regex):
    """Test the filter on real descriptions"""

    print("\n" + "="*70)
    print("Testing Filter...")
    print("="*70)

    skipped = []
    kept = []

    for desc in descriptions:
        if filter_regex.search(desc):
            skipped.append(desc)
        else:
            kept.append(desc)

    print(f"\n✓ Filter Results:")
    print(f"   • Skipped: {len(skipped)}/{len(descriptions)} ({len(skipped)/len(descriptions)*100:.1f}%)")
    print(f"   • Kept for API: {len(kept)}/{len(descriptions)} ({len(kept)/len(descriptions)*100:.1f}%)")

    print(f"\n🚫 Sample skipped descriptions:")
    for desc in skipped[:10]:
        print(f"   • {desc}")

    print(f"\n✅ Sample kept descriptions (will call API):")
    for desc in kept[:10]:
        print(f"   • {desc}")

    return skipped, kept


def main():
    # Get sample PDFs
    pdf_paths = [
        "public/samples/axis.pdf",
        "public/samples/icici-2025.pdf",
        "public/samples/hdfc-2025.pdf",
    ]

    # Check if files exist
    existing_pdfs = [p for p in pdf_paths if os.path.exists(p)]

    if not existing_pdfs:
        print("❌ No sample PDFs found!")
        return

    # Extract descriptions
    descriptions = extract_all_descriptions(existing_pdfs)

    if not descriptions:
        print("❌ No descriptions extracted!")
        return

    # Analyze patterns
    negative_patterns, positive_patterns, skip_count, api_count = analyze_patterns(descriptions)

    # Build filter
    filter_regex = build_filter_rules(negative_patterns)

    # Test filter
    skipped, kept = test_filter(descriptions, filter_regex)

    # Calculate savings
    cost_per_transaction_inr = 0.0009  # From DeepSeek test
    original_cost = len(descriptions) * cost_per_transaction_inr
    filtered_cost = len(kept) * cost_per_transaction_inr
    savings = original_cost - filtered_cost

    print("\n" + "="*70)
    print("💰 FINAL COST ANALYSIS:")
    print("="*70)
    print(f"   • Without filter: ₹{original_cost:.2f} for {len(descriptions)} transactions")
    print(f"   • With filter: ₹{filtered_cost:.2f} for {len(kept)} transactions")
    print(f"   • Savings: ₹{savings:.2f} ({savings/original_cost*100:.1f}%)")

    print(f"\n🚀 For 10,000 transactions:")
    print(f"   • Without filter: ₹{10000 * cost_per_transaction_inr:.2f}")
    print(f"   • With filter: ₹{10000 * (len(kept)/len(descriptions)) * cost_per_transaction_inr:.2f}")
    print(f"   • Savings: ₹{10000 * (len(skipped)/len(descriptions)) * cost_per_transaction_inr:.2f}")
    print("="*70)


if __name__ == "__main__":
    main()