import requests
import os
import subprocess
import base64
import json
import datetime

def get_access_token():
    """Get Google Cloud access token using multiple methods"""
    # Method 1: Try gcloud CLI
    try:
        process = subprocess.Popen(
            "gcloud auth print-access-token",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True
        )
        (access_token_bytes, err) = process.communicate()

        if process.returncode == 0:
            access_token = access_token_bytes.decode("utf-8").strip()
            return access_token
        else:
            print(f"gcloud auth failed: {err.decode('utf-8').strip()}")
    except Exception as e:
        print(f"Exception with gcloud auth: {e}")

    # Method 2: Try using google-auth library if available
    try:
        from google.auth import default
        from google.auth.transport.requests import Request

        credentials, project = default()
        credentials.refresh(Request())
        return credentials.token
    except ImportError:
        print("google-auth library not available. Install with: pip install google-auth")
        return None
    except Exception as e:
        print(f"Error with google-auth: {e}")
        return None

def encode_pdf_to_base64(pdf_path):
    """Encode PDF file to base64"""
    try:
        with open(pdf_path, "rb") as pdf_file:
            pdf_data = pdf_file.read()
            base64_pdf = base64.b64encode(pdf_data).decode('utf-8')
            return base64_pdf
    except Exception as e:
        print(f"Error encoding PDF: {e}")
        return None

def calculate_cost_analysis(usage_info, dimensions, markdown_content, base64_size):
    """Calculate detailed cost analysis for the OCR API usage"""
    print("\n" + "="*80)
    print("💰 COST ANALYSIS & USAGE METRICS")
    print("="*80)

    # Mistral OCR pricing (approximate - check latest pricing)
    # Note: These are estimated rates - actual pricing may vary
    COST_PER_1K_PAGES = 0.10  # $0.10 per 1000 pages (estimated)
    COST_PER_MB = 0.05  # $0.05 per MB processed (estimated)

    pages_processed = usage_info.get('pages_processed', 1)
    doc_size_bytes = usage_info.get('doc_size_bytes', 0)
    doc_size_mb = doc_size_bytes / (1024 * 1024)

    # Calculate costs
    page_cost = (pages_processed / 1000) * COST_PER_1K_PAGES
    size_cost = doc_size_mb * COST_PER_MB
    total_estimated_cost = max(page_cost, size_cost)  # Usually billed by the higher of the two

    print(f"📄 DOCUMENT METRICS:")
    print(f"   • Pages processed: {pages_processed}")
    print(f"   • Document size: {doc_size_bytes:,} bytes ({doc_size_mb:.3f} MB)")
    print(f"   • Page dimensions: {dimensions.get('width', 0)}×{dimensions.get('height', 0)} @ {dimensions.get('dpi', 0)} DPI")
    print(f"   • Base64 encoded size: {base64_size:,} characters")
    print(f"   • Extracted text length: {len(markdown_content):,} characters")

    print(f"\n💵 COST BREAKDOWN (ESTIMATED):")
    print(f"   • Page-based cost: ${page_cost:.6f} ({pages_processed} pages × ${COST_PER_1K_PAGES}/1000)")
    print(f"   • Size-based cost: ${size_cost:.6f} ({doc_size_mb:.3f} MB × ${COST_PER_MB}/MB)")
    print(f"   • Estimated total cost: ${total_estimated_cost:.6f}")

    print(f"\n📊 SCALING PROJECTIONS:")
    # Project costs for different volumes
    volumes = [1, 10, 100, 1000, 10000]
    for volume in volumes:
        if volume == 1:
            print(f"   • {volume:,} page like this: ${total_estimated_cost * volume:.6f}")
        else:
            print(f"   • {volume:,} pages like this: ${total_estimated_cost * volume:.4f}")

    print(f"\n🔢 EFFICIENCY METRICS:")
    chars_per_dollar = len(markdown_content) / total_estimated_cost if total_estimated_cost > 0 else 0
    pages_per_dollar = 1 / total_estimated_cost if total_estimated_cost > 0 else 0

    print(f"   • Characters extracted per $: {chars_per_dollar:,.0f}")
    print(f"   • Pages processed per $: {pages_per_dollar:,.0f}")
    print(f"   • Cost per character: ${total_estimated_cost / len(markdown_content):.8f}" if len(markdown_content) > 0 else "   • Cost per character: N/A")

    print(f"\n📈 MONTHLY ESTIMATES (30 days):")
    daily_volumes = [10, 100, 500, 1000]
    for daily_vol in daily_volumes:
        monthly_cost = total_estimated_cost * daily_vol * 30
        print(f"   • {daily_vol:,} pages/day: ${monthly_cost:.2f}/month")

    print(f"\n⚠️  NOTE: These are estimated costs based on typical OCR pricing.")
    print(f"   Check official Mistral AI pricing for accurate rates.")

    return {
        'total_cost': total_estimated_cost,
        'pages_processed': pages_processed,
        'doc_size_mb': doc_size_mb,
        'chars_extracted': len(markdown_content),
        'efficiency_chars_per_dollar': chars_per_dollar,
        'efficiency_pages_per_dollar': pages_per_dollar
    }

