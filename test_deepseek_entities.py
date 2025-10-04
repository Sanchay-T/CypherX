#!/usr/bin/env python3
"""
Test script to extract entities from transaction descriptions using DeepSeek via OpenRouter
Much cheaper alternative to Google NLP API
"""

from openai import OpenAI
import os
import time
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Sample transaction data (simulating one page of a bank statement)
SAMPLE_PAGE_TRANSACTIONS = [
    {"date": "2024-01-15", "description": "UPI-AMAZON PAY INDIA PRI-QPAYM", "amount": -1299.00},
    {"date": "2024-01-16", "description": "NEFT-HDFC BANK LTD-SALARY CREDIT", "amount": 50000.00},
    {"date": "2024-01-17", "description": "ATM WDL ICICI BANK CONNAUGHT PLACE", "amount": -5000.00},
    {"date": "2024-01-18", "description": "SWIGGY-BANGALORE-FOOD ORDER", "amount": -450.00},
    {"date": "2024-01-19", "description": "FLIPKART INTERNET PVT LTD", "amount": -2999.00},
    {"date": "2024-01-20", "description": "NETFLIX.COM MONTHLY SUBSCRIPTION", "amount": -649.00},
    {"date": "2024-01-21", "description": "GOOGLE WORKSPACE PAYMENT", "amount": -200.00},
    {"date": "2024-01-22", "description": "Payment to John Smith for consultancy", "amount": -15000.00},
    {"date": "2024-01-23", "description": "ATM WITHDRAWAL", "amount": -2000.00},
    {"date": "2024-01-24", "description": "INTEREST CREDITED", "amount": 125.50},
]

# DeepSeek pricing (via OpenRouter)
# https://openrouter.ai/deepseek/deepseek-v3.2-exp
# Input: $0.14 per 1M tokens
# Output: $0.28 per 1M tokens
DEEPSEEK_INPUT_COST_PER_1M = 0.14  # USD
DEEPSEEK_OUTPUT_COST_PER_1M = 0.28  # USD
USD_TO_INR = 83


def estimate_tokens(text):
    """Rough estimation: 1 token ≈ 4 characters"""
    return len(text) // 4


def extract_entities_from_page(client, transactions, page_num=1):
    """
    Extract entities from a page of transactions using DeepSeek
    Returns: dict with entities, time taken, tokens used, cost
    """

    # Create prompt with transaction descriptions
    descriptions = [t["description"] for t in transactions]

    prompt = f"""You are an expert at extracting entities (person names, company names, business names) from bank transaction descriptions.

Extract ONLY person names and organization/company/business names from these transaction descriptions.

Transaction descriptions:
{json.dumps(descriptions, indent=2)}

Return a JSON array where each element corresponds to a transaction and contains:
- "description": the original description
- "entities": array of entity names found (only person/company names, exclude locations, payment types, etc.)

Example output:
[
  {{"description": "UPI-AMAZON PAY", "entities": ["AMAZON"]}},
  {{"description": "Payment to John Doe", "entities": ["John Doe"]}},
  {{"description": "ATM WITHDRAWAL", "entities": []}}
]

Return ONLY the JSON array, no explanation."""

    print(f"\n{'='*70}")
    print(f"Processing Page {page_num} ({len(transactions)} transactions)")
    print(f"{'='*70}")

    start_time = time.time()

    try:
        # Estimate input tokens
        input_tokens = estimate_tokens(prompt)

        # Call DeepSeek via OpenRouter
        completion = client.chat.completions.create(
            extra_headers={
                "HTTP-Referer": "https://cyphersol.com",
                "X-Title": "CypherX Statement Processor",
            },
            model="deepseek/deepseek-v3.2-exp",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0,  # More deterministic
        )

        end_time = time.time()
        time_taken = end_time - start_time

        # Parse response
        response_text = completion.choices[0].message.content

        # Extract JSON from response (in case there's extra text)
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()

        entities_data = json.loads(response_text)

        # Get actual token usage from response
        usage = completion.usage
        input_tokens_actual = usage.prompt_tokens
        output_tokens_actual = usage.completion_tokens
        total_tokens = usage.total_tokens

        # Calculate cost
        input_cost_usd = (input_tokens_actual / 1_000_000) * DEEPSEEK_INPUT_COST_PER_1M
        output_cost_usd = (output_tokens_actual / 1_000_000) * DEEPSEEK_OUTPUT_COST_PER_1M
        total_cost_usd = input_cost_usd + output_cost_usd
        total_cost_inr = total_cost_usd * USD_TO_INR

        print(f"\n✓ Successfully extracted entities")
        print(f"\n📊 Metrics:")
        print(f"   • Time taken: {time_taken:.2f}s")
        print(f"   • Input tokens: {input_tokens_actual:,}")
        print(f"   • Output tokens: {output_tokens_actual:,}")
        print(f"   • Total tokens: {total_tokens:,}")
        print(f"   • Cost: ${total_cost_usd:.6f} (₹{total_cost_inr:.4f})")
        print(f"   • Cost per transaction: ₹{total_cost_inr/len(transactions):.4f}")

        print(f"\n📝 Extracted Entities:")
        for item in entities_data:
            desc = item["description"]
            entities = item.get("entities", [])
            if entities:
                print(f"   • {desc}")
                print(f"     → Entities: {', '.join(entities)}")
            else:
                print(f"   • {desc} → No entities")

        return {
            "success": True,
            "entities_data": entities_data,
            "time_taken": time_taken,
            "tokens": {
                "input": input_tokens_actual,
                "output": output_tokens_actual,
                "total": total_tokens
            },
            "cost": {
                "usd": total_cost_usd,
                "inr": total_cost_inr
            }
        }

    except Exception as e:
        print(f"\n✗ Error: {e}")
        return {
            "success": False,
            "error": str(e)
        }


