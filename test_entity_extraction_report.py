#!/usr/bin/env python3
"""
Generate detailed CSV report showing entity extraction logic
Side-by-side comparison of descriptions, filter decisions, and extracted entities
"""

from openai import OpenAI
import os
import time
import json
import csv
from dotenv import load_dotenv
from pathlib import Path
import pandas as pd
from collections import defaultdict
from typing import List, Dict, Any
import re

load_dotenv()

USD_TO_INR = 83
DEEPSEEK_INPUT_COST_PER_1M = 0.14
DEEPSEEK_OUTPUT_COST_PER_1M = 0.28


def should_extract_entities(description: str) -> tuple[bool, str]:
    """
    Pre-filter to skip descriptions that NEVER have person/company names
    Returns: (should_call_api, reason)
    """

    # Skip pattern checks
    skip_patterns = {
        'opening/closing balance': r'\b(OPENING|CLOSING)\s*BALANCE\b',
        'technical code (tofor...)': r'^tofor\d+$',
        'interest payment code': r'^\d{10,}:int\.pd:',
        'transaction summary': r'^transaction.*total.*closing.*balance',
        'ATM withdrawal': r'\bATM\s+(W(ITH)?D(RAWAL)?L?|WDL|CASH)\b',
        'cash withdrawal': r'\bCASH\s+W(ITH)?D(RAWAL)?L?\b',
        'interest credited': r'\bINTEREST\s+(CREDIT(ED)?|PAID|EARNED)\b',
        'service charges': r'\b(SERVICE|ANNUAL|PROCESSING)\s+(CHARGE|FEE)S?\b',
        'GST/TDS': r'\b(GST|TDS)\b',
        'reversal': r'\bREVERSAL\b',
    }

    for reason, pattern in skip_patterns.items():
        if re.search(pattern, description, re.IGNORECASE):
            return False, f"❌ SKIP - {reason}"

    # Check for meaningful words (4+ letters)
    words = re.findall(r'[a-zA-Z]{4,}', description.lower())

    if not words:
        return False, "❌ SKIP - no alphabetic words"

    # Skip if only technical banking terms
    technical_terms = {'imps', 'neft', 'rtgs', 'payu', 'hdfcban', 'axis', 'bank', 'inb'}
    potential_names = [w for w in words if len(w) >= 4 and w not in technical_terms]

    if not potential_names:
        return False, "❌ SKIP - only technical banking terms"

    return True, f"✅ KEEP - potential entities: {', '.join(potential_names[:3])}"


def load_real_statements():
    """Load descriptions from real processed statements"""
    jobs_dir = Path(".cypherx/jobs")
    all_descriptions = []

    if not jobs_dir.exists():
        return []

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
                all_descriptions.extend([str(d).strip() for d in descs if str(d).strip()])
        except Exception:
            continue

    return all_descriptions


def extract_entities_batch(client: OpenAI, descriptions: List[str]) -> Dict[str, List[str]]:
    """Extract entities from batch - returns dict mapping description to entities"""

    prompt = f"""Extract ONLY person names and company/business names from these transaction descriptions.

Descriptions:
{json.dumps(descriptions, indent=2)}

Return JSON array:
[
  {{"description": "...", "entities": ["Name1", "Name2"]}},
  ...
]

Rules:
- Only extract person names and organization/company/business names
- Exclude: locations, payment types, transaction codes
- If no entities found, return empty array []

Return ONLY the JSON array."""

    try:
        completion = client.chat.completions.create(
            extra_headers={
                "HTTP-Referer": "https://cyphersol.com",
                "X-Title": "CypherX",
            },
            model="deepseek/deepseek-v3.2-exp",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )

        response_text = completion.choices[0].message.content

        # Extract JSON
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        entities_data = json.loads(response_text)

        # Convert to dict
        result = {}
        for item in entities_data:
            desc = item["description"]
            entities = item.get("entities", [])
            result[desc] = entities

        return result

    except Exception as e:
        print(f"Error extracting entities: {e}")
        return {desc: [] for desc in descriptions}


