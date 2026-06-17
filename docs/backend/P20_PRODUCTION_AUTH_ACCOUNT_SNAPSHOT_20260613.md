# P20 Production Auth and Cross-device Account Snapshot

Date: 2026-06-13

Owner surface: `/settings`, `/v1/account/snapshot`, `/v1/reader/subscription`, `/v1/reader/sessions`, `/v1/creator/dialogue/sessions`, auth sessions

## Goal

P20 creates the first production-shaped account snapshot for the web product:

- combine membership entitlement, reader progress and creator dialogue drafts into one resume view
- keep the current `app` Vite/React/TypeScript frontend as the only product frontend
- keep all frontend reads behind `/v1` product contracts
- keep public account UI focused on resume actions, benefits and recovery state
- keep sync diagnostics, provider ids, conflict logs and repair actions out of public pages

P20 does not claim full cross-device sync is complete. Cross-device recovery becomes complete only after durable login, persistent database, creator project persistence and explicit browser-profile merge are production-ready.

## Product Contract

```http
GET /v1/account/snapshot?account_id=web_reader_demo&creator_id=web_creator
```

Optional query fields:

| Field | Purpose |
| --- | --- |
| `account_id` | membership and account-level recovery key |
| `reader_id` | optional reader-session key when different from account |
| `creator_id` | creator dialogue draft owner |
| `include_diagnostics` | Studio/Ops-only diagnostics switch |

Public response shape:

```json
{
  "account": {
    "account_id": "web_reader_demo",
    "reader_id": "web_reader_demo",
    "creator_id": "web_creator",
    "display_name": "网页阅读档案",
    "auth_state": "guest_profile",
    "sync_state": "server_snapshot_ready",
    "requires_login_for_cross_device": true
  },
  "membership": {
    "status": "active",
    "tier_id": "play_pass",
    "label": "阅读会员",
    "story_credits": 30,
    "studio_credits": 10,
    "recommended_action": "continue_reading",
    "checkout_status": "completed"
  },
  "reader_progress": {
    "resume_available": true,
    "session_count": 1,
    "latest": {
      "session_id": "session_xxx",
      "world_id": "beacon-beyond",
      "world_title": "灯塔之外",
      "chapter_index": 1,
      "chapter_title": "第 1 章",
      "resume_available": true
    },
    "recent": []
  },
  "creator_drafts": [
    {
      "session_id": "creator_dialogue_xxx",
      "title": "守灯人在无月夜收到未来航海日志",
      "turn_count": 2,
      "opening_excerpt": "这一次，我先把故事种子写成开场。",
      "resume_available": true
    }
  ],
  "story_projects": {
    "status": "not_connected",
    "refs": []
  },
  "local_fallback": {
    "enabled": true,
    "merge_required": false,
    "server_state_present": true,
    "resolution": "server_snapshot_first"
  },
  "conflicts": [],
  "resume_action": {
    "type": "continue_reading",
    "label": "继续阅读",
    "route": "/story?world=beacon-beyond"
  },
  "public_safe": true
}
```

Diagnostics are opt-in:

```http
GET /v1/account/snapshot?account_id=...&include_diagnostics=true
```

Public frontend must not request diagnostics. Studio/Ops can use diagnostics for counts and repair workflow entry points.

## Current Implementation Evidence

Backend:

- `backend/src/narrativeos/services/account_snapshot.py`
  - aggregates subscription status, reader sessions and creator dialogue drafts
  - keeps provider, webhook, ledger and upstream ids out of the public snapshot
  - returns `local_fallback`, conflict list and a single `resume_action`
- `backend/src/narrativeos/api/account.py`
  - exposes `GET /v1/account/snapshot`
  - optionally resolves bearer auth identity when present
  - keeps diagnostics opt-in through `include_diagnostics`
- `backend/src/narrativeos/api/app_factory.py`
  - wires `AccountSnapshotService` into `app.state`
- `backend/tests/test_account_snapshot_api.py`
  - covers membership + reader progress + creator draft merge
  - covers diagnostics opt-in
  - covers signed-in bearer identity

Frontend:

- `app/src/api/account.ts`
  - adds `accountApi.getSnapshot`
- `app/src/types/index.ts`
  - adds `AccountSnapshot`
- `app/src/pages/Account.tsx`
  - keeps existing plan cards and checkout completion
  - adds `阅读档案`, `创作草稿` and `跨设备恢复` sections
  - does not expose provider, webhook, event id, sync logs or repair details

Verification contracts:

