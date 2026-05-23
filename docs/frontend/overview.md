# Frontend — Overview

> **Canonical reference:** [`DESIGN.md §7`](../../DESIGN.md#7-frontend-architecture).
> This file captures the **actual** built structure through Phase D.

## Stack

| Layer | Version | Notes |
|---|---|---|
| Next.js | **16.2.6** | App Router, Turbopack default, async `params`/`searchParams`. **No `tailwind.config.ts`** |
| React | 19.2 | Canary in App Router (built-in) |
| TypeScript | 5.x | strict mode on |
| Tailwind | 4 | `@theme inline` in `globals.css`, not config file |
| QR generation | `qrcode.react` 4.x | SVG output for the chamber doctor view |
| QR scanning | `html5-qrcode` | client-side camera via getUserMedia, dynamic-imported in `chamber/scan/page.tsx` |
| Fonts | `Noto_Sans_Bengali` via `next/font/google` | OpenType ligatures enabled in `globals.css` |
| State | `localStorage` (session) + `useState` (per-page) | No global store |

## Route layout

```
app/
├── layout.tsx          # global: HTML lang="bn", Noto Sans Bengali (no global banner — D-011)
├── globals.css         # Tailwind 4 @theme + Bangla OpenType + print stylesheet + healthcare token palette
├── page.tsx            # public marketing landing (6 sections, Fix #1 — all subcomponents inline)
├── signin/, verify/    # auth
├── home/, upload/      # patient happy path
├── analyses/[id]/      # patient AI result (with PDF print)
├── timeline/
├── doctors/, doctors/[id]/
├── verifications/, verifications/[id]/
├── access-log/
├── chamber/scan/                       # patient QR scanner
├── chamber/[token]/                    # patient consent dialog
└── doctor-portal/
    ├── inbox/
    ├── cases/[id]/
    └── chamber/                        # doctor QR generator + state machine
```

Full file paths in [`components.md`](components.md).

## Server vs client

Almost every page is `"use client"` — they all need session checks
(localStorage) + dynamic fetches + state. Exceptions:
- `app/page.tsx` (landing): server component.
- `app/layout.tsx`: server component (Next.js requirement for root layout).

When adding pages in Phase F:
- Default to server components.
- Become a client component only if you need `onClick`, form state,
  `useState`, `useEffect`, camera, QR scanner, or polling.

## State management

- No Redux / Zustand / Jotai. `useState` + server-fetched data.
- Session (`access`, `refresh`, `role`, `user_id`) in `localStorage` via
  `lib/api.ts` helpers.
- API client in `lib/api.ts` — typed fetch wrapper.

## i18n

- Bangla by default. English is post-Phase-F.
- `toBangla(n)` converts ASCII digits to Bangla digits.
- `timeAgoBn(iso)` returns relative time in Bangla.
- No separate strings file — Bangla is inlined in JSX.

## Print stylesheet

`@media print` in `globals.css` hides nav/buttons/banners and expands
content. 🖨 PDF button on `/analyses/[id]` calls `window.print()`.
See D-010.

## Offline behavior

Phase 1 has no service worker / PWA manifest. Phase F adds:
- Service worker (next-pwa) caching shell + last 50 timeline items
- Uploads queued in IndexedDB while offline
- PWA install prompt

## Accessibility

Phase 1 baseline:
- WCAG AA color contrast (eyeballed).
- 16px+ body text.
- Semantic HTML.
- All form controls have labels.

Phase F audit catches missing aria attributes, focus rings, etc.

## Performance

- Next 16 + Turbopack: first compile ~500ms in dev.
- Bangla font subset ~50KB, loaded with `display: "swap"`.
- AI analysis blocks the UI for 8-24s; spinner shown.
  Phase F may switch to background job + polling.
