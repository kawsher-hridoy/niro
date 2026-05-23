#!/usr/bin/env bash
# niro.sh — control script for the Niro stack.
#
# Subcommands:
#   start       — bring up Postgres + backend + frontend (idempotent)
#   stop        — stop backend + frontend (Postgres stays; --with-db to stop it too)
#   restart     — stop + start
#   status      — show what's running, what ports, recent log tails
#   setup       — first-time only: venv, deps, migrations, seed
#   probe       — re-run the AI capability probe against the .env key
#   logs        — tail backend + frontend logs (Ctrl-C to exit)
#   nuke        — stop everything + delete .data/ + .niro-run/ + .next/dev (asks first)
#
# PIDs and logs live in .niro-run/ (gitignored).
set -uo pipefail

# ---------- locations ----------
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$REPO_ROOT/.niro-run"
BACKEND_DIR="$REPO_ROOT/niro"
FRONTEND_DIR="$REPO_ROOT/niro/frontend"
VENV="$BACKEND_DIR/.venv"
ENV_FILE="$REPO_ROOT/.env"

BACKEND_PID="$RUN_DIR/backend.pid"
FRONTEND_PID="$RUN_DIR/frontend.pid"
BACKEND_LOG="$RUN_DIR/backend.log"
FRONTEND_LOG="$RUN_DIR/frontend.log"

BACKEND_PORT=8000
FRONTEND_PORT=3000

