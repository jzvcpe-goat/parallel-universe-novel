#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/harness-lib.sh"

load_sources

BACKEND_DIR="$(backend_dir)"
APP_DIR="$(app_dir)"

require_cmd "check-contract" ruby

NODE_BIN="$(resolve_tool NODE_BIN node || true)"
NPM_BIN="$(resolve_tool NPM_BIN npm || true)"
[[ -n "$NODE_BIN" ]] || fail "check-contract" "node executable not found; set NODE_BIN or add node to PATH"
[[ -n "$NPM_BIN" ]] || fail "check-contract" "npm executable not found; set NPM_BIN or add npm to PATH"
export PATH="$(dirname "$NODE_BIN"):$PATH"

generate_openapi_json "$BACKEND_DIR/specs/openapi.yaml" "$BACKEND_DIR/openapi.json"
OPENAPI_SHA="$(sha256_file "$BACKEND_DIR/openapi.json")"
printf '%s\n' "$OPENAPI_SHA" > "$BACKEND_DIR/openapi.checksum"
printf '%s\n' "$OPENAPI_SHA" > "$APP_DIR/src/types/openapi.checksum"

(cd "$APP_DIR" && "$NPM_BIN" exec --yes openapi-typescript "$BACKEND_DIR/openapi.json" > "src/types/generated-openapi.d.ts")
(cd "$APP_DIR" && "$NPM_BIN" run check:alignment)
(cd "$APP_DIR" && "$NPM_BIN" exec tsc -- --noEmit -p tsconfig.app.json)

info "Contract checks passed"
