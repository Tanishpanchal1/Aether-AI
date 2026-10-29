#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="${XDG_RUNTIME_DIR:-/tmp}/aether-ai"
for pid_file in "$RUN_DIR/caddy.pid" "$RUN_DIR/backend.pid"; do
  if [[ -f "$pid_file" ]]; then
    pid="$(cat "$pid_file")"
    if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid"
    fi
    rm -f "$pid_file"
  fi
done

if [[ "${AETHER_DISABLE_SERVE:-0}" == "1" ]] && command -v tailscale >/dev/null 2>&1; then
  tailscale serve reset
fi
echo "Aether local services stopped."
