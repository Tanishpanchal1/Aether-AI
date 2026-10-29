#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="$REPO_ROOT/server"
MOBILE_DIR="$REPO_ROOT/mobile"
RUN_DIR="${XDG_RUNTIME_DIR:-/tmp}/aether-ai"
BACKEND_LOG="$RUN_DIR/backend.log"
CADDY_LOG="$RUN_DIR/caddy.log"
BACKEND_PID="$RUN_DIR/backend.pid"
CADDY_PID="$RUN_DIR/caddy.pid"
PORT="${PORT:-8765}"
CADDY_PORT="${CADDY_PORT:-3000}"
REMOTE="${AETHER_REMOTE:-0}"

die() { echo "Aether: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "required executable '$1' is missing"; }
cleanup() {
  [[ -f "$CADDY_PID" ]] && kill "$(cat "$CADDY_PID")" 2>/dev/null || true
  [[ -f "$BACKEND_PID" ]] && kill "$(cat "$BACKEND_PID")" 2>/dev/null || true
}
trap cleanup ERR INT TERM

mkdir -p "$RUN_DIR"
need curl
need node
need npm
need caddy
[[ -x "$SERVER_DIR/.venv/bin/python" ]] || die "missing $SERVER_DIR/.venv; create it and install server/requirements.txt"
[[ -d "$MOBILE_DIR/node_modules" ]] || die "missing mobile/node_modules; run npm ci in mobile/"

if [[ ! -f "$MOBILE_DIR/dist/index.html" || "${AETHER_REBUILD:-0}" == "1" ]]; then
  (cd "$MOBILE_DIR" && npm run export -- --platform web)
fi
[[ -f "$MOBILE_DIR/dist/index.html" ]] || die "Expo export did not create mobile/dist/index.html"

if [[ -f "$BACKEND_PID" ]] && kill -0 "$(cat "$BACKEND_PID")" 2>/dev/null; then
  die "backend already appears to be running (pid $(cat "$BACKEND_PID"))"
fi
if [[ -f "$CADDY_PID" ]] && kill -0 "$(cat "$CADDY_PID")" 2>/dev/null; then
  die "Caddy already appears to be running (pid $(cat "$CADDY_PID"))"
fi

(
  cd "$SERVER_DIR"
  HOST=127.0.0.1 PORT="$PORT" ./run.sh
) >>"$BACKEND_LOG" 2>&1 &
echo $! >"$BACKEND_PID"

for _ in {1..30}; do
  curl --silent --fail "http://127.0.0.1:$PORT/health" >/dev/null && break
  sleep 1
done
curl --silent --fail "http://127.0.0.1:$PORT/health" >/dev/null || die "backend did not become ready; see $BACKEND_LOG"

export AETHER_WEB_ROOT="$MOBILE_DIR/dist"
caddy validate --config "$REPO_ROOT/Caddyfile" --adapter caddyfile >/dev/null || die "invalid Caddyfile"
caddy run --config "$REPO_ROOT/Caddyfile" --adapter caddyfile --watch >>"$CADDY_LOG" 2>&1 &
echo $! >"$CADDY_PID"

for _ in {1..20}; do
  curl --silent --fail "http://127.0.0.1:$CADDY_PORT/" >/dev/null && break
  sleep 1
done
curl --silent --fail "http://127.0.0.1:$CADDY_PORT/" >/dev/null || die "Caddy did not serve the Expo build; see $CADDY_LOG"

echo "Aether is ready at http://127.0.0.1:$CADDY_PORT"

if [[ "$REMOTE" == "1" ]]; then
  need tailscale
  tailscale status >/dev/null || die "Tailscale is not connected; run 'sudo tailscale up' interactively"
  tailscale serve --bg "$CADDY_PORT"
  tailscale serve status
  echo "Open the HTTPS URL shown above on an authorized tailnet device."
fi

trap - ERR INT TERM
wait "$(cat "$BACKEND_PID")" "$(cat "$CADDY_PID")"
