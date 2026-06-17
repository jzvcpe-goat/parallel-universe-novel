#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
ARTIFACT_DIR="$ROOT_DIR/artifacts/deploy"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PACKAGE_NAME="parallel-universe-vercel-backend-api-$STAMP.tgz"
PACKAGE_PATH="$ARTIFACT_DIR/$PACKAGE_NAME"
STAGING_DIR="$ARTIFACT_DIR/parallel-universe-vercel-backend-api-$STAMP"
MANIFEST_PATH="$ARTIFACT_DIR/parallel-universe-vercel-backend-api-$STAMP.json"
PYTHON_BIN="${PYTHON_BIN:-$ROOT_DIR/.toolchain/python/bin/python}"

if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="python3"
fi

mkdir -p "$ARTIFACT_DIR"
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR/api"

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

cp -R "$BACKEND_DIR/src" "$STAGING_DIR/src"
cp -R "$BACKEND_DIR/examples" "$STAGING_DIR/examples"
cp -R "$BACKEND_DIR/configs" "$STAGING_DIR/configs"
cp -R "$BACKEND_DIR/prompts" "$STAGING_DIR/prompts"
cp -R "$BACKEND_DIR/specs" "$STAGING_DIR/specs"
cp -R "$BACKEND_DIR/db" "$STAGING_DIR/db"
cp "$BACKEND_DIR/requirements.txt" "$STAGING_DIR/requirements.txt"
cp "$BACKEND_DIR/pyproject.toml" "$STAGING_DIR/pyproject.toml"

cat > "$STAGING_DIR/.python-version" <<'EOF'
3.12
EOF

cat > "$STAGING_DIR/api/index.py" <<'EOF'
from src.narrativeos.api import app

__all__ = ["app"]
EOF

cat > "$STAGING_DIR/vercel.json" <<'EOF'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": null,
  "buildCommand": null,
  "installCommand": "pip install -r requirements.txt",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/api/index.py"
    }
  ],
  "crons": [
    {
      "path": "/v1/market/trends/cron/weekly",
      "schedule": "0 8 * * 1"
    },
    {
      "path": "/v1/market/trends/cron/monthly",
      "schedule": "0 8 1 * *"
    }
  ]
}
EOF

tar -czf "$PACKAGE_PATH" -C "$STAGING_DIR" .

cat > "$MANIFEST_PATH" <<EOF
{
  "name": "parallel-universe-vercel-backend-api",
  "created_at": "$STAMP",
  "staging_dir": "$STAGING_DIR",
  "package": "$PACKAGE_PATH",
  "entrypoint": "api/index.py -> src.narrativeos.api:app",
  "runtime": "Vercel Python Runtime / FastAPI ASGI",
  "python_version": "3.12",
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
    "POST /v1/auth/register",
    "POST /v1/auth/login",
    "POST /v1/auth/logout",
    "GET /v1/auth/me",
    "GET /v1/account/snapshot",
    "POST /v1/account/merge/preview",
    "POST /v1/account/merge/confirm",
    "GET /v1/account/data/export",
    "POST /v1/account/delete/preview",
    "POST /v1/account/delete/confirm",
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
    "NARRATIVEOS_CREATOR_DIALOGUE_DIR": "/tmp/creator_dialogue_sessions",
    "NARRATIVEOS_CANON_LEDGER_DIR": "/tmp/canon_commit_ledger",
    "KIMI_API_KEY": "optional; creator dialogue falls back to local cowriter",
    "MOONSHOT_API_KEY": "optional alias for Kimi/Moonshot"
  },
  "deploy_command_after_auth": "cd $STAGING_DIR && npx --yes vercel deploy --yes --target preview -e DATABASE_URL=sqlite:////tmp/narrativeos_beta.db -e 'NARRATIVEOS_ALLOWED_ORIGIN_REGEX=https://(([a-z0-9-]+\\\\.)?parallel-universe-novel-[a-z0-9-]+|app-[a-z0-9-]+)\\\\.vercel\\\\.app' -e NARRATIVEOS_CREATOR_DIALOGUE_DIR=/tmp/creator_dialogue_sessions -e NARRATIVEOS_CANON_LEDGER_DIR=/tmp/canon_commit_ledger",
  "post_deploy_smoke_command": "cd $ROOT_DIR && ./scripts/smoke-deployed-api.sh https://<api-host>",
  "frontend_policy": "Current Vite/React app is the only product frontend. This package exposes only the FastAPI backend."
}
EOF

echo "$PACKAGE_PATH"
echo "$STAGING_DIR"
echo "$MANIFEST_PATH"
