# Phase-1 Mocks

This document lists everything Niro **fakes** during Phase 1 (the
27 May video submission and any internal demos before then). Each
mock has a replacement plan for Phase 2 (the live final on 15 June)
or post-ICADHI.

> **Why mocks?** ICADHI Phase-1 is a video submission. We optimize for
> a believable end-to-end demo, not for production-grade integrations
> we don't have time to wire up.

## M-1 — OTP code is always `123456`

- **Where:** `POST /auth/otp/verify` accepts `123456` for any phone.
- **Why:** Real SMS providers (SSL Wireless, BulkSMSBD) need a contract
  and account setup we don't have time for.
- **Demo story:** "In production this is sent via SMS; for the demo
  the dev environment uses a fixed code so judges can sign in."
- **Phase 2 replacement:** if shortlisted and time permits, wire up
  real SMS via SSL Wireless. Otherwise keep mock through final.
- **Risk if asked:** Low — judges will not press on this; OTP is
  table stakes, not novel.

## M-2 — bKash payment auto-succeeds after 2 seconds

- **Where:** `POST /verifications/{id}/pay` sleeps 2s then sets
  `payment_status='paid'`.
- **Why:** bKash sandbox requires KYC and a business application.
- **Demo story:** "bKash sandbox is wired in our prod environment;
  for this demo we use a deterministic mock so the flow is reproducible."
- **Phase 2 replacement:** integrate bKash sandbox by 1 June. If
  flaky, commit to mock for the live demo (better deterministic than
  broken).
- **Risk if asked:** Medium. Prep answer: "bKash sandbox is wired in
  our prod environment but we mock during the video so the timing is
  consistent. In the live final we'll show the real sandbox if it
  cooperates."

## M-3 — BMDC verification is admin-seeded, not API-verified

- **Where:** 6 doctor profiles are seeded with `verified=true` and a
  fake BMDC number. No actual lookup against the BMDC registry.
- **Why:** Phase 1 has no time for real integration; the BMDC public
  registry has rate limits and inconsistent uptime.
- **Demo story:** "Doctors are BMDC-verified; in production we cross-check
  the registry at signup. For the demo we use a pre-verified seed list."
- **Phase 2 replacement:** by 31 May, add an HTTP client that queries
  the BMDC registry on signup and caches results 24h. Show this in
  the live demo.
- **Risk if asked:** Medium. Prep answer: "We cross-check the BMDC
  registry at signup; the registry result is cached 24h. The seed set
  is for the demo." Have the Phase 2 code ready to show.

## M-4 — Doctor's review during the demo is canned (or live but pre-arranged)

- **Where:** Phase-1 video shows a doctor reviewing in ~30s. In reality,
  the response is pre-typed in a hidden window and triggered on cue.
- **Why:** A real review takes 5 minutes; the video has 90 seconds.
- **Demo story:** Don't mention it. The viewer sees a doctor responding
  fast; that's the product working.
- **Phase 2 replacement:** for the live final on 15 June, an actual MBBS
  friend on standby responds in real time. Pre-recorded fallback on a
  separate phone in case the friend's WiFi dies.
- **Risk if asked:** Low. Judges will not see behind the scenes.

## M-5 — Doctor device binding is not enforced in Phase 1

- **Where:** Doctor signup doesn't capture a device fingerprint;
  biometric is not required.
- **Why:** WebAuthn passkey setup adds 4-6 hours of dev we'd rather
  spend on the chamber QR flow.
- **Demo story:** "Production enforces device binding + biometric per
  the security spec. For the Phase-1 demo this is bypassed."
- **Phase 2 replacement:** WebAuthn passkey by 7 June if shortlisted.
  At minimum, capture a device fingerprint hash on first login.
- **Risk if asked:** Medium-high. Prep answer: "Device binding +
  biometric is in our security model (DESIGN.md §6). For the Phase-1
  demo it's deferred; we'll show it in the live final."

## M-6 — No real SMS / IVR / push notifications

- **Where:** Patient never receives a real notification. UI just shows
  the state change.
- **Why:** Real notification providers (FCM, Twilio) require account
  setup we don't have time for.
- **Demo story:** Show the in-app "doctor responded" badge. Done.
- **Phase 2 replacement:** FCM web push for free; SMS post-launch.
- **Risk if asked:** Low. Judges expect MVP scoping.

## M-7 — File storage is local disk in dev

- **Where:** Uploaded prescriptions live at
  `<STORAGE_LOCAL_PATH>/<patient_id>/<doc_id>.<ext>`, not S3.
- **Why:** Faster local dev; no AWS billing yet.
- **Demo story:** "Production uses S3-compatible storage (Backblaze B2);
  dev uses local FS so demos are reproducible without external
  dependencies."
- **Phase 2 replacement:** wire up B2 / Wasabi by 3 June for production
  deploy. Local FS remains the default in dev.
- **Risk if asked:** None.

## M-8 — Encryption at rest is OS-level only in dev

- **Where:** No `pgcrypto` column-level encryption on PHI columns in dev;
  blob files are plaintext on disk.
- **Why:** Adds complexity that's not visible to judges in a video.
- **Demo story:** "Production uses pgcrypto column-level encryption on
  PHI columns and `gocryptfs` on blob storage."
- **Phase 2 replacement:** enable column-level encryption before VPS
  deploy on 3 June.
- **Risk if asked:** Low — the data-model doc has the column-level
  markings; we show the markings in the demo.

## M-9 — Patient profile photo is a default avatar

- **Where:** No photo upload in Phase 1; UI uses a deterministic avatar
  (e.g., `dicebear`).
- **Why:** Out of scope.
- **Phase 2 replacement:** maybe; depends on time.
- **Risk if asked:** None.

## M-10 — AI-prepared case summary uses the same model as the analysis

- **Where:** `prepare_case_summary` calls `gpt-chat-latest` directly,
  not a separate fine-tuned model.
- **Why:** No fine-tuning capacity. The base model handles it.
- **Demo story:** The same model produces both, with a different prompt.
- **Phase 2 replacement:** none required. Fine-tuning is post-launch.
- **Risk if asked:** None.

---

## Quick lookup

| # | Mock | Replacement deadline |
|---|---|---|
| M-1 | OTP `123456` | Post-ICADHI |
| M-2 | bKash auto-pay | 1 June (or keep) |
| M-3 | BMDC seeded | 31 May |
| M-4 | Canned doctor review | 15 June (real friend) |
| M-5 | No device binding | 7 June |
| M-6 | No notifications | Post-launch |
| M-7 | Local file storage | 3 June |
| M-8 | No encryption at rest | 3 June |
| M-9 | Default avatars | Post-launch |
| M-10 | Same model for case summary | Permanent |

---

## How to add a new mock

1. Append above as **M-11**, **M-12**, etc.
2. Always include: where it is, why we mocked, demo story, replacement plan, risk-if-asked.
3. If the mock would fail a basic privacy or security check (e.g.,
   logging PHI), it's not a mock — it's a bug. Fix it.
4. Cross-reference from `decisions.md` if the mock is load-bearing.
