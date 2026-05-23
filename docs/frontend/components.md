# Frontend — Components & Pages Inventory

Actual inventory as built through Phase D. **14 pages, 1 component**
(more to come in Phase F polish).

## Pages (14)

### Public

| Path | File |
|---|---|
| `/` | `app/page.tsx` (server) |

### Auth (2)

| Path | File | Notes |
|---|---|---|
| `/signin` | `app/signin/page.tsx` | phone entry, calls `/auth/otp/request` |
| `/verify` | `app/verify/page.tsx` | OTP entry, calls `/auth/otp/verify`, saves session to localStorage |

### Patient (8)

| Path | File | Notes |
|---|---|---|
| `/home` | `app/home/page.tsx` | dashboard with upload CTA, doc list, nav chips |
| `/upload` | `app/upload/page.tsx` | file picker + kind selector → upload → analyze chain; supports `?document=<id>` re-analyze |
| `/analyses/[id]` | `app/analyses/[id]/page.tsx` | Bangla result + red flags + meds table + lab values + 🖨 PDF; uses `use(params)` for Next 16 async params |
| `/timeline` | `app/timeline/page.tsx` | chronological events |
| `/doctors` | `app/doctors/page.tsx` | directory with specialty + tier + name filters |
| `/doctors/[id]` | `app/doctors/[id]/page.tsx` | profile + qualifications + chambers + reviews + "request verification" panel |
| `/verifications` | `app/verifications/page.tsx` | own list with status chips |
| `/verifications/[id]` | `app/verifications/[id]/page.tsx` | detail + mock-pay + auto-poll for review |
| `/access-log` | `app/access-log/page.tsx` | patient-visible doctor access log |

### Chamber (patient side, 2)

| Path | File | Notes |
|---|---|---|
| `/chamber/scan` | `app/chamber/scan/page.tsx` | camera scanner via `html5-qrcode` + manual fallback |
| `/chamber/[token]` | `app/chamber/[token]/page.tsx` | consent dialog (scope picker + duration slider) → POST `/chamber/session/{token}/scan` |

### Doctor portal (3)

| Path | File | Notes |
|---|---|---|
| `/doctor-portal/inbox` | `app/doctor-portal/inbox/page.tsx` | Pending / Done split |
| `/doctor-portal/cases/[id]` | `app/doctor-portal/cases/[id]/page.tsx` | AI case-summary + target analysis + history + review form |
| `/doctor-portal/chamber` | `app/doctor-portal/chamber/page.tsx` | 4-phase state machine: init → waiting (QR + 2s poll) → bound → closed |

## Components (1)

| Component | File | Props | Used in |
|---|---|---|---|
| `DisclaimerBanner` | `components/DisclaimerBanner.tsx` | — | Global, mounted in `layout.tsx` |

## Conventions

- One component per file. Name file = component name.
- Default export for pages (Next.js requirement). Named exports for components.
- Props typed at the top of the file.
- `"use client"` at the top for client components.
- Dynamic-route pages accept `{ params: Promise<{...}> }` and use `use()` hook.
- Bangla strings inline in JSX. No separate strings file in Phase 1.
- Tailwind classes via `className`. No CSS modules / inline styles.

## Inline patterns reused across pages

These show up multiple times — Phase F candidates for component extraction:

- **Confidence badge** — `analyses/[id]/page.tsx`. Color-coded by `< 0.5 / 0.5..0.85 / ≥ 0.85`.
- **Red flag chip** — `analyses/[id]/page.tsx` + `doctor-portal/chamber/page.tsx`. Tone by `severity`.
- **Status chip** — `verifications/page.tsx`.
- **Card layout** — `rounded-2xl border border-foreground/10 p-5 bg-foreground/[0.02]` everywhere.

## State management

- No Redux / Zustand / Jotai.
- Session in `localStorage` via `lib/api.ts` (`saveSession`, `loadSession`, `clearSession`).
- Per-page `useState` + `useEffect`. `useRouter` for navigation.
- `apiGet`, `apiPost`, `apiUpload` from `@/lib/api` are the only HTTP path.

## Type definitions

All API response shapes live in `lib/api.ts`:

| Type | Used by |
|---|---|
| `DocumentOut` | `home`, `upload`, `doctors/[id]` |
| `AnalysisOut` | `analyses/[id]`, `upload` |
| `Medication`, `LabValue`, `RedFlag` | `analyses/[id]`, `doctor-portal/cases/[id]` |
| `TimelineEntry` | `timeline` |
| `AccessLogEntry` | `access-log` |
| `DoctorCard`, `DoctorProfileOut` | `doctors`, `doctors/[id]` |
| `VerificationOut` | `verifications`, `verifications/[id]` |
| `CaseView` | `doctor-portal/cases/[id]` |
| `ChamberSessionOut`, `ChamberProfileOut` | `doctor-portal/chamber`, `chamber/[token]` |

## Print stylesheet (PDF export)

`globals.css` `@media print` block + `window.print()` button on
`analyses/[id]`. See **D-010** in `decisions.md`.

## Phase F polish targets

- Component extraction (`ConfidenceBadge`, `RedFlagChip`, `StatusChip`, `Card`).
- shadcn/ui for `Dialog` / `Toast` / `DropdownMenu`.
- Skeleton loaders (currently raw "লোড হচ্ছে...").
- Better empty states with illustrations.
- English language toggle in `/settings`.
- PWA manifest + service worker (offline timeline cache).
- Accessibility audit.
- Mobile viewport tweaks.
