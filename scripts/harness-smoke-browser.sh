#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/harness-lib.sh"

load_sources

APP_DIR="$(app_dir)"
OUT_DIR="$ARTIFACTS_DIR/integration"
mkdir -p "$OUT_DIR"

require_env_vars "smoke-browser" VITE_API_ORIGIN VITE_WS_URL
export VITE_API_LOCAL=false

NODE_BIN="$(resolve_tool NODE_BIN node || true)"
NPM_BIN="$(resolve_tool NPM_BIN npm || true)"
[[ -n "$NODE_BIN" ]] || fail "smoke-browser" "node executable not found; set NODE_BIN or add node to PATH"
[[ -n "$NPM_BIN" ]] || fail "smoke-browser" "npm executable not found; set NPM_BIN or add npm to PATH"
export PATH="$(dirname "$NODE_BIN"):$PATH"

cat > "$OUT_DIR/browser_smoke_notes.md" <<EOF
# Browser Smoke Notes

- Started: $(timestamp_iso)
- App dir: $APP_DIR
- API origin: ${VITE_API_ORIGIN}
- WS URL: ${VITE_WS_URL}
- Node bin: ${NODE_BIN}
- NPM bin: ${NPM_BIN}
- Playwright smoke must be executed from this harness.
- If Playwright is unavailable, this script fails instead of silently skipping.
EOF

info "Browser smoke scaffold prepared. Run Playwright from $APP_DIR with demo mode disabled."
