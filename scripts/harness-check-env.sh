#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/harness-lib.sh"

load_sources

BACKEND_DIR="$(backend_dir)"
APP_DIR="$(app_dir)"

[[ -d "$BACKEND_DIR/.git" ]] || fail "check-env" "backend git clone missing; run harness-init.sh"
[[ -f "$APP_DIR/.nvmrc" ]] || fail "check-env" "app/.nvmrc missing"
[[ -f "$BACKEND_DIR/.python-version" ]] || fail "check-env" "backend/.python-version missing"
[[ -f "$BACKEND_DIR/openapi.json" ]] || fail "check-env" "backend/openapi.json missing"

if [[ -n "$(git -C "$BACKEND_DIR" status --porcelain)" ]]; then
  fail "check-env" "backend worktree is not clean"
fi

require_cmd "check-env" rg

NODE_BIN="$(resolve_tool NODE_BIN node || true)"
PYTHON_BIN="$(resolve_tool PYTHON_BIN python3 || true)"
[[ -n "$NODE_BIN" ]] || fail "check-env" "node executable not found; set NODE_BIN or add node to PATH"
[[ -n "$PYTHON_BIN" ]] || fail "check-env" "python executable not found; set PYTHON_BIN or add python3 to PATH"

NODE_EXPECTED="$(tr -d '[:space:]' < "$APP_DIR/.nvmrc")"
NODE_ACTUAL="$("$NODE_BIN" -v | sed 's/^v//')"
[[ "$NODE_ACTUAL" == "$NODE_EXPECTED" ]] || fail "check-env" "node version mismatch: expected $NODE_EXPECTED got $NODE_ACTUAL"

PYTHON_EXPECTED="$(tr -d '[:space:]' < "$BACKEND_DIR/.python-version")"
PYTHON_ACTUAL="$("$PYTHON_BIN" - <<'PY'
import sys
print(f"{sys.version_info.major}.{sys.version_info.minor}")
PY
)"
[[ "$PYTHON_ACTUAL" == "$PYTHON_EXPECTED" ]] || fail "check-env" "python version mismatch: expected $PYTHON_EXPECTED got $PYTHON_ACTUAL"

require_env_vars "check-env" VITE_API_ORIGIN VITE_WS_URL NARRATIVEOS_ALLOWED_ORIGINS

scan_literal_paths "check-env" "$APP_DIR/src" "$BACKEND_DIR/src/narrativeos/api/app_factory.py" "$BACKEND_DIR/tests/test_cors_config.py"
scan_todo_fixme "check-env" "$APP_DIR/src" "$BACKEND_DIR/src/narrativeos/api/app_factory.py" "$BACKEND_DIR/tests/test_cors_config.py"

info "Environment checks passed"
