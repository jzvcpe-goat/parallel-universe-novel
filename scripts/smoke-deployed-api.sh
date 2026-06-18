#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

API_ORIGIN="${1:-${NARRATIVEOS_API_ORIGIN:-${VITE_API_ORIGIN:-}}}"
API_BASE_URL="${VITE_API_BASE_URL:-}"

if [[ -z "$API_ORIGIN" && -z "$API_BASE_URL" ]]; then
  echo "Usage: $0 https://<api-host>"
  echo "Or set NARRATIVEOS_API_ORIGIN, VITE_API_ORIGIN, or VITE_API_BASE_URL."
  exit 2
fi

if [[ -z "$API_BASE_URL" ]]; then
  API_ORIGIN="${API_ORIGIN%/}"
  API_BASE_URL="$API_ORIGIN/v1"
else
  API_BASE_URL="${API_BASE_URL%/}"
  if [[ -z "$API_ORIGIN" ]]; then
    API_ORIGIN="${API_BASE_URL%/v1}"
  fi
fi

API_ORIGIN="${API_ORIGIN%/}"
PYTHON_BIN="${PYTHON_BIN:-$ROOT_DIR/.toolchain/python/bin/python}"
if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN="python3"
fi

API_ORIGIN="$API_ORIGIN" API_BASE_URL="$API_BASE_URL" "$PYTHON_BIN" - <<'PY'
import json
import os
import sys
import urllib.error
import urllib.request
import uuid

api_origin = os.environ["API_ORIGIN"].rstrip("/")
api_base = os.environ["API_BASE_URL"].rstrip("/")
smoke_account_id = f"p0_smoke_reader_{uuid.uuid4().hex[:8]}"


def fail(message: str) -> None:
    print(f"[smoke-deployed-api] FAIL: {message}", file=sys.stderr)
    sys.exit(1)


def request_json(method: str, url: str, payload: dict | None = None, extra_headers: dict | None = None) -> dict:
    body = None
    headers = {"Accept": "application/json"}
    if extra_headers:
        headers.update(extra_headers)
    if payload is not None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            raw = response.read().decode("utf-8")
            status = response.status
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        fail(f"{method} {url} returned HTTP {exc.code}: {detail[:500]}")
    except urllib.error.URLError as exc:
        fail(f"{method} {url} failed: {exc}")
    except TimeoutError:
        fail(f"{method} {url} timed out")

    if status < 200 or status >= 300:
        fail(f"{method} {url} returned HTTP {status}")
    try:
        return json.loads(raw) if raw else {}
    except json.JSONDecodeError as exc:
        fail(f"{method} {url} did not return JSON: {exc}")


health = request_json("GET", f"{api_origin}/health")
if health.get("status") not in {"ok", "healthy"}:
    fail(f"/health returned unexpected payload: {health}")

worlds_payload = request_json("GET", f"{api_base}/reader/library/worlds")
worlds = worlds_payload.get("worlds")
if not isinstance(worlds, list) or not worlds:
    fail("/reader/library/worlds did not return a non-empty worlds list")
world_ids = {item.get("world_id") for item in worlds if isinstance(item, dict)}
required_worlds = {"beacon-beyond", "rain-bridge", "frontier-edict"}
missing_worlds = sorted(required_worlds - world_ids)
if missing_worlds:
    fail(f"frontend product worlds are missing from backend: {', '.join(missing_worlds)}")

market = request_json("GET", f"{api_base}/market/trends?cadence=weekly")
if market.get("function_call", {}).get("name") != "scan_market_trends":
    fail("/market/trends did not return the scan_market_trends function-call contract")
trends = market.get("trends")
if not isinstance(trends, list) or not trends:
    fail("/market/trends did not return a non-empty trend index")
