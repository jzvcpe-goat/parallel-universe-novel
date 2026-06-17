# P22 Production Account Merge and Persistence Hardening

Date: 2026-06-13

Owner surface: `/settings`, `/v1/auth/*`, `/v1/account/snapshot`, `/v1/account/merge/preview`, `/v1/account/merge/confirm`, `/v1/reader/sessions`, `/v1/creator/dialogue/sessions`

## Goal

P22 turns the previous "current browser profile" recovery message into a real signed-in account merge loop:

- signed-in identity comes from `/v1/auth/login` bearer tokens
- account snapshot defaults to the signed-in account when a bearer token is present
- current browser reader progress can be previewed before merge
- current browser creator drafts can be previewed before merge
- confirm moves reader sessions and creator dialogue drafts into the signed-in account
- payment membership stays attached to the signed-in account and is not overwritten by browser profile data
- public `/settings` shows only login, merge, continue reading, continue creating and recovery state
- internal diagnostics, repair actions, raw storage details and merge audit expansion stay in Studio/Ops scope

P22 does not claim full production account compliance is complete. Database migrations, privacy export/delete, account deletion, device inventory, token rotation policy and security audit remain launch blockers.

## Capability Audit

Current capability state after P22:

| Capability | Current status | Product boundary |
| --- | --- | --- |
| Auth | Connected to `/v1/auth/register`, `/v1/auth/login`, `/v1/auth/me` and bearer-token identity parsing. | Public `/settings` may show login, register, signed-in save state and logout. It must not show token internals. |
| Account snapshot | Connected to signed-in identity when a bearer token is present, with explicit browser-profile fallback when no token is present. | Public copy can say current browser profile or signed-in account. It must not claim cross-device recovery before sign-in and merge confirmation. |
| Reader sessions | Stored through the platform repository and reassigned from guest reader id to signed-in account id during merge confirm. | Public UI can offer continue reading after merge. Raw session ids and merge repair state stay out of public routes. |
| Creator dialogue sessions | Stored through creator dialogue persistence and reassigned from browser creator id to signed-in actor id during merge confirm. | Public UI can offer continue creating after merge through `/create?session=...`. Story-project promotion remains a later persistence step. |
| Subscription entitlement | Existing signed-in account membership is retained during merge and is never overwritten by browser profile data. | Public UI can show current plan and saved benefits. Provider callbacks, entitlement audit and reconciliation remain Studio/Ops only. |
| Local fallback | Still exists only as a labeled degraded mode when API calls are unavailable. | It cannot be marketed as durable account storage or cross-device recovery. |
| Backend-team bridge | Remains optional behind the product `/v1` contract. | No public frontend route should call backend-team internal routes directly. |
| Production database/privacy/security | Not complete in P22. | P23 must cover migration review, backup/restore, export/delete, account deletion, token/session revocation and security audit. |

## Product Contracts

### Merge preview

```http
POST /v1/account/merge/preview
Authorization: Bearer <token>
```

Request:

```json
{
  "guest_reader_id": "web_reader_demo",
  "guest_creator_id": "web_creator"
}
```

Public response:

```json
{
  "public_safe": true,
  "public_state": "ready_to_merge",
  "account": {
    "account_id": "signed_account",
    "reader_id": "signed_account",
    "creator_id": "signed_actor",
    "display_name": "Signed Reader",
    "auth_state": "signed_in"
  },
  "browser_profile": {
    "reader_id": "web_reader_demo",
    "creator_id": "web_creator",
    "merge_available": true
  },
  "summary": {
    "reader_progress_count": 1,
    "creator_draft_count": 1,
    "story_project_ref_count": 0,
    "membership_status": "active"
  },
  "merge_actions": [
    {"kind": "reader_progress", "label": "阅读进度", "count": 1},
    {"kind": "creator_drafts", "label": "创作草稿", "count": 1},
    {"kind": "membership", "label": "会员权益", "count": 1, "action": "keep_account_entitlements"}
  ],
  "conflicts": [],
  "recommended_action": "confirm_merge",
  "message": "发现当前浏览器里的阅读进度或创作草稿，可以合并到账号。"
}
```

If the user is not signed in, preview returns `public_state: requires_login`. Confirm is rejected.

### Merge confirm

```http
POST /v1/account/merge/confirm
Authorization: Bearer <token>
```

Request:

```json
{
  "guest_reader_id": "web_reader_demo",
  "guest_creator_id": "web_creator",
  "resolution": "keep_all_latest_first"
}
```

Confirm behavior:

- reader sessions with `reader_id = guest_reader_id` are reassigned to the signed-in `account_id`
- creator dialogue sessions with `creator_id = guest_creator_id` are reassigned to the signed-in `actor_id`
- existing signed-in account membership is retained
- conflicting reader progress is not overwritten; both sessions remain and account snapshot sorts recent progress by update time
- conflicting creator drafts are not overwritten; both drafts remain available in creation resume
- response includes the new account snapshot so `/settings` can immediately show resume state

## Implementation Evidence

Backend:

- `backend/src/narrativeos/services/account_merge.py`
  - adds `AccountMergeService.preview_merge`
  - adds `AccountMergeService.confirm_merge`
  - keeps response public-safe by default
  - reports product-level conflicts without raw storage records
