# AI Safety — Audit Logging

This doc defines the **audit event taxonomy** for Niro and tracks the
**actual events in use** as of Day-5 Fix #8.

The `audit_log` table schema lives in [`DESIGN.md §3`](../../DESIGN.md#3-data-model).

## Why audit log matters

1. **Compliance:** DPA 2023 requires a record of who accessed what when.
2. **Trust signal for the demo:** showing judges the audit screen
   demonstrates the consent + transparency story.
3. **Forensics:** if anything goes wrong, the audit log is the source of truth.

## Two log tables — don't confuse them

| | `access_logs` (patient-visible) | `audit_log` (system-wide) |
|---|---|---|
| **Audience** | The patient, in the app | Admins + forensics + AI cost tracking |
| **Contents** | Doctor views of patient data | Every event in this taxonomy |
| **Filter** | One patient's view | Whole system |
| **UI** | `/access-log` | Phase F admin only |

Both are append-only.

## Actual events in use

16+ distinct event types confirmed in `audit_log` during the full smoke
test.

| Event | Where it's written | Fields populated |
|---|---|---|
| `auth.otp.requested` | `routers/auth.py request_otp` | `detail.phone_sha256_prefix` |
| `auth.otp.failed` | `routers/auth.py verify_otp` | `detail.attempts` |
| `auth.login` | `routers/auth.py verify_otp` | `actor_id`, `actor_role`, `detail.new_user` |
| `document.upload` | `routers/documents.py upload` | `actor_id`, `patient_id`, `document_id`, `detail.{mime,size_bytes,kind}` |
| `document.delete` | `routers/documents.py delete_document` | `actor_id`, `patient_id`, `document_id` |
| `document.view` | `routers/documents.py get_document` | `actor_id`, `patient_id`, `document_id` |
| `ai.analyze.document` | `routers/analyses.py analyze` (no history) | full AI fields + `detail.latency_ms`, `detail.kind`, `detail.prompt_version` |
| `ai.analyze.history_aware` | `routers/analyses.py analyze` (with history) | same + `detail.history_count` |
| `ai.case_summary` | `routers/doctor.py get_case` | model fields + `detail.request_id` |
| `ai.policy_violation` | `routers/analyses.py analyze` (catch block) | `detail.reason` |
| `ai.document_unreadable` | `routers/analyses.py analyze` (catch `DocumentReadError`) | `actor_id`, `patient_id`, `document_id`, `detail.{reason,mime}` |
| `consent.granted` | `routers/consent.py grant`, `routers/verifications.py create`, `routers/chamber.py scan` | `consent_id`, `detail.{scope,context,hours}` |
| `consent.revoked` | `routers/consent.py revoke` | `consent_id` |
| `consent.check_denied` | `services/consent.py require` | `actor_id`, `detail.reason`, `detail.context` |
| `payment.mock_paid` | `routers/verifications.py pay` | `detail.{fee_bdt,transaction_id}` |
| `doctor.view.case_summary` | `services/consent.py record_access` (from `doctor.py`) | `consent_id`, `document_id`, `detail.location` |
| `doctor.view.timeline` | `services/consent.py record_access` (from `chamber.py`) | same |
| `doctor.review.submitted` | `routers/doctor.py submit_review` | `detail.{request_id,disposition}` |
| `doctor.prescription.written` | `routers/chamber.py write_prescription` | `consent_id`, `document_id`, `detail.{session_id,chamber_address,kind}` |
| `chamber.session.opened` | `routers/chamber.py open_session` | `doctor_id`, `detail.{session_id,chamber_address}` |
| `chamber.session.bound` | `routers/chamber.py scan` | `patient_id`, `doctor_id`, `consent_id`, `detail.{session_id,scope}` |
| `chamber.session.closed` | `routers/chamber.py close_session` | `patient_id`, `doctor_id`, `consent_id`, `detail.{session_id,close_reason}` |
| `system.user.deleted` | `routers/profile.py delete_me` | `patient_id` only (no PHI) |

## How to add a new event

1. Add a row in the table above.
2. Call `from backend.services import audit; audit.record(db, "<event>", ...)` in your code path.
3. Decide which fields populate (prefer IDs and hashes over content).
4. Don't add free-text patient data to `detail`. Strict IDs/hashes only.
5. Commit a `db.flush()` or `db.commit()` after — audit writes are part of the operation's transaction.

## What never goes in the audit log

- **PHI.** No raw document text. No medication names. No patient name, DOB, phone, address.
- **Secrets.** No tokens, no key fragments.
- **Free-form user input** beyond IDs.

## Retention

- Default: `AUDIT_RETENTION_DAYS=365`.
- Phase F: nightly archival to offline file + tamper-evidence (rolling SHA chain).
- DPA 2023: deletion events themselves retained indefinitely.

## Phase F additions

- [ ] Admin UI to browse / filter `audit_log`
- [ ] Nightly archival job + tamper-evidence
- [ ] AI cost computation script (sum tokens × Azure unit cost by day)
- [ ] PHI linter for `detail` payloads
- [ ] Webhook on `ai.policy_violation` to notify security team