def analyze_table_accuracy(markdown_content):
    """Analyze the accuracy of table extraction"""
    print("\n" + "="*80)
    print("📊 TABLE DATA ACCURACY ANALYSIS")
    print("="*80)

    # Expected transactions from the PDF
    expected_transactions = [
        {"date": "04-04-2022", "debit": "24000.00", "credit": "", "balance": "50738.87", "particulars": "IMPS/P2A/209411650274/Sanjan/HDFCBAN"},
        {"date": "01-05-2022", "debit": "", "credit": "838166.00", "balance": "888904.87", "particulars": "TO For 921040060268923"},
        {"date": "01-05-2022", "debit": "700000.00", "credit": "", "balance": "188904.87", "particulars": "INB-TD/922040061366717/ARKA BISWAS"},
        {"date": "02-05-2022", "debit": "43935.00", "credit": "", "balance": "144969.87", "particulars": "IMPS/P2A/212213670084/Shubhy/HDFCBAN"},
        {"date": "03-05-2022", "debit": "599.00", "credit": "", "balance": "144370.87", "particulars": "INB/889671238/PAYU.IN/"},
        {"date": "29-06-2022", "debit": "", "credit": "418819.00", "balance": "563189.87", "particulars": "TO For 921040065564145"},
        {"date": "01-07-2022", "debit": "", "credit": "927.00", "balance": "564116.87", "particulars": "Int.Pd:01-04-2022 to 30-06-2022"},
        {"date": "02-07-2022", "debit": "999.00", "credit": "", "balance": "563117.87", "particulars": "INB/897673481/PAYU.IN/"},
        {"date": "25-07-2022", "debit": "500000.00", "credit": "", "balance": "63117.87", "particulars": "INB-TD/922040070298814/ARKA BISWAS"},
        {"date": "02-10-2022", "debit": "", "credit": "1464.00", "balance": "64581.87", "particulars": "Int.Pd:01-07-2022 to 30-09-2022"},
        {"date": "01-01-2023", "debit": "", "credit": "488.00", "balance": "65069.87", "particulars": "Int.Pd:01-10-2022 to 31-12-2022"},
        {"date": "31-03-2023", "debit": "", "credit": "481.00", "balance": "65550.87", "particulars": "Int.Pd:01-01-2023 to 31-03-2023"}
    ]

    # Extract table rows from markdown
    lines = markdown_content.split('\n')
    table_started = False
    extracted_rows = []

    for line in lines:
        if '| Tran Date |' in line:
            table_started = True
            continue
        if table_started and line.startswith('|') and 'OPENING BALANCE' not in line and 'TRANSACTION TOTAL' not in line and 'CLOSING BALANCE' not in line and ':--:' not in line:
            if line.strip() != '|  |  |  |  |  |  |  |':  # Skip empty rows
                extracted_rows.append(line)

    print(f"✅ Expected transactions: {len(expected_transactions)}")
    print(f"✅ Extracted table rows: {len(extracted_rows)}")

    # Analyze specific data points
    accuracy_score = 0
    total_checks = 0

    print("\n🔍 DETAILED TRANSACTION ANALYSIS:")
    print("-" * 60)

    for i, row in enumerate(extracted_rows):
        if i < len(expected_transactions):
            expected = expected_transactions[i]
            cells = [cell.strip() for cell in row.split('|')[1:-1]]  # Remove first and last empty cells

            if len(cells) >= 6:
                extracted_date = cells[0].strip()
                extracted_particulars = cells[2].strip()
                extracted_debit = cells[3].strip()
                extracted_credit = cells[4].strip()
                extracted_balance = cells[5].strip()

                print(f"\n📅 Transaction {i+1}:")
                print(f"   Date: Expected='{expected['date']}' | Extracted='{extracted_date}' | ✅" if expected['date'] in extracted_date else f"   Date: Expected='{expected['date']}' | Extracted='{extracted_date}' | ❌")
                print(f"   Debit: Expected='{expected['debit']}' | Extracted='{extracted_debit}' | ✅" if expected['debit'] == extracted_debit else f"   Debit: Expected='{expected['debit']}' | Extracted='{extracted_debit}' | ❌")
                print(f"   Credit: Expected='{expected['credit']}' | Extracted='{extracted_credit}' | ✅" if expected['credit'] == extracted_credit else f"   Credit: Expected='{expected['credit']}' | Extracted='{extracted_credit}' | ❌")
                print(f"   Balance: Expected='{expected['balance']}' | Extracted='{extracted_balance}' | ✅" if expected['balance'] == extracted_balance else f"   Balance: Expected='{expected['balance']}' | Extracted='{extracted_balance}' | ❌")

                # Count accuracy
                if expected['date'] in extracted_date: accuracy_score += 1
                if expected['debit'] == extracted_debit: accuracy_score += 1
                if expected['credit'] == extracted_credit: accuracy_score += 1
                if expected['balance'] == extracted_balance: accuracy_score += 1
                total_checks += 4

    overall_accuracy = (accuracy_score / total_checks * 100) if total_checks > 0 else 0
    print(f"\n📈 OVERALL ACCURACY: {accuracy_score}/{total_checks} = {overall_accuracy:.1f}%")

    # Check key account details
    print("\n🏦 ACCOUNT DETAILS EXTRACTION:")
    print("-" * 40)
    account_details = {
        "Account Holder": "ARKA BISWAS",
        "Account Number": "916010029755238",
        "IFSC Code": "UTIB0000695",
        "Customer ID": "865922261",
        "Opening Balance": "74738.87",
        "Closing Balance": "65550.87"
    }

    for detail, expected_value in account_details.items():
        found = expected_value in markdown_content
        print(f"   {detail}: {'✅ Found' if found else '❌ Missing'} - {expected_value}")