def main():
    print("="*70)
    print("DeepSeek Entity Extraction Test via OpenRouter")
    print("="*70)

    # Check for API key
    api_key = os.getenv("OPEN_ROUTER")
    if not api_key:
        print("\n✗ Error: OPEN_ROUTER not found in .env file")
        print("Please add: OPEN_ROUTER=your_key_here")
        return

    print(f"✓ API key found: {api_key[:20]}...")

    # Initialize OpenRouter client
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )

    # Test with one page
    result = extract_entities_from_page(client, SAMPLE_PAGE_TRANSACTIONS, page_num=1)

    if result["success"]:
        print(f"\n{'='*70}")
        print("✅ Test Completed Successfully!")
        print(f"{'='*70}")

        # Project costs for larger volumes
        cost_per_page = result["cost"]["inr"]

        print(f"\n💰 Cost Projections:")
        print(f"   • 1 page (10 transactions): ₹{cost_per_page:.4f}")
        print(f"   • 10 pages (100 transactions): ₹{cost_per_page * 10:.2f}")
        print(f"   • 100 pages (1000 transactions): ₹{cost_per_page * 100:.2f}")
        print(f"   • 1000 pages (10,000 transactions): ₹{cost_per_page * 1000:.2f}")

        print(f"\n⚡ Performance:")
        print(f"   • Time per page: {result['time_taken']:.2f}s")
        print(f"   • Estimated time for 100 pages: {result['time_taken'] * 100 / 60:.1f} minutes")
        print(f"   • Estimated time for 1000 pages: {result['time_taken'] * 1000 / 60:.1f} minutes")

        # Compare with Google NLP
        google_cost_per_transaction = 0.083  # INR
        google_cost_for_10 = google_cost_per_transaction * 10
        deepseek_cost_for_10 = cost_per_page
        savings = ((google_cost_for_10 - deepseek_cost_for_10) / google_cost_for_10) * 100

        print(f"\n📊 Comparison with Google NLP API:")
        print(f"   • Google NLP (10 transactions): ₹{google_cost_for_10:.2f}")
        print(f"   • DeepSeek (10 transactions): ₹{deepseek_cost_for_10:.4f}")
        print(f"   • Savings: {savings:.1f}%")

    else:
        print(f"\n{'='*70}")
        print("❌ Test Failed")
        print(f"{'='*70}")


if __name__ == "__main__":
    main()