- `backend/specs/openapi.yaml` and `backend/openapi.json` expose `/v1/account/snapshot`
- `app/src/types/generated-openapi.d.ts` is regenerated
- `scripts/smoke-deployed-api.sh` now proves reader, creator, membership and account snapshot on one unique account
- `scripts/check-capability-alignment.mjs` requires the frontend route, API client and OpenAPI contract to stay aligned

## Frontend Display Boundary

Reader:

- sees continue reading and saved progress
- does not see raw session internals, provider data or repair logs

Creator:

- sees continue creation and latest draft
- does not see system prompt, model source, prompt plumbing or raw extraction details

Account:

- sees current plan, reading credits, creation credits, latest reading, latest draft and cross-device recovery state
- may say current browser profile can be merged after sign-in
- must not claim cross-device recovery is already complete for guest profile users

Studio/Ops:

- may inspect diagnostics, conflict logs, upstream ids, repair actions and event histories
- must keep those surfaces out of public navigation

## Backend-Team Integration Contract

Backend-team services should map into the P20 contract without replacing the product frontend:

| Capability | Product route |
| --- | --- |
| auth identity | optional bearer resolution for `GET /v1/account/snapshot` |
| entitlement snapshot | `GET /v1/reader/subscription` folded into `/v1/account/snapshot` |
| reader progress | local reader session list folded into `/v1/account/snapshot` |
| creator dialogue draft | creator dialogue session list folded into `/v1/account/snapshot` |
| story project draft | future creator-dialogue project persistence folded into `story_projects.refs` |
| sync diagnostics | Studio/Ops-only opt-in diagnostics |

No backend-team `apps/web` frontend should be merged for P20.

## Verification Commands

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/backend
../.toolchain/python/bin/pytest tests/test_account_snapshot_api.py tests/test_creator_dialogue_api.py -q
```

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/app
npx tsc --noEmit -p tsconfig.app.json
npm run check:alignment
npm run check:copy-boundary
npm run check:design-system
npm run check:backend-bridge
```

Full P20 acceptance also requires:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/smoke-deployed-api.sh http://127.0.0.1:8000
```

or the deployed API host after packaging.

## Latest Verification Evidence

Local backend/API:

- `30 passed, 2 warnings`
- warnings are the existing `jsonschema.RefResolver` deprecation warnings
- covered tests include P20 account snapshot, reader runtime, backend bridge, market trends, creator dialogue, creator blueprint, CORS and checkout lifecycle

Frontend:

- `npx tsc --noEmit -p tsconfig.app.json` passed
- `npm run build` passed
- `npm run lint -- --max-warnings=0` passed
- `npm audit --audit-level=moderate` found `0 vulnerabilities`
- build still prints the existing non-blocking Browserslist data-age warning and chunk-size warning

Product gates:

- `check:alignment` passed with 29 frontend API calls, 115 OpenAPI paths, 6 routes and 14 required product contracts
- `check:backend-bridge` passed
- `check:design-system` passed
- `check:copy-boundary` passed for 7 target groups

Local API smoke:

```json
{
  "api_origin": "http://127.0.0.1:8000",
  "api_base_url": "http://127.0.0.1:8000/v1",
  "world_count": 12,
  "trend_count": 6,
  "reader_choice_events": 2,
  "subscription_tiers": 3,
  "checkout_tier": "play_pass",
  "checkout_status": "completed",
  "account_snapshot_resume": "continue_reading",
  "creator_turn_count": 4
}
```

Browser QA:

- opened `http://127.0.0.1:4173/settings?qa=p20-account-snapshot`
- API origin was `http://127.0.0.1:8000`
- confirmed `阅读档案`, `创作草稿`, `跨设备恢复`, `继续阅读`, `继续创作`
- confirmed three plan cards render
- confirmed forbidden public terms are absent: `后端`, `PRD`, `OpenAPI`, `system prompt`, `系统提示词`, `provider`, `webhook`, `起点`, `番茄`, `绑定`, `底盘`

## Remaining Production Risks

- Persistent production database is still required; serverless `/tmp` is preview-only.
- Real login and browser-profile merge UX still need final production privacy review.
- Creator dialogue to saved story project persistence is not connected yet; `story_projects.refs` is intentionally empty.
- Production payment provider hardening is next: browser preview completion must be replaced by provider callback, return-page polling and Ops reconciliation.

## P21 Readiness

P21 can start after P20 when:

- `/v1/account/snapshot` is green in OpenAPI alignment and smoke
- `/settings` displays account snapshot without public implementation leakage
- P20 tests pass with reader progress, creator draft and membership entitlement in one snapshot
- docs and handoff record that cross-device recovery cannot be claimed complete until durable login and merge are production-ready

P21 can start after P20.
