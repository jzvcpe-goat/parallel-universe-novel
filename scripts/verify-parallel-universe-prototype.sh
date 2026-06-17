#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$ROOT_DIR/app"
BACKEND_DIR="$ROOT_DIR/backend"
PYTHON_BIN="$ROOT_DIR/.toolchain/python/bin/python"
PREVIEW_PORT="${PREVIEW_PORT:-4173}"
PREVIEW_LOG="$(mktemp -t parallel-universe-preview.XXXXXX.log)"
PREVIEW_PID=""

cleanup() {
  if [[ -n "$PREVIEW_PID" ]]; then
    kill "$PREVIEW_PID" >/dev/null 2>&1 || true
  fi
  rm -f "$PREVIEW_LOG"
}
trap cleanup EXIT

if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="$(command -v python3 || true)"
fi

if [[ -z "$PYTHON_BIN" ]]; then
  echo "[verify-parallel-universe] python3 not found" >&2
  exit 1
fi

echo "[verify-parallel-universe] contract and capability alignment"
"$SCRIPT_DIR/harness-check-contract.sh"

echo "[verify-parallel-universe] frontend lint/build/audit"
(
  cd "$APP_DIR"
  npm run lint -- --max-warnings=0
  npm run check:backend-bridge
  npm run check:copy-boundary
  npm run build
  npm audit --audit-level=moderate
)

echo "[verify-parallel-universe] backend narrow API tests"
(
  cd "$BACKEND_DIR"
  "$PYTHON_BIN" -m pytest -q \
    tests/test_harness_narrow_api.py \
    tests/test_ops_frontend_split.py \
    tests/test_cors_config.py \
    tests/test_provider_routing.py \
    tests/test_backend_team_bridge.py \
    tests/test_market_trends_api.py \
    tests/test_creator_commercial_api.py \
    tests/test_product_runtime_api.py
)

echo "[verify-parallel-universe] local preview route smoke"
(
  cd "$APP_DIR"
  npm run preview -- --host 127.0.0.1 --port "$PREVIEW_PORT" >"$PREVIEW_LOG" 2>&1 &
  PREVIEW_PID="$!"

  for _ in $(seq 1 50); do
    if /usr/bin/curl -fsS "http://127.0.0.1:$PREVIEW_PORT/" >/dev/null 2>&1; then
      break
    fi
    sleep 0.2
  done

  for route in "/" "/story" "/story?world=unknown-world" "/library" "/create" "/settings" "/studio"; do
    code="$(/usr/bin/curl -L -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PREVIEW_PORT$route")"
    if [[ "$code" != "200" ]]; then
      echo "[verify-parallel-universe] route $route returned $code" >&2
      cat "$PREVIEW_LOG" >&2
      exit 1
    fi
    echo "[verify-parallel-universe] route $route -> $code"
  done

  rg -n "UnknownWorldGate|CharacterMemoryPanel|EventRhythmPanel|selectChoice|isWorldTemplateId" "$APP_DIR/src/pages/Story.tsx" >/dev/null
  rg -n "RuntimeSyncPanel|storyApi\\.createSession|runtimeApi\\.getReaderSnapshot|runtimeApi\\.advanceScene|story-choice-" "$APP_DIR/src/pages/Story.tsx" >/dev/null
  rg -n "interactive_prototype|宇宙线图谱|对话创作" "$APP_DIR/src/features/parallel-universe/data.ts" >/dev/null
  rg -n "marketApi|getTrends|热门题材索引" "$APP_DIR/src/pages/Home.tsx" "$APP_DIR/src/pages/Create.tsx" "$APP_DIR/src/api/market.ts" >/dev/null
  rg -n "creatorApi|createDialogueSession|addDialogueTurn|localDialogueSession" "$APP_DIR/src/pages/Create.tsx" "$APP_DIR/src/api/creator.ts" >/dev/null
  rg -n "evaluateScene|commitScene|runtimeApi\\.evaluateQuality|runtimeApi\\.commitCanon|quality-check-|canon-commit-" "$APP_DIR/src/pages/Studio.tsx" >/dev/null
  rg -n "runtimeApi|getReaderSnapshot|advanceScene|evaluateQuality|commitCanon" "$APP_DIR/src/api/runtime.ts" >/dev/null
  for term in "世界在你脚下" "可选择故事书城" "热门题材索引" "主编强推" "榜单" "最近更新" "创作助手" "开始创作"; do
    rg -n "$term" "$APP_DIR/src/pages/Home.tsx" >/dev/null
  done
  test ! -f "$APP_DIR/src/pages/Showcase.tsx"
  test ! -f "$APP_DIR/src/pages/Settings.tsx"
  stale_copy_pattern="Showcase API 未接入|Reader backend|Customer exports|committed baseline|后端世界暂不伪装|前后端接线状态|账户管理|公共广场|订阅占位|工程占位|Reader Mode|Choice Point|World Discovery|Worldline Graph|Memo Kernel|高概念|概念展示|WEB READER|PROTOTYPE|Prototype|prototype|原型|入口页|首页只|预览环境|后台|后端|接口|PRD|试玩|底盘|绑定|起点|番茄|设定卡|模板库|冷启动样本|CURRENT WORLD|命运核|内核|正史|候选|时间织机|质量门禁|可转正"
  if rg -n "$stale_copy_pattern" "$APP_DIR/src/pages" >/dev/null; then
    echo "[verify-parallel-universe] stale backend placeholder copy found in reader-facing pages" >&2
    rg -n "$stale_copy_pattern" "$APP_DIR/src/pages" >&2
    exit 1
  fi
)

echo "[verify-parallel-universe] PASS"
