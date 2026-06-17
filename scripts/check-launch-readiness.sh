#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$ROOT_DIR/app"
BACKEND_DIR="$ROOT_DIR/backend"
ARTIFACT_DIR="$ROOT_DIR/artifacts/integration"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
MANIFEST_PATH="$ARTIFACT_DIR/launch-readiness-$STAMP.json"
PYTHON_BIN="${PYTHON_BIN:-$ROOT_DIR/.toolchain/python/bin/python}"
API_ORIGIN="${1:-${NARRATIVEOS_API_ORIGIN:-}}"

if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="$BACKEND_DIR/.venv/bin/python"
fi
if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="python3"
fi

mkdir -p "$ARTIFACT_DIR"

echo "[launch-readiness] frontend gates"
npm --prefix "$APP_DIR" run check:alignment
npm --prefix "$APP_DIR" run check:backend-bridge
npm --prefix "$APP_DIR" run check:copy-boundary
npm --prefix "$APP_DIR" run check:design-system
npm --prefix "$APP_DIR" run lint -- --max-warnings=0
npm --prefix "$APP_DIR" run build
npm --prefix "$APP_DIR" audit --audit-level=moderate

echo "[launch-readiness] backend targeted gates"
cd "$BACKEND_DIR"
"$PYTHON_BIN" -m pytest \
  tests/test_harness_narrow_api.py \
  tests/test_product_runtime_api.py \
  tests/test_backend_team_bridge.py \
  tests/test_cors_config.py \
  tests/test_account_snapshot_api.py \
  tests/test_account_merge_api.py \
  tests/test_account_data_api.py \
  tests/test_payment_provider_hardening.py \
  tests/test_market_trends_api.py \
  tests/test_creator_dialogue_api.py \
  tests/test_creator_commercial_api.py \
  -q

echo "[launch-readiness] OpenAPI contract"
cd "$ROOT_DIR"
./scripts/harness-check-contract.sh

if [[ -n "$API_ORIGIN" ]]; then
  echo "[launch-readiness] API smoke: $API_ORIGIN"
  ./scripts/smoke-deployed-api.sh "$API_ORIGIN"
else
  echo "[launch-readiness] API smoke skipped: set NARRATIVEOS_API_ORIGIN or pass an API origin"
fi

for required in \
  "$ROOT_DIR/scripts/package-vercel-preview.sh" \
  "$ROOT_DIR/scripts/package-vercel-backend-api.sh" \
  "$ROOT_DIR/scripts/deploy-vercel-preview.sh" \
  "$ROOT_DIR/scripts/smoke-deployed-api.sh" \
  "$APP_DIR/.env.example" \
  "$BACKEND_DIR/.env.example" \
  "$BACKEND_DIR/docs/deployment_runbook.md"; do
  if [[ ! -f "$required" ]]; then
    echo "[launch-readiness] missing required launch file: $required" >&2
    exit 1
  fi
done

cat > "$MANIFEST_PATH" <<EOF
{
  "name": "parallel-universe-launch-readiness",
  "created_at": "$STAMP",
  "api_origin_smoked": "$API_ORIGIN",
  "frontend": {
    "project_root": "$APP_DIR",
    "checks": [
      "check:alignment",
      "check:backend-bridge",
      "check:copy-boundary",
      "check:design-system",
      "lint -- --max-warnings=0",
      "build",
      "audit --audit-level=moderate"
    ],
    "routes_required_for_browser_qa": ["/", "/library", "/story", "/create", "/settings", "/studio"]
  },
  "backend": {
    "project_root": "$BACKEND_DIR",
    "targeted_tests": [
      "test_harness_narrow_api",
      "test_product_runtime_api",
      "test_backend_team_bridge",
      "test_cors_config",
      "test_account_snapshot_api",
      "test_account_merge_api",
      "test_account_data_api",
      "test_payment_provider_hardening",
      "test_market_trends_api",
      "test_creator_dialogue_api",
      "test_creator_commercial_api"
    ]
  },
  "production_blockers_to_resolve_before_public_paid_launch": [
    "persistent production database migration and backup/restore drill",
    "real payment provider callback/refund/dispute acceptance",
    "custom domain CORS and cookie security acceptance",
    "privacy/legal review for data export and account deletion",
    "security audit and incident runbook rehearsal"
  ]
}
EOF

echo "[launch-readiness] manifest: $MANIFEST_PATH"
