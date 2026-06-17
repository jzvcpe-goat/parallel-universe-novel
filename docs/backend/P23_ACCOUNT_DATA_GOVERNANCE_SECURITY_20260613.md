# P23 Account Data Governance and Security Readiness

Date: 2026-06-13

Owner surface: `/settings`, `/v1/auth/logout`, `/v1/account/data/export`, `/v1/account/delete/preview`, `/v1/account/delete/confirm`, Studio/Ops account audit

## Goal

P23 turns the signed-in account loop from P22 into a minimum data-governance surface:

- signed-in users can export their own account data
- signed-in users can preview account deletion impact before confirming
- account deletion requires explicit confirmation
- account deletion removes reader progress and creator dialogue drafts for the signed-in account
- account deletion revokes auth sessions
- active subscriptions are marked for account closure instead of being silently erased
- public `/settings` shows only account data, export, delete, logout and save state
- token hashes, password hashes, migration status, provider payloads, refund/dispute handling and repair logs stay out of public routes

P23 does not claim full legal/compliance launch readiness. Production database migrations, backup/restore drills, privacy/legal review, real payment refund and dispute handling, account recovery flows and security audit remain launch blockers before a public paid production release.

## Capability Audit

| Capability | Current status | Product boundary |
| --- | --- | --- |
| Auth ownership | Bearer token identity resolves `actor_id`, `account_id`, current token id and display name. | Public pages may show signed-in save state and logout. They must not expose token ids or token hashes. |
| Data export | `GET /v1/account/data/export` returns a public-safe JSON package for the current signed-in account. | The package includes reader progress, creator drafts, subscription summaries and session summaries. It excludes password hashes, token hashes and raw provider payloads. |
| Delete preview | `POST /v1/account/delete/preview` returns counts and consequences. | Public UI can show affected reading, drafts, membership and login state. It must not show database row names or repair logs. |
| Delete confirm | `POST /v1/account/delete/confirm` requires confirmation text `删除账号` or `DELETE`. | Confirm deletes reader progress and creator drafts, marks subscriptions for account closure, revokes sessions and closes the auth identity. |
| Subscription handling | Active subscriptions are not hard-deleted; they are marked `account_closure_pending`. | Public UI explains that membership records remain as billing records. Refunds, disputes and provider cancellation remain payment/Ops work. |
| Session/token revocation | Existing `/v1/auth/logout` revokes the current token; delete confirm revokes all tokens for the account identity. | Public UI only says current login is exited. Studio/Ops can later inspect revocation audit. |
| Production database/security | Not complete in P23. | P24 must cover deployed database migration, backup/restore, account recovery, security audit and legal/compliance acceptance. |

## Product Contracts

### Account data export

```http
GET /v1/account/data/export
Authorization: Bearer <token>
```

Public response:

```json
{
  "public_safe": true,
  "public_state": "ready",
  "filename": "parallel-universe-account-export.json",
  "content_type": "application/json",
  "summary": {
    "reader_session_count": 1,
    "creator_draft_count": 1,
    "subscription_count": 1,
    "active_session_count": 1
  },
  "package": {
    "account": {},
    "reader_sessions": [],
    "creator_drafts": [],
    "subscriptions": [],
    "sessions": [],
    "retention_policy": {}
  },
  "message": "你的账号数据已经整理好，可以保存为 JSON 文件。"
}
```

### Account deletion preview

```http
POST /v1/account/delete/preview
Authorization: Bearer <token>
```

Public response:

```json
{
  "public_safe": true,
  "public_state": "requires_confirmation",
  "summary": {
    "reader_session_count": 1,
    "creator_draft_count": 1,
    "active_subscription_count": 1,
    "active_session_count": 1
  },
  "confirmation_required": "删除账号",
  "message": "删除账号会清除阅读进度和创作草稿，并退出当前登录。会员记录会保留为账务记录。"
}
```

### Account deletion confirm

```http
POST /v1/account/delete/confirm
Authorization: Bearer <token>
```

Request:

```json
{
  "confirmation": "删除账号"
}
```

Confirm behavior:

- deletes reader sessions, chapter rows and choice rows for the signed-in account id
- deletes creator dialogue sessions for the signed-in actor id
- marks subscriptions as `account_closure_pending`
- revokes auth tokens for the signed-in actor/account
- marks the auth identity as `deleted`
- leaves billing records available for future refund, dispute and compliance handling

## Implementation Evidence

Backend:

- `backend/src/narrativeos/services/account_data.py`
  - adds `AccountDataService.export_account_data`
  - adds `AccountDataService.preview_account_deletion`
  - adds `AccountDataService.confirm_account_deletion`
  - keeps password and token secrets out of public export
- `backend/src/narrativeos/api/account.py`
  - adds `GET /v1/account/data/export`
  - adds `POST /v1/account/delete/preview`
  - adds `POST /v1/account/delete/confirm`
