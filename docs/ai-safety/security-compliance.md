# AI Safety — Security & Compliance

> **Canonical reference:** [`DESIGN.md §6`](../../DESIGN.md#6-security--compliance-architecture).
> This file adds DPA 2023 quick-reference and operational checklists.

## DPA 2023 — quick reference

Bangladesh Data Protection Act 2023. Niro must comply with:

| Right | What we provide | Where |
|---|---|---|
| Right to be informed | Privacy notice on signup | Frontend `(auth)/signin/page.tsx` |
| Right to access | `GET /me/export` returns ZIP with all data | `routers/profile.py` |
| Right to rectification | `PATCH /me` | `routers/profile.py` |
| Right to erasure | `DELETE /me` cascades + blob purge worker | `routers/profile.py` + worker |
| Right to data portability | Export ZIP is JSON + media | Same as above |
| Right to object | Revoke consents one-tap | `routers/consent.py` |

## Auth (Phase B)

- **Patient + doctor:** phone + SMS OTP. Dev OTP is always `123456` (see [`mocks.md`](../mocks.md)).
- **Doctor extras:** device fingerprint hash + biometric (WebAuthn passkey, Phase F).
- **JWT:** access 1h, refresh 30d, rotated on use.

## Encryption

| Layer | Dev | Prod (Phase F) |
|---|---|---|
| At rest — disk | OS only | LUKS-encrypted volume |
| At rest — PHI columns | none | `pgcrypto` column-level (master key in env) |
| At rest — blobs | none | `gocryptfs` encrypted dir |
| In transit | TLS via dev Caddy or plain HTTP | TLS 1.2+ via Caddy + Let's Encrypt + HSTS |

## BMDC verification

- Phase 1: seeded with `verified=true` (mock M-3).
- Phase 2: HTTP client against the BMDC public registry, 24h cache.

## Consent enforcement

Every backend query that returns patient data **must** call:

```python
consent_guard.require(patient_id=p, doctor_id=d, context=ctx)
# Raises PermissionDenied if no active consent.
```

Enforced at the **repository layer**, not the route layer. Routes call
repositories; repositories call `consent_guard`. UI is advisory only.

## Audit log integrity

`audit_log` is append-only at the app layer. The Postgres role used by
the app has `INSERT, SELECT` on this table but not `UPDATE` or `DELETE`.

Phase 2: nightly job copies new rows to an offline file with a rolling
SHA256 chain for tamper evidence.

## Incident playbook (stub)

If a key is leaked:
1. Rotate immediately in Azure Portal / Anthropic / GCP console.
2. Update `.env` on the VPS, restart `niro-backend.service`.
3. Force re-login of all users: bump `APP_SECRET` and redeploy.
4. Log to `docs/build-log.md` and `audit_log` (system event row).

If patient data leak is suspected:
1. Disable affected routes via feature flag.
2. Pull access logs for the affected `patient_id`.
3. Notify patient via the app + email + SMS.
4. Within 72 hours, notify the relevant authority per DPA 2023.

## To be added during the build

- [ ] Phase F: full incident runbook (`docs/deployment/runbook.md`)
- [ ] Phase F: encryption key rotation runbook
- [ ] Phase F: penetration test results (if a friend can do a quick scan)