required_trend_templates = {
    "beacon-beyond",
    "rain-bridge",
    "jade-contract",
    "lotus-lane",
    "frontier-edict",
    "algorithm-city",
}
trend_template_ids = {item.get("template_id") for item in trends if isinstance(item, dict)}
missing_trend_templates = sorted(required_trend_templates - trend_template_ids)
if missing_trend_templates:
    fail(f"/market/trends is missing template mappings: {', '.join(missing_trend_templates)}")

weekly_scan = request_json(
    "POST",
    f"{api_base}/market/trends/scan",
    {"cadence": "weekly", "force": True},
)
monthly_scan = request_json(
    "POST",
    f"{api_base}/market/trends/scan",
    {"cadence": "monthly", "force": True},
)
if weekly_scan.get("cadence") != "weekly" or weekly_scan.get("function_call", {}).get("arguments", {}).get("force") is not True:
    fail("/market/trends/scan did not return forced weekly scan payload")
if monthly_scan.get("cadence") != "monthly" or monthly_scan.get("function_call", {}).get("arguments", {}).get("force") is not True:
    fail("/market/trends/scan did not return forced monthly scan payload")
if not isinstance(weekly_scan.get("template_recommendations"), list) or not weekly_scan.get("template_recommendations"):
    fail("/market/trends/scan weekly did not return template recommendations")

weekly_cron = request_json("GET", f"{api_base}/market/trends/cron/weekly")
monthly_cron = request_json("GET", f"{api_base}/market/trends/cron/monthly")
if weekly_cron.get("cadence") != "weekly" or weekly_cron.get("function_call", {}).get("arguments", {}).get("force") is not True:
    fail("/market/trends/cron/weekly did not return forced weekly scan payload")
if monthly_cron.get("cadence") != "monthly" or monthly_cron.get("function_call", {}).get("arguments", {}).get("force") is not True:
    fail("/market/trends/cron/monthly did not return forced monthly scan payload")

session = request_json(
    "POST",
    f"{api_base}/reader/sessions",
    {"world_id": "beacon-beyond", "reader_id": smoke_account_id},
)
session_id = session.get("session_id")
if not session_id:
    fail("/reader/sessions did not return session_id")
if session.get("world_id") != "beacon-beyond":
    fail(f"/reader/sessions returned wrong world_id: {session.get('world_id')}")

continued = request_json(
    "POST",
    f"{api_base}/reader/continue",
    {
        "session_id": session_id,
        "choice_id": "publish-signal",
        "freeform_intent": "公开灯码，但先保护幸存者身份。",
        "reader_id": smoke_account_id,
    },
)
if continued.get("session_id") != session_id:
    fail("/reader/continue did not preserve session_id")

advanced = request_json(
    "POST",
    f"{api_base}/scene/advance",
    {
        "session_id": session_id,
        "choice_id": "publish-signal",
        "freeform_intent": "公开灯码，但先保护幸存者身份。",
        "reader_id": smoke_account_id,
    },
)
if advanced.get("status") not in {"ok", "advanced"}:
    fail(f"/scene/advance returned unexpected status: {advanced.get('status')}")
if not isinstance(advanced.get("candidate_scene"), dict):
    fail("/scene/advance did not return candidate_scene")
advanced_scene = advanced.get("candidate_scene") or {}
chapter_view = advanced_scene.get("chapter_view") or advanced_scene.get("reader_view") or {}
if not isinstance(chapter_view, dict) or not (chapter_view.get("body") or chapter_view.get("chapter_body")):
    fail("/scene/advance did not return readable next-scene body")

snapshot = request_json(
    "POST",
    f"{api_base}/reader/snapshot",
    {"session_id": session_id},
)
if snapshot.get("session_id") != session_id:
    fail("/reader/snapshot did not preserve session_id after choice")
if snapshot.get("world_id") != "beacon-beyond":
    fail(f"/reader/snapshot returned wrong world_id: {snapshot.get('world_id')}")
worldline = snapshot.get("worldline") or {}
if not isinstance(worldline, dict) or worldline.get("event_count", 0) < 1:
    fail("/reader/snapshot did not expose a reader worldline after choice")

