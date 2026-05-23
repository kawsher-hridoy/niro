# Glossary

Bangla terms, medical abbreviations, and project acronyms used in Niro.
Add new entries as they come up.

## Project / brand

| Term | Meaning |
|---|---|
| **Niro** (নিরো) | Project name. From Bangla *Nirog* (নীরোগ) — "disease-free". |
| **ICADHI** | IEEE International Congress on AI and Digital Health Innovation 2026. The competition Niro is submitted to. |
| **DIU** | Daffodil International University. Hosts ICADHI 2026. |
| **PWA** | Progressive Web App. Niro's frontend is a PWA, not a native app. |

## Bangla terms used in UI / docs

| Bangla | Roman | English |
|---|---|---|
| নীরোগ | Nirog | disease-free |
| স্বাস্থ্য | shasthya | health |
| ডাক্তার | daktar | doctor |
| প্রেসক্রিপশন | prescription | (loanword) |
| রিপোর্ট | report | (loanword) |
| খাতা | khata | notebook (used metaphorically: "ShasthyaKhata" = health notebook) |
| সাথী | sathi | companion |
| বন্ধু | bondhu | friend |
| আপন | apon | one's own |
| চেম্বার | chamber | (loanword — doctor's office) |
| রক্তস্বল্পতা | rokto-sholpota | anemia |
| উচ্চ রক্তচাপ | uchcho rokto-chap | hypertension |
| ডায়াবেটিস | diabetes | (loanword) |
| হিমোগ্লোবিন | hemoglobin | (loanword) |
| কোলেস্টেরল | cholesterol | (loanword) |

## Bangla numerals

| 0 | ০ |
| 1 | ১ |
| 2 | ২ |
| 3 | ৩ |
| 4 | ৪ |
| 5 | ৫ |
| 6 | ৬ |
| 7 | ৭ |
| 8 | ৮ |
| 9 | ৯ |

Niro displays medical values using Bangla numerals when natural
(২৪৫ mg/dL, not 245 mg/dL). The probe confirmed `gpt-chat-latest`
does this natively in Bangla output.

## Medical abbreviations

| Abbrev | Meaning |
|---|---|
| **MBBS** | Bachelor of Medicine, Bachelor of Surgery — basic medical degree |
| **FCPS** | Fellow of the College of Physicians and Surgeons — Bangladesh specialty cert |
| **MD** | Doctor of Medicine — postgraduate specialty (different from US "MD") |
| **OPD** | Outpatient Department |
| **CBC** | Complete Blood Count |
| **HbA1c** | Glycated hemoglobin — 3-month average blood sugar |
| **FBS** | Fasting Blood Sugar |
| **LDL** | Low-Density Lipoprotein ("bad" cholesterol) |
| **HDL** | High-Density Lipoprotein ("good" cholesterol) |
| **BP** | Blood Pressure |
| **Rx** | Prescription |
| **SOS** | "If needed" (Latin: *si opus sit*) — common BD prescription notation |
| **PR** | Per rectum |
| **PO** | Per os (by mouth) |
| **IV** | Intravenous |
| **IM** | Intramuscular |
| **q.d.** | Once daily |
| **b.i.d.** | Twice daily |
| **t.i.d.** | Three times daily |
| **q.i.d.** | Four times daily |

### BD-specific dosing notation

Common in Bangladeshi prescriptions:

| Notation | Meaning |
|---|---|
| `1+0+1` | One in the morning, none at noon, one at night |
| `1+1+1` | Three times a day (morning/noon/night) |
| `0+0+1` | Only at night |
| `1+0+0` | Only in the morning |
| `SOS` | As needed |
| `BBF` / `BB` | Before breakfast |
| `ABF` / `AB` | After breakfast |

## Regulatory / institutional

| Term | Meaning |
|---|---|
| **BMDC** | Bangladesh Medical and Dental Council. Licensing body for physicians. Every practicing MBBS doctor has a BMDC registration number. |
| **DGDA** | Directorate General of Drug Administration. Maintains the BD drug formulary. |
| **DGHS** | Directorate General of Health Services. Public health authority. |
| **EPI** | Expanded Programme on Immunization. BD national vaccination program. |
| **DPA 2023** | Bangladesh Data Protection Act 2023. Niro must comply with deletion, export, and consent provisions. |
| **DHS** | Demographic and Health Survey. Public data source for population-health analytics. |

## Niro-internal acronyms

| Term | Meaning |
|---|---|
| **PHI** | Protected Health Information. Patient data we encrypt and never log. |
| **EMR** | Electronic Medical Record. What Niro's patient profile effectively is. |
| **RAG** | Retrieval-Augmented Generation. Used over DGDA formulary for drug interactions. |
| **ADR** | Architecture Decision Record. Stored in `docs/adr/`. |
| **AIProvider** | The abstract base class in `niro/backend/ai/provider.py`. All AI calls go through it. |
| **AuditWriter** | The service that appends to `audit_log`. One row per AI call. |
| **ConsentGuard** | The service that decides whether a doctor may see a patient's data right now. |

## Common loanwords (English in Bangla speech)

Bangla speakers often code-switch with medical terms. We don't translate
these; we use them as-is in the UI.

`hemoglobin`, `cholesterol`, `diabetes`, `pressure`, `pulse`, `cancer`,
`tumor`, `infection`, `tablet`, `capsule`, `syrup`, `injection`,
`vaccine`, `antibiotic`, `prescription`, `report`, `test`, `result`,
`appointment`, `consultation`.

Rule of thumb: if a Bangladeshi doctor would say the English word in
conversation, Niro uses the English word. We don't manufacture Bangla
neologisms for them.