def test_mistral_ocr():
    """Test Mistral OCR API with the provided PDF"""

    # Environment variables
    MODEL_ID = "mistral-ocr-2505"
    PROJECT_ID = "cyphersol-api"
    REGION = "us-central1"

    # PDF file path
    pdf_path = "/Users/sanchay/Documents/projects/cyphersol/CypherX/apps/statements/AXIS.pdf"

    print("🚀 MISTRAL OCR API TEST - DETAILED ANALYSIS")
    print("="*80)
    print(f"📄 Document: AXIS Bank Statement (First Page Only)")
    print(f"🔧 Model: {MODEL_ID}")
    print(f"🌍 Region: {REGION}")
    print(f"📂 Project: {PROJECT_ID}")
    print(f"📍 File: {pdf_path}")
    print("="*80)

    # Get access token
    print("\n🔐 Authenticating with Google Cloud...")
    access_token = get_access_token()
    if not access_token:
        print("❌ Authentication failed!")
        return

    print("✅ Authentication successful!")

    # Encode PDF to base64
    print("\n📦 Encoding PDF to base64...")
    base64_pdf = encode_pdf_to_base64(pdf_path)
    if not base64_pdf:
        print("❌ PDF encoding failed!")
        return

    print(f"✅ PDF encoded successfully!")
    print(f"   📊 Base64 size: {len(base64_pdf):,} characters")
    print(f"   📏 Original size: ~{len(base64_pdf) * 3 // 4:,} bytes")

    # Construct API URL
    url = f"https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{REGION}/publishers/mistralai/models/{MODEL_ID}:rawPredict"

    print(f"\n🌐 API Endpoint: {url}")

    # Prepare payload
    payload = {
        "model": MODEL_ID,
        "document": {
            "type": "document_url",
            "document_url": f"data:application/pdf;base64,{base64_pdf}",
        },
        "pages": "0"  # First page only
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    print("\n🚀 Sending OCR request...")

    try:
        response = requests.post(url=url, headers=headers, json=payload)

        print(f"📡 Response Status: {response.status_code}")

        if response.status_code == 200:
            response_dict = response.json()

            # Extract key metrics
            pages_info = response_dict.get('pages', [])
            usage_info = response_dict.get('usage_info', {})

            if pages_info:
                page_data = pages_info[0]
                markdown_content = page_data.get('markdown', '')
                dimensions = page_data.get('dimensions', {})

                print(f"✅ OCR Processing successful!")
                print(f"   📊 Pages processed: {usage_info.get('pages_processed', 0)}")
                print(f"   📏 Document size: {usage_info.get('doc_size_bytes', 0):,} bytes")
                print(f"   🖼️  Page dimensions: {dimensions.get('width', 0)}x{dimensions.get('height', 0)} @ {dimensions.get('dpi', 0)} DPI")
                print(f"   📝 Extracted content length: {len(markdown_content):,} characters")

                # Cost analysis
                cost_analysis = calculate_cost_analysis(usage_info, dimensions, markdown_content, len(base64_pdf))

                # Detailed accuracy analysis
                analyze_table_accuracy(markdown_content)

                print("\n" + "="*80)
                print("📄 FULL EXTRACTED CONTENT (MARKDOWN)")
                print("="*80)
                print(markdown_content)

                print("\n" + "="*80)
                print("🔧 RAW API RESPONSE")
                print("="*80)
                print("📡 Complete JSON Response from Mistral OCR API:")
                print("-" * 60)
                print(json.dumps(response_dict, indent=2, ensure_ascii=False))

                print("\n" + "="*80)
                print("📋 RAW RESPONSE BREAKDOWN")
                print("="*80)

                # Show request details
                print("🌐 REQUEST DETAILS:")
                print(f"   • URL: {url}")
                print(f"   • Method: POST")
                print(f"   • Model: {response_dict.get('model', 'N/A')}")
                print(f"   • Pages requested: First page only (pages='0')")

                # Show response headers
                print(f"\n📡 RESPONSE HEADERS:")
                for header, value in response.headers.items():
                    print(f"   • {header}: {value}")

                # Show response structure
                print(f"\n🏗️  RESPONSE STRUCTURE:")
                print(f"   • pages: Array of {len(pages_info)} page(s)")
                print(f"   • model: {response_dict.get('model', 'N/A')}")
                print(f"   • document_annotation: {response_dict.get('document_annotation', 'null')}")
                print(f"   • usage_info: {usage_info}")

                # Show page-level details
                if pages_info:
                    for i, page in enumerate(pages_info):
                        print(f"\n   📄 Page {i+1} Details:")
                        print(f"      • index: {page.get('index', 'N/A')}")
                        print(f"      • markdown length: {len(page.get('markdown', ''))} characters")
                        print(f"      • images: {len(page.get('images', []))} image(s)")
                        dims = page.get('dimensions', {})
                        print(f"      • dimensions: {dims.get('width', 0)}x{dims.get('height', 0)} @ {dims.get('dpi', 0)} DPI")

                print(f"\n📊 PAYLOAD SENT:")
                print(f"   • model: {payload['model']}")
                print(f"   • document.type: {payload['document']['type']}")
                print(f"   • document.document_url: data:application/pdf;base64,[{len(base64_pdf)} chars]")
                print(f"   • pages: {payload.get('pages', 'all pages')}")

                print(f"\n🔍 RAW MARKDOWN CONTENT:")
                print("-" * 60)
                print(markdown_content)

                # Save raw response to file
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                raw_file = f"mistral_ocr_raw_response_{timestamp}.json"

                # Prepare complete response data for file
                complete_response = {
                    "timestamp": timestamp,
                    "request": {
                        "url": url,
                        "method": "POST",
                        "headers": dict(headers),
                        "payload": {
                            "model": payload['model'],
                            "document": {
                                "type": payload['document']['type'],
                                "document_url": f"data:application/pdf;base64,[{len(base64_pdf)} chars - truncated for file size]"
                            },
                            "pages": payload.get('pages', 'all')
                        }
                    },
                    "response": {
                        "status_code": response.status_code,
                        "headers": dict(response.headers),
                        "body": response_dict
                    }
                }

                try:
                    with open(raw_file, 'w', encoding='utf-8') as f:
                        json.dump(complete_response, f, indent=2, ensure_ascii=False)
                    print(f"\n💾 RAW RESPONSE SAVED:")
                    print(f"   • File: {raw_file}")
                    print(f"   • Size: {os.path.getsize(raw_file)} bytes")
                    print(f"   • Contains: Complete request/response cycle with headers")
                except Exception as e:
                    print(f"\n❌ Failed to save raw response: {e}")

            else:
                print("❌ No pages found in response")

        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"📡 Response: {response.text}")

    except Exception as e:
        print(f"💥 Error: {e}")

