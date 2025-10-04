#!/usr/bin/env bash
set -euo pipefail

# Determine repository root (script is expected inside scripts/)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

FRONTEND_MODE="dev"
BACKEND_RELOAD_ARGS=(--reload)
BACKEND_HOST="0.0.0.0"
BACKEND_PORT="8000"

usage() {
  cat <<'USAGE'
Usage: start_stack.sh [--prod] [--host HOST] [--port PORT]

Options:
  --prod        Run frontend with "npm run start" and backend without --reload.
  --host HOST   Bind address for uvicorn (default: 0.0.0.0).
  --port PORT   Listen port for uvicorn (default: 8000).
  -h, --help    Show this help message.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prod)
      FRONTEND_MODE="start"
      BACKEND_RELOAD_ARGS=()
      shift
      ;;
    --host)
      [[ $# -ge 2 ]] || { echo "Missing value for --host" >&2; exit 1; }
      BACKEND_HOST="$2"
      shift 2
      ;;
    --port)
      [[ $# -ge 2 ]] || { echo "Missing value for --port" >&2; exit 1; }
      BACKEND_PORT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ ! -d .venv ]]; then
  echo "Python virtual environment .venv not found in $REPO_ROOT" >&2
  exit 1
fi

npm_cmd=(npm run "$FRONTEND_MODE")
backend_cmd=(uvicorn apps.main:app --host "$BACKEND_HOST" --port "$BACKEND_PORT")
if [[ ${#BACKEND_RELOAD_ARGS[@]} -gt 0 ]]; then
  backend_cmd+=("${BACKEND_RELOAD_ARGS[@]}")
fi

source .venv/bin/activate

cleanup() {
  local exit_code=$?
  if [[ -n "${FRONTEND_PID:-}" ]]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${BACKEND_PID:-}" ]]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

printf 'Starting frontend (npm run %s)\n' "$FRONTEND_MODE"
"${npm_cmd[@]}" &
FRONTEND_PID=$!

printf 'Starting backend (uvicorn apps.main:app on %s:%s)\n' "$BACKEND_HOST" "$BACKEND_PORT"
"${backend_cmd[@]}" &
BACKEND_PID=$!

wait
