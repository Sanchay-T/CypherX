# Lending AI Report Template Research Memo (India Market)

## Executive Summary
- Objective: tailor CypherX's AI-generated statement report into a "Lending – India" template that equips PSU/private banks, NBFCs, and fintech lenders with RBI-compliant portfolio intelligence.
- Finding: existing LLM planning → Jinja → PDF workflow remains valid; effectiveness hinges on India-specific prompts, regulatory ratios (GNPA/NNPA, PCR, PSL mix), and contextual metadata (CIBIL scores, CRILC flags, SMA buckets).
- Recommendation: structure the template around six pillars—Portfolio Scale, Segment Health, Risk & Stress, Liquidity & Cashflows, Collateral & Security, Compliance & Supervisory Actions—embedding RBI thresholds, co-lending nuances, and digital lending alerts.
- Outcome: deliver a briefing-ready PDF for leadership that balances prudential oversight with growth levers, enabling faster credit committee reviews while staying audit-ready for RBI inspections and statutory audits.

## Current AI Report Capability Reference
CypherX's statement pipeline already produces a structured `ReportPlan` and renders to PDF through `statement_report.html`. To specialise for India:
1. **Planner prompt**: swap in a lending analyst system prompt referencing RBI norms and Indian terminologies (GNPA, SMA-2, PSL, co-lending).
2. **Context enrichment**: extend `statement_summary` with Indian data feeds—CRILC exposures, CIBIL score bands, PSL classification, GST turnover, Udyam status, CERSAI collateral records.
3. **Presentation**: reuse the PDF template with copy tweaks (e.g., "INR Cr" units, RBI watchpoints) or introduce a variant if compliance tables grow.
No new rendering stack is required; changes live in configuration, prompt scaffolding, and data assembly.

## Indian Lending Landscape Snapshot
### Stakeholder Priorities
- **PSU & Private Banks**: manage GNPA ratios, provisioning coverage, sectoral caps (e.g., steel, infra), adhere to priority sector lending (PSL) targets, and monitor SMA slippages.
- **NBFCs & HFCs**: track cost of funds vs yields, asset-liability mismatches (ALM), securitisation pools, and compliance with scale-based regulation (SBR) tiers.
- **Fintech Lenders & Co-lending Partnerships**: ensure digital lending guideline compliance (2022), balance sheet vs FLDG exposures, customer KFS disclosures, and API-based monitoring.
- **Regulatory / Audit**: RBI, NHB, SIDBI, and credit bureau audits seek evidence of provisioning, CRAR adequacy, and timely reporting (CRILC, CKYCR, FIU-India).

### Operating Context
- Lending portfolios blend retail (home, auto, gold loans), MSME (CGTMSE-backed), agriculture (KCC, Agri term), and corporate exposures (working capital, term loans).
- Data fragmentation across Core Banking Systems, Loan Origination, LOS/LMS, GSTN, ITR filings, CIBIL/Experian/CRIF High Mark, and regional collateral registries complicates unified reporting.
- RBI's emphasis on stress testing (IRB aspirants), climate risk pilots, and digital lending compliance elevates the need for rapid, configurable reporting.

## Regulatory & Compliance Anchors (India)
- **Income Recognition, Asset Classification (IRAC)**: SMA-0/1/2 buckets, NPA definition (>90 DPD), provisioning norms (standard, sub-standard, doubtful, loss).
- **Ind AS 109 / IFRS 9**: Stage 1/2/3 expected credit loss (ECL) disclosures for larger banks and NBFCs.
- **Scale-Based Regulation (SBR)** for NBFCs: CET1 tiers, concentration limits, governance reporting.
- **Digital Lending Guidelines (2022)**: lender of record visibility, key fact statement, first loss default guarantee (FLDG) caps.
- **Priority Sector Lending (PSL)**: 40%/75% targets, sub-targets (agri, MSME, weaker sections) with quarterly reporting.
- **Co-lending Framework**: risk sharing, collection responsibility, and borrower communication splits.
- **Collateral & Security**: CERSAI charge registration, SARFAESI enforcement steps, insurance coverage.

