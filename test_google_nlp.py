#!/usr/bin/env python3
"""
Test script to verify Google Cloud Natural Language API is working
Tests the analyzeEntities method with sample transaction descriptions
"""

from google.cloud import language_v1
import os


def test_analyze_entities():
    """Test if Google NLP API is working and can extract entities"""

    # Initialize the client
    try:
        client = language_v1.LanguageServiceClient()
        print("✓ Successfully initialized Google Cloud Natural Language client")
    except Exception as e:
        print(f"✗ Failed to initialize client: {e}")
        print("\nMake sure you have:")
        print("1. Enabled the Cloud Natural Language API")
        print("2. Set up authentication: gcloud auth application-default login")
        print("3. Installed the library: pip install google-cloud-language")
        return False

    # Sample transaction descriptions (common in bank statements)
    test_descriptions = [
        "UPI-AMAZON PAY INDIA PRI-QPAYM",
        "NEFT-HDFC BANK LTD-SALARY CREDIT",
        "ATM WDL ICICI BANK CONNAUGHT PLACE",
        "SWIGGY-BANGALORE-FOOD ORDER",
        "FLIPKART INTERNET PVT LTD",
        "NETFLIX.COM MONTHLY SUBSCRIPTION",
        "GOOGLE WORKSPACE PAYMENT",
        "Payment to John Smith for consultancy"
    ]

    print("\n" + "="*60)
    print("Testing Entity Extraction from Transaction Descriptions")
    print("="*60)

    # Pricing: $1 per 1000 text records (1000 units = $1)
    # Each analyzeEntities call = 1 text record
    cost_per_call = 0.001  # $0.001 per call
    total_calls = 0
    total_cost = 0.0

    for description in test_descriptions:
        print(f"\n📝 Description: {description}")

        try:
            # Prepare the document
            document = language_v1.Document(
                content=description,
                type_=language_v1.Document.Type.PLAIN_TEXT
            )

            # Call analyzeEntities
            response = client.analyze_entities(
                document=document,
                encoding_type=language_v1.EncodingType.UTF8
            )

            total_calls += 1
            total_cost += cost_per_call

            # Extract entity names - only PERSON and ORGANIZATION
            entities = []
            for entity in response.entities:
                entity_type = language_v1.Entity.Type(entity.type_).name

                # Filter: only PERSON and ORGANIZATION with salience > 0.1
                if entity_type in ["PERSON", "ORGANIZATION"] and entity.salience > 0.1:
                    entities.append({
                        "name": entity.name,
                        "type": entity_type,
                        "salience": round(entity.salience, 3)
                    })

            if entities:
                print("   ✓ Entities found (PERSON/ORGANIZATION only):")
                for e in entities:
                    print(f"      • {e['name']} ({e['type']}, salience: {e['salience']})")
            else:
                print("   ⚠ No PERSON or ORGANIZATION entities found")

        except Exception as e:
            print(f"   ✗ Error: {e}")
            return False

    print("\n" + "="*60)
    print("✓ All tests passed! Google NLP API is working correctly.")
    print(f"💰 Total API calls: {total_calls}")
    print(f"💰 Total cost: ${total_cost:.6f} (${cost_per_call} per call)")
    print(f"💰 Cost for 1000 transactions: ${total_calls * cost_per_call * (1000/total_calls):.2f}")
    print("="*60)
    return True


def check_credentials():
    """Check if Google Cloud credentials are set up"""
    print("\n🔍 Checking Google Cloud credentials...")

    # Check for GOOGLE_APPLICATION_CREDENTIALS env var
    creds_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if creds_path:
        print(f"✓ GOOGLE_APPLICATION_CREDENTIALS: {creds_path}")
        if os.path.exists(creds_path):
            print("✓ Credentials file exists")
        else:
            print("✗ Credentials file not found at specified path")
            return False
    else:
        print("⚠ GOOGLE_APPLICATION_CREDENTIALS not set (using default credentials)")

    return True


if __name__ == "__main__":
    print("="*60)
    print("Google Cloud Natural Language API Test")
    print("="*60)

    # Check credentials first
    check_credentials()

    # Test the API
    success = test_analyze_entities()

    if success:
        print("\n✅ Ready to integrate with statement processing pipeline!")
    else:
        print("\n❌ Please fix the issues above before proceeding.")