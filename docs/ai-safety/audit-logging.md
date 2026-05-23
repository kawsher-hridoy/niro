# AI Safety — Audit Logging

This doc defines the **audit event taxonomy** for Niro. Every event we
log to `audit_log` must use one of the events listed here. Adding a new
event = adding an entry here first.

The `audit_log` table schema lives in [`DESIGN.md §3`](../../DESIGN.md#3-data-model).

## Why audit log matters

1. **Compliance:** DPA 2023 requires a record of who accessed what when.
2. **Trust signal for the demo:** showing judges the audit screen
   demonstrates the consent + transparency story.
3. **Forensics:** if anything goes wrong, the audit log is the source of truth.

## Event taxonomy

Events use snake_case strings. Group by domain prefix.

### AI events

| Event | When | Fields |
|---|---|---|
| `ai.analyze.document` | Every call to `analyze_document` | model_name, model_version, prompt_sha256, output_sha256, confidence, document_id |
| `ai.analyze.history_aware` | Same, when history was passed | same + `detail.history_count` |
| `ai.case_summary` | Every call to `prepare_case_summary` | same as analyze |
| `ai.drug_interaction_check` | Every call to `check_drug_interaction` | drug_a, drug_b, result (in detail) |
| `ai.policy_violation` | Banned-phrase linter caught output | model_name, prompt_sha256, banned_phrase |
| `ai.fallback` | Provider switched due to failure | from_provider, to_provider, reason |

### Document events

| Event | When | Fields |
|---|---|---|
| `document.upload` | Patient uploads | patient_id, document_id, mime, size_bytes |
| `document.delete` | Patient deletes | patient_id, document_id |
| `document.view` | Anyone views (patient or doctor) | actor_id, document_id |

### Consent events

| Event | When | Fields |
|---|---|---|
| `consent.granted` | Patient grants new consent | patient_id, doctor_id, consent_id, scope, expires_at |
| `consent.revoked` | Patient revokes | patient_id, doctor_id, consent_id |
| `consent.expired` | Auto-expiry job runs | consent_id |
| `consent.check_denied` | `ConsentGuard.require` returned no | actor_id, patient_id, doctor_id, reason |

### Doctor events

| Event | When | Fields |
|---|---|---|
| `doctor.view.profile` | Doctor opens patient profile | doctor_id, patient_id, consent_id, screen |
| `doctor.view.document` | Doctor opens a document | doctor_id, document_id, consent_id |
| `doctor.review.submitted` | Doctor submits a verification review | doctor_id, request_id, patient_id |
| `doctor.prescription.written` | Doctor writes new Rx in chamber | doctor_id, patient_id, document_id |

### Chamber events

| Event | When | Fields |
|---|---|---|
| `chamber.session.opened` | Doctor generates QR | doctor_id, session_id, chamber_address |
| `chamber.session.bound` | Patient scans QR | doctor_id, patient_id, session_id, consent_id |
| `chamber.session.closed` | Session ends (timeout, manual, GPS) | session_id, close_reason |

### Auth events

| Event | When | Fields |
|---|---|---|
| `auth.otp.requested` | OTP requested | phone (hashed) |
| `auth.otp.verified` | OTP succeeded | user_id |
| `auth.otp.failed` | OTP wrong | phone (hashed), attempts |
| `auth.login` | Token issued | user_id |
| `auth.logout` | Logout | user_id |

### System events

| Event | When | Fields |
|---|---|---|
| `system.key.rotated` | App secret or AI key rotated | which_key |
| `system.migration.applied` | Alembic upgrade | revision_to |
| `system.backup.completed` | Nightly backup | backup_size_bytes, location |
| `system.user.deleted` | Patient invoked DPA 2023 deletion | user_id (only) |

## Two log types — don't confuse them

| | `access_logs` (patient-visible) | `audit_log` (system-wide) |
|---|---|---|
| **Audience** | The patient, in the app | Admins + forensics + AI cost tracking |
| **Contents** | Doctor views of patient data | Every event in this taxonomy |
| **Filter** | One patient's view | Whole system |
| **UI** | `(patient)/access-log/page.tsx` | `(admin)` only (Phase F) |

Both are append-only.

## What never goes in the audit log

- **PHI.** No raw document text, no medication names, no patient identifiers beyond UUID.
- **Secrets.** No tokens, no key fragments.
- **Free-form user input** beyond IDs.

The `detail` JSONB column accepts arbitrary additional fields but each
event must define above which keys are allowed. A linter (Phase F) will
enforce this; for Phase 1 it's a code review concern.

## Retention

- Default: `AUDIT_RETENTION_DAYS=365` (configurable in env).
- A nightly job archives older rows to an offline file (Phase F) and
  deletes from the live table.
- DPA 2023: deletion events themselves are retained indefinitely (the row
  proves we deleted, even if PHI is gone).

## To be added during the build

- [ ] Phase B: actual `AuditWriter` code reference once written
- [ ] Phase B: golden test that every AI call writes exactly one row
- [ ] Phase F: archival job + tamper-evidence chain
- [ ] Phase F: admin UI for browsing the audit log
