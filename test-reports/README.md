# Test lab reports — health-metric trend feature

10 generated lab-report images for one patient (**Rahima Begum, 54F**) spanning
~13 months. Regenerate with `niro/.venv/bin/python niro/scripts/gen_test_reports.py`.

## How to test on nirobd.tech
1. Sign up / log in as a patient.
2. Upload each PNG **in filename order (01 → 10)**, choosing kind = **lab report**.
   Wait for each AI analysis to finish before the next.
3. Open **/trends** → tap any metric to see the chart, reference band, and Bangla verdict.

Files are named `NN_rahima_<report-date>.png`; sorted order = chronological order.

## What each metric should show (start → end)

| Metric | Direction set | Start | End | Expected verdict |
|---|---|---|---|---|
| Fasting Blood Sugar | lower=better | 11.2 | 5.4 mmol/L | improving · abnormal→normal |
| HbA1c | lower=better | 9.8 | 6.1 % | improving (stays mildly high) |
| Total Cholesterol | lower=better | 268 | 175 mg/dL | improving · abnormal→normal |
| LDL Cholesterol | lower=better | 178 | 92 mg/dL | improving · abnormal→normal |
| HDL Cholesterol | higher=better | 34 | 48 mg/dL | improving · abnormal→normal |
| Triglycerides | lower=better | 290 | 148 mg/dL | improving · abnormal→normal |
| Serum Creatinine | lower=better | 0.90 | 1.42 mg/dL | **worsening** · normal→abnormal |
| eGFR | higher=better | 98 | 64 | **worsening** · normal→abnormal |
| Hemoglobin | higher=better | 11.2 | 13.2 g/dL | improving (V-shape: dips to 9.8 then recovers) |

### Extra metrics (fewer points — test 2-point & single-point views)
- **Blood Pressure** (Systolic 158→128, Diastolic 98→80) — reports 1,3,5,7,9 — improving.
- **Vitamin D** (18→34 ng/mL) — reports 1,6 — 2-point trend, abnormal→normal.
- **SGPT/ALT** (62→29 U/L) — reports 2,5,9 — improving.
- **Uric Acid** (7.2→5.4 mg/dL) — reports 3,8 — improving.
- **TSH** (3.1) — report 4 only — single point → renders the "value card", not a chart.

## Notes
- The X-axis date comes from the **report date printed on each image** (the backend reads
  it; falls back to upload date if unread) — so upload order doesn't have to match dates,
  but uploading 01→10 keeps things tidy.
- A trend line needs **≥2 dated points** for the same metric; TSH (1 point) shows a value card.
- Creatinine + eGFR worsen **by design** (a diabetic-nephropathy storyline) so you can see
  the red "worsening" banner, not just green "improving".