# ---------- output helpers ----------
if [[ -t 1 ]]; then
  C_DIM=$'\033[2m'; C_BOLD=$'\033[1m'; C_RED=$'\033[31m'
  C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'; C_BLUE=$'\033[34m'; C_RST=$'\033[0m'
else
  C_DIM=""; C_BOLD=""; C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_RST=""
fi
say()   { printf '%s\n' "$*"; }
info()  { printf '%s•%s %s\n' "$C_BLUE" "$C_RST" "$*"; }
ok()    { printf '%s✓%s %s\n' "$C_GREEN" "$C_RST" "$*"; }
warn()  { printf '%s!%s %s\n' "$C_YELLOW" "$C_RST" "$*"; }
err()   { printf '%s✗%s %s\n' "$C_RED" "$C_RST" "$*" >&2; }
hdr()   { printf '\n%s%s%s\n' "$C_BOLD" "$*" "$C_RST"; }

# ---------- guards ----------
need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "$1 not found. Install it and retry."
    return 1
  fi
}

need_env_file() {
  if [[ ! -f "$ENV_FILE" ]]; then
    err ".env not found at $ENV_FILE. Copy .env.example and fill AZURE_OPENAI_KEY + APP_SECRET."
    return 1
  fi
  local key
  key="$(grep -E '^AZURE_OPENAI_KEY=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r\n')"
  if [[ -z "$key" || "$key" == "replace-me" ]]; then
    err "AZURE_OPENAI_KEY is empty / placeholder in .env."
    return 1
  fi
}

is_pid_alive() {
  local pidfile="$1"
  [[ -f "$pidfile" ]] || return 1
  local pid; pid="$(cat "$pidfile" 2>/dev/null || true)"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

port_listening() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -tln 2>/dev/null | grep -qE "[:.]${port}\b"
  else
    netstat -tln 2>/dev/null | grep -qE "[:.]${port}\b"
  fi
}

wait_for_port() {
  local port="$1" timeout="${2:-30}" elapsed=0
  while (( elapsed < timeout )); do
    if port_listening "$port"; then return 0; fi
    sleep 1; (( elapsed++ ))
  done
  return 1
}

# ---------- subcommands ----------

cmd_setup() {
  hdr "Niro · first-time setup"
  need_cmd docker || return 1
  need_cmd python3 || return 1
  need_cmd npm || return 1
  need_env_file || return 1

  mkdir -p "$RUN_DIR"

  info "Starting Postgres so we can apply migrations..."
  (cd "$REPO_ROOT" && docker compose up -d postgres) || { err "docker compose failed"; return 1; }
  wait_for_port 5432 30 || { err "Postgres did not listen on 5432"; return 1; }
  sleep 2

  if [[ ! -d "$VENV" ]]; then
    info "Creating Python venv at $VENV ..."
    if command -v uv >/dev/null 2>&1; then
      (cd "$BACKEND_DIR" && uv venv --python 3.12 .venv) || { err "uv venv failed"; return 1; }
    else
      python3 -m venv "$VENV" || { err "python3 -m venv failed"; return 1; }
    fi
  fi

  info "Installing backend deps (editable)..."
  # shellcheck disable=SC1091
  source "$VENV/bin/activate"
  if command -v uv >/dev/null 2>&1; then
    uv pip install -e "$BACKEND_DIR/backend" >/dev/null || { err "uv pip install failed"; return 1; }
  else
    pip install -e "$BACKEND_DIR/backend" >/dev/null || { err "pip install failed"; return 1; }
  fi
  ok "Backend deps installed."

  info "Applying database migrations..."
  (cd "$BACKEND_DIR" && alembic -c alembic.ini upgrade head) || { err "alembic upgrade failed"; return 1; }
  ok "Migrations at head."

  info "Seeding 6 BMDC-verified doctors (idempotent)..."
  (cd "$BACKEND_DIR" && python -m backend.seeds.doctors) || { err "seed failed"; return 1; }

  if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    info "Installing frontend deps (npm install)..."
    (cd "$FRONTEND_DIR" && npm install) || { err "npm install failed"; return 1; }
  fi
  ok "Frontend deps installed."

  ok "Setup complete. Run './niro.sh start' next."
}

cmd_start() {
  hdr "Niro · starting"
  need_env_file || return 1
  mkdir -p "$RUN_DIR"

  # Postgres ----------
  if ! port_listening 5432; then
    info "Bringing up Postgres..."
    (cd "$REPO_ROOT" && docker compose up -d postgres) || { err "docker compose failed"; return 1; }
    wait_for_port 5432 30 || { err "Postgres did not listen on 5432"; return 1; }
    sleep 2
  fi
  ok "Postgres ready on :5432"

  if [[ ! -d "$VENV" ]]; then
    warn "Python venv missing. Running setup first..."
    cmd_setup || return 1
  fi

  # Migrations (cheap, always safe) ----------
  info "Applying migrations (no-op if at head)..."
  (cd "$BACKEND_DIR" && "$VENV/bin/alembic" -c alembic.ini upgrade head) \
    >> "$RUN_DIR/migrate.log" 2>&1 \
    || { err "alembic upgrade failed (see $RUN_DIR/migrate.log)"; return 1; }
  ok "Migrations applied."

  # Backend ----------
  if is_pid_alive "$BACKEND_PID"; then
    ok "Backend already running (pid $(cat "$BACKEND_PID"))."
  else
    if port_listening "$BACKEND_PORT"; then
      err "Port $BACKEND_PORT already in use by another process. Stop it first."
      return 1
    fi
    info "Starting backend on :$BACKEND_PORT ..."
    (
      cd "$BACKEND_DIR"
      nohup "$VENV/bin/uvicorn" backend.main:app \
        --host 127.0.0.1 --port "$BACKEND_PORT" --log-level info \
        > "$BACKEND_LOG" 2>&1 &
      echo $! > "$BACKEND_PID"
    )
    wait_for_port "$BACKEND_PORT" 30 || { err "Backend did not listen on $BACKEND_PORT (see $BACKEND_LOG)"; return 1; }
    ok "Backend running on http://localhost:$BACKEND_PORT (pid $(cat "$BACKEND_PID"))."
  fi

  # Health probe ----------
  if curl -fsS "http://localhost:$BACKEND_PORT/api/v1/health" > /dev/null 2>&1; then
    ok "Backend /api/v1/health returns 200."
  else
    warn "Backend health endpoint did not respond. Tail $BACKEND_LOG."
  fi

  # Frontend ----------
  if is_pid_alive "$FRONTEND_PID"; then
    ok "Frontend already running (pid $(cat "$FRONTEND_PID"))."
  else
    if port_listening "$FRONTEND_PORT"; then
      err "Port $FRONTEND_PORT already in use by another process. Stop it first."
      return 1
    fi
    if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
      info "Frontend node_modules missing. Running npm install..."
      (cd "$FRONTEND_DIR" && npm install) >> "$FRONTEND_LOG" 2>&1 \
        || { err "npm install failed"; return 1; }
    fi
    info "Starting frontend on :$FRONTEND_PORT (Turbopack)..."
    (
      cd "$FRONTEND_DIR"
      nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
      echo $! > "$FRONTEND_PID"
    )
    wait_for_port "$FRONTEND_PORT" 60 || { err "Frontend did not listen on $FRONTEND_PORT (see $FRONTEND_LOG)"; return 1; }
    ok "Frontend running on http://localhost:$FRONTEND_PORT (pid $(cat "$FRONTEND_PID"))."
  fi

  hdr "Niro is up"
  say "  ${C_BOLD}Patient app:${C_RST}    http://localhost:$FRONTEND_PORT"
  say "  ${C_BOLD}API health:${C_RST}     http://localhost:$BACKEND_PORT/api/v1/health"
  say "  ${C_BOLD}Swagger:${C_RST}        http://localhost:$BACKEND_PORT/docs"
  say ""
  say "  Patient login: any phone, OTP ${C_BOLD}123456${C_RST}"
  say "  Doctor login : phone ${C_BOLD}+88017000DOCTR1${C_RST} (through DOCTR6), OTP ${C_BOLD}123456${C_RST}"
  say ""
  say "  Logs:  $BACKEND_LOG"
  say "         $FRONTEND_LOG"
  say "  Stop:  ./niro.sh stop"
}

cmd_stop() {
  hdr "Niro · stopping"
  local with_db=0
  for arg in "$@"; do
    case "$arg" in
      --with-db|--db) with_db=1 ;;
    esac
  done

  # Frontend ----------
  if is_pid_alive "$FRONTEND_PID"; then
    local pid; pid="$(cat "$FRONTEND_PID")"
    info "Stopping frontend (pid $pid)..."
    kill "$pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      warn "Frontend didn't exit; SIGKILL..."
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$FRONTEND_PID"
    ok "Frontend stopped."
  else
    info "Frontend not running."
    rm -f "$FRONTEND_PID"
  fi
  # Defensive: kill any straggler `next dev` processes started outside the script
  pkill -f "next dev" 2>/dev/null || true

  # Backend ----------
  if is_pid_alive "$BACKEND_PID"; then
    local pid; pid="$(cat "$BACKEND_PID")"
    info "Stopping backend (pid $pid)..."
    kill "$pid" 2>/dev/null || true
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      warn "Backend didn't exit; SIGKILL..."
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$BACKEND_PID"
    ok "Backend stopped."
  else
    info "Backend not running."
    rm -f "$BACKEND_PID"
  fi
  pkill -f "uvicorn backend.main:app" 2>/dev/null || true

  # Postgres (optional) ----------
  if (( with_db )); then
    info "Stopping Postgres container..."
    (cd "$REPO_ROOT" && docker compose stop postgres) || warn "docker compose stop returned non-zero"
    ok "Postgres stopped."
  else
    info "Postgres left running. Use './niro.sh stop --with-db' to stop it too."
  fi

  ok "Niro is down."
}

