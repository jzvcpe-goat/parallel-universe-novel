#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$ROOT_DIR/app"
API_ORIGIN="${VITE_API_ORIGIN:-}"
API_BASE_URL="${VITE_API_BASE_URL:-}"
RESOLVED_API_TARGET="${API_BASE_URL:-$API_ORIGIN}"
VERCEL_AUTH_ARGS=()
VERCEL_BUILD_ENV_ARGS=()

if [[ -n "$API_ORIGIN" ]]; then
  VERCEL_BUILD_ENV_ARGS+=(--build-env "VITE_API_ORIGIN=$API_ORIGIN")
fi

if [[ -n "$API_BASE_URL" ]]; then
  VERCEL_BUILD_ENV_ARGS+=(--build-env "VITE_API_BASE_URL=$API_BASE_URL")
fi

if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  VERCEL_AUTH_ARGS=(--token "$VERCEL_TOKEN")
elif npx --yes vercel whoami >/dev/null 2>&1; then
  VERCEL_AUTH_ARGS=()
else
  cat >&2 <<'EOF'
[deploy-vercel-preview] Vercel credentials are missing.
Run this once, then rerun this script:

  cd /Users/james/Documents/PUF/workspaces/integration-harness/app
  npx vercel login

Or set VERCEL_TOKEN in the environment for non-interactive deployment.

To create a verified deploy artifact before auth is available:

  cd /Users/james/Documents/PUF/workspaces/integration-harness
  ./scripts/package-vercel-preview.sh
EOF
  exit 2
fi

cd "$APP_DIR"
npm run check:alignment
npm run check:backend-bridge
npm run check:copy-boundary
npm run check:design-system
npm run build
npm audit --audit-level=moderate

if [[ "$RESOLVED_API_TARGET" == http* && "$RESOLVED_API_TARGET" != http://127.0.0.1* && "$RESOLVED_API_TARGET" != http://localhost* && "$RESOLVED_API_TARGET" != https://localhost* ]]; then
  API_SMOKE_ORIGIN="$API_ORIGIN"
  if [[ -z "$API_SMOKE_ORIGIN" && "$API_BASE_URL" == */v1 ]]; then
    API_SMOKE_ORIGIN="${API_BASE_URL%/v1}"
  fi
  if [[ -n "$API_SMOKE_ORIGIN" ]]; then
    "$ROOT_DIR/scripts/smoke-deployed-api.sh" "$API_SMOKE_ORIGIN"
  fi
fi

VERCEL_DEPLOY_ARGS=(--yes --target preview)
if [[ ${#VERCEL_BUILD_ENV_ARGS[@]} -gt 0 ]]; then
  VERCEL_DEPLOY_ARGS+=("${VERCEL_BUILD_ENV_ARGS[@]}")
fi
if [[ ${#VERCEL_AUTH_ARGS[@]} -gt 0 ]]; then
  VERCEL_DEPLOY_ARGS+=("${VERCEL_AUTH_ARGS[@]}")
fi

npx --yes vercel deploy "${VERCEL_DEPLOY_ARGS[@]}"
