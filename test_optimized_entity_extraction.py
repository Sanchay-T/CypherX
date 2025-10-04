#!/usr/bin/env python3
"""
Optimized entity extraction with:
1. Smart pre-filtering (skip obvious non-entities)
2. Deduplication (same description = same entities)
3. Batching (process multiple descriptions per API call)
4. Cost and time tracking
"""

from openai import OpenAI
import os
import time
import json
from dotenv import load_dotenv
from pathlib import Path
import pandas as pd
from collections import defaultdict
from typing import List, Dict, Any

load_dotenv()

USD_TO_INR = 83
DEEPSEEK_INPUT_COST_PER_1M = 0.14  # USD
DEEPSEEK_OUTPUT_COST_PER_1M = 0.28  # USD


def should_extract_entities(description: str) -> bool:
    """
    Pre-filter to skip descriptions that NEVER have person/company names
    """
    import re

    # Obvious skip patterns
    skip_patterns = [
        r'\bATM\s+(W(ITH)?D(RAWAL)?L?|WDL|CASH)\b',
        r'\bCASH\s+W(ITH)?D(RAWAL)?L?\b',
        r'\bINTEREST\s+(CREDIT(ED)?|PAID|EARNED)\b',
        r'\b(SERVICE|ANNUAL|PROCESSING)\s+(CHARGE|FEE)S?\b',
        r'\bMIN(IMUM)?\s+BAL(ANCE)?\s+(CHARGE|FEE)\b',
        r'\bSMS\s+CHARGES?\b',
        r'\bGST\b',
        r'\bTDS\b',
        r'\bREVERSAL\b',
        r'\b(OPENING|CLOSING)\s*BALANCE\b',
        r'^\s*BAL(ANCE)?\s*:',
        r'^tofor\d+$',  # Technical codes like "tofor921040060268923"
        r'^\d{10,}:int\.pd:',  # Interest payment codes
        r'^transaction.*total.*closing.*balance',  # Transaction summary text
    ]

    skip_regex = re.compile('|'.join(skip_patterns), re.IGNORECASE)

    # If matches skip pattern, return False
    if skip_regex.search(description):
        return False

    # Additional heuristic: if description is mostly numbers/slashes with no clear words
    # Example: "916010029755238:int.pd:01-04-2022to30-06-2022"
    # But keep: "imps/p2a/209411650274/sanjan/hdfcban" (has potential name)

    # Check if description has any alphabetic words of 4+ characters (potential names)
    words = re.findall(r'[a-zA-Z]{4,}', description.lower())

    # Skip if no meaningful words found
    if not words:
        return False

    # Skip if only technical banking terms
    technical_terms = {'imps', 'neft', 'rtgs', 'payu', 'hdfcban', 'axis', 'bank', 'inb'}
    meaningful_words = [w for w in words if w not in technical_terms]

    # If only technical terms, check if there might be a name
    # Names are usually 4+ letters and don't match common patterns
    potential_names = [w for w in words if len(w) >= 4 and w not in technical_terms]

    return len(potential_names) > 0


def load_real_statements():
    """Load descriptions from real processed statements"""
    jobs_dir = Path(".cypherx/jobs")
    all_descriptions = []

    if not jobs_dir.exists():
        return []

    print("📂 Loading real statements...")
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
        except Exception as e:
            continue

    return all_descriptions


def deduplicate_descriptions(descriptions: List[str]) -> tuple[List[str], Dict[str, int]]:
    """
    Deduplicate descriptions and count occurrences
    Returns: (unique_descriptions, occurrence_map)
    """
    occurrence_map = defaultdict(int)
    for desc in descriptions:
        occurrence_map[desc] += 1

    unique = list(occurrence_map.keys())
    return unique, dict(occurrence_map)


