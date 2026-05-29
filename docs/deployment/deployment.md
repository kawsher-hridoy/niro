# Deployment — End-to-end guide (Azure VM, Ubuntu 24.04)

> **⚡ LIVE DEPLOYMENT (30 May 2026): https://nirobd.tech**
> The real deployment is **single-domain, path-routed** on an Azure VM —
> NOT the two-subdomain (`niro.` + `api.niro.`) scheme this guide's body
> still uses as a worked example. What's actually true in prod:
> - **One domain** `nirobd.tech` (+ `www→` 301). Caddy routes `/api/*` →
>   FastAPI :8000, everything else → Next.js :3000.
> - **No CORS** — same origin, so the client uses a **relative** API base
>   `NEXT_PUBLIC_API_BASE=/api/v1` (pinned in `niro/frontend/.env.production`).
>   The §5.6 CORS edit and §5.7 absolute-URL build below are **obsolete** —
>   see the corrected notes inline in those sections.
> - **Updates use `./deploy.sh`** (repo root), not the manual §9 steps.
>   Config templates are committed: `Caddyfile`, `niro-backend.service`,
>   `niro-frontend.service` in this folder.
>
> The section-by-section mechanics (provisioning, Docker, systemd, Caddy,
> TLS, smoke test, rollback) are still accurate — just mentally map
> `niro.example.com`/`api.niro.example.com` → the single `nirobd.tech`.

> **Audience:** anyone deploying Niro to a single VPS for the
> ICADHI demo or a beta deployment.
> **Stack target:** one Azure VM running Postgres (Docker) + FastAPI
> (systemd) + Next.js (systemd) + Caddy (system package) + Let's
> Encrypt TLS.
> **Time budget:** ~45 minutes from VM-up to live URL, assuming DNS is
> already pointed at the VM.
>
> Companion docs (each goes deep on one piece — keep them open in tabs):
> - [`topology.md`](topology.md) — what runs where
> - [`docker-compose.md`](docker-compose.md) — Postgres compose walk-through
> - [`caddy.md`](caddy.md) — full Caddyfile + DNS pitfalls
> - [`backups.md`](backups.md) — nightly `pg_dump` → encrypted off-site
>
> **This guide is the single linear walkthrough.** The above are reference.

---

## 0. Pre-flight checklist

Before you click "Create" on the Azure portal, confirm you have:

- [ ] An **Azure subscription with credit** (Azure for Students is fine)
- [ ] A **GitHub Personal Access Token** with `repo:read` (the repo is private — see [open-questions.md OQ-5](../open-questions.md))
- [ ] The **production Azure OpenAI key** ready to paste into `.env` — you'll know it's right when `probe.py` shows 6/6 PASS in dev. **Do not commit it.**
- [ ] A **domain name** (or decision to demo on the raw `<vm>.<region>.cloudapp.azure.com` Azure FQDN — see [open-questions.md OQ-4](../open-questions.md)). The rest of this guide assumes `niro.example.com` + `api.niro.example.com`.
- [ ] An **SSH keypair on your local machine**. Generate one if you don't:

  ```bash
  ssh-keygen -t ed25519 -C "niro-deploy" -f ~/.ssh/niro_ed25519
  ```

  This produces `~/.ssh/niro_ed25519` (private) and `~/.ssh/niro_ed25519.pub` (public). You'll paste the **`.pub`** into the Azure portal.

- [ ] A **password manager entry** ready to receive: VM IP, SSH key path, `APP_SECRET`, `AZURE_OPENAI_KEY`, Postgres password (if you change it from `niro`). Never paste these into chat or commits.

---

## 1. Provision the Azure VM

### 1.1 Recommended config (matches what we sized in chat)

| Setting | Value |
|---|---|
| **Subscription** | Azure for Students (or your paid sub) |
| **Resource group** | `niro` (new) |
| **VM name** | `niro` |
| **Region** | **Central India** (lowest latency for Bangladesh ~30-50ms) |
| **Availability options** | Availability zone, Zone 1 |
| **Security type** | Trusted launch (Secure Boot + vTPM) |
| **Image** | Ubuntu Server **24.04 LTS** (Gen2, x64) |
| **Size** | **Standard B2als v2** (2 vCPU / 4 GiB) — burstable, ~$20/mo |
| **Authentication type** | **SSH public key** (NOT password) |
| **Username** | `niro` |
| **SSH public key source** | Use existing — paste `~/.ssh/niro_ed25519.pub` |
| **Public inbound ports** | **SSH (22), HTTP (80), HTTPS (443)** — three only |
| **OS disk** | Standard SSD LRS, 30 GB, "Delete with VM" enabled |

