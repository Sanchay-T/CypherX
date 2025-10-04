"""
Entity extraction service using DeepSeek via OpenRouter
Extracts person and company names from transaction descriptions
"""

import os
import re
import logging
from typing import Dict, List
from collections import defaultdict
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

LOGGER = logging.getLogger(__name__)

USD_TO_INR = 83
DEEPSEEK_INPUT_COST_PER_1M = 0.14  # USD
DEEPSEEK_OUTPUT_COST_PER_1M = 0.28  # USD


class EntityExtractionService:
    """Service for extracting entities (person/company names) from transaction descriptions"""

    def __init__(self):
        api_key = os.getenv("OPEN_ROUTER")
        if not api_key:
            LOGGER.warning("OPEN_ROUTER API key not found, entity extraction disabled")
            self.client = None
        else:
            self.client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key,
            )


    def should_extract_entities(self, description: str) -> bool:
        """
        Pre-filter to skip descriptions that will never have person/company names
        Returns True if we should call API, False to skip
        """
        if not description or not isinstance(description, str):
            return False

        # Skip patterns - descriptions that never have entities
        skip_patterns = [
            r'\b(OPENING|CLOSING)\s*BALANCE\b',
            r'^tofor\d+$',  # Technical codes
            r'^\d{10,}:int\.pd:',  # Interest payment codes
            r'^transaction.*total.*closing.*balance',  # Summary text
            r'\bATM\s+(W(ITH)?D(RAWAL)?L?|WDL|CASH)\b',
            r'\bCASH\s+W(ITH)?D(RAWAL)?L?\b',
            r'\bCASH\s+DEPOSIT\b',
            r'\bINTEREST\s+(CREDIT(ED)?|PAID|EARNED)\b',
            r'\b(SERVICE|ANNUAL|PROCESSING|MAINTENANCE)\s+(CHARGE|FEE)S?\b',
            r'\bMIN(IMUM)?\s+BAL(ANCE)?\s+(CHARGE|FEE)\b',
            r'\bSMS\s+CHARGES?\b',
            r'\bATM\s+(CHARGE|FEE)S?\b',
            r'\b(GST|TDS)\b',
            r'\bREVERSAL\b',
            r'\bREFUND\b',
            r'\bCHEQUE\s+(BOUNCE|RETURN|DISHONO(U)?R)\b',
        ]

        # Check if matches any skip pattern
        for pattern in skip_patterns:
            if re.search(pattern, description, re.IGNORECASE):
                return False

        # Check if description has any meaningful alphabetic words (4+ letters)
        words = re.findall(r'[a-zA-Z]{4,}', description.lower())
        if not words:
            return False

        # Skip if only technical banking terms
        technical_terms = {'imps', 'neft', 'rtgs', 'payu', 'hdfcban', 'axis', 'bank', 'inb', 'icici', 'hdfc'}
        potential_names = [w for w in words if w not in technical_terms]

        return len(potential_names) > 0

    def extract_entities_batch(self, descriptions: List[str]) -> Dict[str, List[str]]:
        """
        Extract entities from a batch of descriptions in one API call
        Returns: dict mapping description -> list of entity names
        """
        if not self.client:
            LOGGER.warning("Entity extraction client not initialized")
            return {desc: [] for desc in descriptions}

        if not descriptions:
            return {}

        # Build prompt
        import json
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
- Exclude: locations, payment types, transaction codes, bank names
- If no entities found, return empty array []
- Return ONLY the JSON array, no explanation"""

        try:
            completion = self.client.chat.completions.create(
                extra_headers={
                    "HTTP-Referer": "https://cyphersol.com",
                    "X-Title": "CypherX Entity Extractor",
                },
                model="deepseek/deepseek-v3.2-exp",
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
            )

            response_text = completion.choices[0].message.content

            # Extract JSON from response
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

            # Log cost
            usage = completion.usage
            input_cost = (usage.prompt_tokens / 1_000_000) * DEEPSEEK_INPUT_COST_PER_1M
            output_cost = (usage.completion_tokens / 1_000_000) * DEEPSEEK_OUTPUT_COST_PER_1M
            total_cost_inr = (input_cost + output_cost) * USD_TO_INR

            LOGGER.info(
                f"Entity extraction: {len(descriptions)} descriptions, "
                f"cost: ₹{total_cost_inr:.6f}, tokens: {usage.total_tokens}"
            )

            return result

        except Exception as e:
            LOGGER.error(f"Entity extraction failed: {e}")
            return {desc: [] for desc in descriptions}

    def extract_entities_from_descriptions(
        self,
        descriptions: List[str],
        batch_size: int = 20,
        existing_matches: Dict[str, str] | None = None,
    ) -> Dict[str, str]:
        """
        Extract entities from a list of descriptions

        Args:
            descriptions: List of transaction descriptions
            batch_size: Number of descriptions per API call

        Returns:
            Dict mapping description -> comma-separated entity names
        """
        if not self.client:
            LOGGER.warning("Entity extraction disabled (no API key)")
            return {desc: "" for desc in descriptions}

        LOGGER.info(f"Starting entity extraction for {len(descriptions)} descriptions")

        existing_matches = existing_matches or {}

        custom_matched_count = sum(1 for v in existing_matches.values() if v)

        unmatched_descriptions = [
            desc for desc in descriptions if not existing_matches.get(desc)
        ]
        filtered_descriptions = [
            desc for desc in unmatched_descriptions if self.should_extract_entities(desc)
        ]

        skipped_due_to_existing = len(descriptions) - len(unmatched_descriptions)
        skipped_due_to_filters = len(unmatched_descriptions) - len(filtered_descriptions)
        skipped_count = skipped_due_to_existing + skipped_due_to_filters

        LOGGER.info(
            "Pre-filter: kept %s, skipped %s (already matched by custom: %s, filtered out: %s)",
            len(filtered_descriptions),
            skipped_count,
            custom_matched_count,
            skipped_due_to_filters,
        )

        # Step 2: Deduplicate
        unique_descriptions = list(set(filtered_descriptions))
        occurrence_count = defaultdict(int)
        for desc in filtered_descriptions:
            occurrence_count[desc] += 1

        LOGGER.info(
            f"Deduplication: {len(unique_descriptions)} unique "
            f"(saved {len(filtered_descriptions) - len(unique_descriptions)})"
        )

        # Step 3: Extract entities in batches (AI for remaining)
        all_entities = dict(existing_matches)  # Start with provided matches

        for i in range(0, len(unique_descriptions), batch_size):
            batch = unique_descriptions[i:i+batch_size]
            batch_num = (i // batch_size) + 1
            total_batches = (len(unique_descriptions) + batch_size - 1) // batch_size

            LOGGER.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} descriptions)")

            batch_entities = self.extract_entities_batch(batch)
            all_entities.update(batch_entities)

        # Step 4: Map back to all descriptions (including duplicates)
        result = {}
        for desc in descriptions:
            if desc in all_entities:
                entities = all_entities[desc]
                result[desc] = ", ".join(entities) if entities else ""
            else:
                result[desc] = ""

        entities_found = sum(1 for v in result.values() if v)
        LOGGER.info(
            f"Entity extraction complete: found entities in {entities_found}/{len(descriptions)} descriptions"
        )

        return result
