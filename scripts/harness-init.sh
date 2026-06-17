#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/harness-lib.sh"

require_cmd "init" git
require_cmd "init" rsync
require_cmd "init" shasum
require_cmd "init" ruby

SOURCE_BACKEND="${1:-${SOURCE_BACKEND:-}}"
SOURCE_APP="${2:-${SOURCE_APP:-}}"
SOURCE_ISSUES="${SOURCE_ISSUES:-$HARNESS_ROOT/../../INTEGRATION_ISSUES.md}"

[[ -d "$SOURCE_BACKEND" ]] || fail "init" "SOURCE_BACKEND does not exist: $SOURCE_BACKEND"
[[ -d "$SOURCE_APP" ]] || fail "init" "SOURCE_APP does not exist: $SOURCE_APP"
[[ -f "$SOURCE_ISSUES" ]] || fail "init" "SOURCE_ISSUES does not exist: $SOURCE_ISSUES"

if [[ -e "$(backend_dir)" || -e "$(app_dir)" ]]; then
  fail "init" "backend/ or app/ already exists; remove them or create a new harness workspace"
fi

mkdir -p "$ARTIFACTS_DIR/manifests" "$OVERLAYS_DIR/backend" "$OVERLAYS_DIR/app" "$OVERLAYS_DIR/meta"

BASE_COMMIT="$(git -C "$SOURCE_BACKEND" rev-parse HEAD)"
SHORT_SHA="${BASE_COMMIT:0:7}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
HARNESS_BRANCH="harness/integration-${TIMESTAMP}-${SHORT_SHA}"

cat > "$SOURCES_FILE" <<EOF
SOURCE_BACKEND='$SOURCE_BACKEND'
SOURCE_APP='$SOURCE_APP'
SOURCE_ISSUES='$SOURCE_ISSUES'
EOF

info "Exporting intentional overlay files"

backend_overlay_files=(
  ".env.example"
  "src/narrativeos/api/app_factory.py"
  "tests/test_cors_config.py"
)

frontend_overlay_files=(
  "src/api/auth.ts"
  "src/api/client.ts"
  "src/api/index.ts"
  "src/api/library.ts"
  "src/api/settings.ts"
  "src/api/soul.ts"
  "src/api/story.ts"
  "src/api/studio.ts"
  "src/types/index.ts"
  "src/lib/adapters.ts"
)

for rel_path in "${backend_overlay_files[@]}"; do
  if [[ -f "$SOURCE_BACKEND/$rel_path" ]]; then
    mkdir -p "$OVERLAYS_DIR/backend/$(dirname "$rel_path")"
    cp "$SOURCE_BACKEND/$rel_path" "$OVERLAYS_DIR/backend/$rel_path"
  fi
done

for rel_path in "${frontend_overlay_files[@]}"; do
  if [[ -f "$SOURCE_APP/$rel_path" ]]; then
    mkdir -p "$OVERLAYS_DIR/app/$(dirname "$rel_path")"
    cp "$SOURCE_APP/$rel_path" "$OVERLAYS_DIR/app/$rel_path"
  fi
done

cp "$SOURCE_ISSUES" "$OVERLAYS_DIR/meta/INTEGRATION_ISSUES.md"
cp "$SOURCE_ISSUES" "$ISSUES_FILE"

write_file_hashes "$ARTIFACTS_DIR/manifests/backend_overlay.sha256" \
  "$OVERLAYS_DIR/backend/.env.example" \
  "$OVERLAYS_DIR/backend/src/narrativeos/api/app_factory.py" \
  "$OVERLAYS_DIR/backend/tests/test_cors_config.py"

write_file_hashes "$ARTIFACTS_DIR/manifests/frontend_overlay.sha256" \
  "$OVERLAYS_DIR/app/src/api/auth.ts" \
  "$OVERLAYS_DIR/app/src/api/client.ts" \
  "$OVERLAYS_DIR/app/src/api/index.ts" \
  "$OVERLAYS_DIR/app/src/api/library.ts" \
  "$OVERLAYS_DIR/app/src/api/settings.ts" \
  "$OVERLAYS_DIR/app/src/api/soul.ts" \
  "$OVERLAYS_DIR/app/src/api/story.ts" \
  "$OVERLAYS_DIR/app/src/api/studio.ts" \
  "$OVERLAYS_DIR/app/src/types/index.ts" \
  "$OVERLAYS_DIR/app/src/lib/adapters.ts"

