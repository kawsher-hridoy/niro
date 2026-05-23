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

## 7. Verify Phase A — 6 checks (~2 minutes total)

Run these in order after a fresh clone or any environment change. If all
6 pass, your Phase A setup is correct and you can start Phase B work.

### Check 1 — Postgres is up and healthy

```bash
docker compose ps --format "{{.Name}}\t{{.Status}}"
```

Expect:
```
niro-postgres	Up X minutes (healthy)
```

If not healthy, `docker compose logs postgres | tail -20` and look for
errors. Common: port 5432 collision with a host-installed Postgres
(`sudo systemctl stop postgresql`).

### Check 2 — Migrations are applied

```bash
docker compose exec -T postgres psql -U niro -d niro -c "\dt"
```

Expect 6 tables (5 schema + 1 Alembic version):
```
public | alembic_version  | table | niro
public | doctor_profiles  | table | niro
public | documents        | table | niro
public | otp_codes        | table | niro
public | patient_profiles | table | niro
public | users            | table | niro
```

If missing, `cd niro && source .venv/bin/activate && alembic -c alembic.ini upgrade head`.

### Check 3 — Backend health endpoint

In one terminal start the backend:
```bash
cd niro && source .venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

In another:
```bash
curl http://localhost:8000/api/v1/health
```

Expect (formatted for readability — real output is one line):
```json
{
  "ok": true,
  "service": "niro-backend",
  "version": "0.1.0",
  "time": "2026-05-..."
}
```

If you get a connection refused, the backend isn't running. If you get
500, check the uvicorn logs — likely a `.env` or DB connection problem.

### Check 4 — Frontend loads with Bangla content

In a third terminal:
```bash
cd niro/frontend && npm run dev
```

Open <http://localhost:3000> in a browser. You should see:
- A title **নিরো** in green
- Subtitle **আপনার স্বাস্থ্য, আপন হাতে।**
- 3 feature cards in Bangla: "AI ডকুমেন্ট বিশ্লেষণ", "রোগী-নিয়ন্ত্রিত প্রোফাইল", "ডাক্তার যাচাই"
- A pale-amber disclaimer banner at the top: **এটি চিকিৎসা পরামর্শ নয়। ডাক্তারের সাথে নিশ্চিত হোন।**
- Footer mentioning ICADHI 2026 Track 1

If Bangla shows boxes / wrong glyphs: the Noto Sans Bengali font failed
to load. Check `src/app/layout.tsx` and `globals.css`.

Quick headless verification:
```bash
curl -s http://localhost:3000/ | grep -oE "(নিরো|আপনার স্বাস্থ্য|বিশ্লেষণ)" | sort -u
```
Expect 3 lines.

### Check 5 — AI provider is alive

```bash
cd niro
set -a && source ../.env && set +a
.venv/bin/python probe.py
```

Expect:
```
6/6 tests passed
```

Each test is gated:
- TEST 1 — Bangla generation quality (80%+ Bangla characters)
- TEST 2 — Structured JSON from a typed prescription
- TEST 3 — Vision: read `sample_rx.png`
- TEST 4 — Vision + Bangla on `sample_lab.png` + no content-filter refusal
- TEST 5 — Function/tool calling
- TEST 6 — Latency < 15s

If any fail, your `AZURE_OPENAI_KEY` in `.env` is likely wrong / expired.
Get a fresh key from the Azure portal and re-run.

### Check 6 — Git state is clean

```bash
git status --short
```

Expect either nothing, or only changes you intend (like a fresh
`docs/build-log.md` entry).

```bash
git log --oneline -5
```

Expect to see `phase-a: foundation — ...` near the top.

```bash
gh pr view 1 --json state,title -t '{{.state}} | {{.title}}'
```

Expect:
```
OPEN | Phase A — Foundation: docker-compose, FastAPI backend, Next.js frontend, docs
```

### All 6 green = Phase A verified. Proceed to Phase B.

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
