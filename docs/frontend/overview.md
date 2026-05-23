# Frontend — Overview

> **Canonical reference:** [`DESIGN.md §7`](../../DESIGN.md#7-frontend-architecture).
> This file adds component decisions and operational notes as the build
> progresses.

## Stack

- Next.js 15 (App Router)
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui for dialogs/forms/toasts (see [`open-questions.md OQ-7`](../open-questions.md))
- Noto Sans Bengali via `next/font/google` (see [`bangla-typography.md`](bangla-typography.md))
- QR scanning: `html5-qrcode` or `react-zxing`
- PDF generation: server-side via WeasyPrint or client-side print stylesheet

## Route groups

Three groups in one app, all sharing one auth context:

```
app/
├── (auth)/
│   ├── signin/page.tsx           # phone entry
│   └── verify/page.tsx           # OTP entry
├── (patient)/
│   ├── home/page.tsx
│   ├── upload/page.tsx
│   ├── analyses/[id]/page.tsx
│   ├── timeline/page.tsx
│   ├── doctors/page.tsx + [id]/
│   ├── verifications/page.tsx + [id]/
│   ├── access-log/page.tsx
│   └── settings/page.tsx
├── (doctor)/
│   ├── inbox/page.tsx
│   ├── cases/[id]/page.tsx
│   └── chamber/page.tsx
└── (chamber-tablet)/
    └── tablet/page.tsx
```

## Server vs client default

**Default to server components.** Become a client component (`"use client"`) only when needed:

- `onClick`, form state, `useState`, `useEffect` → client
- Camera, QR scanner → client
- Polling (chamber waiting for scan) → client
- Static read of DB data → server

## State management

- No Redux, Zustand, or Jotai. Just `useState` + server-fetched data.
- Auth token in httpOnly cookie (set by backend) — frontend never reads it.
- API client in `lib/api.ts` — typed fetch wrapper. All HTTP goes through it.

## Offline-first (patient app)

- Timeline cached via SWR with long stale window.
- Service worker (next-pwa) caches shell + last 50 timeline items.
- Uploads queued in IndexedDB if offline; flushed on reconnect.
- Phase 1: PWA install prompt skipped per [`open-questions.md OQ-8`](../open-questions.md).

## Accessibility / Bangla typography

- Min 16px body text on mobile.
- WCAG AA color contrast.
- Bangla-default with English toggle in settings.
- See [`bangla-typography.md`](bangla-typography.md) for font loading + ligature test matrix.

## To be added during the build

- [ ] Phase B: list of all client components with justification
- [ ] Phase B: API client design (`lib/api.ts`) once written
- [ ] Phase D: QR scanner library decision + reasoning
- [ ] Phase F: PWA manifest + service worker config