### 1.2 Networking tab — three things to flip

1. **Accelerated networking → On** (free perf win)
2. **Public IP → Static** (so DNS doesn't break on stop/start). Click into `niro-ip` → set Assignment to Static. Adds ~$3.65/mo.
3. **Delete public IP and NIC when VM is deleted → Enabled** (no orphaned charges)

### 1.3 Management tab — turn on auto-shutdown

For a student-budget demo, **Auto-shutdown ON at 02:00 Asia/Kolkata** roughly halves your monthly compute cost. The VM deallocates overnight; you bring it back up next session with a single click.

### 1.4 Click Create

Wait ~2 minutes for provisioning. Note the **public IP** when it's done. From here on this guide calls it `<VM_IP>`.

### 1.5 Lock down SSH (do this first, before anything else)

The Azure portal opens SSH to the entire internet by default. Bots find it within minutes.

1. VM blade → **Networking** → **Network settings**
2. Click the **SSH** inbound rule
3. **Source:** change `Any` → **My IP address**
4. Save

Verify from your local terminal:

```bash
ssh -i ~/.ssh/niro_ed25519 niro@<VM_IP>
```

If this works, you're in. If not, double-check the NSG rule's source matches `curl -s ifconfig.me` from your local machine.

> **If your home IP changes** (mobile network, ISP DHCP renewal), you'll need to re-edit the NSG rule. Use Azure CLI for speed:
> `az network nsg rule update --resource-group niro --nsg-name niro-nsg --name SSH --source-address-prefixes "$(curl -s ifconfig.me)/32"`

---

## 2. System preparation (one-time, on the VM)

All commands from here run **on the VM** as user `niro` unless noted.

### 2.1 Update + essentials

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y \
  build-essential \
  curl \
  ca-certificates \
  git \
  ufw \
  unattended-upgrades \
  jq \
  postgresql-client-16
```

`postgresql-client-16` gives you `psql` for migrations and ad-hoc queries — the server runs in Docker.

### 2.2 Enable automatic security updates

```bash
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

Accept defaults. Patches install nightly without intervention.

### 2.3 Enable UFW (defense in depth — NSG is your primary firewall)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

UFW is redundant with the NSG but cheap and catches the case where a future admin opens an NSG port without thinking.

### 2.4 Install Docker Engine

Use the official Docker repo, not the Ubuntu package (the Ubuntu package lags by months).

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker niro
newgrp docker  # apply group change in current shell
docker version
docker compose version
```

If `docker version` exits cleanly without `sudo`, you're set.

### 2.5 Install Node.js 20 LTS

Frontend needs Node 20+. We use NodeSource — Ubuntu's `nodejs` package is too old.

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # → v20.x.x
npm --version
```

### 2.6 Install Python 3.12 + uv

Ubuntu 24.04 ships Python 3.12 — perfect, our backend pins `>=3.12`.

```bash
sudo apt install -y python3.12 python3.12-venv python3-pip
python3.12 --version  # → Python 3.12.x

# Optional but faster: install uv (the package manager we use locally)
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env
```

### 2.7 Install Caddy (system package, not Docker)

Caddy needs to bind ports 80/443 directly. Running it in Docker adds complexity; system package is simpler.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | \
  sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | \
  sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
caddy version
```

Caddy is now running on ports 80/443 with its default page. You'll replace its config in §6.

---

## 3. DNS — point your domain at the VM

Do this **now**, in parallel with step 4. DNS propagation takes 1-5 minutes; if you wait until §6 you'll be twiddling thumbs.

In your DNS provider (Cloudflare, Namecheap, Google Domains — wherever you registered):

| Type | Name | Value | Proxy / Cloud |
|---|---|---|---|
| `A` | `niro` | `<VM_IP>` | **DNS only** (no orange cloud) |
| `A` | `api.niro` | `<VM_IP>` | **DNS only** (no orange cloud) |

> **Cloudflare proxying breaks Let's Encrypt HTTP-01.** If you must proxy through Cloudflare, switch Caddy to DNS-01 challenge (see [`caddy.md`](caddy.md) "Things that go wrong"). For the demo, just leave proxying off.

Verify from your local machine:

```bash
dig +short niro.example.com
dig +short api.niro.example.com
# Both should print <VM_IP>
```

If they don't resolve yet, give it 2-5 more minutes.

---

## 4. Clone the repo and configure `.env`

Back on the VM:

### 4.1 Pick a location

```bash
sudo mkdir -p /opt
sudo chown niro:niro /opt
cd /opt
```

We use `/opt/niro` (not `~/niro`) because systemd unit files reference an absolute path, and `/opt` is the conventional home for self-contained third-party software.

### 4.2 Clone

```bash
cd /opt
git clone https://github.com/kawsher-hridoy/niro.git
cd niro
git status  # confirm you're on main, working tree clean
```

If the repo is private, prompt-paste your GitHub PAT as the password when git asks. Or use `git clone https://<token>@github.com/kawsher-hridoy/niro.git` once and the credential is cached.

### 4.3 Create `.env` at the **repo root**

> **Critical:** `niro/backend/config.py:13` resolves `REPO_ROOT` as `parents[2]` from `niro/backend/config.py`, which is `/opt/niro`. Place `.env` at **`/opt/niro/.env`** — NOT inside `/opt/niro/niro/`. Wrong location = Settings won't see your vars and will crash at startup.

Generate a strong `APP_SECRET`:

```bash
APP_SECRET=$(openssl rand -hex 32)
echo "APP_SECRET=$APP_SECRET"   # copy this — store in password manager
```

Now create `.env`:

```bash
cat > /opt/niro/.env <<EOF
# === Niro production .env ===
# Created on $(date -u +%Y-%m-%dT%H:%M:%SZ)

# AI provider
AI_PROVIDER=azure
AZURE_OPENAI_ENDPOINT=https://ai-for-security.services.ai.azure.com/openai/v1
AZURE_OPENAI_DEPLOYMENT=gpt-chat-latest
AZURE_OPENAI_KEY=<paste-key-here>

# App
APP_ENV=prod
APP_SECRET=$APP_SECRET

# Database (Postgres in Docker on this same host)
DATABASE_URL=postgresql+psycopg://niro:niro@localhost:5432/niro

# Storage (local FS — Phase F task to migrate to Azure Blob)
STORAGE_BACKEND=local
STORAGE_LOCAL_PATH=/opt/niro/.data/blobs

# Audit
AUDIT_RETENTION_DAYS=365
EOF

chmod 600 /opt/niro/.env  # only owner can read
```

Open it and replace `<paste-key-here>` with the real Azure key:

```bash
nano /opt/niro/.env
```

Smoke-check the values are present:

```bash
grep -E "^(APP_SECRET|AZURE_OPENAI_KEY|DATABASE_URL|APP_ENV)=" /opt/niro/.env | wc -l
# → 4
```

> **`APP_ENV=prod`** is what flips runtime behavior away from dev defaults. Currently the codebase only reads it for logging; future Phase F changes will branch on it (e.g., disable Swagger UI in prod). Set it now so you don't forget later.

### 4.4 Strengthen Postgres password (recommended)

Default `niro:niro` is fine for local dev but embarrassing in prod even though Postgres only listens on `127.0.0.1`. Generate a real password:

```bash
PG_PASS=$(openssl rand -hex 16)
echo "Postgres password: $PG_PASS"   # copy to password manager
```

Edit two files to use it:

```bash
sed -i "s/POSTGRES_PASSWORD: niro/POSTGRES_PASSWORD: $PG_PASS/" /opt/niro/docker-compose.yml
sed -i "s|niro:niro@localhost|niro:$PG_PASS@localhost|" /opt/niro/.env
```

Verify both:

```bash
grep PASSWORD /opt/niro/docker-compose.yml
grep DATABASE_URL /opt/niro/.env
```

> If you skip this step, that's fine for the demo — Postgres is unreachable from outside the VM. Just promise yourself you'll fix it before any real patient sees the system.

---

## 5. Bring up the data + backend + frontend stack

### 5.1 Start Postgres (Docker)

```bash
cd /opt/niro
docker compose up -d postgres
docker compose ps   # postgres should show "healthy" within 10s
docker compose logs postgres | tail -20  # confirm "database system is ready to accept connections"
```

If healthcheck fails: check `docker compose logs postgres` for an error. Most common: port 5432 already in use because something else on the VM is binding it (`sudo ss -tlnp | grep 5432`).

### 5.2 Backend — Python venv + deps + migrations

```bash
cd /opt/niro/niro
python3.12 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -e backend          # installs niro/backend in editable mode
```

This pulls in FastAPI, uvicorn, SQLAlchemy 2.0, openai, pymupdf, etc. Takes ~2 min.

Apply migrations:

```bash
cd /opt/niro/niro
alembic -c alembic.ini upgrade head
```

Expected output: 5 migrations applied (`d99530cae0c6`, `a376ab1ca234`, `28e9c4a069e8`, `0004_email_password_auth`, `7c1a9f4b2e10`). Confirm:

```bash
alembic -c alembic.ini current
# → 7c1a9f4b2e10 (head)
```

### 5.3 Seed demo doctors

```bash
cd /opt/niro/niro
python -m backend.seeds.doctors
```

This inserts the 6 demo doctor profiles (Cardiology, Diabetes, etc.) used by the doctor-directory page. Idempotent — safe to re-run.

Verify:

```bash
docker compose -f /opt/niro/docker-compose.yml exec -T postgres \
  psql -U niro -d niro -c "SELECT count(*) FROM doctor_profiles;"
# → 6
```

### 5.4 Verify backend boots (foreground sanity check, not the final run)

```bash
cd /opt/niro/niro
source .venv/bin/activate
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Watch for `Application startup complete.` in the logs.

In a **second SSH session**:

```bash
curl -s http://127.0.0.1:8000/api/v1/health | jq
# → {"ok":true,"service":"niro-backend","version":"0.1.0","time":"..."}
```

Kill the foreground uvicorn (`Ctrl+C`) — we'll run it via systemd next.

### 5.5 Run probe.py against your prod Azure key

```bash
cd /opt/niro/niro
.venv/bin/python probe.py
```

Expected: `7/7 PASS` (TEST 7 is the PDF round-trip added in Fix #8). If you see `401 Unauthorized` from Azure, your key is wrong — re-check `.env`. **Do not skip this step.** A bad Azure key will pass health checks but every analysis will 500.

### 5.6 Patch CORS for production

> **⚠️ OBSOLETE for the single-domain (nirobd.tech) setup — SKIP THIS.**
> With frontend and API on the same origin (`/api/*` path-routed), the
> browser makes same-origin requests and **CORS never applies**. Leave
> `backend/main.py` untouched. This section only matters if you run the
> frontend and API on *different* origins (the old two-subdomain scheme).

If (and only if) you split frontend/API across two hostnames,

```bash
nano /opt/niro/niro/backend/main.py
```

Find the `CORSMiddleware` block (around line 59-65) and replace `allow_origins=["http://localhost:3000"]` with your prod origin:

```python
allow_origins=[
    "https://niro.example.com",
    "http://localhost:3000",   # keep for SSH-tunnel debugging
],
```

> **Don't commit this edit.** It's a deploy-local change. The proper Phase F fix is to read origins from `.env`. For now, make the edit on the VM and note it in your handoff.

### 5.7 Frontend — install + build with prod API URL baked in

> **Single-domain (nirobd.tech) reality:** the API base is **relative** and
> already committed in `niro/frontend/.env.production` as
> `NEXT_PUBLIC_API_BASE=/api/v1`. `next build` picks it up automatically —
> you do **not** pass an absolute URL on the CLI. Just run:
> ```bash
> cd /opt/niro/niro/frontend
> npm ci
> NODE_ENV=production npm run build
> ```
> (`deploy.sh` does exactly this on every frontend change.)

The absolute-URL form below is the **two-subdomain** variant — kept for
reference only:

`niro/frontend/src/lib/api.ts` reads `process.env.NEXT_PUBLIC_API_BASE` **at build time**, not runtime. It must be set before `npm run build`, and it gets compiled into the JS bundle.

```bash
cd /opt/niro/niro/frontend
npm ci   # uses package-lock.json, faster + reproducible vs npm install
NEXT_PUBLIC_API_BASE=https://api.niro.example.com/api/v1 npm run build
```

Build takes ~2 min. Output goes to `niro/frontend/.next/`.

Sanity-check the bundle has the right URL:

```bash
grep -r "api.niro.example.com" .next/server | head -3
# Should match — confirms the env var was baked in
```

Verify it boots:

```bash
npm run start -- --port 3000
# Open a second SSH session:
curl -sI http://127.0.0.1:3000 | head -1
# → HTTP/1.1 200 OK
```

Kill it (`Ctrl+C`) — systemd will run it next.

---

## 6. systemd units — make backend + frontend persistent

### 6.1 Backend unit

```bash
sudo tee /etc/systemd/system/niro-backend.service >/dev/null <<'EOF'
[Unit]
Description=Niro FastAPI backend
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=niro
Group=niro
WorkingDirectory=/opt/niro/niro
Environment="PATH=/opt/niro/niro/.venv/bin"
ExecStart=/opt/niro/niro/.venv/bin/uvicorn backend.main:app \
  --host 127.0.0.1 --port 8000 --workers 2 --log-level info
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

Notes:
- `--host 127.0.0.1` — binds to localhost only. **Caddy proxies to it**; the public internet never sees port 8000.
- `--workers 2` — for B2als v2 (2 vCPU). Each worker uses ~120 MB idle, ~600 MB during PDF rasterization. Two workers = ~1.2 GB peak; safe in 4 GB RAM alongside Postgres + Next.
- `Restart=always` — uvicorn died? systemd brings it back in 5 seconds.

### 6.2 Frontend unit

```bash
sudo tee /etc/systemd/system/niro-frontend.service >/dev/null <<'EOF'
[Unit]
Description=Niro Next.js frontend
After=network.target niro-backend.service

[Service]
Type=simple
User=niro
Group=niro
WorkingDirectory=/opt/niro/niro/frontend
Environment="NODE_ENV=production"
Environment="PORT=3000"
ExecStart=/usr/bin/npm run start -- --port 3000
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

### 6.3 Enable + start both

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now niro-backend niro-frontend
sudo systemctl status niro-backend --no-pager
sudo systemctl status niro-frontend --no-pager
```

Both should show `active (running)`.

If a unit fails: `sudo journalctl -u niro-backend -n 50 --no-pager` to see the last 50 log lines. The most common failure is a missing/wrong env var in `/opt/niro/.env`.

---

## 7. Caddy — TLS + reverse proxy

### 7.1 Write the Caddyfile

```bash
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
{
    email admin@example.com
}

niro.example.com {
    encode gzip zstd
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(self), camera=(self), microphone=()"
    }
    reverse_proxy 127.0.0.1:3000
}

api.niro.example.com {
    encode gzip zstd
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        Access-Control-Allow-Origin "https://niro.example.com"
        Access-Control-Allow-Credentials "true"
        Access-Control-Allow-Methods "GET, POST, PATCH, DELETE, OPTIONS"
        Access-Control-Allow-Headers "Authorization, Content-Type"
    }
    reverse_proxy 127.0.0.1:8000
}
EOF
```

Replace `example.com` everywhere with your real domain. **Don't forget the `email`** at the top — Let's Encrypt uses it for expiry warnings. Use a real address you check.

### 7.2 Validate + reload

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo journalctl -u caddy -n 30 --no-pager
```

In the journal you should see `obtain certificate` followed by `certificate obtained successfully` for both hostnames. If it hangs at `obtain certificate`:

- DNS hasn't propagated yet → wait, retry in 2 minutes
- Cloudflare proxying enabled → disable orange cloud
- Port 80 blocked by NSG → re-check §1.1 inbound ports

### 7.3 Verify TLS

From your local machine:

```bash
curl -sI https://niro.example.com | head -3
curl -sI https://api.niro.example.com/api/v1/health | head -3
```

Both should return `HTTP/2 200`. The frontend page should load in a browser and show the Niro marketing landing.

---

## 8. End-to-end smoke test

Mirrors the 14-step Phase-1 smoke from [`dev-setup.md §7`](../dev-setup.md), adapted for prod URLs.

1. **Health:** `curl https://api.niro.example.com/api/v1/health` → `{"ok":true,...}`
2. **Marketing landing loads:** open `https://niro.example.com` in a browser. Sticky nav, hero, 6 sections, footer.
3. **Patient signup:** click "Sign up" → enter phone + name → use mock OTP `123456`. **Important:** dev OTP only works because Phase 1 mocks SMS (see [open-questions.md OQ-16](../open-questions.md)). On prod this is still mocked.
4. **Sign in lands on `/home`:** authenticated app shell loads with sidebar + topbar.
5. **Upload PNG prescription:** pick `niro/sample_rx.png` (you can scp it up if you want a known-good fixture). Bangla analysis renders in 8-15s.
6. **Upload multi-page PDF:** use any 2-5 page lab report PDF. Analysis renders in 15-30s. **This exercises the Fix #8 PyMuPDF rasterization path** — if it fails, check `journalctl -u niro-backend` for `DocumentReadError` or Azure errors.
7. **🖨 PDF export button:** opens browser print dialog with print-only stylesheet (nav hidden).
8. **Doctor directory:** `/doctors` shows the 6 seeded doctors.
9. **Request verification:** pick a doctor → request → mock-pay → verification appears in `/verifications`.
10. **Audit trail intact:**
    ```bash
    docker compose -f /opt/niro/docker-compose.yml exec -T postgres \
      psql -U niro -d niro -c \
      "SELECT event, count(*) FROM audit_log GROUP BY event ORDER BY count(*) DESC;"
    ```
    Expect 12-15 distinct event types after running the flow above, including `ai.analyze.document` and (if you uploaded a PDF) `ai.document_unreadable` only if you hit a bad PDF.
11. **Negative test — bad PDF:** try uploading an encrypted/corrupted PDF. Expect HTTP 422 with a friendly message, NOT a 500 page.
12. **Bangla rendering:** confirm Bangla text uses Noto Sans Bengali (look for proper conjuncts: `ক্ষ`, `জ্ঞ`). Numerals appear as `২`, `৫`, etc., not `2`/`5`.
13. **Mobile view:** open the site on your phone. Hamburger menu, dashboard cards reflow, no horizontal scroll.
14. **TLS rating:** run `https://www.ssllabs.com/ssltest/analyze.html?d=niro.example.com`. Target **A+**. Caddy defaults already get there if HSTS is on.

If all 14 pass, **the deployment is live and ready for ICADHI judges**.

---

## 9. Operations cheat-sheet

### Logs

```bash
sudo journalctl -u niro-backend -f       # tail backend
sudo journalctl -u niro-frontend -f      # tail frontend
sudo journalctl -u caddy -f              # tail caddy
docker compose -f /opt/niro/docker-compose.yml logs -f postgres
```

### Restart a single service

```bash
sudo systemctl restart niro-backend
sudo systemctl restart niro-frontend
sudo systemctl reload caddy   # reload not restart — preserves connections
```

### Deploy a code update from `main`

**Primary path — one command on the VM:**

```bash
cd /opt/niro && ./deploy.sh
```

`deploy.sh` (repo root) fast-forward-pulls `origin/main`, then — based on
which files changed — reinstalls backend deps (only if `pyproject.toml`
changed), runs `alembic upgrade head` (only if a migration appeared),
rebuilds the frontend (only if `niro/frontend/` changed, `npm ci` only if
the lockfile changed), restarts only the affected systemd unit, and
health-checks `https://nirobd.tech/api/v1/health`. It refuses to run on a
dirty tree or off `main`, never touches `.env`, and no-ops when already up
to date. **This is the canonical update path.**

<details><summary>Manual equivalent (what <code>deploy.sh</code> automates)</summary>

```bash
cd /opt/niro
git pull --ff-only origin main

# If backend changed:
cd /opt/niro/niro
source .venv/bin/activate
pip install -e backend                                 # only if pyproject.toml changed
alembic -c alembic.ini upgrade head                    # only if a new migration appeared
sudo systemctl restart niro-backend

# If frontend changed:
cd /opt/niro/niro/frontend
npm ci
NODE_ENV=production npm run build                      # relative API base from .env.production
sudo systemctl restart niro-frontend
```
</details>

### Database snapshot (manual, ad-hoc)

```bash
docker compose -f /opt/niro/docker-compose.yml exec -T postgres \
  pg_dump -U niro -d niro -Fc -f /tmp/niro-$(date -u +%Y%m%dT%H%M%SZ).dump
docker compose -f /opt/niro/docker-compose.yml cp postgres:/tmp/niro-*.dump /opt/niro/.data/
```

For nightly automated backups → see [`backups.md`](backups.md) for the `pg_dump` → `age` → Backblaze B2 pipeline.

### Disk usage check

```bash
df -h /                                      # whole disk
du -sh /opt/niro/.data/blobs                 # uploaded PDFs/images
du -sh /opt/niro/.data/pg                    # Postgres data
docker system df                             # Docker layers
```

If `.data/blobs` grows fast: Phase F task to migrate to Azure Blob Storage.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `502 Bad Gateway` from Caddy | backend or frontend systemd unit is down | `systemctl status niro-backend niro-frontend` → check `journalctl` for the failing one |
| Login works but uploads return 500 | Bad Azure key, or `STORAGE_LOCAL_PATH` not writable | Re-run `probe.py`. Check `ls -la /opt/niro/.data/blobs` is owned by `niro:niro` |
| Login succeeds but every page-load logs out | `APP_SECRET` mismatch between current and previous backend boot — JWT rejected | Don't change `APP_SECRET` in prod. If you must, accept that all sessions force-relogin once |
| TLS cert won't issue | DNS not propagated, Cloudflare proxying, or port 80 blocked | `dig +short niro.example.com` must return `<VM_IP>`. Disable Cloudflare orange cloud. Re-check NSG port 80 |
| Bangla text renders as boxes | Noto Sans Bengali not loaded — usually a CSP/blocking issue | Open browser devtools → Network → filter "fonts" → check the Google Fonts URL loads |
| PDF analysis hangs >60s | Azure OpenAI rate limit, or PyMuPDF stuck on a corrupt page | Check `journalctl -u niro-backend` for the actual error. Multi-page lab reports legitimately take 25-30s |
| `ai.document_unreadable` audit event but a normal PDF | PDF actually IS encrypted (some banks/labs PDF-export with metadata encryption even when no password) | Open the PDF locally with `qpdf --check file.pdf` to confirm |
| Memory pressure / OOM kills | One PDF analysis spiked too high | Reduce uvicorn `--workers` from 2 to 1 in `niro-backend.service`. B2als v2 has 4 GiB; safer for demo |

---

## 11. Rollback

If a deploy breaks something:

```bash
cd /opt/niro
git log --oneline -10                # find the last good commit
git checkout <good-sha>
cd niro
source .venv/bin/activate
pip install -e backend               # if deps changed
alembic -c alembic.ini downgrade -1  # only if you need to roll back a migration
sudo systemctl restart niro-backend

cd /opt/niro/niro/frontend
NEXT_PUBLIC_API_BASE=https://api.niro.example.com/api/v1 npm run build
sudo systemctl restart niro-frontend
```

For database rollback you also need the latest backup (see [`backups.md`](backups.md)).

> **Do NOT `git reset --hard`** — `git checkout` is enough and lets you `git checkout main` to return.

---

## 12. Teardown (after demo)

If the VM is just for ICADHI and you want to stop billing:

### Option A — pause (keep IP and disk)

In Azure portal → VM blade → **Stop**. This deallocates compute (no hourly charge); disk + static IP keep billing (~$9/mo). Restart anytime — same IP, same data.

### Option B — full delete (zero ongoing cost)

```bash
# From your local machine, with az CLI logged in:
az group delete --name niro --yes --no-wait
```

Deletes everything: VM, disk, NIC, public IP, NSG, VNet. Set-and-forget; takes ~5 minutes. **Data is gone forever** unless you've backed up `/opt/niro/.data/pg` first.

For ICADHI demo, **Option A during the judging window** then **Option B after results**.

---

## 13. What's NOT covered (Phase F follow-ups)

This guide gets you to a live demo. The following are tracked as Phase F (post-30-May shortlist):

- **Real SMS for OTP** — currently mocked, see [open-questions.md OQ-16](../open-questions.md)
- **Real BMDC verification** — currently seeded `verified=true`, see [open-questions.md OQ-14](../open-questions.md)
- **PyMuPDF → pypdfium2 swap** — AGPL compliance, see [open-questions.md OQ-17](../open-questions.md) and [decisions.md D-013](../decisions.md)
- **Azure Blob Storage for documents** — currently local FS, scales poorly past one VM
- **Sentry error tracking** — currently structlog → journald only
- **Azure Database for PostgreSQL** — currently single-VM Postgres, no PITR
- **Multi-VM HA** — currently single point of failure
- **CI/CD pipeline** — currently manual `git pull && systemctl restart`

When you ship those, **come back to this file and update §5/§6/§7 to match.**

---

*Last updated: 29 May 2026 (Day-5 Fix #8/#9/#10 — PDF vision, docs refresh, hydration suppression all on `main`).*
