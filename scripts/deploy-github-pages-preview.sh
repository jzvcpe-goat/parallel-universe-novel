#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$ROOT_DIR/app"
OWNER="${GITHUB_OWNER:-}"
REPO="${GITHUB_REPO:-parallel-universe-novel-prototype}"
BRANCH="${GITHUB_PAGES_BRANCH:-gh-pages}"

if [[ -z "$OWNER" ]]; then
  OWNER="$(gh api user --jq '.login')"
fi

PUBLIC_URL="https://${OWNER}.github.io/${REPO}/"
BASE_PATH="/${REPO}/"
TEMP_DIR="$(mktemp -d)"
PAGES_PAYLOAD="$(mktemp)"

cleanup() {
  rm -rf "$TEMP_DIR"
  rm -f "$PAGES_PAYLOAD"
}
trap cleanup EXIT

cd "$APP_DIR"
npm run check:alignment
VITE_API_LOCAL=true VITE_BASE_PATH="$BASE_PATH" VITE_ROUTER_MODE=hash npm run build

cp dist/index.html dist/404.html
touch dist/.nojekyll
cat > dist/deploy-metadata.json <<EOF
{
  "name": "parallel-universe-novel-commercial-prototype",
  "target": "github-pages",
  "owner": "$OWNER",
  "repo": "$REPO",
  "branch": "$BRANCH",
  "base_path": "$BASE_PATH",
  "router_mode": "hash",
  "api_mode": "demo_local",
  "public_url": "$PUBLIC_URL",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

if gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  echo "[deploy-github-pages] using existing repository $OWNER/$REPO"
else
  gh repo create "$OWNER/$REPO" \
    --public \
    --description "Commercial prototype preview for the Parallel Universe Novel product." \
    --homepage "$PUBLIC_URL"
fi

cp -R dist/. "$TEMP_DIR/"
cd "$TEMP_DIR"
git init -q
git checkout -q -b "$BRANCH"
git add .
git -c user.name="Codex Deploy" -c user.email="codex-deploy@local" commit -q -m "Deploy parallel universe prototype preview"
git remote add origin "https://github.com/${OWNER}/${REPO}.git"
git push -q --force origin "$BRANCH"

cat > "$PAGES_PAYLOAD" <<EOF
{
  "source": {
    "branch": "$BRANCH",
    "path": "/"
  },
  "build_type": "legacy"
}
EOF

if gh api "repos/$OWNER/$REPO/pages" >/dev/null 2>&1; then
  gh api -X PUT "repos/$OWNER/$REPO/pages" --input "$PAGES_PAYLOAD" --silent
else
  gh api -X POST "repos/$OWNER/$REPO/pages" --input "$PAGES_PAYLOAD" --silent
fi

gh repo edit "$OWNER/$REPO" --homepage "$PUBLIC_URL" >/dev/null

echo "[deploy-github-pages] waiting for $PUBLIC_URL"
for attempt in $(seq 1 36); do
  status="$(curl -L -s -o /dev/null -w '%{http_code}' "$PUBLIC_URL")"
  if [[ "$status" == "200" ]]; then
    echo "$PUBLIC_URL"
    exit 0
  fi
  echo "[deploy-github-pages] attempt $attempt/36 returned $status"
  sleep 5
done

echo "[deploy-github-pages] deployment pushed, but the page did not return 200 yet: $PUBLIC_URL" >&2
exit 3
