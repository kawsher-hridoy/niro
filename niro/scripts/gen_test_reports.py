"""Generate 10 realistic lab-report PNGs to exercise the health-metric trend feature.

One patient (Rahima Begum, 54F — the PROJECT.md persona), a recurring panel across
10 dated reports spanning ~13 months. Values are engineered so that after uploading
all 10 in order, /trends shows: improving series (glucose, HbA1c, lipids, BP),
worsening series (creatinine, eGFR — diabetic nephropathy), a V-shaped recover
(hemoglobin), abnormal->normal dot transitions, and a couple of single/2-point extras.

Parameter names match backend/api/routers/analyses.py METRIC_KEY_SYNONYMS so the
extractor maps each row to a canonical metric_key. Reference ranges (two-sided and
one-sided) populate ref_low/ref_high and drive the H/L abnormal flags.

Run:  niro/.venv/bin/python niro/scripts/gen_test_reports.py
Out:  test-reports/NN_rahima_<date>.png
"""
from __future__ import annotations

import os

try:
    import fitz  # PyMuPDF
except ImportError:  # newer wheels expose the package as `pymupdf`
    import pymupdf as fitz  # type: ignore

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "test-reports")
OUT_DIR = os.path.abspath(OUT_DIR)

# ---- palette ----
INK = (0.10, 0.12, 0.11)
MUTED = (0.42, 0.46, 0.44)
GREEN = (0.06, 0.48, 0.29)
RED = (0.80, 0.12, 0.12)
LINE = (0.80, 0.80, 0.78)
ZEBRA = (0.965, 0.965, 0.955)
BAND = (0.91, 0.95, 0.93)

FONT = "helv"
FONT_B = "hebo"

# ---- dates (oldest -> newest), ~13 months ----
DATES = [
    "2025-03-04", "2025-04-18", "2025-06-02", "2025-07-15", "2025-08-26",
    "2025-10-09", "2025-11-20", "2026-01-08", "2026-02-19", "2026-04-02",
]
_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def pretty(iso: str) -> str:
    y, m, d = iso.split("-")
    return f"{int(d):02d} {_MONTHS[int(m) - 1]} {y}"


# ---- core panel: present in all 10 reports ----
# (display, unit, ref_str, lo, hi, [10 values])
CORE = [
    ("Fasting Blood Sugar (FBS)", "mmol/L", "3.9 - 5.6", 3.9, 5.6,
     [11.2, 10.1, 9.0, 8.1, 7.3, 6.6, 6.1, 5.8, 5.6, 5.4]),
    ("HbA1c", "%", "4.0 - 6.0", 4.0, 6.0,
     [9.8, 9.3, 8.7, 8.0, 7.4, 6.9, 6.6, 6.4, 6.2, 6.1]),
    ("Total Cholesterol", "mg/dL", "< 200", None, 200,
     [268, 256, 242, 225, 210, 198, 188, 182, 178, 175]),
    ("LDL Cholesterol", "mg/dL", "< 100", None, 100,
     [178, 169, 158, 144, 130, 118, 108, 101, 96, 92]),
    ("HDL Cholesterol", "mg/dL", "40 - 60", 40, 60,
     [34, 35, 37, 38, 40, 42, 43, 45, 46, 48]),
    ("Triglycerides", "mg/dL", "< 150", None, 150,
     [290, 272, 255, 232, 210, 188, 172, 162, 155, 148]),
    ("Serum Creatinine", "mg/dL", "0.6 - 1.1", 0.6, 1.1,
     [0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.22, 1.28, 1.35, 1.42]),
    ("eGFR", "mL/min/1.73m2", "> 90", 90, None,
     [98, 95, 92, 88, 84, 80, 76, 72, 68, 64]),
    ("Hemoglobin (Hb)", "g/dL", "12.0 - 15.5", 12.0, 15.5,
     [11.2, 10.8, 10.1, 9.8, 10.5, 11.3, 12.0, 12.5, 12.9, 13.2]),
]

# ---- extras: only on certain report indices -> tests 2-point & single-point views ----
# key -> (display, unit, ref_str, lo, hi, {idx: value})
EXTRAS = [
    ("Blood Pressure - Systolic", "mmHg", "90 - 120", 90, 120,
     {0: 158, 2: 146, 4: 138, 6: 132, 8: 128}),
    ("Blood Pressure - Diastolic", "mmHg", "60 - 80", 60, 80,
     {0: 98, 2: 92, 4: 86, 6: 83, 8: 80}),
    ("Vitamin D (25-OH)", "ng/mL", "30 - 100", 30, 100, {0: 18, 5: 34}),
    ("SGPT (ALT)", "U/L", "0 - 35", None, 35, {1: 62, 4: 44, 8: 29}),
    ("Serum Uric Acid", "mg/dL", "2.5 - 6.0", 2.5, 6.0, {2: 7.2, 7: 5.4}),
    ("TSH", "uIU/mL", "0.4 - 4.0", 0.4, 4.0, {3: 3.1}),
]

