#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -f .venv/bin/activate ]]; then
  echo "Aether: missing server virtual environment at $SCRIPT_DIR/.venv" >&2
  echo "Create it with: python3 -m venv $SCRIPT_DIR/.venv && $SCRIPT_DIR/.venv/bin/pip install -r $SCRIPT_DIR/requirements.txt" >&2
  exit 1
fi

source .venv/bin/activate
if ! python -c 'import fastapi, uvicorn' >/dev/null 2>&1; then
  echo "Aether: backend dependencies are missing from $VIRTUAL_ENV" >&2
  echo "Install them with: $VIRTUAL_ENV/bin/pip install -r $SCRIPT_DIR/requirements.txt" >&2
  exit 1
fi

export PYTHONPATH="$SCRIPT_DIR"
exec uvicorn app.main:app \
  --host "${HOST:-127.0.0.1}" \
  --port "${PORT:-8765}" \
  --no-access-log