## Recommended Template Architecture
### Analytical Pillars (India Focus)
1. **Portfolio Scale & Mix** – total exposure (INR Cr), sanctioned vs utilised, product mix (retail/MSME/corporate), PSL compliance, yield vs cost of funds.
2. **Segment & Borrower Health** – exposure by sector (Infrastructure, Manufacturing, Services, Agriculture), geographic (state) mix, top borrowers, rating migration, CIBIL/CRIF banding, new-to-bank share.
3. **Risk & Stress Signals** – SMA ladder, GNPA/NNPA ratios, slippage and recovery rates, restructured book, Stage 2/3 balances, credit cost trajectory, CRILC watchlist names, early warning triggers.
4. **Liquidity & Cashflows** – inflow/outflow from statements, ALM mismatches, LCR/NSFR (if applicable), utilisation of working capital lines, undrawn limits, prepayment trends.
5. **Collateral & Security Adequacy** – collateral coverage ratio, valuation ageing, insurance status, CERSAI charge status, gold loan LTVs, mortgage vs unsecured mix.
6. **Compliance & Supervisory Actions** – PSL shortfalls, KYC/AML exceptions, audit observations, RBI inspection action items, digital lending conformance, co-lending reconciliations, recommended management actions.

### Narrative & Tone
- Executive summary: four to five concise sentences emphasising GNPA movement, PSL gaps, urgent regulatory actions, and growth levers.
- Section prose: maximum three sentences plus three concise bullets; highlight "Action" and "Monitor" labels.
- Visualisation prompts: DPD stack, sector exposure heatmap (state × sector), PSL progress vs target, collateral coverage waterfall, liquidity gap line chart.

## India-centric Metric Library
| Pillar | Metrics | Benchmarks / Alerts |
| --- | --- | --- |
| Portfolio Scale | Total outstanding (INR Cr), sanctioned vs utilised %, yield %, cost of funds %, Net Interest Margin (NIM), PSL %, share of co-lending assets | MoM / QoQ delta, RBI PSL 40%/75%, internal ROA target |
| Segment Health | Exposure by sector/state, top 20 borrower share, rating migration (Internal / External), CIBIL bands %, MSME vs retail mix, borrower vintage mix | Sectoral caps, maximum borrower exposure norms, rating downgrade limits |
| Risk & Stress | SMA-0/1/2 pipeline, GNPA %, NNPA %, PCR %, Stage 2/3 balances, slippage ratio, write-offs, recovery %, credit cost bps | Policy limits (e.g., GNPA <4%), RBI IRAC norms, board-approved risk appetite |
| Liquidity & Cashflows | Average monthly inflow/outflow, utilisation %, undrawn commitments, ALM buckets (1-30, 31-90, 91-365), LCR/NSFR, prepayment %, DSCR proxy | ALM tolerance limits, regulatory LCR ≥100%, DSCR covenant |
| Collateral | Coverage ratio, valuation age, insurance expiry count, top collateral shortfalls, CERSAI registration %, gold loan LTV, secured vs unsecured mix | Policy coverage ≥1.3x, valuation <12 months, regulatory filings |
| Compliance & Actions | PSL shortfall (INR Cr), KYC/AML pending %, audit issue ageing, digital lending breaches, co-lending settlement delays, SARFAESI stage | Regulatory due dates, SLA commitments, inspection findings |

## Prompt & Content Strategy (India)
- **System prompt**: "You are CypherX's India lending portfolio analyst. Provide RBI-ready insight on asset quality, PSL compliance, collateral, and digital lending controls. Use concise sentences, cite INR figures, and surface actions first."
- **User payload scaffold**: include `exposures`, `sma_ladder`, `gnpa_metrics`, `psl_progress`, `collateral_registry`, `compliance_log`, `cashflow_trend` sections; allow instructions such as "Flag borrowers nearing SMA-2" or "Highlight PSL agri shortfall".
- **Output guidance**: enforce bullets ≤ 14 words, require every section to include at least one action/recommendation, and tie charts to metrics named above.

