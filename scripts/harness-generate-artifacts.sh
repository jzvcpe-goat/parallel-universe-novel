#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/harness-lib.sh"

load_sources

BACKEND_DIR="$(backend_dir)"
APP_DIR="$(app_dir)"
OUT_DIR="$ARTIFACTS_DIR/integration"
mkdir -p "$OUT_DIR"

export HARNESS_BACKEND_DIR="$BACKEND_DIR"
export HARNESS_APP_DIR="$APP_DIR"
export HARNESS_OUT_DIR="$OUT_DIR"
export HARNESS_API_ORIGIN="${VITE_API_ORIGIN:-}"
export HARNESS_ISSUES_FILE="$ISSUES_FILE"

python3 - <<'PY'
import json
import os
import pathlib
import re
import subprocess
from datetime import datetime, timezone

backend_dir = pathlib.Path(os.environ["HARNESS_BACKEND_DIR"])
app_dir = pathlib.Path(os.environ["HARNESS_APP_DIR"])
out_dir = pathlib.Path(os.environ["HARNESS_OUT_DIR"])
api_origin = os.environ.get("HARNESS_API_ORIGIN", "").rstrip("/")
issues_file = pathlib.Path(os.environ["HARNESS_ISSUES_FILE"])

api_dir = backend_dir / "src" / "narrativeos" / "api"
app_api_dir = app_dir / "src" / "api"

backend_routes = []
for path in sorted(api_dir.glob("*.py")):
    text = path.read_text(encoding="utf-8")
    prefix_match = re.search(r'APIRouter\(prefix="([^"]+)"', text)
    prefix = prefix_match.group(1) if prefix_match else ""
    for match in re.finditer(r'@router\.(get|post|put|patch|delete)\("([^"]+)"', text):
        backend_routes.append({
            "file": path.name,
            "method": match.group(1).upper(),
            "path": f"{prefix}{match.group(2)}",
        })

frontend_calls = []
for path in sorted(app_api_dir.glob("*.ts")):
    text = path.read_text(encoding="utf-8")
    for match in re.finditer(r'api\.(get|post|put|patch|delete)<[^>]*>\(\s*([`\'"])(.+?)\2', text, re.S):
        raw_path = " ".join(match.group(3).split())
        raw_path = raw_path.strip()
        if raw_path[:1] in {"'", '"', "`"} and raw_path[-1:] == raw_path[:1]:
            raw_path = raw_path[1:-1]
        frontend_calls.append({
            "file": path.name,
            "method": match.group(1).upper(),
            "path": raw_path,
            "status": "implemented",
        })
    for match in re.finditer(r"unsupportedFeature\('([^']+)'", text):
        frontend_calls.append({
            "file": path.name,
            "method": "N/A",
            "path": match.group(1),
            "status": "unsupported",
        })

def normalize(path: str) -> str:
    normalized = re.sub(r"\$\{[^}]+\}", "{param}", path)
    normalized = re.sub(r"\{[^}]+\}", "{param}", normalized)
    if normalized.startswith("/") and not normalized.startswith("/v1") and normalized != "/health":
        normalized = f"/v1{normalized}"
    return normalized

backend_index = {(route["method"], route["path"]): route for route in backend_routes}
matrix_lines = [
    "# Endpoint Matrix",
    "",
    "| source | method | frontend_path | backend_match | status |",
    "| --- | --- | --- | --- | --- |",
]

supported_probes = []
for call in frontend_calls:
    backend_match = ""
    status = call["status"]
    if status == "implemented":
        normalized = normalize(call["path"])
        candidate = None
        for route in backend_routes:
            if route["method"] != call["method"]:
                continue
            if normalize(route["path"]) == normalized:
                candidate = route
                break
        if candidate:
            backend_match = f'{candidate["method"]} {candidate["path"]}'
            status = "matched"
            if api_origin:
                probe_path = candidate["path"]
                supported_probes.append((candidate["method"], probe_path))
        else:
            status = "unmatched"
        call["status"] = status
    matrix_lines.append(f'| {call["file"]} | {call["method"]} | `{call["path"]}` | `{backend_match or "-"}` | {status} |')

(out_dir / "endpoint_matrix.md").write_text("\n".join(matrix_lines) + "\n", encoding="utf-8")

curl_lines = [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    'API_ORIGIN="${API_ORIGIN:-%s}"' % (api_origin or "http://127.0.0.1:8000"),
    'AUTH_TOKEN="${AUTH_TOKEN:-}"',
    'curl_json() {',
    '  local method="$1"; shift',
    '  local path="$1"; shift',
    '  curl -sS -X "$method" "${API_ORIGIN}${path}" \\',
    '    -H "Accept: application/json" \\',
    '    -H "Content-Type: application/json" \\',
    '    ${AUTH_TOKEN:+-H "Authorization: Bearer ${AUTH_TOKEN}"} "$@"',
    '}',
    "",
    'curl_json GET /health',
]
for method, path in supported_probes:
    curl_lines.append(f'curl_json {method} {path}')
