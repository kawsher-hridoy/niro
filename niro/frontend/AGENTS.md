<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Niro frontend notes

- Next.js 16.2.6 App Router: `params` and `searchParams` are Promises. Use `use(params)` in client dynamic pages or `await props.params` in server pages.
- Tailwind 4: no config file. Theme tokens live in `src/app/globals.css` under `@theme inline`; use `--color-primary`, `--color-muted`, `--color-card`, `--color-card-border`, `--color-accent-soft`.
- Authenticated patient routes live under `src/app/(app)/` and keep their public URLs (`/home`, `/timeline`, `/upload`, etc.). Verified doctor routes live under `src/app/(doctor)/doctor-portal/`.
- Public/pre-auth routes stay outside route groups: `/`, `/signin`, `/signin/otp`, `/verify`, `/forgot-password`, `/chamber/scan`, `/chamber/[token]`, `/doctor-portal/pending`.
- Shared chrome lives in `src/components/app-shell/`; use `EmptyState` from `src/components/EmptyState.tsx` for authenticated empty data surfaces.
- Bangla is default. Use `toBangla()` and `timeAgoBn()` from `src/lib/i18n.ts` for numbers and relative dates.
