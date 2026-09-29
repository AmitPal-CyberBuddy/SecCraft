#!/bin/bash
set -e
REPO_ROOT="$(dirname "$(dirname "$(realpath "$0")")")"
cd "$REPO_ROOT/backend"

# Prefer a repository-local environment when present; never depend on one developer's home path.
if [ -x "$REPO_ROOT/backend/.venv/bin/python" ]; then
  PYTHON="$REPO_ROOT/backend/.venv/bin/python"
elif [ -x "$REPO_ROOT/.venv/bin/python" ]; then
  PYTHON="$REPO_ROOT/.venv/bin/python"
else
  PYTHON="${PYTHON:-python3}"
fi

exec "$PYTHON" -m uvicorn app.main:app --host "${HOST:-0.0.0.0}" --port "${PORT:-8000}" --reload