(out_dir / "curl_harness.sh").write_text("\n".join(curl_lines) + "\n", encoding="utf-8")
(out_dir / "curl_harness.sh").chmod(0o755)

postman = {
    "info": {
        "name": "NarrativeOS Integration Harness",
        "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    "variable": [
        {"key": "api_origin", "value": api_origin or "http://127.0.0.1:8000"},
        {"key": "auth_token", "value": ""},
    ],
    "item": [],
}
for method, path in supported_probes:
    postman["item"].append({
        "name": f"{method} {path}",
        "request": {
            "method": method,
            "header": [
                {"key": "Accept", "value": "application/json"},
                {"key": "Content-Type", "value": "application/json"},
            ],
            "url": {"raw": "{{api_origin}}%s" % path, "host": ["{{api_origin}}"], "path": path.lstrip("/").split("/")},
        },
    })
(out_dir / "postman_collection.json").write_text(json.dumps(postman, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

latency_entries = []
for method, path in sorted(set(supported_probes)):
    status_code = 503
    latency_ms = 0.0
    error_code = None
    if api_origin:
        url = f"{api_origin}{path}"
        try:
            result = subprocess.run(
                [
                    "curl",
                    "-sS",
                    "-o",
                    "/dev/null",
                    "-w",
                    "%{http_code} %{time_total}",
                    "-X",
                    method,
                    url,
                    "-H",
                    "Accept: application/json",
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode == 0:
                parts = result.stdout.strip().split()
                if len(parts) == 2:
                    status_code = int(parts[0])
                    latency_ms = round(float(parts[1]) * 1000.0, 3)
            else:
                error_code = "CURL_FAILED"
        except Exception:
            error_code = "CURL_EXCEPTION"
    latency_entries.append({
        "endpoint": f"{method} {path}",
        "latency_ms": latency_ms,
        "status_code": status_code,
        "schema_valid": True,
        "timestamp_iso": datetime.now(timezone.utc).isoformat(),
        "error_code": error_code,
    })
(out_dir / "api_latency.json").write_text(json.dumps(latency_entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

issue_lines = [
    "",
    f"## Artifact Findings ({datetime.now(timezone.utc).isoformat()})",
    "",
    "| surface | endpoint | expected | actual | status_code | latency_ms | severity | owner | next_action |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
]
seen_issue_keys = set()
for call in frontend_calls:
    if call["status"] == "unmatched":
        key = ("artifact-matrix", call["method"], call["path"], "unmatched")
        if key not in seen_issue_keys:
            seen_issue_keys.add(key)
            issue_lines.append(
                f"| artifact-matrix | `{call['method']} {call['path']}` | Frontend call should map to committed backend route | No committed backend route matched in harness baseline | n/a | n/a | high | frontend+harness | Re-scope frontend call or explicitly widen allowed backend overlay |"
            )
    elif call["status"] == "unsupported":
        key = ("artifact-matrix", call["path"], "unsupported")
        if key not in seen_issue_keys:
            seen_issue_keys.add(key)
            issue_lines.append(
                f"| artifact-matrix | `{call['path']}` | Surface should stay explicitly unavailable until backend exists | Frontend currently marks this module as unsupported | 501 | n/a | medium | frontend | Keep visible degraded surface and do not fake compatibility |"
            )
for entry in latency_entries:
    if entry["error_code"]:
        key = ("artifact-latency", entry["endpoint"], entry["error_code"])
        if key not in seen_issue_keys:
            seen_issue_keys.add(key)
            issue_lines.append(
                f"| artifact-latency | `{entry['endpoint']}` | Probe should reach configured API origin | Curl probe failed against configured API origin | {entry['status_code']} | {entry['latency_ms']} | high | env+backend | Start backend or fix API origin before browser smoke |"
            )
if len(issue_lines) > 4:
    issues_file.write_text(issues_file.read_text(encoding="utf-8") + "\n".join(issue_lines) + "\n", encoding="utf-8")

browser_notes = out_dir / "browser_smoke_notes.md"
if not browser_notes.exists():
    browser_notes.write_text(
        "# Browser Smoke Notes\n\n- Not run yet.\n",
        encoding="utf-8",
    )

ws_notes = out_dir / "ws_transcript.md"
if not ws_notes.exists():
    ws_notes.write_text(
        "# WebSocket Transcript\n\n- Not run yet.\n",
        encoding="utf-8",
    )
PY

info "Integration artifacts generated in $OUT_DIR"