## Integration Considerations
- Extend pipeline summary builder to ingest Indian datasets (CRILC exports, bureau bands, PSL classification, ALM buckets) either directly or via enrichment jobs.
- Add `report_template="lending_india"` flag through API/UI; log template selection for audits.
- Provide translation layer for units (₹, INR Cr) and ensure HTML template handles bilingual requirements if regulators request (optional future work).
- Establish evaluation notebooks with anonymised Indian lending portfolios to regression-test `ReportPlan` outputs.
- Collaborate with compliance to map template outputs against RBI supervisory review (SREP) expectations.

## Risks & Open Questions
- **Data granularity**: Do we have Stage 2/3 balances and SMA ladders in structured form, or do we infer from ledger? Missing data will weaken insights.
- **Regional variations**: State cooperative banks and small finance banks follow additional norms (priority sector sub-targets, PSL certificates). Template may need toggles.
- **Co-lending reporting**: Each partner requires borrower-level reconciliation; decide if template should break out lender share percentages.
- **Confidentiality**: GNPA disclosures sensitive—confirm masking rules before including borrower names.
- **Real-time alerts**: Digital lenders may expect daily snapshots; assess frequency vs current batch workflow.

## Sample Report Structure & Excerpt (Client: Dimay Head (5), India)
**Cover**
- Headline: "India Lending Portfolio Risk Brief – September 2024"
- Prepared for: Dimay Head (5)
- Period: 01 Sep 2024 – 30 Sep 2024
- Generated on: 21 Sep 2024, 10:05 AM IST

**Executive Summary (excerpt)**
- Portfolio outstanding ₹4,826 Cr; growth +7.4% MoM driven by MSME working capital renewals.
- GNPA at 3.2% (↓14 bps); SMA-2 pipeline up 22% led by manufacturing accounts.
- PSL compliance at 41.5% vs 40% target; agri sub-target short by ₹38 Cr.
- Action: Initiate restructuring outreach for Greenfield Auto (61-90 DPD) and trigger collateral revaluation for Silverline Textiles (coverage 1.18x).

**Section Snapshots**
1. *Portfolio Scale & Mix*
   - Highlights: PSU co-lending share at 18%; top 20 borrowers hold 27% of book; blended yield 11.2% vs cost of funds 6.9%.
   - Chart: Donut of exposure mix (Retail 35%, MSME 33%, Corporate 24%, Agri 8%).

2. *Risk & Stress*
   - Highlights: SMA-1 rising to ₹162 Cr; GNPA 3.2%, NNPA 1.2%; PCR sustained at 63% vs 60% floor.
   - Action: Escalate DSCR breach (<1.1) for Delta Components; monitor Stage 2 jump in textile cluster.
   - Chart: Stacked bar of SMA/NPA migration over last six months with slippage rate line.

3. *Liquidity & Cashflows*
   - Highlights: Average monthly inflows ₹1,280 Cr vs outflows ₹1,190 Cr; undrawn limits ₹670 Cr; ALM 1-30 day gap +₹82 Cr (within tolerance).
   - Monitor: Prepayment spike in BNPL book; evaluate redeployment pipeline.

4. *Collateral & Security*
   - Highlights: Coverage 1.46x; 12% collateral valuations >12 months; gold loan LTV 72% (below 75% limit).
   - Action: Schedule valuation refresh for eight MSME mortgages; update insurance for three Agri warehouses before expiry.

5. *Compliance & Supervisory Actions*
   - Highlights: PSL agri shortfall ₹38 Cr; 14 SME KYCs due for renewal; digital lending audit flagged KFS delivery gap for two fintech partners.
   - Action: Remedy KFS breach before RBI inspection window; purchase PSL certificates to plug agri deficit if originations lag.

**Appendix Elements**
- Metric table: GNPA/NNPA/PCR, SMA ladder, Stage 2/3 balances by sector, PSL progress.
- Sample transactions: top inflow/outflow entries (masked borrower IDs) with GST trade references.
- Watchlist log: borrower, trigger (CIBIL drop, GST variance), owner, resolution date.

**Intended Outcome**
The India-focused template equips Dimay Head (5) leadership with a regulator-aligned, action-oriented PDF—ready for credit committee packs, board MIS, or RBI onsite reviews without additional manual aggregation.
