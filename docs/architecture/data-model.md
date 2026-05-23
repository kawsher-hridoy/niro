# Architecture — Data Model

> **Canonical reference:** [`DESIGN.md §3`](../../DESIGN.md#3-data-model)
> for the full SQL DDL.
> This file adds migration order, seed data plan, and operational notes
> as the build progresses.

## At a glance

Tables (PHI columns marked **★** in `DESIGN.md`):

| Table | Phase | Purpose |
|---|---|---|
| `users` | A | All accounts: patient / doctor / admin |
| `otp_codes` | A | Phone OTP storage (dev: always `123456`) |
| `patient_profiles` | A | Patient-specific fields (DOB, allergies, conditions) |
| `doctor_profiles` | A | Doctor-specific fields (BMDC #, specialties, fee tier) |
| `documents` | A | Uploaded files (prescription, lab report, etc.) |
| `analyses` | B | AI analysis outputs |
| `audit_log` | B | Append-only system audit trail (AI calls, security events) |
| `access_logs` | B | Patient-visible doctor-view log |
| `consents` | B | Time-bound grants for doctor access |
| `verification_requests` | C | Patient-initiated async review requests |
| `verification_reviews` | C | Doctor's submitted reviews |
| `doctor_reviews` | C | Patient → doctor ratings (verified consults only) |
| `chamber_sessions` | C | Chamber QR sessions (table now, flow in Phase D) |

`timeline_entries` is a SQL **VIEW**, not a table — see DESIGN.md §3.

## Migration order (Alembic revisions)

1. `0001_init` — create extension `pgcrypto`; create `users`, `otp_codes`, `patient_profiles`, `doctor_profiles`, `documents` (Phase A).
2. `0002_ai` — `analyses`, `audit_log` (Phase B).
3. `0003_consent` — `consents`, `access_logs` (Phase B).
4. `0004_verification` — `verification_requests`, `verification_reviews`, `doctor_reviews` (Phase C).
5. `0005_chamber` — `chamber_sessions` + `timeline_entries` VIEW (Phase C).

Always `alembic upgrade head` before starting the backend.

## Seed data

Phase C adds 6 seeded doctors via `niro/backend/seeds/doctors.py`. See [`mocks.md M-3`](../mocks.md#m-3--bmdc-verification-is-admin-seeded-not-api-verified).

## PHI encryption strategy

- Dev: OS-level FS encryption only. PHI columns stored plaintext in Postgres for ease of inspection.
- Prod (Phase F): `pgcrypto` column-level encryption on `★ enc` columns. Master key in env (`PGCRYPTO_KEY`), rotated quarterly.
- Blob files: `gocryptfs` encrypted directory on the VPS volume (Phase F4).

## To be added during the build

- [ ] Phase B: ER diagram (Mermaid)
- [ ] Phase B: index strategy table (which indexes exist, why)
- [ ] Phase F: encryption key rotation runbook
