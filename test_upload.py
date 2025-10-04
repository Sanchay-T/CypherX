#!/usr/bin/env python3
"""Test script to verify statement upload endpoint."""
import requests
import time
import json

BASE_URL = "http://localhost:8000"
PDF_PATH = "public/samples/axis.pdf"

print("Testing statement upload endpoint...")
print("=" * 60)

# Step 1: Upload PDF
print(f"\n1. Uploading PDF: {PDF_PATH}")
with open(PDF_PATH, 'rb') as f:
    files = {'file': ('axis.pdf', f, 'application/pdf')}
    data = {
        'bank_name': 'AXIS',
        'financial_year': '2022-2023'  # PDF contains data from Apr 2022 to Mar 2023
    }
    response = requests.post(f"{BASE_URL}/ai/statements/normalize", files=files, data=data)

print(f"Status: {response.status_code}")
if response.status_code == 200:
    job_data = response.json()
    job_id = job_data['job_id']
    print(f"Job ID: {job_id}")
    print(f"Initial Status: {job_data['status']}")
else:
    print(f"Error: {response.text}")
    exit(1)

# Step 2: Poll for completion
print(f"\n2. Waiting for job to complete...")
max_attempts = 30
for attempt in range(max_attempts):
    time.sleep(2)
    try:
        response = requests.get(f"{BASE_URL}/ai/statements/{job_id}")
        if response.status_code != 200:
            print(f"   Attempt {attempt + 1}: Error {response.status_code}")
            continue

        job_status = response.json()
        status = job_status['status']
        print(f"   Attempt {attempt + 1}: {status}")

        if status == 'completed':
            print("\n✓ Job completed successfully!")

            # Step 3: Check results
            print("\n3. Checking results...")
            result = job_status.get('result', {})
            print(f"   Excel path: {result.get('excel', {}).get('path')}")
            print(f"   Has sheets_data: {result.get('sheets_data') is not None}")

            if result.get('sheets_data'):
                sheets = result['sheets_data']
                print(f"   Sheet names: {list(sheets.keys())}")

                # Show Transactions sheet preview
                if 'Transactions' in sheets:
                    trans = sheets['Transactions']
                    print(f"   Transactions: {len(trans)} rows")
                    if len(trans) > 0:
                        print(f"   Sample row: {trans[0]}")

            break
        elif status == 'failed':
            print(f"\n✗ Job failed!")
            print(f"   Error: {job_status.get('error')}")
            break
    except Exception as e:
        print(f"   Attempt {attempt + 1}: Exception - {e}")

else:
    print(f"\n✗ Job did not complete after {max_attempts} attempts")

print("\n" + "=" * 60)