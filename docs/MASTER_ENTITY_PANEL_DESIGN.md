# Master Entity Panel - Design Document

## Overview
A feature that allows users to define custom entities (person names, business names) they want to track across their bank statements. The system will intelligently identify these entities in transaction descriptions and populate the Entity column.

---

## User Flow

### 1. Entity Management Panel
**Location:** `/dashboard/entities` (new page in sidebar)

**Features:**
- Add custom entities with name and type
- View all tracked entities
- Edit/Delete entities
- Bulk import from CSV
- Search and filter entities

### 2. Entity Discovery (Proof Feature)
**Location:** Integrated into upload flow and entity panel

**Features:**
- Preview which transactions contain the entity
- Show match confidence
- Highlight matched text in descriptions
- Show statistics (how many times found across statements)

### 3. Integration with Statement Processing
- When processing statement, match against custom entity list FIRST
- Then use AI extraction for remaining descriptions
- Combined approach: Custom entities + AI = Best results

---

## UI/UX Design

### Page: Master Entity Panel (`/dashboard/entities`)

```
┌─────────────────────────────────────────────────────────────────┐
│  🏢 Master Entity Panel                         [+ Add Entity]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Track specific people and businesses across your statements    │
│                                                                  │
│  ┌──────────────┬──────────────┬────────────┬──────────────┐   │
│  │ Search...    │ Type: All ▼  │  Export    │  Import CSV  │   │
│  └──────────────┴──────────────┴────────────┴──────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Entity Name          Type        Found In   Actions     │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 🧑 Sanchay           Person      247 txns   👁️ ✏️ 🗑️    │   │
│  │ 🏢 Business A        Company     89 txns    👁️ ✏️ 🗑️    │   │
│  │ 🏢 Rajat Traders     Company     156 txns   👁️ ✏️ 🗑️    │   │
│  │ 🧑 John Smith        Person      12 txns    👁️ ✏️ 🗑️    │   │
│  │ 🏢 Amazon India      Company     342 txns   👁️ ✏️ 🗑️    │   │
│  │ 🏢 Flipkart          Company     198 txns   👁️ ✏️ 🗑️    │   │
│  │ 🧑 Arkabiswas        Person      45 txns    👁️ ✏️ 🗑️    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  💡 Tip: Add entities you frequently transact with for better   │
│     categorization and reporting                                │
└─────────────────────────────────────────────────────────────────┘
```

### Modal: Add/Edit Entity

```
┌───────────────────────────────────────────────┐
│  ✨ Add Custom Entity                  [✕]   │
├───────────────────────────────────────────────┤
│                                                │
│  Entity Name *                                 │
│  ┌──────────────────────────────────────────┐ │
│  │ Sanchay                                  │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Entity Type *                                 │
│  ┌──────────────────────────────────────────┐ │
│  │ Person                              ▼   │ │
│  └──────────────────────────────────────────┘ │
│  Options: Person, Company, Business            │
│                                                │
│  Aliases (optional)                            │
│  ┌──────────────────────────────────────────┐ │
│  │ + Add alias                              │ │
│  └──────────────────────────────────────────┘ │
│  💡 e.g., "Sanchay Gupta", "S Gupta"          │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │ 🔍 Preview Matches (optional)           │  │
│  │                                         │  │
│  │ Search in recent statements to see      │  │
│  │ where this entity appears               │  │
│  │                                         │  │
│  │        [Preview in Statements]          │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│              [Cancel]  [Save Entity]           │
└───────────────────────────────────────────────┘
```

### Modal: Preview Entity Matches

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Preview: "Sanchay" found in 247 transactions    [✕]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📊 Statistics                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Total Matches: 247  |  Statements: 12  |  Avg: 20.6 │  │
│  │  Total Amount: ₹12,45,678  (Debit: ₹8,23,456)        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  📝 Sample Matches (showing 10 of 247)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Date         Description                      Amount  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 15-Jan-2025  NEFT-SANCHAY GUPTA-SALARY     ₹50,000  │  │
│  │              ^^^^^^^^ ^^^^^ (matched)                │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 18-Jan-2025  UPI-sanchay@okaxis           -₹1,200   │  │
│  │              ^^^^^^^ (matched)                       │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 22-Jan-2025  IMPS-S GUPTA-PAYMENT         -₹15,000  │  │
│  │              ^ ^^^^^ (alias matched)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ✅ This entity will be tracked across all statements       │
│                                                              │
│                         [Got it]  [Add Entity]              │
└─────────────────────────────────────────────────────────────┘
```

### Integration in Upload Flow

```
┌───────────────────────────────────────────────┐
│  📄 Upload Statement                   [✕]   │
├───────────────────────────────────────────────┤
│  [File upload area...]                         │
│  [Bank name, password fields...]               │
│                                                │
│  ✨ New Feature!                               │
│  ┌─────────────────────────────────────────┐  │
│  │ 🏢 Entity Tracking                      │  │
│  │                                         │  │
│  │ ☑️ Use Master Entity List (7 entities)  │  │
│  │ ☐ Extract new entities using AI        │  │
│  │                                         │  │
│  │ [Manage Entities →]                     │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│              [Cancel]  [Upload & Analyze]      │
└───────────────────────────────────────────────┘
```

### Transactions View Enhancement

```
Transactions Sheet (with Entity column highlighted)

