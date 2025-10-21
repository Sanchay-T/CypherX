#!/usr/bin/env python3
"""
Clean the CSV by removing header/metadata rows
"""
import pandas as pd
import re

# Read the messy CSV
df = pd.read_csv("tmp/full_statement_complete.csv")

print(f"Original rows: {len(df)}")

# Filter to only keep rows where Transaction Date is an actual date (DD/MM/YYYY format)
def is_valid_date(date_str):
    """Check if string looks like a date DD/MM/YYYY"""
    if not isinstance(date_str, str):
        return False
    # Match pattern DD/MM/YYYY
    return bool(re.match(r'^\d{2}/\d{2}/\d{4}$', date_str.strip()))

# Keep only rows with valid transaction dates
df_clean = df[df['Transaction Date'].apply(is_valid_date)].copy()

print(f"Cleaned rows: {len(df_clean)}")
print(f"Removed {len(df) - len(df_clean)} junk rows")

# Save cleaned CSV
df_clean.to_csv("tmp/full_statement_complete_CLEAN.csv", index=False)
print(f"\n✅ Saved cleaned CSV to: tmp/full_statement_complete_CLEAN.csv")

# Show first 10 rows
print(f"\nFirst 10 transactions:")
print(df_clean.head(10).to_string())

# Show column summary
print(f"\nColumns: {list(df_clean.columns)}")
print(f"Total transactions: {len(df_clean)}")
print(f"Date range: {df_clean['Transaction Date'].min()} to {df_clean['Transaction Date'].max()}")
