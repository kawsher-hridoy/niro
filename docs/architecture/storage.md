# Architecture — Storage

> **Canonical reference:** [`DESIGN.md §8`](../../DESIGN.md#8-storage-strategy).
> This file adds operational notes (blob layout, signed URL spec) as the
> build progresses.

## What lives where

| Data | Where | Phase |
|---|---|---|
| Structured records | PostgreSQL 16 | A |
| Document blobs (dev) | Local FS at `STORAGE_LOCAL_PATH` | B |
| Document blobs (prod) | S3-compatible (Backblaze B2 or Wasabi) | F4 |
| Thumbnails | Same as blobs, suffix `.thumb.jpg` | B |
| DGDA formulary embeddings | pgvector table `drug_kb_embeddings` | C / F |
| Sessions | Postgres `sessions` table | B |
| Rate limits | In-memory (single process) for MVP; Redis post-final | F |

## Blob layout

```
<STORAGE_LOCAL_PATH>/
└── <patient_uuid>/
    ├── <document_uuid>.<ext>
    └── <document_uuid>.thumb.jpg
```

## Signed URLs (Phase B)

Frontend never receives raw blob paths. Instead:

1. Frontend requests `GET /documents/{id}` → backend returns signed URL valid 5 min.
2. URL format: `<base>/blob/<patient_id>/<document_id>?expires=<unix>&sig=<hmac>`.
3. Backend `/blob/...` route verifies HMAC + expiry + that the requesting bearer has consent.

## To be added during the build

- [ ] Phase B: actual `storage.py` API once written
- [ ] Phase B: thumbnail generation pipeline
- [ ] Phase F: S3 / B2 setup steps + bucket policy
- [ ] Phase F: backup procedure (`pg_dump` for SQL + `rclone` for blobs)