def generate_report():
    """Generate detailed CSV report"""

    print("="*70)
    print("📊 GENERATING ENTITY EXTRACTION REPORT")
    print("="*70)

    # Get API key
    api_key = os.getenv("OPEN_ROUTER")
    if not api_key:
        print("\n✗ Error: OPEN_ROUTER not found in .env")
        return

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )

    # Load statements
    print("\n📂 Loading statements...")
    descriptions = load_real_statements()

    if not descriptions:
        print("⚠️  No statements found")
        return

    print(f"✓ Loaded {len(descriptions)} descriptions")

    # Process each description
    print("\n🔍 Analyzing descriptions...")

    rows = []
    kept_descriptions = []
    occurrence_count = defaultdict(int)

    # Count occurrences
    for desc in descriptions:
        occurrence_count[desc] += 1

    # Get unique descriptions
    unique_descriptions = list(set(descriptions))

    for desc in unique_descriptions:
        should_call, reason = should_extract_entities(desc)

        row = {
            "Description": desc,
            "Occurrences": occurrence_count[desc],
            "Filter Decision": reason,
            "API Called": "No",
            "Entities Extracted": "",
            "Cost (INR)": 0,
        }

        if should_call:
            kept_descriptions.append(desc)

        rows.append(row)

    # Extract entities for kept descriptions in batches
    if kept_descriptions:
        print(f"\n⚡ Extracting entities for {len(kept_descriptions)} descriptions...")

        batch_size = 20
        all_entities = {}

        for i in range(0, len(kept_descriptions), batch_size):
            batch = kept_descriptions[i:i+batch_size]
            print(f"   Batch {i//batch_size + 1}/{(len(kept_descriptions) + batch_size - 1)//batch_size}...")

            entities = extract_entities_batch(client, batch)
            all_entities.update(entities)

        # Update rows with extracted entities
        for row in rows:
            desc = row["Description"]
            if desc in all_entities:
                row["API Called"] = "Yes"
                entities = all_entities[desc]
                if entities:
                    row["Entities Extracted"] = ", ".join(entities)
                else:
                    row["Entities Extracted"] = "(none found)"

    # Calculate costs
    total_cost = len(kept_descriptions) * 0.000020  # Approximate cost per description
    for row in rows:
        if row["API Called"] == "Yes":
            row["Cost (INR)"] = f"₹{0.000020:.6f}"

    # Sort rows: API Called first, then by occurrences
    rows.sort(key=lambda x: (x["API Called"] == "No", -x["Occurrences"]))

    # Save to CSV
    output_file = "entity_extraction_report.csv"
    print(f"\n💾 Saving report to {output_file}...")

    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            "Description",
            "Occurrences",
            "Filter Decision",
            "API Called",
            "Entities Extracted",
            "Cost (INR)"
        ])
        writer.writeheader()
        writer.writerows(rows)

    print(f"✓ Report saved!")

    # Print summary
    print("\n" + "="*70)
    print("📊 SUMMARY")
    print("="*70)

    total = len(unique_descriptions)
    kept = len(kept_descriptions)
    skipped = total - kept

    print(f"\nTotal unique descriptions: {total}")
    print(f"✅ Kept (API called): {kept} ({kept/total*100:.1f}%)")
    print(f"❌ Skipped (filtered): {skipped} ({skipped/total*100:.1f}%)")

    entities_found = sum(1 for row in rows if row["Entities Extracted"] and row["Entities Extracted"] != "(none found)")
    print(f"🎯 Entities found in: {entities_found} descriptions")

    print(f"\n💰 Total cost: ₹{total_cost:.6f}")

    naive_cost = total * 0.0009
    savings = naive_cost - total_cost
    print(f"💰 Naive cost (no filtering): ₹{naive_cost:.4f}")
    print(f"💰 Savings: ₹{savings:.4f} ({savings/naive_cost*100:.1f}%)")

    print(f"\n📄 Open {output_file} to see detailed analysis")
    print("="*70)


def main():
    generate_report()


if __name__ == "__main__":
    main()