# Frontend — Components

Component inventory. Append a row per component as you build. Keep it
short — code lives in `niro/frontend/components/`.

| Component | File | Props (high level) | Used in | Phase |
|---|---|---|---|---|
| `DisclaimerBanner` | `components/DisclaimerBanner.tsx` | language | global layout | A |
| `RedFlagChip` | `components/RedFlagChip.tsx` | label_bn, severity | analysis result | B |
| `ConfidenceBadge` | `components/ConfidenceBadge.tsx` | confidence (0-1) | analysis result | B |
| `BanglaText` | `components/BanglaText.tsx` | children | global | A |
| `ConsentDialog` | `components/ConsentDialog.tsx` | doctorId, defaultScope, onApprove | request-verification, chamber | C |
| `TimelineEntry` | `components/TimelineEntry.tsx` | entry (timeline_entries row) | timeline | C |
| `CaseSummaryCard` | `components/CaseSummaryCard.tsx` | summary (CaseSummary) | doctor case view | C |
| `AccessLogRow` | `components/AccessLogRow.tsx` | log entry | access log | C |
| `QRDisplay` | `components/QRDisplay.tsx` | sessionToken | doctor chamber | D |
| `QRScanner` | `components/QRScanner.tsx` | onScan | patient | D |
| `UploadDropzone` | `components/UploadDropzone.tsx` | onUpload, kind | upload page | B |
| `MedicationsTable` | `components/MedicationsTable.tsx` | meds[] | analysis result, case view | B–C |

## Conventions

- One component per file. Name file = component name.
- Default exports for pages (Next.js requires it). Named exports for
  components.
- Props as a `Props` type at the top of the file:
  ```typescript
  type Props = { confidence: number };
  export function ConfidenceBadge({ confidence }: Props) { ... }
  ```
- Use shadcn/ui primitives (`Dialog`, `Button`, `Toast`) directly; don't
  wrap them unless adding domain-specific behavior.
- Bangla strings inline in JSX (not in a separate strings file). For
  English toggle, use a hook `useTranslate()` that reads the user's
  language preference.

## To be added

- [ ] Phase B: actual prop type definitions for each
- [ ] Phase D: screenshot per component (Storybook-style, optional)