info "Creating clean backend clone"
git clone "$SOURCE_BACKEND" "$(backend_dir)" >/dev/null 2>&1
git -C "$(backend_dir)" checkout --quiet "$BASE_COMMIT"
git -C "$(backend_dir)" checkout --quiet -b "$HARNESS_BRANCH"

info "Copying frontend snapshot"
rsync -a --delete --exclude node_modules --exclude dist --exclude .DS_Store "$SOURCE_APP/" "$(app_dir)/"

info "Applying overlay files"
rsync -a "$OVERLAYS_DIR/backend/" "$(backend_dir)/"
rsync -a "$OVERLAYS_DIR/app/" "$(app_dir)/"

printf '20.19.0\n' > "$(app_dir)/.nvmrc"
cat > "$(app_dir)/.env.example" <<'EOF'
# @required: true
# @type: url
# @pattern: ^https?://
VITE_API_ORIGIN=https://api.example.com

# @required: true
# @type: ws_url
VITE_WS_URL=wss://api.example.com/ws

# @required: false
# @type: boolean
# @default: false
VITE_API_LOCAL=false

# Deprecated compatibility fallback
VITE_API_BASE_URL=/v1
EOF

printf '3.11\n' > "$(backend_dir)/.python-version"
generate_openapi_json "$(backend_dir)/specs/openapi.yaml" "$(backend_dir)/openapi.json"
printf '%s\n' "$(sha256_file "$(backend_dir)/openapi.json")" > "$(backend_dir)/openapi.checksum"

git -C "$(backend_dir)" config user.name >/dev/null 2>&1 || git -C "$(backend_dir)" config user.name "Harness Bot"
git -C "$(backend_dir)" config user.email >/dev/null 2>&1 || git -C "$(backend_dir)" config user.email "harness@example.invalid"
git -C "$(backend_dir)" add .env.example src/narrativeos/api/app_factory.py tests/test_cors_config.py .python-version openapi.json openapi.checksum
if [[ -n "$(git -C "$(backend_dir)" diff --cached --name-only)" ]]; then
  git -C "$(backend_dir)" commit --quiet -m "[harness][baseline] Lock clean integration baseline

- BASE_COMMIT: $BASE_COMMIT
- AFFECTED_ROUTES: /health
"
fi

FRONTEND_SNAPSHOT_SHA="$(hash_tree "$(app_dir)")"
OPENAPI_SHA="$(sha256_file "$(backend_dir)/openapi.json")"
BACKEND_OVERLAY_SHA="$(sha256_file "$ARTIFACTS_DIR/manifests/backend_overlay.sha256")"
FRONTEND_OVERLAY_SHA="$(sha256_file "$ARTIFACTS_DIR/manifests/frontend_overlay.sha256")"
HARNESS_BACKEND_COMMIT="$(git -C "$(backend_dir)" rev-parse HEAD)"

cat > "$BASELINE_FILE" <<EOF
BASE_COMMIT=$BASE_COMMIT
BRANCH=$HARNESS_BRANCH
HARNESS_BACKEND_COMMIT=$HARNESS_BACKEND_COMMIT
BACKEND_SOURCE=$SOURCE_BACKEND
APP_SOURCE=$SOURCE_APP
ISSUES_SOURCE=$SOURCE_ISSUES
FRONTEND_SNAPSHOT_SHA256=$FRONTEND_SNAPSHOT_SHA
OPENAPI_SHA256=$OPENAPI_SHA
BACKEND_OVERLAY_SHA256=$BACKEND_OVERLAY_SHA
FRONTEND_OVERLAY_SHA256=$FRONTEND_OVERLAY_SHA
GENERATED_AT=$(timestamp_iso)
EOF

info "Harness initialized"
info "BASE_COMMIT=$BASE_COMMIT"
info "BRANCH=$HARNESS_BRANCH"