quality = request_json(
    "POST",
    f"{api_base}/quality/evaluate",
    {
        "candidate_id": "p0_smoke_candidate",
        "world_id": "beacon-beyond",
        "body": "第七灯塔重新点火，沈星澜把航海日志藏进外衣，决定先保护还活着的人。",
        "choices": ["公开灯码", "隐藏幸存者"],
        "character_fidelity_score": 0.72,
    },
)
if "report" not in quality or "quality_gate" not in quality:
    fail("/quality/evaluate did not return report and quality_gate")

creator = request_json(
    "POST",
    f"{api_base}/creator/dialogue/sessions",
    {
        "creator_id": smoke_account_id,
        "seed": "一个守灯人在无月夜收到一封来自未来的航海日志。",
        "context": {
            "guide_id": "novel_starter_guide",
            "rule": "write_first_ask_later",
        },
    },
)
assistant = creator.get("assistant") if isinstance(creator.get("assistant"), dict) else {}
if not assistant.get("story_text"):
    fail("/creator/dialogue/sessions did not return assistant.story_text")
questions = assistant.get("questions")
if not isinstance(questions, list) or len(questions) > 2:
    fail("/creator/dialogue/sessions did not enforce at most two questions")
creator_session_id = creator.get("session_id")
if not creator_session_id:
    fail("/creator/dialogue/sessions did not return session_id")

creator_turn = request_json(
    "POST",
    f"{api_base}/creator/dialogue/sessions/{creator_session_id}/turns",
    {
        "message": "主角是在追一个不能放手的真相，他发现日志上的墨迹还没干。",
        "previous_session": creator,
        "context": {
            "guide_id": "novel_starter_guide",
            "rule": "write_first_ask_later",
        },
    },
)
if creator_turn.get("session_id") != creator_session_id:
    fail("/creator/dialogue turn did not preserve session_id")
if len(creator_turn.get("turns") or []) < len(creator.get("turns") or []) + 2:
    fail("/creator/dialogue turn did not append a user and assistant turn")
turn_questions = (creator_turn.get("assistant") or {}).get("questions")
if not isinstance(turn_questions, list) or len(turn_questions) > 2:
    fail("/creator/dialogue turn did not enforce at most two questions")

rehydrated_creator_session_id = "creator_dialogue_rehydrate_smoke"
rehydrated = request_json(
    "POST",
    f"{api_base}/creator/dialogue/sessions/{rehydrated_creator_session_id}/turns",
    {
        "message": "如果服务端刚好换了实例，也要继续写这一段。",
        "previous_session": {**creator, "session_id": rehydrated_creator_session_id},
        "context": {
            "guide_id": "novel_starter_guide",
            "rule": "write_first_ask_later",
        },
    },
)
if rehydrated.get("session_id") != rehydrated_creator_session_id:
    fail("/creator/dialogue rehydrate turn did not preserve requested session_id")
if len(rehydrated.get("turns") or []) < len(creator.get("turns") or []) + 2:
    fail("/creator/dialogue rehydrate turn did not continue from previous_session")

subscription = request_json("GET", f"{api_base}/reader/subscription?account_id={smoke_account_id}")
tiers = subscription.get("tiers")
if not isinstance(tiers, list) or not tiers:
    fail("/reader/subscription did not return tiers")
tier_ids = {item.get("tier_id") for item in tiers if isinstance(item, dict)}
if "play_pass" not in tier_ids:
    fail("/reader/subscription did not expose play_pass")

checkout = request_json(
    "POST",
    f"{api_base}/reader/checkout/start",
    {"account_id": smoke_account_id, "tier_id": "play_pass"},
)
checkout_payload = checkout.get("checkout") or {}
if checkout_payload.get("tier_id") != "play_pass":
    fail("/reader/checkout/start did not return the requested tier")