- `backend/src/narrativeos/api/account.py`
  - adds `POST /v1/account/merge/preview`
  - adds `POST /v1/account/merge/confirm`
  - confirm requires a valid bearer token
- `backend/src/narrativeos/persistence/repositories.py`
  - adds `reassign_reader_sessions`
  - updates reader ownership without needing a new table
- `backend/src/narrativeos/services/creator_dialogue.py`
  - adds `reassign_sessions`
  - persists creator draft ownership changes in the existing JSON store
- `backend/src/narrativeos/api/app_factory.py`
  - wires `AccountMergeService` after `AccountSnapshotService`

Frontend:

- `app/src/main.tsx`
  - wraps the app with `AuthProvider`
- `app/src/api/account.ts`
  - adds `previewMerge`
  - adds `confirmMerge`
- `app/src/types/index.ts`
  - adds `AccountMergePreview`
  - adds `AccountMergeConfirmResponse`
- `app/src/pages/Account.tsx`
  - uses signed-in user identity when present
  - exposes login/register directly in the membership/account page
  - shows `发现本机档案`
  - lets the user `合并到账号`
  - refreshes the account snapshot after merge

Gates and packaging:

- `scripts/check-capability-alignment.mjs`
  - requires both account merge contracts
- `scripts/smoke-deployed-api.sh`
  - registers and logs in a smoke account
  - creates separate browser-profile reader and creator data
  - runs merge preview and confirm
  - checks active membership survives the merge
- OpenAPI artifacts include `/v1/account/merge/preview` and `/v1/account/merge/confirm`

## UX Boundary

Reader:

- sees login/register, merge preview, merge confirm and continue reading
- sees current browser profile only until signed in
- never sees storage owner fields or repair logs

Creator:

- sees continue creating after drafts are merged
- continues the same creator dialogue draft through the signed-in actor id
- does not choose system-level ownership rules manually

Account:

- owns membership and reading credits
- keeps entitlement state during merge
- becomes the recovery anchor after confirm

Studio/Ops:

- can later show audit, manual repair, privacy export/delete and account deletion state
- remains the place for diagnostics and security review

Public `/settings` may show:

- 登录后合并
- 创建账号
- 发现本机档案
- 合并到账号
- 继续阅读
- 继续创作
- 已登录保存
- 当前浏览器档案

Public `/settings` must not show:

- database table names
- raw conflict records
- provider callback ids
- storage repair logs
- webhook, replay or reconcile wording
- internal merge diagnostics

Studio/Ops can later add:

- merge audit trail
- device inventory
- manual repair queue
- privacy export/delete history
- account deletion review
- suspicious token/session review

## Verification Commands

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/backend
.venv/bin/python -m pytest tests/test_account_snapshot_api.py tests/test_account_merge_api.py -q
```

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/app
npm run lint -- --max-warnings=0
npm run build
```

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
node scripts/check-capability-alignment.mjs
node scripts/check-reader-creator-copy-boundary.mjs
node scripts/check-design-system-boundary.mjs
node scripts/check-backend-compatibility-bridge.mjs
./scripts/smoke-deployed-api.sh http://127.0.0.1:8000
```

## Latest Verification Evidence

Current checked evidence:

- targeted backend tests: `6 passed, 3 warnings`
- `npm run lint -- --max-warnings=0` passed
- `npm run build` passed
- `node scripts/check-capability-alignment.mjs` passed with `33 frontend API calls`, `208 OpenAPI paths`, `18 required product contracts`
- `node scripts/check-reader-creator-copy-boundary.mjs` passed
- `node scripts/check-design-system-boundary.mjs` passed
- `node scripts/check-backend-compatibility-bridge.mjs` passed
- local API smoke passed against `http://127.0.0.1:8013`
  - `merge_public_state: merged`
  - `merge_reader_progress: 1`
  - `merge_creator_drafts: 1`
- browser QA passed against `http://127.0.0.1:5176`
  - registered a signed-in account
  - showed `发现本机档案`
  - confirmed `合并到账号`
  - resumed `/story`
  - resumed `/create?session=...`
  - verified public route text did not leak internal terms
- browser QA screenshots:
  - `artifacts/visual-qa/p22-account-merge-mqckmqhw/01-settings-merge-preview.png`
  - `artifacts/visual-qa/p22-account-merge-mqckmqhw/02-settings-merged.png`
  - `artifacts/visual-qa/p22-account-merge-mqckmqhw/03-story-resume.png`
  - `artifacts/visual-qa/p22-account-merge-mqckmqhw/04-create-draft-resume.png`

Remaining production risks before P23 production acceptance:

- production database migration review
- privacy export/delete and account deletion design
- security audit of token handling and merge ownership checks

## P23 Readiness

P23 should start only after P22 smoke and browser QA pass. This condition is now met for the local integration environment. P23 should treat the remaining items above as production-readiness work, not as public UX blockers.

Recommended P23 scope:

- production database migration and backup/restore acceptance
- account privacy export/delete
- story-project draft promotion from creator dialogue
- signed-in reader resume on deployed preview
- account deletion and token/session revocation audit
