#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTING_ROOT="${AETHER_TESTING_ROOT:-$SCRIPT_DIR/../Aether ai testing}"
mkdir -p "$TESTING_ROOT"
TESTING_ROOT="$(cd "$TESTING_ROOT" && pwd)"

if ! command -v opencode >/dev/null 2>&1; then
  echo "Aether: opencode is not installed or is not on PATH." >&2
  exit 1
fi

cd "$TESTING_ROOT"
export AETHER_TESTING_ROOT="$TESTING_ROOT"
export AETHER_TERMINAL=1
COMMAND=(opencode)
if (($#)); then COMMAND+=("$@"); fi

if command -v gnome-terminal >/dev/null 2>&1; then
  exec gnome-terminal --working-directory="$TESTING_ROOT" -- bash -lc 'exec "${@}"' -- "${COMMAND[@]}"
elif command -v x-terminal-emulator >/dev/null 2>&1; then
  exec x-terminal-emulator -e bash -lc 'exec "${@}"' -- "${COMMAND[@]}"
elif [[ -n "${DISPLAY:-}" ]] && command -v xterm >/dev/null 2>&1; then
  exec xterm -e bash -lc 'exec "${@}"' -- "${COMMAND[@]}"
else
  echo "Aether: no graphical terminal found; running OpenCode in this terminal." >&2
  exec "${COMMAND[@]}"
fi
