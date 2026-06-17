#!/usr/bin/env bash

set -euo pipefail

HARNESS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACTS_DIR="$HARNESS_ROOT/artifacts"
OVERLAYS_DIR="$HARNESS_ROOT/.overlays"
SOURCES_FILE="$HARNESS_ROOT/.harness-sources"
BASELINE_FILE="$HARNESS_ROOT/.harness-baseline"
ISSUES_FILE="$HARNESS_ROOT/INTEGRATION_ISSUES.md"

timestamp_iso() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

info() {
  printf '[harness][info] %s\n' "$*"
}

warn() {
  printf '[harness][warn] %s\n' "$*" >&2
}

append_issue_log() {
  local gate_name="$1"
  local message="$2"
  {
    printf '\n## Harness Abort Log\n'
    printf -- '- [%s] `%s`: %s\n' "$(timestamp_iso)" "$gate_name" "$message"
  } >> "$ISSUES_FILE"
}

fail() {
  local gate_name="$1"
  local message="$2"
  append_issue_log "$gate_name" "$message"
  printf '[harness][abort] %s: %s\n' "$gate_name" "$message" >&2
  exit 1
}

require_cmd() {
  local gate_name="$1"
  shift
  local cmd_name="$1"
  if ! command -v "$cmd_name" >/dev/null 2>&1; then
    fail "$gate_name" "missing required command: $cmd_name"
  fi
}

resolve_tool() {
  local env_name="$1"
  local fallback_name="$2"
  local candidate="${!env_name:-}"
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    printf '%s\n' "$candidate"
    return 0
  fi
  if command -v "$fallback_name" >/dev/null 2>&1; then
    command -v "$fallback_name"
    return 0
  fi
  return 1
}

sha256_file() {
  shasum -a 256 "$1" | awk '{print $1}'
}

write_file_hashes() {
  local output_file="$1"
  shift
  : > "$output_file"
  local file_path
  for file_path in "$@"; do
    if [[ -f "$file_path" ]]; then
      printf '%s  %s\n' "$(sha256_file "$file_path")" "$file_path" >> "$output_file"
    fi
  done
}

hash_tree() {
  local root_dir="$1"
  find "$root_dir" -type f ! -path '*/node_modules/*' ! -path '*/dist/*' -print0 \
    | sort -z \
    | xargs -0 shasum -a 256 \
    | shasum -a 256 \
    | awk '{print $1}'
}

load_sources() {
  if [[ ! -f "$SOURCES_FILE" ]]; then
    fail "sources" "missing .harness-sources; run ./scripts/harness-init.sh first"
  fi
  # shellcheck disable=SC1090
  source "$SOURCES_FILE"
  : "${SOURCE_BACKEND:?SOURCE_BACKEND missing from .harness-sources}"
  : "${SOURCE_APP:?SOURCE_APP missing from .harness-sources}"
  : "${SOURCE_ISSUES:?SOURCE_ISSUES missing from .harness-sources}"
}

backend_dir() {
  printf '%s/backend' "$HARNESS_ROOT"
}

app_dir() {
  printf '%s/app' "$HARNESS_ROOT"
}

generate_openapi_json() {
  local yaml_file="$1"
  local json_file="$2"
  require_cmd "contract" ruby
  ruby -r yaml -r json -e '
    def rewrite_refs(value)
      case value
      when Hash
        value.each_with_object({}) do |(key, child), out|
          if key == "$ref" && child.is_a?(String) && child.start_with?("./") && !child.start_with?("./specs/")
            out[key] = "./specs/#{child.delete_prefix("./")}"
          else
            out[key] = rewrite_refs(child)
          end
        end
      when Array
        value.map { |child| rewrite_refs(child) }
      else
        value
      end
    end

    payload = rewrite_refs(YAML.load_file(ARGV[0]))
    File.write(ARGV[1], JSON.pretty_generate(payload))
  ' "$yaml_file" "$json_file"
}

scan_literal_paths() {
  local gate_name="$1"
  shift
  if rg -n '/Users/|/home/|C:\\Users' "$@" >/dev/null 2>&1; then
    fail "$gate_name" "hardcoded absolute path literal detected"
  fi
}

scan_todo_fixme() {
  local gate_name="$1"
  shift
  if rg -n 'TODO|FIXME' "$@" >/dev/null 2>&1; then
    fail "$gate_name" "open TODO/FIXME markers detected"
  fi
}

require_env_vars() {
  local gate_name="$1"
  shift
  local var_name
  for var_name in "$@"; do
    if [[ -z "${!var_name:-}" ]]; then
      fail "$gate_name" "required environment variable missing: $var_name"
    fi
  done
}