- `backend/src/narrativeos/persistence/repositories.py`
  - adds `list_reader_sessions`
  - adds `delete_reader_sessions`
  - adds `list_auth_tokens`
  - adds `revoke_auth_tokens`
  - adds `update_auth_identity_status`
  - adds `mark_account_subscriptions_for_closure`
- `backend/src/narrativeos/services/creator_dialogue.py`
  - adds `delete_sessions`

Frontend:

- `app/src/api/account.ts`
  - adds `accountApi.exportData`
  - adds `accountApi.previewDelete`
  - adds `accountApi.confirmDelete`
- `app/src/context/AuthContext.tsx`
  - adds `clearLocalSession`
- `app/src/pages/Account.tsx`
  - shows `账号与数据`
  - lets signed-in users `导出我的数据`
  - lets signed-in users preview `删除账号`
  - requires confirmation text before deletion
  - shows `账号已删除`

Contracts and gates:

- OpenAPI artifacts include `/v1/account/data/export`, `/v1/account/delete/preview` and `/v1/account/delete/confirm`
- `scripts/check-capability-alignment.mjs` includes the three P23 contracts
- `app/src/features/parallel-universe/data.ts` lists the P23 account data product surface
- `scripts/smoke-deployed-api.sh` exercises account data export and delete confirm on an isolated smoke account

## UX Boundary

Reader / account page:

- 导出我的数据
- 删除账号
- 输入“删除账号”确认
- 账号已删除
- 退出登录

Not shown publicly:

- token id
- token hash
- password hash
- database table names
- migration status
- provider payload
- refund or dispute workflow
- repair or reconciliation log

Studio/Ops may later show:

- account deletion audit
- device/session inventory
- privacy export history
- billing refund/dispute state
- backup/restore status
- security review evidence

## Test Commands

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/backend
.venv/bin/python -m pytest tests/test_account_snapshot_api.py tests/test_account_merge_api.py tests/test_account_data_api.py -q
```

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/app
npm run lint -- --max-warnings=0
npm run build
```

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/harness-check-contract.sh
node scripts/check-capability-alignment.mjs
node scripts/check-reader-creator-copy-boundary.mjs
node scripts/check-design-system-boundary.mjs
node scripts/check-backend-compatibility-bridge.mjs
./scripts/smoke-deployed-api.sh http://127.0.0.1:8000
```

## Latest Verification Evidence

Current checked evidence:

- targeted backend account tests: `9 passed, 3 warnings`
- `npm run lint -- --max-warnings=0` passed
- `npm run build` passed
- `./scripts/harness-check-contract.sh` passed with `36 frontend API calls`, `211 OpenAPI paths`, `21 required product contracts`
- `node scripts/check-capability-alignment.mjs` passed
- `node scripts/check-reader-creator-copy-boundary.mjs` passed
- `node scripts/check-design-system-boundary.mjs` passed
- `node scripts/check-backend-compatibility-bridge.mjs` passed
- local API smoke passed against `http://127.0.0.1:8014`
  - `data_export_state: ready`
  - `delete_preview_state: requires_confirmation`
  - `delete_confirm_state: deleted`
  - `delete_sessions_revoked: 1`
- browser QA passed against `http://127.0.0.1:5177`
  - registered a signed-in account
  - exported account data
  - verified exported JSON does not include password or token secret fields
  - opened delete preview
  - cancelled delete
  - confirmed delete with `删除账号`
  - verified deleted account can no longer log in
  - verified public route text did not leak internal terms
- browser QA screenshots and exported JSON:
  - `artifacts/visual-qa/p23-account-data-mqcsf5sh/01-settings-account-data-ready.png`
  - `artifacts/visual-qa/p23-account-data-mqcsf5sh/02-data-exported.png`
  - `artifacts/visual-qa/p23-account-data-mqcsf5sh/03-delete-preview.png`
  - `artifacts/visual-qa/p23-account-data-mqcsf5sh/04-delete-cancelled.png`
  - `artifacts/visual-qa/p23-account-data-mqcsf5sh/05-account-deleted.png`
  - `artifacts/visual-qa/p23-account-data-mqcsf5sh/parallel-universe-account-export.json`

Remaining production risks before P24 deployment acceptance:

- production database migration review
- backup/restore drill
- privacy/legal review
- payment refund/dispute and provider cancellation plan
- security audit of ownership, token revocation and account deletion paths

## P24 Readiness

P24 should start only after P23 smoke and browser QA pass. This condition is now met for the local integration environment. P24 should treat the remaining items above as deployed production-readiness work, not as public UX blockers.

Recommended P24 scope:

- deployed API and frontend preview for signed-in account governance
- production database migration and backup/restore acceptance
- account recovery and email verification
- payment refund/dispute/cancellation integration
- security audit and privacy/legal acceptance
