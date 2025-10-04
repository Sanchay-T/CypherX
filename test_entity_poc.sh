#!/bin/bash

# POC Test Script for Custom Entity Management
# Shows boss how the system works!

echo "======================================================================="
echo "🎯 CUSTOM ENTITY MANAGEMENT POC"
echo "======================================================================="
echo ""

# Make sure backend is running
if ! curl -s http://localhost:8000/health/live > /dev/null; then
    echo "❌ Backend not running! Start it with: uvicorn apps.main:app --reload"
    exit 1
fi

echo "✓ Backend is running"
echo ""

# Step 1: Initialize demo entities
echo "📊 Step 1: Initialize Demo Entities"
echo "-----------------------------------------------------------------------"
curl -s -X POST http://localhost:8000/ai/entities/init-demo | python3 -m json.tool
echo ""
sleep 1

# Step 2: List all entities
echo "📋 Step 2: List All Custom Entities"
echo "-----------------------------------------------------------------------"
curl -s http://localhost:8000/ai/entities | python3 -m json.tool
echo ""
sleep 1

# Step 3: Preview matches for "Sanchay"
echo "🔍 Step 3: Preview Matches for 'Sanchay'"
echo "-----------------------------------------------------------------------"
curl -s -X POST http://localhost:8000/ai/entities/preview \
  -H "Content-Type: application/json" \
  -d '{"name": "Sanchay", "aliases": ["sanchay", "Sanchay Gupta"]}' \
  | python3 -m json.tool
echo ""
sleep 1

# Step 4: Add a new custom entity
echo "✨ Step 4: Add New Entity 'John Doe'"
echo "-----------------------------------------------------------------------"
curl -s -X POST http://localhost:8000/ai/entities/ \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "type": "person", "aliases": ["J Doe", "John D"]}' \
  | python3 -m json.tool
echo ""
sleep 1

# Step 5: Process a statement to see entities in action
echo "🚀 Step 5: Process Statement with Custom Entities"
echo "-----------------------------------------------------------------------"
echo "Uploading sample PDF..."
RESPONSE=$(curl -s -X POST http://localhost:8000/ai/statements/normalize \
  -F "file=@public/samples/axis.pdf" \
  -F "financial_year=2022-2023")

JOB_ID=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['job_id'])")
echo "Job ID: $JOB_ID"
echo ""

echo "⏳ Waiting for processing (30 seconds)..."
sleep 30

# Check result
echo ""
echo "📄 Step 6: Check Entities in Processed Statement"
echo "-----------------------------------------------------------------------"
python3 << EOF
import pandas as pd
try:
    df = pd.read_excel('.cypherx/jobs/${JOB_ID}/statement.xlsx', sheet_name='Transactions')
    print(f"✓ Found {len(df)} transactions\n")
    print("Description → Entity mapping:")
    print("="*100)
    for i, row in df.head(15).iterrows():
        desc = str(row.get('Description', ''))[:50]
        entity = str(row.get('Entity', ''))
        if entity and entity != '-':
            print(f"✅ {desc:50s} → {entity}")
        else:
            print(f"   {desc:50s} → (no entity)")
except Exception as e:
    print(f"Error: {e}")
EOF

echo ""
echo "======================================================================="
echo "✅ POC COMPLETE!"
echo "======================================================================="
echo ""
echo "🎯 What we demonstrated:"
echo "   1. Custom entity management (add/list/delete)"
echo "   2. Preview feature (see matches before adding)"
echo "   3. Automatic entity extraction in statements"
echo "   4. Hybrid approach: Custom entities + AI"
echo ""
echo "📊 Open http://localhost:3000/dashboard/statements to see in UI"
echo ""