if checkout_payload.get("status") not in {"created", "ready", "open"}:
    fail(f"/reader/checkout/start returned unexpected status: {checkout_payload.get('status')}")
checkout_session_id = checkout_payload.get("checkout_session_id") or checkout_payload.get("session_id")
if not checkout_session_id:
    fail("/reader/checkout/start did not return checkout_session_id")

checkout_status = request_json(
    "GET",
    f"{api_base}/reader/checkout/{checkout_session_id}/status?account_id={smoke_account_id}",
)
if checkout_status.get("public_state") != "processing":
    fail("/reader/checkout/{id}/status did not return the processing public state")
if "provider" in json.dumps(checkout_status):
    fail("/reader/checkout/{id}/status leaked provider internals")

completed_checkout = request_json(
    "POST",
    f"{api_base}/reader/checkout/return",
    {
        "account_id": smoke_account_id,
        "checkout_session_id": checkout_session_id,
    },
)
if completed_checkout.get("public_state") != "active":
    fail("/reader/checkout/return did not activate the membership in preview mode")
subscription_after_checkout = request_json("GET", f"{api_base}/reader/subscription?account_id={smoke_account_id}")
if (subscription_after_checkout.get("subscription") or {}).get("status") != "active":
    fail("/reader/subscription did not refresh to active after checkout completion")
if (subscription_after_checkout.get("checkout_session") or {}).get("status") != "completed":
    fail("/reader/subscription did not expose the completed checkout session after checkout completion")

account_snapshot = request_json(
    "GET",
    f"{api_base}/account/snapshot?account_id={smoke_account_id}&reader_id={smoke_account_id}&creator_id={smoke_account_id}",
)
if account_snapshot.get("public_safe") is not True:
    fail("/account/snapshot did not return a public-safe snapshot")
if (account_snapshot.get("membership") or {}).get("status") != "active":
    fail("/account/snapshot did not include active membership after checkout")
reader_progress = account_snapshot.get("reader_progress") or {}
if reader_progress.get("resume_available") is not True:
    fail("/account/snapshot did not include reader resume progress")
if not account_snapshot.get("creator_drafts"):
    fail("/account/snapshot did not include creator dialogue drafts")

auth_actor_id = f"{smoke_account_id}@example.test"
browser_reader_id = f"{smoke_account_id}_browser_reader"
browser_creator_id = f"{smoke_account_id}_browser_creator"
registered = request_json(
    "POST",
    f"{api_base}/auth/register",
    {
        "actor_id": auth_actor_id,
        "actor_role": "customer",
        "password": "correct horse battery staple",
        "account_id": smoke_account_id,
        "display_name": "Smoke Reader",
    },
)
if (registered.get("identity") or {}).get("account_id") != smoke_account_id:
    fail("/auth/register did not preserve the requested account_id")
logged_in = request_json(
    "POST",
    f"{api_base}/auth/login",
    {"actor_id": auth_actor_id, "password": "correct horse battery staple"},
)
access_token = (logged_in.get("token") or {}).get("access_token")
if not access_token:
    fail("/auth/login did not return an access token")
auth_headers = {"Authorization": f"Bearer {access_token}"}
me = request_json("GET", f"{api_base}/auth/me", extra_headers=auth_headers)
if (me.get("identity") or {}).get("account_id") != smoke_account_id:
    fail("/auth/me did not resolve the signed-in account")

browser_reader = request_json(
    "POST",
    f"{api_base}/reader/sessions",
    {"world_id": "rain-bridge", "reader_id": browser_reader_id},
)
if not browser_reader.get("session_id"):
    fail("/reader/sessions did not create a browser profile reader session")
browser_creator = request_json(
    "POST",
    f"{api_base}/creator/dialogue/sessions",
    {
        "creator_id": browser_creator_id,
        "seed": "一个雨夜证人发现录像里的自己迟到了七分钟。",
    },
)
if not browser_creator.get("session_id"):
    fail("/creator/dialogue/sessions did not create a browser profile draft")

