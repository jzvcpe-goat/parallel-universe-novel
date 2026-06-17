#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/harness-lib.sh"

load_sources

APP_DIR="$(app_dir)"
BACKEND_DIR="$(backend_dir)"
REPORT_FILE="$ARTIFACTS_DIR/review_report.md"
mkdir -p "$ARTIFACTS_DIR"

require_cmd "review-automated" rg

NODE_BIN="$(resolve_tool NODE_BIN node || true)"
NPM_BIN="$(resolve_tool NPM_BIN npm || true)"
[[ -n "$NODE_BIN" ]] || fail "review-automated" "node executable not found; set NODE_BIN or add node to PATH"
[[ -n "$NPM_BIN" ]] || fail "review-automated" "npm executable not found; set NPM_BIN or add npm to PATH"
export PATH="$(dirname "$NODE_BIN"):$PATH"

{
  echo "# Code Review Report"
  echo "## Reviewer: automated-harness"
  echo "## Date: $(timestamp_iso)"
  echo
  echo "### Scope"
  echo "- App dir: $APP_DIR"
  echo "- Backend dir: $BACKEND_DIR"
  echo
} > "$REPORT_FILE"

(
  cd "$APP_DIR"
  "$NPM_BIN" run lint -- --max-warnings=0
  "$NPM_BIN" exec tsc -- --noEmit -p tsconfig.app.json
  "$NPM_BIN" audit --audit-level=moderate
) || fail "review-automated" "frontend lint/typecheck/audit failed"

if ! find "$APP_DIR/src" -type f \( -name '*.test.ts' -o -name '*.test.tsx' -o -name '*.spec.ts' -o -name '*.spec.tsx' \) | grep -q .; then
  fail "review-automated" "no frontend tests found for coverage gate"
fi

scan_literal_paths "review-automated" "$APP_DIR/src" "$BACKEND_DIR/src/narrativeos/api/app_factory.py" "$BACKEND_DIR/tests/test_cors_config.py"
scan_todo_fixme "review-automated" "$APP_DIR/src" "$BACKEND_DIR/src/narrativeos/api/app_factory.py" "$BACKEND_DIR/tests/test_cors_config.py"

if rg -n 'sk_live_|sk_test_|pk_live_|pk_test_|BEGIN (RSA|OPENSSH) PRIVATE KEY' "$APP_DIR" "$BACKEND_DIR" >/dev/null 2>&1; then
  fail "review-automated" "potential secret material detected"
fi

(cd "$APP_DIR" && "$NPM_BIN" exec --yes ts-prune) >/dev/null || fail "review-automated" "dead-code check failed"

cat >> "$REPORT_FILE" <<EOF
### Automated Result

- PASS: lint
- PASS: typecheck
- PASS: npm audit
- PASS: absolute path scan
- PASS: TODO/FIXME scan
- PASS: secret scan
- PASS: dead-code scan

### Conclusion

- PASS
EOF

info "Automated review completed"
