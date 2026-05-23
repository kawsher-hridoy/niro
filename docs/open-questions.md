# Open Questions

Things not yet decided. Each has a default answer the codebase falls
back on. Resolved questions move to [`decisions.md`](decisions.md).

---

## OQ-1 — Has the leaked Azure API key been rotated?

- **Default:** Treat the current key as active. Do not push to a public
  GitHub repo until rotated. Add the key to `.env` (gitignored) only.
- **Affects:** GitHub push timing, Phase F4 (VPS deploy with secrets).
- **Who decides:** kawsher-hridoy.
- **When needed:** before any GitHub push.

## OQ-2 — bKash for Phase 1: mocked, sandbox, or skipped?

- **Default:** Mocked (`POST /verifications/{id}/pay` sleeps 2s then
  sets `payment_status='paid'`). See [`mocks.md M-2`](mocks.md#m-2--bkash-payment-auto-succeeds-after-2-seconds).
- **Affects:** Phase C verification flow; Phase 2 demo if we have time to
  add real sandbox.
- **Who decides:** kawsher-hridoy.
- **When needed:** Day 3 (25 May) when wiring `/verifications/{id}/pay`.

## OQ-3 — MBBS contact for the live demo on 15 June?

- **Default:** Recruit a friend or relative by 30 May. Pre-record a
  fallback by 5 June in case they cancel.
- **Affects:** Phase F5; Phase G live demo.
- **Who decides:** kawsher-hridoy.
- **When needed:** by 30 May.

## OQ-4 — Domain name for production?

- **Default:** Use a placeholder (`niro.example.com`) in Caddyfile until
  decided. Suggestions: `niro.health`, `niro.bd`, `niro.app`,
  `niroapp.com`.
- **Affects:** Phase F4 (Caddy + TLS); demo slides.
- **Who decides:** kawsher-hridoy.
- **When needed:** by 1 June (cert provisioning takes ~5 minutes once
  the DNS A record is set).

## OQ-5 — GitHub repo: private now via `gh` CLI, or manual?

- **Default:** Create private repo via `gh repo create` on Day 1 (after
  key rotation). Push only after `git log` is clean of any commit
  containing the leaked key.
- **Affects:** Daily push cadence, the two-agent workflow (post-final).
- **Who decides:** kawsher-hridoy.
- **When needed:** Day 1 evening if pushing tonight.

## OQ-6 — Bangla TTS for voice playback: Phase 1 or Phase 2?

- **Default:** Phase 2. The Phase-1 video has voice-over (own voice or
  AI TTS) recorded separately, not generated in-app.
- **Affects:** Frontend; analysis result page.
- **Who decides:** kawsher-hridoy.
- **When needed:** if Phase 2 has time after F8 (demo dry-runs).

## OQ-7 — Component library: shadcn/ui or hand-rolled?

- **Default:** shadcn/ui. We don't have time to hand-roll dialogs,
  toasts, dropdowns, etc.
- **Affects:** All `niro/frontend/components/`.
- **Who decides:** kawsher-hridoy.
- **When needed:** Day 1 frontend scaffold.

## OQ-8 — PWA install prompt — required for Phase 1?

- **Default:** No. Just ensure the site works as a normal mobile web app.
  Add manifest + service worker stubs but no install prompt UX.
- **Affects:** Frontend; demo polish.
- **Who decides:** kawsher-hridoy.
- **When needed:** Phase A.

## OQ-9 — Doctor onboarding: open signup or admin-seeded for Phase 1?

- **Default:** Admin-only seeded list (6 doctors). Open signup is
  post-final. See `docs/mocks.md M-3`.
- **Affects:** `routers/doctor.py`, signup flow.
- **Who decides:** kawsher-hridoy.
- **When needed:** Day 3 (25 May).

## OQ-10 — Source of the prescription/report image for the video?

- **Default:** Use one synthetic image (`niro/sample_rx.png` — clean
  typed prescription) plus 1-2 real photos taken from family members'
  prescriptions with verbal consent. Faces / names redacted.
- **Affects:** Video content.
- **Who decides:** kawsher-hridoy.
- **When needed:** Day 5 (27 May, recording day).

## OQ-11 — Voice-over for the 90-second video: own voice or AI TTS?

- **Default:** Own voice (Bangla). More authentic. ElevenLabs Bangla
  if the recording quality is bad.
- **Affects:** Video production.
- **Who decides:** kawsher-hridoy.
- **When needed:** Day 5.

## OQ-12 — Should we register a `Niro` trademark / domain?

- **Default:** Out of scope for ICADHI. Buy the domain on Day 1 if
  cheap (~$10-15). Trademark is post-launch.
- **Affects:** Branding longevity.
- **Who decides:** kawsher-hridoy.
- **When needed:** Phase F4.

---

## How to resolve a question

1. Answer it.
2. Move the entry to `decisions.md` with a new `D-NNN` id.
3. Cross-reference from any affected doc.
4. Append a note to `build-log.md` for that day.
5. Delete the entry from this file.