merge_preview = request_json(
    "POST",
    f"{api_base}/account/merge/preview",
    {
        "guest_reader_id": browser_reader_id,
        "guest_creator_id": browser_creator_id,
    },
    extra_headers=auth_headers,
)
if merge_preview.get("public_state") not in {"ready_to_merge", "needs_review"}:
    fail(f"/account/merge/preview returned unexpected public_state: {merge_preview.get('public_state')}")
merge_summary = merge_preview.get("summary") or {}
if merge_summary.get("reader_progress_count", 0) < 1 or merge_summary.get("creator_draft_count", 0) < 1:
    fail("/account/merge/preview did not find browser profile progress and drafts")

merge_confirm = request_json(
    "POST",
    f"{api_base}/account/merge/confirm",
    {
        "guest_reader_id": browser_reader_id,
        "guest_creator_id": browser_creator_id,
    },
    extra_headers=auth_headers,
)
if merge_confirm.get("public_state") != "merged":
    fail("/account/merge/confirm did not return merged state")
confirm_summary = merge_confirm.get("summary") or {}
if confirm_summary.get("reader_progress_merged", 0) < 1 or confirm_summary.get("creator_drafts_merged", 0) < 1:
    fail("/account/merge/confirm did not merge reader progress and creator drafts")
merged_snapshot = merge_confirm.get("snapshot") or {}
if (merged_snapshot.get("membership") or {}).get("status") != "active":
    fail("/account/merge/confirm did not retain active membership")
if not (merged_snapshot.get("reader_progress") or {}).get("resume_available"):
    fail("/account/merge/confirm snapshot did not include merged reading resume")
if not merged_snapshot.get("creator_drafts"):
    fail("/account/merge/confirm snapshot did not include merged creator drafts")

p23_account_id = f"{smoke_account_id}_data"
p23_actor_id = f"{p23_account_id}@example.test"
p23_registered = request_json(
    "POST",
    f"{api_base}/auth/register",
    {
        "actor_id": p23_actor_id,
        "actor_role": "customer",
        "password": "correct horse battery staple",
        "account_id": p23_account_id,
        "display_name": "Smoke Data Owner",
    },
)
if (p23_registered.get("identity") or {}).get("account_id") != p23_account_id:
    fail("/auth/register did not create the P23 data-governance account")
p23_login = request_json(
    "POST",
    f"{api_base}/auth/login",
    {"actor_id": p23_actor_id, "password": "correct horse battery staple"},
)
p23_token = (p23_login.get("token") or {}).get("access_token")
if not p23_token:
    fail("/auth/login did not return an access token for P23 data-governance account")
p23_headers = {"Authorization": f"Bearer {p23_token}"}
p23_reader = request_json(
    "POST",
    f"{api_base}/reader/sessions",
    {"world_id": "jade-contract", "reader_id": p23_account_id},
)
if not p23_reader.get("session_id"):
    fail("/reader/sessions did not create P23 account reader progress")
p23_creator = request_json(
    "POST",
    f"{api_base}/creator/dialogue/sessions",
    {"creator_id": p23_actor_id, "seed": "一份玉京契书要求主角用清白换回师门。"},
)
if not p23_creator.get("session_id"):
    fail("/creator/dialogue/sessions did not create P23 account creator draft")
p23_checkout = request_json(
    "POST",
    f"{api_base}/reader/checkout/start",
    {"account_id": p23_account_id, "tier_id": "play_pass"},
)
p23_checkout_id = (p23_checkout.get("checkout") or {}).get("checkout_session_id") or (p23_checkout.get("checkout") or {}).get("session_id")
if not p23_checkout_id:
    fail("/reader/checkout/start did not create P23 checkout session")
request_json(
    "POST",
    f"{api_base}/reader/checkout/return",
    {"account_id": p23_account_id, "checkout_session_id": p23_checkout_id},
)