def test_full_pdf_cost_estimate():
    """Test the entire PDF to get full document cost estimate"""

    # Environment variables
    MODEL_ID = "mistral-ocr-2505"
    PROJECT_ID = "cyphersol-api"
    REGION = "us-central1"

    # PDF file path
    pdf_path = "/Users/sanchay/Documents/projects/cyphersol/CypherX/apps/statements/AXIS.pdf"

    print("\n" + "="*80)
    print("📊 FULL PDF COST ESTIMATION")
    print("="*80)
    print(f"📄 Analyzing entire PDF: {pdf_path}")

    # Get access token
    access_token = get_access_token()
    if not access_token:
        print("❌ Authentication failed!")
        return

    # Encode PDF to base64
    base64_pdf = encode_pdf_to_base64(pdf_path)
    if not base64_pdf:
        print("❌ PDF encoding failed!")
        return

    # Construct API URL
    url = f"https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{REGION}/publishers/mistralai/models/{MODEL_ID}:rawPredict"

    # Prepare payload for ALL pages
    payload = {
        "model": MODEL_ID,
        "document": {
            "type": "document_url",
            "document_url": f"data:application/pdf;base64,{base64_pdf}",
        }
        # No "pages" parameter = process all pages
    }

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    print("🚀 Processing entire PDF...")

    try:
        response = requests.post(url=url, headers=headers, json=payload)

        if response.status_code == 200:
            response_dict = response.json()
            pages_info = response_dict.get('pages', [])
            usage_info = response_dict.get('usage_info', {})

            print(f"✅ Full PDF processed successfully!")
            print(f"   📊 Total pages: {len(pages_info)}")
            print(f"   📏 Document size: {usage_info.get('doc_size_bytes', 0):,} bytes")

            total_chars = sum(len(page.get('markdown', '')) for page in pages_info)
            print(f"   📝 Total extracted content: {total_chars:,} characters")

            # Calculate full document cost
            if pages_info:
                # Use first page dimensions as representative
                dimensions = pages_info[0].get('dimensions', {})
                cost_analysis = calculate_cost_analysis(usage_info, dimensions,
                                                      'x' * total_chars, len(base64_pdf))

            print(f"\n📋 PAGE BREAKDOWN:")
            for i, page in enumerate(pages_info):
                page_chars = len(page.get('markdown', ''))
                print(f"   • Page {i+1}: {page_chars:,} characters extracted")

        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"📡 Response: {response.text}")

    except Exception as e:
        print(f"💥 Error: {e}")

if __name__ == "__main__":
    # Test single page first
    test_mistral_ocr()

    # Also run full PDF analysis for comprehensive cost estimate
    test_full_pdf_cost_estimate()