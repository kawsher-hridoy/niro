# Open Questions

Things not yet decided. Each has a default answer the codebase falls
back on. Resolved questions move to [`decisions.md`](decisions.md).

---

## ✅ Recently resolved (closed)

- **OQ-1 — Azure key rotation** → **Resolved.** User rotated, an early paste had a stray trailing `s` causing 401s; fixed. Now passing 6/6 probe. Diagnostic in `build-log.md` Day 2.
- **OQ-2 — bKash mock vs sandbox** → **D-002 / mocks.md M-2.** Mocked for Phase 1; real sandbox attempt in F3.
- **OQ-5 — GitHub repo public/private** → **Resolved.** Private at https://github.com/kawsher-hridoy/niro.
- **OQ-7 — shadcn/ui vs hand-rolled** → **Resolved.** Hand-rolled Tailwind so far (Phase A–D); shadcn/ui added in Phase F polish if time permits.
- **OQ-8 — PWA install prompt for Phase 1** → **Resolved no** (deferred to Phase F).
- **OQ-9 — Doctor onboarding** → **mocks.md M-3.** Admin-seeded list (6 doctors); open signup post-final.
- **OQ-13 — Azure 401 mid-build** → **Resolved.** Was the trailing-`s` typo; key works.

---

## Still open

## OQ-3 — MBBS contact for the live demo on 15 June?

- **Default:** Recruit a friend or relative by 30 May (if shortlisted). Pre-record a fallback by 5 June.
- **Affects:** Phase F5; Phase G live demo.
- **Who decides:** kawsher-hridoy.
- **When needed:** by 30 May (after shortlist result).

## OQ-4 — Domain name for production

- **Default:** Use a placeholder (`niro.example.com`) in Caddyfile until decided. Suggestions: `niro.health`, `niro.bd`, `niro.app`, `niroapp.com`.
- **Affects:** Phase F4 (Caddy + TLS); demo slides.
- **Who decides:** kawsher-hridoy.
- **When needed:** by 1 June.

## OQ-6 — Bangla TTS for voice playback: Phase 2 or post-launch?

- **Default:** Phase 2 if time permits after F8. Otherwise post-launch.
- **Affects:** Frontend analysis result page voice playback.
- **Who decides:** kawsher-hridoy.
- **When needed:** post-shortlist.

## OQ-10 — Source of the prescription/report image for the Phase-1 video?

- **Default:** Use the synthetic `niro/sample_rx.png` + `niro/sample_lab.png` (cleaner, faster) PLUS one real photo from a family member with verbal consent. Faces / names redacted.
- **Affects:** Video content (Phase E).
- **Who decides:** kawsher-hridoy.
- **When needed:** Day 5 (27 May, recording day).

## OQ-11 — Voice-over for the 90-second video: own voice or AI TTS?

- **Default:** Own voice (Bangla). More authentic. ElevenLabs Bangla fallback if recording quality is bad.
- **Affects:** Video production (Phase E).
- **Who decides:** kawsher-hridoy.
- **When needed:** Day 5.

## OQ-12 — Should we register a `Niro` trademark / domain?

- **Default:** Out of scope for ICADHI. Buy the domain on Phase F4 if cheap. Trademark is post-launch.
- **Affects:** Branding longevity.
- **Who decides:** kawsher-hridoy.
- **When needed:** Phase F4.

## OQ-14 — Real BMDC API integration before final demo?

- **Default:** Yes — wire up the BMDC public registry lookup in Phase F2 (31 May). Cache 24h. If the registry is too flaky or slow, document the limitation and keep the mock for the live demo.
- **Affects:** Phase F2.
- **Who decides:** kawsher-hridoy.
- **When needed:** by 31 May (if shortlisted).

## OQ-15 — Production AI subscription: stay on shared account or migrate?

- **Default:** Stay on the current Azure deployment (`gpt-chat-latest`) through Phase G. Migrate to user's own Azure subscription post-ICADHI before any external launch.
- **Affects:** Long-term operations.
- **Who decides:** kawsher-hridoy.
- **When needed:** post-Phase G.

## OQ-16 — Real SMS provider for Phase F?

- **Default:** SSL Wireless or BulkSMSBD via simple HTTP API. Tier 1 cost ~Tk 0.30/SMS. Skip if time is too tight; mock OTP `123456` remains for the live demo (acknowledged as a Phase 1 limitation).
- **Affects:** Phase F (no exact sub-phase).
- **Who decides:** kawsher-hridoy.
- **When needed:** post-shortlist.

## OQ-17 — Swap PyMuPDF → pypdfium2 before commercial launch (AGPL)

- **Default:** Replace `pymupdf` with `pypdfium2` in `niro/backend/ai/azure.py` `_data_uris_for` helper. The API surface for rasterizing PDF bytes at a given DPI is a near drop-in (`pypdfium2.PdfDocument(data) → page.render(scale=dpi/72)`). Effort ~30 min including re-running probe TEST 7.
- **Why:** PyMuPDF is AGPL-3.0. The network-use clause triggers as soon as Niro is offered as a hosted service to real users; would otherwise force open-sourcing the entire codebase or buying Artifex's commercial license. Acceptable for ICADHI demo (academic showcase, not yet a paid service) — see D-013.
- **Trigger:** Any non-demo deployment with real patients OR any plan to take revenue. Whichever comes first.
- **Affects:** `niro/backend/pyproject.toml`, `niro/backend/ai/azure.py`, `niro/probe.py`. D-013 status flips to "Locked (replaced)".
- **Who decides:** kawsher-hridoy.
- **When needed:** before first paying patient / before public launch.

---

## How to resolve a question

1. Answer it.
2. Move the entry to `decisions.md` with a new `D-NNN` id.
3. Cross-reference from any affected doc.
4. Append a note to `build-log.md` for that day.
5. Delete the entry from this file (or move to "Recently resolved" with brief context).
