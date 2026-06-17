#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
ARTIFACT_DIR="$ROOT_DIR/artifacts/deploy"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PACKAGE_NAME="parallel-universe-backend-api-$STAMP.tgz"
PACKAGE_PATH="$ARTIFACT_DIR/$PACKAGE_NAME"
MANIFEST_PATH="$ARTIFACT_DIR/parallel-universe-backend-api-$STAMP.json"
PYTHON_BIN="${PYTHON_BIN:-$ROOT_DIR/.toolchain/python/bin/python}"

if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="python3"
fi

mkdir -p "$ARTIFACT_DIR"

cd "$BACKEND_DIR"
"$PYTHON_BIN" -m pytest \
  tests/test_harness_narrow_api.py \
  tests/test_product_runtime_api.py \
  tests/test_backend_team_bridge.py \
  tests/test_cors_config.py \
  tests/test_account_snapshot_api.py \
  tests/test_payment_provider_hardening.py \
  tests/test_market_trends_api.py \
  tests/test_creator_dialogue_api.py \
  tests/test_creator_commercial_api.py \
  -q

tar -czf "$PACKAGE_PATH" \
  --exclude='.git' \
  --exclude='.venv' \
  --exclude='__pycache__' \
  --exclude='.pytest_cache' \
  --exclude='artifacts/*' \
  --exclude='*.pyc' \
  -C "$BACKEND_DIR" .

cat > "$MANIFEST_PATH" <<EOF
{
  "name": "parallel-universe-backend-api",
  "created_at": "$STAMP",
  "backend_root": "$BACKEND_DIR",
  "package": "$PACKAGE_PATH",
  "entrypoint": "src.narrativeos.api:app",
  "dockerfile": "backend/Dockerfile",
  "port": 8000,
  "required_for_p0": [
    "GET /health",
    "GET /v1/reader/library/worlds",
    "POST /v1/reader/sessions",
    "POST /v1/reader/continue",
    "POST /v1/scene/advance",
    "POST /v1/creator/dialogue/sessions",
    "POST /v1/quality/evaluate",
    "POST /v1/canon/commit",
    "GET /v1/reader/subscription",
    "POST /v1/reader/checkout/start",
    "GET /v1/reader/checkout/{checkout_session_id}/status",
    "POST /v1/reader/checkout/return",
    "POST /v1/reader/checkout/provider-callback",
    "GET /v1/account/snapshot",
    "GET /v1/market/trends",
    "POST /v1/market/trends/scan",
    "GET /v1/market/trends/cron/weekly",
    "GET /v1/market/trends/cron/monthly"
  ],
  "required_env": {
    "NARRATIVEOS_ALLOWED_ORIGINS": "https://<frontend-preview-host>",
    "NARRATIVEOS_ALLOWED_ORIGIN_REGEX": "optional preview host regex, for example https://(([a-z0-9-]+\\\\.)?parallel-universe-novel-[a-z0-9-]+|app-[a-z0-9-]+)\\\\.vercel\\\\.app",
    "NARRATIVEOS_BACKEND_TEAM_API_BASE_URL": "optional backend-team service origin",
    "DATABASE_URL": "optional persistent database; sqlite is acceptable only for preview",
    "NARRATIVEOS_CREATOR_DIALOGUE_DIR": "writable directory for creator dialogue sessions; use /tmp/creator_dialogue_sessions on serverless preview",
    "NARRATIVEOS_CANON_LEDGER_DIR": "writable directory for canon commit ledger; use /tmp/canon_commit_ledger on serverless preview",
    "KIMI_API_KEY": "optional; creator dialogue falls back to local cowriter",
    "MOONSHOT_API_KEY": "optional alias for Kimi/Moonshot"
  },
  "local_run_command": "cd $BACKEND_DIR && NARRATIVEOS_ALLOWED_ORIGINS=http://127.0.0.1:5175 $PYTHON_BIN -m uvicorn src.narrativeos.api:app --host 0.0.0.0 --port 8000",
  "docker_build_command": "docker build -t parallel-universe-api -f $BACKEND_DIR/Dockerfile $BACKEND_DIR",
  "post_deploy_smoke_command": "cd $ROOT_DIR && ./scripts/smoke-deployed-api.sh https://<api-host>",
  "pre_package_tests": [
    "tests/test_harness_narrow_api.py",
    "tests/test_product_runtime_api.py",
    "tests/test_backend_team_bridge.py",
    "tests/test_account_snapshot_api.py",
    "tests/test_payment_provider_hardening.py",
    "tests/test_market_trends_api.py",
    "tests/test_creator_dialogue_api.py",
    "tests/test_creator_commercial_api.py"
  ],
  "frontend_policy": "Current Vite/React app is the only product frontend. Backend-team apps/web remains reference-only unless separately approved."
}
EOF

echo "$PACKAGE_PATH"
echo "$MANIFEST_PATH"