data_export = request_json("GET", f"{api_base}/account/data/export", extra_headers=p23_headers)
if data_export.get("public_state") != "ready":
    fail("/account/data/export did not return ready state")
export_summary = data_export.get("summary") or {}
if export_summary.get("reader_session_count", 0) < 1 or export_summary.get("creator_draft_count", 0) < 1:
    fail("/account/data/export did not include reader progress and creator draft")
if "token_hash" in json.dumps(data_export, ensure_ascii=False) or "password_hash" in json.dumps(data_export, ensure_ascii=False):
    fail("/account/data/export leaked sensitive credential material")

delete_preview = request_json("POST", f"{api_base}/account/delete/preview", extra_headers=p23_headers)
if delete_preview.get("public_state") != "requires_confirmation":
    fail("/account/delete/preview did not require confirmation")
delete_summary = delete_preview.get("summary") or {}
if delete_summary.get("reader_session_count", 0) < 1 or delete_summary.get("creator_draft_count", 0) < 1:
    fail("/account/delete/preview did not include affected reader progress and creator draft")

delete_confirm = request_json(
    "POST",
    f"{api_base}/account/delete/confirm",
    {"confirmation": "删除账号"},
    extra_headers=p23_headers,
)
if delete_confirm.get("public_state") != "deleted":
    fail("/account/delete/confirm did not delete the account")
delete_confirm_summary = delete_confirm.get("summary") or {}
if delete_confirm_summary.get("reader_sessions_deleted", 0) < 1 or delete_confirm_summary.get("creator_drafts_deleted", 0) < 1:
    fail("/account/delete/confirm did not remove reader progress and creator draft")
if delete_confirm_summary.get("sessions_revoked", 0) < 1:
    fail("/account/delete/confirm did not revoke login sessions")
deleted_subscription = request_json("GET", f"{api_base}/reader/subscription?account_id={p23_account_id}")
if (deleted_subscription.get("subscription") or {}).get("status") != "account_closure_pending":
    fail("/account/delete/confirm did not mark subscription for account closure")
deleted_snapshot = request_json(
    "GET",
    f"{api_base}/account/snapshot?account_id={p23_account_id}&creator_id={p23_actor_id}",
)
if (deleted_snapshot.get("reader_progress") or {}).get("session_count", 0) != 0:
    fail("/account/delete/confirm left reader progress in account snapshot")
if deleted_snapshot.get("creator_drafts"):
    fail("/account/delete/confirm left creator drafts in account snapshot")

print("[smoke-deployed-api] PASS")
print(json.dumps(
    {
        "api_origin": api_origin,
        "api_base_url": api_base,
        "smoke_account_id": smoke_account_id,
        "world_count": len(worlds),
        "trend_count": len(trends),
        "weekly_scan_trends": len(weekly_scan.get("trends") or []),
        "monthly_scan_trends": len(monthly_scan.get("trends") or []),
        "session_id": session_id,
        "reader_choice_events": worldline.get("event_count"),
        "subscription_tiers": len(tiers),
        "checkout_tier": checkout_payload.get("tier_id"),
        "checkout_status": (subscription_after_checkout.get("checkout_session") or {}).get("status"),
        "account_snapshot_resume": (account_snapshot.get("resume_action") or {}).get("type"),
        "merge_public_state": merge_confirm.get("public_state"),
        "merge_reader_progress": confirm_summary.get("reader_progress_merged"),
        "merge_creator_drafts": confirm_summary.get("creator_drafts_merged"),
        "data_export_state": data_export.get("public_state"),
        "delete_preview_state": delete_preview.get("public_state"),
        "delete_confirm_state": delete_confirm.get("public_state"),
        "delete_sessions_revoked": delete_confirm_summary.get("sessions_revoked"),
        "creator_session_id": creator_session_id,
        "creator_turn_count": len(creator_turn.get("turns") or []),
    },
    ensure_ascii=False,
    indent=2,
))
PY
