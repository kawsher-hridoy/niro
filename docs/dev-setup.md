# Dev Setup

> **Target:** clean clone → working health check in **10 minutes**.

This guide assumes a Linux or macOS development machine. Windows users:
WSL2 with Ubuntu 22.04+ recommended.

## Prerequisites

| Tool | Min version | Install |
|---|---|---|
| Python | 3.12 | `pyenv install 3.12` or system package |
| Node.js | 20 LTS | `nvm install 20` or `fnm install 20` |
| Docker | 24+ | docker.io or Docker Desktop |
| Docker Compose | v2 (built into Docker) | included with Docker |
| Git | 2.40+ | system package |
| Make (optional) | 4+ | used for shortcuts later |

Check:

```bash
python3 --version    # 3.12.x
node --version       # v20.x
docker --version     # 24.x or newer
docker compose version  # v2.x
```

## 1. Clone

```bash
git clone <repo-url> niro
cd niro
```

(Until we push to GitHub, this directory is just
`/home/l0minex/Desktop/Project/Ai-doc-project/`.)

## 2. Environment variables

```bash
cp .env.example .env
$EDITOR .env
```

Fill in at minimum:

- `AZURE_OPENAI_KEY` — your rotated Azure OpenAI key
- `APP_SECRET` — generate via `openssl rand -hex 32`

See [`env-vars.md`](env-vars.md) for the full list with rotation policy.

## 3. Bring up Postgres

```bash
docker compose up -d postgres
docker compose logs -f postgres   # confirm "database system is ready"
```

Postgres runs on `localhost:5432` with user/password/db = `niro/niro/niro`
(dev-only). Production credentials live in the VPS env, never in git.

## 4. Backend

```bash
cd niro
python3 -m venv .venv
source .venv/bin/activate
pip install -e ./backend
# Or, until backend/pyproject.toml exists:
# pip install fastapi sqlalchemy alembic openai pillow structlog python-jose passlib uvicorn pytest
```

Apply migrations:

```bash
cd backend
alembic upgrade head
```

Run the backend:

```bash
uvicorn backend.main:app --reload --port 8000
```

Verify:

```bash
curl http://localhost:8000/api/v1/health
# expected: {"ok":true}
```

## 5. Frontend

In a separate terminal:

```bash
cd niro/frontend
npm install
npm run dev
```

Open <http://localhost:3000>. You should see the Niro landing page
with the Bangla disclaimer banner.

## 6. AI capability check

Confirm the Azure OpenAI deployment is alive **with your key**:

```bash
cd niro
AZURE_OPENAI_KEY=$(grep ^AZURE_OPENAI_KEY .env | cut -d= -f2) .venv/bin/python probe.py
```

Expected: `6/6 tests passed`. If anything fails, see
[`ai-safety/contract.md`](ai-safety/contract.md) and the fallback options.

## 7. Happy path test (smoke test)

Once Phase B has shipped:

1. Open <http://localhost:3000>, click "Sign in".
2. Phone: any number (e.g. `+8801711000000`). OTP: `123456` (mock).
3. Upload `niro/sample_rx.png` as a prescription.
4. Wait ≤ 8 seconds → Bangla analysis page shows medications + red flags.

If this works end-to-end, your dev environment is correctly set up.

## 8. Stopping cleanly

```bash
# Backend: Ctrl+C
# Frontend: Ctrl+C
docker compose down       # stops Postgres but keeps volume
docker compose down -v    # ALSO deletes the volume (full reset)
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `psycopg2.OperationalError: could not connect` | Postgres not up | `docker compose up -d postgres` |
| `openai.APIError: 401` | Wrong key | Rotate + re-paste; see `env-vars.md` |
| `openai.BadRequestError: content_filter` | Azure content filter | Switch `AI_PROVIDER=claude`, see `ai-safety/contract.md` |
| `alembic.util.exc.CommandError: Can't locate revision` | Out-of-sync migrations | `alembic downgrade base && alembic upgrade head` |
| `next: command not found` | Forgot `npm install` | `cd niro/frontend && npm install` |
| Bangla shows boxes | Font failed to load | Check `niro/frontend/app/layout.tsx` — see `frontend/bangla-typography.md` |
| `port 5432 already in use` | Local Postgres running | `sudo systemctl stop postgresql` or change port in `docker-compose.yml` |

For anything not on this list, append to [`build-log.md`](build-log.md)
with the error and what you tried.