LABS = [
    ("MEDLIFE DIAGNOSTIC CENTRE", "House 14, Road 7, Dhanmondi, Dhaka-1205  |  PH: 09600-112233"),
    ("CARE LABORATORY & DIAGNOSTICS", "Sector 11, Jasimuddin Road, Uttara, Dhaka-1230  |  PH: 09611-445566"),
]


def fmt(v: float) -> str:
    return str(int(v)) if float(v).is_integer() else f"{v:g}"


def flag_of(v: float, lo, hi) -> str:
    if hi is not None and v > hi:
        return "H"
    if lo is not None and v < lo:
        return "L"
    return ""


def rows_for(idx: int):
    """Build the ordered list of rows for report idx: (group, name, value, unit, ref, lo, hi)."""
    vitals, panel = [], []
    for disp, unit, ref, lo, hi, by_idx in EXTRAS:
        if idx in by_idx:
            v = by_idx[idx]
            target = vitals if "Pressure" in disp else panel
            target.append((disp, v, unit, ref, lo, hi))
    for disp, unit, ref, lo, hi, series in CORE:
        panel.append((disp, series[idx], unit, ref, lo, hi))
    return vitals, panel


def text_w(s: str, fs: float, font: str = FONT) -> float:
    return fitz.get_text_length(s, fontname=font, fontsize=fs)


