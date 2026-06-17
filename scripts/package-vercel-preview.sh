#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$ROOT_DIR/app"
ARTIFACT_DIR="$ROOT_DIR/artifacts/deploy"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
PACKAGE_NAME="parallel-universe-vercel-preview-$STAMP.tgz"
PACKAGE_PATH="$ARTIFACT_DIR/$PACKAGE_NAME"
STATIC_PACKAGE_NAME="parallel-universe-static-preview-$STAMP.tgz"
STATIC_PACKAGE_PATH="$ARTIFACT_DIR/$STATIC_PACKAGE_NAME"
MANIFEST_PATH="$ARTIFACT_DIR/parallel-universe-vercel-preview-$STAMP.json"
API_ORIGIN="${VITE_API_ORIGIN:-}"
API_BASE_URL="${VITE_API_BASE_URL:-}"
API_LOCAL="${VITE_API_LOCAL:-false}"
PREVIEW_KIND="static-demo-fallback"
RESOLVED_API_TARGET="${API_BASE_URL:-$API_ORIGIN}"

if [[ "$API_LOCAL" != "true" && "$RESOLVED_API_TARGET" == http* ]]; then
  PREVIEW_KIND="real-api"
  if [[ "$RESOLVED_API_TARGET" == http://127.0.0.1* || "$RESOLVED_API_TARGET" == http://localhost* || "$RESOLVED_API_TARGET" == https://localhost* ]]; then
    PREVIEW_KIND="local-real-api"
  fi
fi

mkdir -p "$ARTIFACT_DIR"

cd "$APP_DIR"
npm run check:alignment
npm run check:backend-bridge
npm run check:copy-boundary
npm run check:design-system
npm run build
npm audit --audit-level=moderate

tar -czf "$PACKAGE_PATH" dist vercel.json package.json package-lock.json

TEMP_STATIC_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TEMP_STATIC_DIR"
}
trap cleanup EXIT

cp -R dist/. "$TEMP_STATIC_DIR/"
cp vercel.json "$TEMP_STATIC_DIR/vercel.json"
tar -czf "$STATIC_PACKAGE_PATH" -C "$TEMP_STATIC_DIR" .

cat > "$MANIFEST_PATH" <<EOF
{
  "name": "parallel-universe-novel-commercial-prototype",
  "created_at": "$STAMP",
  "project_root": "$APP_DIR",
  "package": "$PACKAGE_PATH",
  "static_package": "$STATIC_PACKAGE_PATH",
  "preview_kind": "$PREVIEW_KIND",
  "vite_api_origin": "$API_ORIGIN",
  "vite_api_base_url": "$API_BASE_URL",
  "vite_api_local": "$API_LOCAL",
  "build_command": "npm run build",
  "output_directory": "dist",
  "framework": "vite",
  "routes_smoked": [
    "/",
    "/story",
    "/story?world=unknown-world",
    "/library",
    "/create",
    "/settings",
    "/studio"
  ],
  "pre_deploy_checks": [
    "npm run check:alignment",
    "npm run check:backend-bridge",
    "npm run check:copy-boundary",
    "npm run check:design-system",
    "npm audit --audit-level=moderate",
    "npm run build"
  ],
  "real_api_smoke_command": "cd $ROOT_DIR && ./scripts/smoke-deployed-api.sh ${API_ORIGIN:-https://<api-host>}",
  "deploy_command_after_auth": "cd $ROOT_DIR && ./scripts/deploy-vercel-preview.sh",
  "claimable_static_deploy_command": "bash /Users/james/.codex/skills/vercel-deploy/scripts/deploy.sh $STATIC_PACKAGE_PATH"
}
EOF

echo "$PACKAGE_PATH"
echo "$STATIC_PACKAGE_PATH"
echo "$MANIFEST_PATH"
