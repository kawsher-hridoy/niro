# Environment Variables

Every env var Niro reads, what it's for, an example value, and how/when
to rotate it. Source of truth for `.env.example`.

> **Never commit `.env`.** It's in `.gitignore`. If you accidentally
> commit a key, rotate it immediately — `git filter-branch` does not
> protect you from someone reading the pushed commit.

## Required

### AI provider

| Variable | Type | Example | Description | Rotation |
|---|---|---|---|---|
| `AI_PROVIDER` | enum | `azure` | One of `azure`, `claude`, `gemini`. Selects the `AIProvider` implementation at startup. | Never; change to fail over. |
| `AZURE_OPENAI_ENDPOINT` | url | `https://ai-for-security.services.ai.azure.com/openai/v1` | Azure OpenAI base URL. Already includes `/openai/v1`. | When migrating to your own Azure subscription post-ICADHI. |
| `AZURE_OPENAI_DEPLOYMENT` | string | `gpt-chat-latest` | Deployment name (NOT the model name — it's whatever you named the deployment in Azure portal). | When you create a new deployment. |
| `AZURE_OPENAI_KEY` | secret | `52oN...vVQ` (88 chars) | Azure API key. Used as `Authorization: Bearer <key>`. | If leaked: immediately. Routine: every 90 days. |

### App

| Variable | Type | Example | Description | Rotation |
|---|---|---|---|---|
| `APP_ENV` | enum | `dev` | One of `dev`, `staging`, `prod`. Changes some defaults (e.g. CORS). | n/a |
| `APP_SECRET` | secret | 64 hex chars | Used to sign JWTs and signed blob URLs. Generate via `openssl rand -hex 32`. | If leaked: immediately + force re-login of all users. Routine: every 180 days. |

### Database

| Variable | Type | Example | Description | Rotation |
|---|---|---|---|---|
| `DATABASE_URL` | url | `postgresql://niro:niro@localhost:5432/niro` | SQLAlchemy connection string. | Change the password by rotating the role; redeploy. |

### Storage

| Variable | Type | Example | Description | Rotation |
|---|---|---|---|---|
| `STORAGE_BACKEND` | enum | `local` | One of `local`, `s3`. Selects blob writer. | n/a |
| `STORAGE_LOCAL_PATH` | path | `./niro/uploads` | Used when `STORAGE_BACKEND=local`. Directory must be writable. | n/a |

### Audit

| Variable | Type | Example | Description | Rotation |
|---|---|---|---|---|
| `AUDIT_RETENTION_DAYS` | int | `365` | How long audit rows are kept before archival. | n/a |

## Optional (fallback providers)

| Variable | Type | When needed | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | secret | `AI_PROVIDER=claude` | Get from console.anthropic.com. |
| `GOOGLE_API_KEY` | secret | `AI_PROVIDER=gemini` | Get from ai.google.dev. |

## Optional (Phase 2)

| Variable | Type | When needed | Notes |
|---|---|---|---|
| `STORAGE_S3_BUCKET` | string | `STORAGE_BACKEND=s3` | Bucket name. |
| `STORAGE_S3_REGION` | string | `STORAGE_BACKEND=s3` | e.g. `us-east-1`. |
| `STORAGE_S3_ENDPOINT` | url | S3-compatible | Backblaze B2 or Wasabi endpoint. |
| `STORAGE_S3_ACCESS_KEY` | secret | `STORAGE_BACKEND=s3` | Per-bucket if possible. |
| `STORAGE_S3_SECRET_KEY` | secret | `STORAGE_BACKEND=s3` | — |
| `SENTRY_DSN` | url | error reporting on | Free tier is fine. |
| `BKASH_API_KEY` | secret | real bKash | Sandbox first; production is application + manual approval. |
| `BKASH_API_SECRET` | secret | real bKash | — |
| `BKASH_USERNAME` | string | real bKash | — |
| `BKASH_PASSWORD` | secret | real bKash | — |
| `BMDC_API_BASE` | url | real BMDC verification | Phase 2 only; Phase 1 uses seeded `verified=true`. |
| `SMS_PROVIDER_KEY` | secret | real OTP | Phase 2; Phase 1 uses static `123456`. |

## Generating secrets locally

```bash
# APP_SECRET (64 hex chars)
openssl rand -hex 32

# Postgres password (24 url-safe chars)
openssl rand -base64 24 | tr -d '/+=' | head -c 24

# A general-purpose UUID
python3 -c "import uuid; print(uuid.uuid4())"
```

## Loading in code

Niro uses **pydantic-settings**:

```python
# niro/backend/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_env: str = "dev"
    app_secret: str
    azure_openai_endpoint: str
    azure_openai_deployment: str = "gpt-chat-latest"
    azure_openai_key: str
    database_url: str
    storage_backend: str = "local"
    storage_local_path: str = "./niro/uploads"
    audit_retention_days: int = 365

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()  # raises if required ones missing
```

Never read env vars directly with `os.environ.get(...)` in feature
code. Always go through `settings`. This gives type safety and a single
place to spot config drift.
