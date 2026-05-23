# Architecture — API Surface

> **Canonical reference:** [`DESIGN.md §4`](../../DESIGN.md#4-api-surface)
> for the full endpoint list with request/response shapes.
> This file adds curl examples and operational notes as the build progresses.

## API base

- Dev: `http://localhost:8000/api/v1`
- Prod: `https://api.niro.<domain>/api/v1`

All responses are JSON; errors use:

```json
{"error": {"code": "string", "message_bn": "...", "message_en": "..."}}
```

Auth via `Authorization: Bearer <jwt>` header. JWT access tokens live 1h; refresh tokens 30d (rotated on use).

## Endpoint groups (with phase markers)

| Group | Phase | Routes |
|---|---|---|
| Auth | B | `/auth/otp/request`, `/auth/otp/verify`, `/auth/refresh`, `/auth/logout` |
| Documents | B | `POST /documents`, `GET /documents/{id}`, `GET /documents`, `DELETE /documents/{id}` |
| Analyses | B | `POST /analyses`, `GET /analyses/{id}`, `GET /analyses`, `GET /analyses/{id}/export.pdf` |
| Profile | C | `GET /me`, `PATCH /me`, `GET /me/timeline`, `DELETE /me` |
| Consent | C | `POST /consents`, `POST /consents/{id}/revoke`, `GET /me/access-log` |
| Verifications | C | `POST /verifications`, `POST /verifications/{id}/pay`, `GET /verifications/{id}`, `GET /me/verifications` |
| Doctor portal | C | `GET /doctor/inbox`, `GET /doctor/cases/{id}`, `POST /doctor/cases/{id}/review` |
| Doctors directory | D | `GET /doctors`, `GET /doctors/{id}`, `POST /doctors/{id}/reviews` |
| Chamber | D | `POST /chamber/session`, `POST /chamber/session/{token}/scan`, `GET /chamber/session/{id}/profile`, `POST /chamber/session/{id}/prescription`, `POST /chamber/session/{id}/close` |
| Audit | B | `GET /me/audit` |
| Admin | C | `POST /admin/doctors/{id}/verify` |

## To be added during the build

- [ ] Phase B: curl examples for the auth + document upload + analyze flow
- [ ] Phase C: curl examples for consent + verification request → review
- [ ] Phase D: curl examples for chamber QR flow
- [ ] Phase F: OpenAPI spec (FastAPI auto-generated at `/docs`)

## Operational notes

- Rate limiting: not enforced in Phase 1 (single-process in-memory). Phase 2 adds Redis-backed limits.
- CORS: dev allows `localhost:3000`; prod allows the frontend domain only.
- Request size: documents up to 10MB; lab PDFs up to 20MB.