cmd_restart() {
  cmd_stop "$@"
  echo
  cmd_start
}

cmd_status() {
  hdr "Niro · status"

  # Postgres
  if port_listening 5432; then
    ok "Postgres listening on :5432"
    if command -v docker >/dev/null 2>&1; then
      docker compose ps --format 'table {{.Name}}\t{{.Status}}' 2>/dev/null | grep -E '^(NAME|niro-postgres)' || true
    fi
  else
    warn "Postgres NOT listening on :5432"
  fi

  # Backend
  if is_pid_alive "$BACKEND_PID"; then
    ok "Backend running (pid $(cat "$BACKEND_PID")) on :$BACKEND_PORT"
    if curl -fsS "http://localhost:$BACKEND_PORT/api/v1/health" > /dev/null 2>&1; then
      say "    /api/v1/health → 200"
    else
      warn "  /api/v1/health did not respond"
    fi
  else
    warn "Backend NOT running"
  fi

  # Frontend
  if is_pid_alive "$FRONTEND_PID"; then
    ok "Frontend running (pid $(cat "$FRONTEND_PID")) on :$FRONTEND_PORT"
    if curl -fsS "http://localhost:$FRONTEND_PORT/" > /dev/null 2>&1; then
      say "    / → 200"
    else
      warn "  / did not respond"
    fi
  else
    warn "Frontend NOT running"
  fi

  if [[ -f "$BACKEND_LOG" ]]; then
    hdr "backend.log (last 5 lines)"
    tail -n 5 "$BACKEND_LOG" 2>/dev/null || true
  fi
  if [[ -f "$FRONTEND_LOG" ]]; then
    hdr "frontend.log (last 5 lines)"
    tail -n 5 "$FRONTEND_LOG" 2>/dev/null || true
  fi
}

