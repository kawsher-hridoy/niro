# Architecture — API Surface

> **Canonical reference:** [`DESIGN.md §4`](../../DESIGN.md#4-api-surface).
> This file lists every endpoint **as actually built** through Day-5 Fix #4
> with curl examples for the demo path.

## API base

- Dev: `http://localhost:8000/api/v1`
- Prod (Phase F): `https://api.niro.<domain>/api/v1`

All responses JSON. Errors:
```json
{"detail": "..."}    // FastAPI's default for HTTPException
```

Auth via `Authorization: Bearer <jwt>` header. JWT access tokens 1h, refresh 30d.

## Full endpoint table (39 router endpoints + health — current)

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| **Health** | | | | |
| GET | `/health` | none | — | `{ok,service,version,time}` |
| **Auth** | | | | |
| POST | `/auth/signup/start` | none | `{full_name,email,phone,password}` | `{ok,signup_token}` |
| POST | `/auth/signup/verify` | none | `{signup_token,code}` | `{access,refresh,role,user_id}` |
| POST | `/auth/signup/resend-otp` | none | `{signup_token}` | `{ok}` |
| POST | `/auth/doctor/apply` | none | doctor application payload | `{access,refresh,role,user_id,verified,pending}` |
| POST | `/auth/login/password` | none | `{identifier,password}` | `{access,refresh,role,user_id}` |
| POST | `/auth/login/otp/request` | none | `{phone}` | `{ok,dev_hint?}` |
| POST | `/auth/login/otp/verify` | none | `{phone,code,full_name?}` | `{access,refresh,role,user_id}` |
| POST | `/auth/password/reset/start` | none | `{email_or_phone}` | `{ok,reset_token}` |
| POST | `/auth/password/reset/confirm` | none | `{reset_token,code,new_password}` | `{access,refresh,role,user_id}` |
| POST | `/auth/refresh` | none | `{refresh}` | `{access}` |
| POST | `/auth/logout` | bearer | — | `{ok}` |
| **Documents** | | | | |
| POST | `/documents` | patient | multipart `file`+`kind` | document meta |
| GET | `/documents` | patient | — | document list |
| GET | `/documents/{id}` | patient (owner) | — | document meta |
| DELETE | `/documents/{id}` | patient (owner) | — | 204 |
| **Analyses** | | | | |
| POST | `/analyses` | patient | `{document_id,use_history?}` | full analysis |
| GET | `/analyses/{id}` | bearer (owner or consented doctor) | — | full analysis |
| GET | `/analyses` | patient | — | own list |
| **Profile** | | | | |
| GET | `/me` | patient | — | profile |
| PATCH | `/me` | patient | partial fields | profile |
| GET | `/me/dashboard` | patient | — | dashboard aggregate |
| GET | `/me/timeline` | patient | — | chronological events (docs + analyses + reviews) |
| GET | `/me/access-log` | patient | — | doctor view log |
| DELETE | `/me` | patient | — | 204 (DPA 2023 deletion) |
| **Consent** | | | | |
| POST | `/consents` | patient | `{doctor_id,scope,context,expires_in_hours,document_id?}` | consent |
| POST | `/consents/{id}/revoke` | patient (owner) | — | consent (revoked) |
| **Verifications (async paid review)** | | | | |
| POST | `/verifications` | patient | `{doctor_id,document_id,scope,expires_in_hours}` | verification (pending) |
| POST | `/verifications/{id}/pay` | patient (owner) | `{transaction_id?}` | verification (paid, 2s mock) |
| GET | `/verifications` | patient | — | own list |
| GET | `/verifications/{id}` | patient or doctor | — | one |
| **Doctor portal** | | | | |
| GET | `/doctor/status` | doctor | — | verified/pending status |
| GET | `/doctor/dashboard` | doctor | — | dashboard aggregate |
| GET | `/doctor/inbox` | doctor | — | paid pending requests |
| GET | `/doctor/cases/{request_id}` | doctor (assigned) | — | case view incl. AI summary (consent-gated; writes access log) |
| POST | `/doctor/cases/{request_id}/review` | doctor (assigned) | `{disposition,ai_claims_eval,doctor_notes_bn}` | `{review_id,submitted_at}` |
| **Doctors directory** | | | | |
| GET | `/doctors` | bearer | `?specialty=&fee_tier=&q=` | doctor cards |
| GET | `/doctors/{id}` | bearer | — | full profile + reviews |
| POST | `/doctors/{id}/reviews` | patient (verified consult) | `{verification_id,rating,text?}` | `{id}` |
| **Chamber** | | | | |
| POST | `/chamber/session` | verified doctor | `{chamber_address?}` | session + QR token + `niro://chamber/<token>` payload |
| POST | `/chamber/session/{qr_token}/scan` | patient | `{scope,expires_in_hours}` | session (now bound) |
| GET | `/chamber/session/{session_id}` | doctor or bound patient | — | session state (poll for `bound_at`) |
| GET | `/chamber/session/{session_id}/profile` | doctor (bound, consent) | — | patient profile snapshot incl. timeline + latest analysis |
| POST | `/chamber/session/{session_id}/prescription` | doctor (bound, consent) | multipart `file`+`kind` | `{document_id,added_by}` |
| POST | `/chamber/session/{session_id}/close` | doctor or patient | — | session (closed, consent revoked) |

## Curl examples — the demo flow

### 1. Sign in as patient
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone":"+8801711000005"}'
# Returns dev_hint with "dev OTP is 123456"

ACCESS=$(curl -s -X POST http://localhost:8000/api/v1/auth/login/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"+8801711000005","code":"123456","full_name":"রহিমা বেগম"}' \
  | jq -r .access)
```

### 2. Upload prescription
```bash
DOC=$(curl -s -X POST http://localhost:8000/api/v1/documents \
  -H "Authorization: Bearer $ACCESS" \
  -F "file=@niro/sample_rx.png;type=image/png" \
  -F "kind=prescription" | jq -r .id)
```

### 3. Analyze with history context
```bash
curl -X POST http://localhost:8000/api/v1/analyses \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d "{\"document_id\":\"$DOC\",\"use_history\":true}" | jq
```

### 4. Browse doctors, request verification
```bash
curl -s "http://localhost:8000/api/v1/doctors?specialty=diabetes" \
  -H "Authorization: Bearer $ACCESS" | jq

DOCTOR_ID="<paste id>"
REQ=$(curl -s -X POST http://localhost:8000/api/v1/verifications \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d "{\"doctor_id\":\"$DOCTOR_ID\",\"document_id\":\"$DOC\",\"scope\":\"full_history\",\"expires_in_hours\":24}" \
  | jq -r .id)

curl -X POST "http://localhost:8000/api/v1/verifications/$REQ/pay" \
  -H "Authorization: Bearer $ACCESS" -H "Content-Type: application/json" -d '{}'
```

### 5. Doctor reviews
```bash
# Sign in as Dr. Mahmudul Hasan (seeded; phone "+88017000DOCTR1")
DOC_TOK=$(curl -s -X POST http://localhost:8000/api/v1/auth/login/otp/request \
  -H "Content-Type: application/json" -d '{"phone":"+88017000DOCTR1"}' >/dev/null \
  && curl -s -X POST http://localhost:8000/api/v1/auth/login/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"+88017000DOCTR1","code":"123456"}' | jq -r .access)

curl -s http://localhost:8000/api/v1/doctor/inbox -H "Authorization: Bearer $DOC_TOK" | jq

# Open case (triggers AI case-summary generation, 5-9s)
curl -s "http://localhost:8000/api/v1/doctor/cases/$REQ" \
  -H "Authorization: Bearer $DOC_TOK" | jq

# Submit review
curl -X POST "http://localhost:8000/api/v1/doctor/cases/$REQ/review" \
  -H "Authorization: Bearer $DOC_TOK" \
  -H "Content-Type: application/json" \
  -d '{"disposition":"agree","ai_claims_eval":[],"doctor_notes_bn":"AI-এর বিশ্লেষণ সঠিক।"}'
```

### 6. Chamber QR flow
```bash
SESS=$(curl -s -X POST http://localhost:8000/api/v1/chamber/session \
  -H "Authorization: Bearer $DOC_TOK" \
  -H "Content-Type: application/json" \
  -d '{"chamber_address":"Popular Diagnostic, Dhanmondi"}')

SESSION_ID=$(echo "$SESS" | jq -r .id)
QR_TOKEN=$(echo "$SESS" | jq -r .qr_token)
echo "QR payload (patient scans): $(echo "$SESS" | jq -r .qr_payload)"

curl -X POST "http://localhost:8000/api/v1/chamber/session/$QR_TOKEN/scan" \
  -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"scope":"full_history","expires_in_hours":2}'

curl -s "http://localhost:8000/api/v1/chamber/session/$SESSION_ID/profile" \
  -H "Authorization: Bearer $DOC_TOK" | jq

curl -X POST "http://localhost:8000/api/v1/chamber/session/$SESSION_ID/prescription" \
  -H "Authorization: Bearer $DOC_TOK" \
  -F "file=@niro/sample_rx.png;type=image/png" \
  -F "kind=prescription"

curl -X POST "http://localhost:8000/api/v1/chamber/session/$SESSION_ID/close" \
  -H "Authorization: Bearer $DOC_TOK"
```

### 7. Inspect audit log
```bash
docker compose exec -T postgres psql -U niro -d niro \
  -c "SELECT event, count(*) FROM audit_log GROUP BY event ORDER BY count(*) DESC;"
```

Expect 12-15 distinct event types after running the full flow.

## Operational notes

- **Rate limiting:** not enforced in Phase 1. Phase F adds Redis-backed limits.
- **CORS:** dev allows `http://localhost:3000` only.
- **Request size:** documents up to 10MB (`backend/api/routers/documents.py:_MAX_SIZE`).
- **Auto-generated OpenAPI:** `GET /docs` (Swagger UI), `GET /redoc`, `GET /openapi.json`.