def render(idx: int) -> str:
    iso = DATES[idx]
    lab_name, lab_addr = LABS[0] if idx % 2 == 0 else LABS[1]
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4 portrait

    L, R = 40, 555

    # header
    page.insert_text((L, 58), lab_name, fontsize=19, fontname=FONT_B, color=GREEN)
    page.insert_text((L, 74), lab_addr, fontsize=8.5, fontname=FONT, color=MUTED)
    page.insert_text((R - text_w("Accredited Laboratory  |  ISO 15189", 8.5), 74),
                     "Accredited Laboratory  |  ISO 15189", fontsize=8.5, fontname=FONT, color=MUTED)
    page.draw_line((L, 86), (R, 86), color=GREEN, width=1.4)

    # patient block
    pid = f"{'MLD' if idx % 2 == 0 else 'CLD'}-{204417 + idx * 13}"
    left = [
        ("Patient Name", "Rahima Begum"),
        ("Age / Sex", "54 Years / Female"),
        ("Patient ID", pid),
    ]
    right = [
        ("Sample Collection", pretty(iso)),
        ("Report Date", pretty(iso)),
        ("Referred by", "Dr. Mahmudul Hasan"),
    ]
    y0 = 104
    for i, (k, v) in enumerate(left):
        yy = y0 + i * 15
        page.insert_text((L, yy), f"{k}:", fontsize=9.5, fontname=FONT_B, color=INK)
        page.insert_text((L + 92, yy), v, fontsize=9.5, fontname=FONT, color=INK)
    for i, (k, v) in enumerate(right):
        yy = y0 + i * 15
        page.insert_text((320, yy), f"{k}:", fontsize=9.5, fontname=FONT_B, color=INK)
        page.insert_text((320 + 96, yy), v, fontsize=9.5, fontname=FONT, color=INK)

    page.draw_rect(fitz.Rect(L, y0 - 14, R, y0 + 36), color=LINE, width=0.7)

    # title
    title = "COMPREHENSIVE HEALTH CHECKUP  —  DIABETIC & LIPID PROFILE"
    page.insert_text((L, 172), title, fontsize=12, fontname=FONT_B, color=INK)
    page.insert_text((R - text_w(f"Report No: {pid}-R", 8.5), 172),
                     f"Report No: {pid}-R", fontsize=8.5, fontname=FONT, color=MUTED)

    # column anchors
    cx_test = L + 6
    cx_res_r = 330      # result right-aligned
    cx_unit = 348
    cx_ref = 432
    cx_flag_r = R - 16  # flag right-aligned

    def header_band(y, label):
        page.draw_rect(fitz.Rect(L, y, R, y + 18), color=None, fill=BAND)
        page.insert_text((cx_test, y + 13), label, fontsize=9, fontname=FONT_B, color=INK)
        return y + 18

    def col_titles(y):
        page.draw_rect(fitz.Rect(L, y, R, y + 18), color=None, fill=(0.93, 0.93, 0.91))
        page.insert_text((cx_test, y + 13), "INVESTIGATION", fontsize=8.5, fontname=FONT_B, color=MUTED)
        page.insert_text((cx_res_r - text_w("RESULT", 8.5, FONT_B), y + 13), "RESULT", fontsize=8.5, fontname=FONT_B, color=MUTED)
        page.insert_text((cx_unit, y + 13), "UNIT", fontsize=8.5, fontname=FONT_B, color=MUTED)
        page.insert_text((cx_ref, y + 13), "REF. RANGE", fontsize=8.5, fontname=FONT_B, color=MUTED)
        page.insert_text((cx_flag_r - text_w("FLAG", 8.5, FONT_B), y + 13), "FLAG", fontsize=8.5, fontname=FONT_B, color=MUTED)
        return y + 18

    vitals, panel = rows_for(idx)
    y = 188

    def draw_rows(rows, y, zebra_start=0):
        rh = 19
        for i, (name, v, unit, ref, lo, hi) in enumerate(rows):
            fl = flag_of(v, lo, hi)
            abnormal = fl != ""
            if (i + zebra_start) % 2 == 1:
                page.draw_rect(fitz.Rect(L, y, R, y + rh), color=None, fill=ZEBRA)
            page.insert_text((cx_test, y + 13), name, fontsize=9.2,
                             fontname=FONT_B if abnormal else FONT, color=INK)
            res = fmt(v)
            page.insert_text((cx_res_r - text_w(res, 9.6, FONT_B), y + 13), res,
                             fontsize=9.6, fontname=FONT_B, color=RED if abnormal else INK)
            page.insert_text((cx_unit, y + 13), unit, fontsize=8.8, fontname=FONT, color=MUTED)
            page.insert_text((cx_ref, y + 13), ref, fontsize=8.8, fontname=FONT, color=MUTED)
            if fl:
                s = "High" if fl == "H" else "Low"
                page.insert_text((cx_flag_r - text_w(s, 8.8, FONT_B), y + 13), s,
                                 fontsize=8.8, fontname=FONT_B, color=RED)
            page.draw_line((L, y + rh), (R, y + rh), color=LINE, width=0.4)
            y += rh
        return y

    if vitals:
        y = header_band(y, "VITALS  (recorded at sample collection)")
        y = draw_rows(vitals, y)
        y += 6

    y = col_titles(y)
    y = draw_rows(panel, y)

    # interpretation note (helps realism; not parsed for metrics)
    y += 16
    page.draw_rect(fitz.Rect(L, y, R, y + 46), color=LINE, width=0.6, fill=(0.99, 0.985, 0.97))
    page.insert_text((L + 8, y + 16), "Note:", fontsize=8.8, fontname=FONT_B, color=INK)
    page.insert_text((L + 40, y + 16),
                     "Values flagged High/Low are outside the laboratory reference range.",
                     fontsize=8.5, fontname=FONT, color=MUTED)
    page.insert_text((L + 8, y + 32),
                     "Please correlate clinically. This report is not a diagnosis.",
                     fontsize=8.5, fontname=FONT, color=MUTED)

    # footer
    page.draw_line((L, 792), (R, 792), color=LINE, width=0.7)
    page.insert_text((L, 806), "This is a computer-generated report and does not require a signature.",
                     fontsize=8, fontname=FONT, color=MUTED)
    page.insert_text((L, 818), "Verified by: Dr. S. Akhtar, MBBS, FCPS (Lab Medicine)  |  Reg: BMDC-A-31204",
                     fontsize=8, fontname=FONT, color=MUTED)
    page.insert_text((R - text_w("Page 1 of 1", 8), 818), "Page 1 of 1", fontsize=8, fontname=FONT, color=MUTED)

    pix = page.get_pixmap(matrix=fitz.Matrix(2.2, 2.2))
    out = os.path.join(OUT_DIR, f"{idx + 1:02d}_rahima_{iso}.png")
    pix.save(out)
    doc.close()
    return out


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    paths = [render(i) for i in range(len(DATES))]
    print(f"Wrote {len(paths)} reports to {OUT_DIR}")
    for p in paths:
        kb = os.path.getsize(p) / 1024
        print(f"  {os.path.basename(p)}  ({kb:.0f} KB)")


if __name__ == "__main__":
    main()
