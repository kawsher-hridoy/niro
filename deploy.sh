#!/usr/bin/env bash
# deploy.sh — publish the latest GitHub `main` to the running nirobd.tech stack.
#
# Usage:  cd /opt/niro && ./deploy.sh
#
# Pulls origin/main (fast-forward only), then rebuilds/migrates/restarts ONLY the
# parts that actually changed, and health-checks the live site. Never touches
# .env or any secret. Safe to run repeatedly — a no-op when already up to date.
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$REPO_ROOT/niro"
FRONTEND_DIR="$REPO_ROOT/niro/frontend"
VENV="$BACKEND_DIR/.venv"
SITE="https://nirobd.tech"

cd "$REPO_ROOT"

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
info() { printf '  • %s\n'  "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

export PATH="$HOME/.local/bin:$PATH"   # ensure uv is found in non-login shells

# --- 1. Guard: clean tree, on main ---
say "Checking working tree"
[ -n "$(git status --porcelain)" ] && die "Working tree has local changes. Commit/stash them first, then re-run."
branch="$(git rev-parse --abbrev-ref HEAD)"
[ "$branch" = "main" ] || die "Not on main (on '$branch'). Switch to main first."
ok "Clean, on main"

# --- 2. Pull (fast-forward only) ---
say "Pulling origin/main"
OLD="$(git rev-parse HEAD)"
git fetch origin main || die "git fetch failed"
git pull --ff-only origin main || die "Pull is not a fast-forward — server and GitHub have diverged. Resolve manually."
NEW="$(git rev-parse HEAD)"

if [ "$OLD" = "$NEW" ]; then
  ok "Already up to date ($(git rev-parse --short HEAD)). Nothing to deploy."
  exit 0
fi
ok "Updated ${OLD:0:7} → ${NEW:0:7}"

CHANGED="$(git diff --name-only "$OLD" "$NEW")"
info "Changed files:"; echo "$CHANGED" | sed 's/^/      /'

changed() { echo "$CHANGED" | grep -qE "$1"; }
restart_backend=0
restart_frontend=0

# --- 3. Backend deps ---
if changed '^niro/backend/pyproject.toml$'; then
  say "Backend deps changed → reinstalling"
  "$VENV/bin/python" -m pip --version >/dev/null 2>&1 || true
  (cd "$BACKEND_DIR" && uv pip install -e backend) || die "backend dep install failed"
  ok "Backend deps installed"
  restart_backend=1
fi

# --- 4. Migrations ---
if changed '^niro/backend/db/migrations/'; then
  say "Migrations changed → upgrading database"
  (cd "$BACKEND_DIR" && "$VENV/bin/alembic" -c alembic.ini upgrade head) || die "alembic upgrade failed"
  ok "Database at head"
  restart_backend=1
fi

# --- 5. Other backend code ---
if changed '^niro/backend/' && [ "$restart_backend" = 0 ]; then
  restart_backend=1
fi

# --- 6. Frontend build ---
if changed '^niro/frontend/'; then
  say "Frontend changed → building"
  cd "$FRONTEND_DIR"
  if changed '^niro/frontend/package-lock.json$'; then
    info "Lockfile changed → npm ci"
    npm ci || die "npm ci failed"
  fi
  NODE_OPTIONS=--max-old-space-size=2048 NODE_ENV=production npm run build || die "next build failed"
  cd "$REPO_ROOT"
  ok "Frontend built"
  restart_frontend=1
fi

# --- 7. Restart only what changed ---
say "Restarting services"
if [ "$restart_backend" = 1 ]; then sudo systemctl restart niro-backend; ok "niro-backend restarted"; else info "backend unchanged — left running"; fi
if [ "$restart_frontend" = 1 ]; then sudo systemctl restart niro-frontend; ok "niro-frontend restarted"; else info "frontend unchanged — left running"; fi
sleep 4

# --- 8. Health check ---
say "Health check"
h="$(curl -fsS "$SITE/api/v1/health" 2>/dev/null)" && echo "$h" | grep -q '"ok":true' \
  && ok "API healthy: $h" || die "API health check FAILED — check: journalctl -u niro-backend -n 50"
code="$(curl -s -o /dev/null -w '%{http_code}' "$SITE/")"
[ "$code" = "200" ] && ok "Site returns 200" || die "Site returned HTTP $code"

say "Deployed $(git rev-parse --short HEAD) → $SITE ✓"