def extract_entities_batch(client: OpenAI, descriptions: List[str]) -> Dict[str, Any]:
    """
    Extract entities from a batch of descriptions in ONE API call
    """

    # Optimized prompt - shorter and more focused
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

    start_time = time.time()

    try:
        completion = client.chat.completions.create(
            extra_headers={
                "HTTP-Referer": "https://cyphersol.com",
                "X-Title": "CypherX Entity Extractor",
            },
            model="deepseek/deepseek-v3.2-exp",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
        )

        end_time = time.time()
        time_taken = end_time - start_time

        # Parse response
        response_text = completion.choices[0].message.content

        # Extract JSON
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        entities_data = json.loads(response_text)

        # Get token usage
        usage = completion.usage
        input_tokens = usage.prompt_tokens
        output_tokens = usage.completion_tokens
        total_tokens = usage.total_tokens

        # Calculate cost
        input_cost_usd = (input_tokens / 1_000_000) * DEEPSEEK_INPUT_COST_PER_1M
        output_cost_usd = (output_tokens / 1_000_000) * DEEPSEEK_OUTPUT_COST_PER_1M
        total_cost_usd = input_cost_usd + output_cost_usd
        total_cost_inr = total_cost_usd * USD_TO_INR

        return {
            "success": True,
            "entities_data": entities_data,
            "time_taken": time_taken,
            "tokens": {
                "input": input_tokens,
                "output": output_tokens,
                "total": total_tokens
            },
            "cost": {
                "usd": total_cost_usd,
                "inr": total_cost_inr
            }
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def process_statements_optimized(client: OpenAI, descriptions: List[str], batch_size: int = 20):
    """
    Process statements with all optimizations:
    1. Pre-filter
    2. Deduplicate
    3. Batch processing
    """

    print("\n" + "="*70)
    print("🚀 OPTIMIZED ENTITY EXTRACTION PIPELINE")
    print("="*70)

    # Step 1: Pre-filter
    print(f"\n📋 Step 1: Pre-filtering...")
    print(f"   Total descriptions: {len(descriptions)}")

    filtered = [d for d in descriptions if should_extract_entities(d)]
    skipped_count = len(descriptions) - len(filtered)

    print(f"   After filter: {len(filtered)}")
    print(f"   Skipped: {skipped_count} ({skipped_count/len(descriptions)*100:.1f}%)")

    # Step 2: Deduplicate
    print(f"\n🔄 Step 2: Deduplicating...")
    unique_descriptions, occurrence_map = deduplicate_descriptions(filtered)

    print(f"   Unique descriptions: {len(unique_descriptions)}")
    print(f"   Deduplication savings: {len(filtered) - len(unique_descriptions)} ({(len(filtered) - len(unique_descriptions))/len(filtered)*100:.1f}%)")

    # Step 3: Batch processing
    print(f"\n⚡ Step 3: Batch processing (batch size: {batch_size})...")

    total_cost_inr = 0
    total_time = 0
    total_api_calls = 0
    all_results = {}

    # Process in batches
    for i in range(0, len(unique_descriptions), batch_size):
        batch = unique_descriptions[i:i+batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(unique_descriptions) + batch_size - 1) // batch_size

        print(f"\n   📦 Batch {batch_num}/{total_batches} ({len(batch)} descriptions)")

        result = extract_entities_batch(client, batch)

        if result["success"]:
            total_cost_inr += result["cost"]["inr"]
            total_time += result["time_taken"]
            total_api_calls += 1

            # Store results
            for item in result["entities_data"]:
                desc = item["description"]
                entities = item.get("entities", [])
                all_results[desc] = entities

                if entities:
                    print(f"      ✓ {desc[:60]}... → {', '.join(entities)}")
                else:
                    print(f"      ○ {desc[:60]}... → No entities")

            print(f"      Cost: ₹{result['cost']['inr']:.4f}, Time: {result['time_taken']:.1f}s")

        else:
            print(f"      ✗ Error: {result['error']}")

    # Calculate final stats
    print("\n" + "="*70)
    print("📊 FINAL RESULTS")
    print("="*70)

    original_calls_needed = len(descriptions)
    after_filter_calls = len(filtered)
    after_dedup_calls = len(unique_descriptions)
    actual_api_calls = total_api_calls

    print(f"\n💰 Cost Analysis:")
    print(f"   • Original transactions: {original_calls_needed}")
    print(f"   • After pre-filter: {after_filter_calls} (saved {original_calls_needed - after_filter_calls})")
    print(f"   • After deduplication: {after_dedup_calls} (saved {after_filter_calls - after_dedup_calls})")
    print(f"   • Actual API calls: {actual_api_calls} (batching)")
    print(f"   • Total cost: ₹{total_cost_inr:.4f}")
    print(f"   • Cost per transaction: ₹{total_cost_inr/len(descriptions):.6f}")

    # Compare with naive approach
    naive_cost_per_transaction = 0.0009  # From single transaction test
    naive_total_cost = original_calls_needed * naive_cost_per_transaction
    savings = naive_total_cost - total_cost_inr
    savings_pct = (savings / naive_total_cost * 100) if naive_total_cost > 0 else 0

    print(f"\n📉 Savings vs Naive Approach:")
    print(f"   • Naive cost (1 call per transaction): ₹{naive_total_cost:.4f}")
    print(f"   • Optimized cost: ₹{total_cost_inr:.4f}")
    print(f"   • Savings: ₹{savings:.4f} ({savings_pct:.1f}%)")

    print(f"\n⚡ Time Analysis:")
    print(f"   • Total time: {total_time:.1f}s ({total_time/60:.1f} min)")
    print(f"   • Avg time per batch: {total_time/total_api_calls:.1f}s")
    print(f"   • Transactions per second: {len(descriptions)/total_time:.1f}")

    print(f"\n🚀 Projections for 10,000 transactions:")
    factor = 10000 / len(descriptions) if len(descriptions) > 0 else 1
    print(f"   • Estimated cost: ₹{total_cost_inr * factor:.2f}")
    print(f"   • Estimated time: {total_time * factor / 60:.1f} minutes")
    print(f"   • vs Naive: ₹{naive_total_cost * factor:.2f} (save ₹{savings * factor:.2f})")

    return all_results, {
        "total_descriptions": len(descriptions),
        "skipped_by_filter": skipped_count,
        "unique_descriptions": len(unique_descriptions),
        "api_calls": actual_api_calls,
        "total_cost_inr": total_cost_inr,
        "total_time": total_time,
        "cost_per_transaction": total_cost_inr / len(descriptions) if len(descriptions) > 0 else 0,
    }


def main():
    print("="*70)
    print("🧠 OPTIMIZED ENTITY EXTRACTION TEST")
    print("="*70)

    # Get API key
    api_key = os.getenv("OPEN_ROUTER")
    if not api_key:
        print("\n✗ Error: OPEN_ROUTER not found in .env")
        return

    # Initialize client
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )

    # Load real statements
    descriptions = load_real_statements()

    if not descriptions:
        print("\n⚠️  No statements found, using test data...")
        descriptions = [
            "openingbalance",
            "imps/p2a/209411650274/sanjan/hdfcban/x145082/bal",
            "tofor921040060268923",
            "inb-td/922040061366717/arkabiswas",
            "imps/p2a/212213670084/shubhy/hdfcban/x633202/sin",
            "ATM WDL ICICI BANK",
            "INTEREST CREDITED",
            "UPI-AMAZON PAY INDIA",
            "NEFT-JOHN DOE-CONSULTANCY",
        ] * 10  # Repeat for testing

    print(f"\n✓ Loaded {len(descriptions)} transaction descriptions")

    # Process with optimizations
    results, stats = process_statements_optimized(client, descriptions, batch_size=20)

    print("\n" + "="*70)
    print("✅ TEST COMPLETE!")
    print("="*70)


if __name__ == "__main__":
    main()