┌──────┬─────────────┬────────────────────────┬─────────┬─────────┬───────────┬──────────────┐
│ Date │ Description │ Debit                  │ Credit  │ Balance │ Category  │ Entity       │
├──────┼─────────────┼────────────────────────┼─────────┼─────────┼───────────┼──────────────┤
│ 01-  │ NEFT-       │ 50,000.00              │         │         │ Salary    │ 🧑 Sanchay   │ ✨
│ Jan  │ SANCHAY-SAL │                        │         │         │           │              │
├──────┼─────────────┼────────────────────────┼─────────┼─────────┼───────────┼──────────────┤
│ 05-  │ UPI-AMAZON  │                        │ 1,299   │         │ Shopping  │ 🏢 Amazon    │ ✨
│ Jan  │ PAY INDIA   │                        │         │         │           │              │
├──────┼─────────────┼────────────────────────┼─────────┼─────────┼───────────┼──────────────┤
│ 08-  │ BUSINESS A  │                        │ 25,000  │         │ Business  │ 🏢 Business A│ ✨
│ Jan  │ PAYMENT     │                        │         │         │           │              │
└──────┴─────────────┴────────────────────────┴─────────┴─────────┴───────────┴──────────────┘

🎯 Custom entities are highlighted with icons!
```

---

## Technical Implementation

### Database Schema (Supabase)

```sql
-- Custom entities table
CREATE TABLE entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'person', 'company', 'business'
    aliases TEXT[], -- Array of alternative names
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Entity matches (cache for performance)
CREATE TABLE entity_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID REFERENCES entities(id),
    job_id VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    match_confidence FLOAT, -- 0.0 to 1.0
    matched_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_entities_user_id ON entities(user_id);
CREATE INDEX idx_entity_matches_entity_id ON entity_matches(entity_id);
CREATE INDEX idx_entity_matches_job_id ON entity_matches(job_id);
```

### API Endpoints

```python
# Entity Management
POST   /ai/entities              # Create entity
GET    /ai/entities              # List all user entities
GET    /ai/entities/{id}         # Get entity details
PUT    /ai/entities/{id}         # Update entity
DELETE /ai/entities/{id}         # Delete entity

# Entity Discovery
POST   /ai/entities/preview      # Preview matches for entity
GET    /ai/entities/{id}/matches # Get all matches for entity
POST   /ai/entities/import       # Bulk import from CSV

# Integration
GET    /ai/statements/{job_id}/entities  # Get entities found in statement
```

### Matching Logic (Hybrid Approach)

```python
def extract_entities_hybrid(descriptions, custom_entities, use_ai=True):
    """
    Step 1: Match against custom entities (fast, accurate)
    Step 2: Use AI for remaining descriptions (slower, discovers new)
    """

    results = {}

    # Step 1: Custom entity matching (fuzzy + exact)
    for desc in descriptions:
        matched = match_custom_entities(desc, custom_entities)
        if matched:
            results[desc] = matched

    # Step 2: AI extraction for unmatched (optional)
    if use_ai:
        unmatched = [d for d in descriptions if d not in results]
        if unmatched:
            ai_results = extract_with_deepseek(unmatched)
            results.update(ai_results)

    return results


def match_custom_entities(description, entities):
    """
    Smart fuzzy matching with aliases
    Returns best match with confidence score
    """
    desc_lower = description.lower()

    best_match = None
    best_score = 0.0

    for entity in entities:
        # Check main name
        if entity['name'].lower() in desc_lower:
            return entity['name']

        # Check aliases
        for alias in entity.get('aliases', []):
            if alias.lower() in desc_lower:
                return entity['name']

        # Fuzzy match (using difflib)
        score = fuzzy_match(entity['name'], description)
        if score > best_score and score > 0.7:  # 70% threshold
            best_match = entity['name']
            best_score = score

    return best_match


    for entity in entities:
        return entity['name']

        if scrore > best_score and score > 0.9:
            best_match = entity['']

            fuzzy_math()


        for alias in entity.get('aliases')

```

---

## User Benefits

1. **🎯 Precision Tracking**
   - Track specific people/businesses you care about
   - No more searching through descriptions manually

2. **💰 Cost Savings**
   - Custom matching is FREE (no API calls)
   - AI only used for unknown entities
   - 90%+ cost reduction

3. **📊 Better Insights**
   - See all transactions with "Sanchay" instantly
   - Track payments to "Business A" over time
   - Generate reports by entity

4. **🚀 Proof of Concept**
   - Preview feature shows it works BEFORE adding
   - User sees real matches from their statements
   - Builds confidence in the system

---

## Implementation Priority

### Phase 1: Core (Week 1)
- [ ] Database schema
- [ ] Entity CRUD API
- [ ] Basic UI for entity management
- [ ] Simple exact match in processing

### Phase 2: Smart Matching (Week 2)
- [ ] Fuzzy matching logic
- [ ] Alias support
- [ ] Preview/proof feature
- [ ] Match confidence scores

### Phase 3: Integration (Week 3)
- [ ] Upload flow integration
- [ ] Hybrid extraction (custom + AI)
- [ ] Statistics dashboard
- [ ] Bulk import/export

---

## Sample Data for Testing

```json
[
  {"name": "Sanchay", "type": "person", "aliases": ["Sanchay Gupta", "S Gupta"]},
  {"name": "Business A", "type": "company", "aliases": ["Business A Pvt Ltd"]},
  {"name": "Rajat Traders", "type": "business", "aliases": ["Rajat Trading Co"]},
  {"name": "Amazon India", "type": "company", "aliases": ["Amazon Pay", "AMZN"]},
  {"name": "Flipkart", "type": "company", "aliases": ["Flipkart Internet"]},
  {"name": "John Smith", "type": "person", "aliases": ["J Smith", "John S"]},
  {"name": "Arkabiswas", "type": "person", "aliases": ["Arka Biswas"]}
]
```

---

This design gives users full control while proving the system works!