cmd_logs() {
  if [[ ! -f "$BACKEND_LOG" && ! -f "$FRONTEND_LOG" ]]; then
    err "No log files yet. Start Niro first."
    return 1
  fi
  hdr "Tailing logs (Ctrl-C to exit)"
  tail -F "$BACKEND_LOG" "$FRONTEND_LOG" 2>/dev/null
}

cmd_probe() {
  hdr "Niro · AI capability probe"
  need_env_file || return 1
  if [[ ! -x "$VENV/bin/python" ]]; then
    err "Python venv missing. Run './niro.sh setup' first."
    return 1
  fi
  ( cd "$BACKEND_DIR" \
    && set -a && source "$ENV_FILE" && set +a \
    && "$VENV/bin/python" probe.py )
}

cmd_nuke() {
  hdr "Niro · NUKE (interactive)"
  warn "This will:"
  say  "  - Stop backend, frontend, and Postgres"
  say  "  - Delete the Postgres data volume ($REPO_ROOT/.data/)"
  say  "  - Delete the run dir + logs ($RUN_DIR)"
  say  "  - Delete the Next.js dev build cache ($FRONTEND_DIR/.next)"
  warn "Your code is safe. Your .env is safe. But ALL local data (users, documents, audit log) is gone."
  say  ""
  read -rp "Type 'NUKE' to proceed: " confirm
  if [[ "$confirm" != "NUKE" ]]; then
    info "Aborted."
    return 1
  fi
  cmd_stop --with-db || true
  (cd "$REPO_ROOT" && docker compose down -v) >/dev/null 2>&1 || true
  rm -rf "$REPO_ROOT/.data" "$RUN_DIR" "$FRONTEND_DIR/.next" 2>/dev/null || true
  ok "Nuked. Re-run './niro.sh setup' to start fresh."
}

cmd_help() {
  cat <<'HELP'
niro.sh — control script for the Niro stack

Usage:
  ./niro.sh <command> [args]

Commands:
  setup            First-time only: install Python venv + deps + frontend deps,
                   apply migrations, seed 6 doctors.
  start            Bring up Postgres + backend + frontend (idempotent).
  stop             Stop backend + frontend. Postgres stays.
  stop --with-db   Also stop Postgres.
  restart          stop + start.
  status           Show what's running, plus last log lines.
  logs             Tail backend + frontend logs.
  probe            Re-run the AI capability probe against .env key.
  nuke             Stop + delete local data + caches (asks first).
  help             This message.

Files:
  .niro-run/*.pid       process IDs (gitignored)
  .niro-run/*.log       service logs (gitignored)
  .env                  your secrets (gitignored)

After ./niro.sh start, open:
  http://localhost:3000        — Niro app (Bangla)
  http://localhost:8000/docs   — Backend Swagger UI

Patient login: any phone (e.g. +8801711000001), OTP 123456
Doctor login : +88017000DOCTR1 .. DOCTR6, OTP 123456
HELP
}

# ---------- dispatch ----------
cmd="${1:-help}"
shift || true
case "$cmd" in
  setup)   cmd_setup "$@" ;;
  start)   cmd_start "$@" ;;
  stop)    cmd_stop  "$@" ;;
  restart) cmd_restart "$@" ;;
  status)  cmd_status "$@" ;;
  logs)    cmd_logs "$@" ;;
  probe)   cmd_probe "$@" ;;
  nuke)    cmd_nuke "$@" ;;
  -h|--help|help) cmd_help ;;
  *)
    err "Unknown command: $cmd"
    echo
    cmd_help
    exit 1
    ;;
esac
