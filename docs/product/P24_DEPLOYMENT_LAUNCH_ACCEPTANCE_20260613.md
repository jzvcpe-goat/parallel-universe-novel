# P24 Deployment Launch Acceptance and Release Handoff

Date: 2026-06-13

## Objective

P24 moves the current product line from local feature acceptance to launch-readiness acceptance:

- the only product frontend remains `app` (Vite + React + TypeScript)
- backend-team frontends and old concept exports remain reference-only
- public routes consume the backend only through `/v1`
- deployment evidence must cover reading, creation, account, membership, market trends, account export/delete and rollback boundaries
- production blockers must be explicit instead of hidden behind a demo preview

## Launch Boundary

Current launch candidate source:

- Frontend: `app`
- Backend: `backend/src/narrativeos`
- Contract: `backend/openapi.json`, `backend/specs/openapi.yaml`, `app/src/types/generated-openapi.d.ts`
- Acceptance script: `scripts/check-launch-readiness.sh`
- Frontend package script: `scripts/package-vercel-preview.sh`
- Backend package script: `scripts/package-vercel-backend-api.sh`

P24 does not merge any external frontend. Any future frontend package must pass separate approval before replacing or entering the current app line.

## Route Acceptance Matrix

| Surface | Route / API | P24 acceptance |
| --- | --- | --- |
| Home / discovery | `/` | Guide page, topic index, start-reading CTA, no reading article embedded as homepage. |
| Library | `/library` | Topic index, searchable/browsable works, `用这个方向创作` from work cards. |
| Reader | `/story` | Chapter manuscript, page controls, choice point, branch state and account entitlement read. |
| Creator | `/create` | Natural-language writing entry, `把第一幕说出来`, story context notes and current topic direction. |
| Account / membership | `/settings` | Login, account snapshot, membership, data export and account deletion entry. |
| Studio/Ops | `/studio` | Backstage workbench only; it may show operational details, but public routes may not. |
| Backend health | `GET /health` | API available before frontend/API pair is accepted. |
| OpenAPI | `/v1` contract artifacts | Frontend calls and OpenAPI paths must align. |
| Market trend refresh | `/v1/market/trends`, `/v1/market/trends/scan`, cron routes | Weekly/monthly scan path smoke passes; public pages stay source-neutral. |
| Account data governance | `/v1/account/data/export`, `/v1/account/delete/*` | Signed-in user can export data, preview deletion, confirm deletion and revoke sessions. |
| Payment hardening | checkout status/return/provider callback | Public UI does not call provider callback directly; real provider launch still requires external credentials and dispute/refund acceptance. |

## Acceptance Script

Run:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/check-launch-readiness.sh http://127.0.0.1:8015
```

The script performs:

- `npm --prefix app run check:alignment`
- `npm --prefix app run check:backend-bridge`
- `npm --prefix app run check:copy-boundary`
- `npm --prefix app run check:design-system`
- `npm --prefix app run lint -- --max-warnings=0`
- `npm --prefix app run build`
- `npm --prefix app audit --audit-level=moderate`
- targeted backend tests for runtime, CORS, account snapshot, account merge, account data, payment hardening, market trends and creator dialogue
- `./scripts/harness-check-contract.sh`
- optional `./scripts/smoke-deployed-api.sh <api-origin>`

Latest manifest:

```text
/Users/james/Documents/PUF/workspaces/integration-harness/artifacts/integration/launch-readiness-20260613T202710Z.json
```

Latest local result:

- frontend gates passed
- `npm audit --audit-level=moderate` found `0 vulnerabilities`
- backend targeted gates passed: `37 passed, 2 warnings`
- OpenAPI contract passed
- local API smoke passed against `http://127.0.0.1:8015`

Smoke evidence:

```json
{
  "api_origin": "http://127.0.0.1:8015",
  "world_count": 12,
  "trend_count": 6,
  "weekly_scan_trends": 6,
  "monthly_scan_trends": 6,
  "subscription_tiers": 3,
  "checkout_status": "completed",
  "account_snapshot_resume": "continue_reading",
  "merge_public_state": "merged",
  "data_export_state": "ready",
  "delete_preview_state": "requires_confirmation",
  "delete_confirm_state": "deleted",
  "delete_sessions_revoked": 1,
  "creator_turn_count": 4
}
```

## Deployment Packages

Frontend package generated:

```text
/Users/james/Documents/PUF/workspaces/integration-harness/artifacts/deploy/parallel-universe-vercel-preview-20260613T201820Z.tgz
/Users/james/Documents/PUF/workspaces/integration-harness/artifacts/deploy/parallel-universe-static-preview-20260613T201820Z.tgz
/Users/james/Documents/PUF/workspaces/integration-harness/artifacts/deploy/parallel-universe-vercel-preview-20260613T201820Z.json
```

Backend package generated:

```text
/Users/james/Documents/PUF/workspaces/integration-harness/artifacts/deploy/parallel-universe-vercel-backend-api-20260613T201820Z.tgz
/Users/james/Documents/PUF/workspaces/integration-harness/artifacts/deploy/parallel-universe-vercel-backend-api-20260613T201820Z
/Users/james/Documents/PUF/workspaces/integration-harness/artifacts/deploy/parallel-universe-vercel-backend-api-20260613T201820Z.json
```

The packages are deployable preview artifacts, not production promotion approval.

## Browser QA

Local QA target:

```text
Frontend: http://127.0.0.1:5178
API: http://127.0.0.1:8015/v1
```

Browser QA covered:

- `/`
- `/library`
- `/story`
- `/create`
- `/settings`
- `/studio`

Signed-in account QA:

- registered and logged in as `p24-mqcsx6m1@example.test`
- confirmed `/settings` shows account data area after login
- confirmed `导出我的数据` is enabled after login
- confirmed `删除账号` is enabled after login
- confirmed public routes do not show forbidden internal terms: `后端`, `PRD`, `system prompt`, `系统提示词`, `起点`, `番茄`, `绑定`, `provider`, `webhook`, `OpenAPI`, `数据库迁移`, `token`
- confirmed no console errors

Artifacts:

```text
/Users/james/Documents/PUF/workspaces/integration-harness/artifacts/visual-qa/p24-launch-routes-mqcszrli/
```

## Production Blockers

P24 allows release handoff and preview packaging. It does not authorize public paid production traffic until these are resolved:

1. Persistent production database is selected, migrated, backed up and restore-drilled.
2. Production custom domains and CORS/cookie security are configured and verified.
3. Real payment provider credentials, callback signatures, refunds, cancellations and disputes are accepted end to end.
4. Privacy/legal review accepts account data export, account deletion and retention policy.
5. Security audit covers auth tokens, account deletion, payment callbacks, CORS, secrets and operational logs.
6. Rollback drill confirms both frontend alias rollback and backend data restore.
7. Workspace source control or release artifact signing is clarified, because `integration-harness` is not currently a Git repository root.

## Release Decision

Status: release handoff ready, production launch not yet approved.

The current frontend/backend pair is coherent enough for deployment-team preview execution and release-candidate review. It should not be marketed as a production paid service until the production blockers above are cleared.

## Next Goal

Recommended P25:

`Production deployment execution and rollback rehearsal`

Done when a real preview/staging URL pair is deployed from the P24 packages, smoke and browser QA pass against that URL pair, rollback commands are rehearsed, and production blockers are either resolved or explicitly signed off by the owner.
