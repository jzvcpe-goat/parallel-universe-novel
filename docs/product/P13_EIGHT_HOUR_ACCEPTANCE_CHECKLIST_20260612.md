# P13 Eight-Hour Acceptance Checklist - 2026-06-12

## Acceptance Scope

This checklist is for the next manual acceptance window. It proves the current product direction, frontend ownership, backend boundary and deploy surface are ready for review.

Current product frontend:

`/Users/james/Documents/PUF/workspaces/integration-harness/app`

Backend-team package status:

- Reviewed in P12.
- Kept isolated under `artifacts/backend-team-inspection/`.
- `apps/web` Next.js frontend is not approved for merge.
- Backend value enters through current `/v1` product contract and compatibility bridge only.

## Links

Stable frontend:

`https://parallel-universe-novel-p0.vercel.app`

Latest known frontend deployment:

`https://app-s8n8lyt0d-james-projects-97742675.vercel.app`

Deployment id:

`dpl_8UVCv9Mb67ouGbue11ErkVF7Htoq`

Stable API:

`https://pun-api-p0.vercel.app`

Local preview currently available:

`http://127.0.0.1:4173`

## Page Acceptance Matrix

| Route | User role | What to verify | Pass condition |
| --- | --- | --- | --- |
| `/` | Reader / new visitor | Commercial guide page, hot-topic index, featured work, start-reading CTA | Homepage is not a reader page; no manuscript article appears; topic clicks go to `/library?topic=...`. |
| `/library` | Reader | Topic filters, ranked works, read/create split | URL topic state activates filter; work card opens `/story`; create direction opens `/create?template=...`. |
| `/story` | Reader | Reading layout, pagination, choice, branch feedback, membership state | Three-column desktop alignment, mobile drawer controls, at least one readable page, choice updates branch/impact, no internal copy. |
| `/create` | Creator | Natural-language Socratic creation | First action is a story seed textarea; assistant writes opening first, asks at most two questions, story notes/creative context appear as support. |
| `/settings` | Reader / subscriber | Membership center, checkout request and account recovery | Shows plan state, credits and 3 plan cards; checkout request checks status through the public return/status flow; login can preview and confirm current browser profile merge. |
| `/studio` | Creator ops / internal | Internal trend refresh, capability map, release gate references | Clearly backstage; not in public nav; can show engineering terms because it is internal. |

## Current Implemented Capabilities

1. Hot-topic index
   - Public pages use productized topic names only.
   - `/`, `/library` and `/create` share `marketApi.getTrends('weekly')` with fallback.
   - Studio can trigger weekly/monthly refresh through the current `/v1/market/trends/scan` contract.

2. Library filtering
   - Homepage topic entries navigate into `/library?topic=...`.
   - Library reads URL topic as active filter.
   - Ranked list is a shared design-system pattern.

3. Reader choice loop
   - `/story` uses current reader session and scene advance contracts.
   - Choice can update personal branch, impact feedback and saved progress.
   - Reader page is visually separate from homepage and library.

4. Creator dialogue
   - `/create` is natural-language first, not a settings form.
   - Uses current creator dialogue contract.
   - Local fallback still follows the novel-starter prompt principles without exposing raw prompt text.

5. Membership and checkout request
   - `/settings` calls subscription and checkout-start contracts.
   - Public UI shows product benefits, not provider internals.

6. Studio operations
   - Trend scan and capability mapping live in Studio only.
   - Internal details stay out of public routes.

7. Backend compatibility bridge
   - Current backend can optionally bridge selected backend-team routes into the `/v1` product contract.
   - Current checks guard `BackendTeamBridge`, `/v1` routes, market scans, smoke coverage and the P12 backend review.

## Not Yet Implemented / Phase-Two Items

1. Real external hot-topic scanning sources
   - Current trend scan returns a curated deterministic snapshot.
   - Need backend jobs and source adapters before it becomes live market intelligence.

2. Creator dialogue to story-project persistence
   - Current creator dialogue can produce story text and notes.
   - Product still needs the moment where a dialogue becomes a persisted story project.

3. Reader session and backend-team story-project ID unification
   - Current reader session IDs and backend-team story project IDs are separate concepts.
   - Bridge should not force this until product semantics are decided.

4. Full narrative quality evaluation
   - Current bridge maps content safety into quality gate shape.
   - Full evaluation should compose safety, editorial style, continuity, character consistency and release readiness.

5. Cross-device account sync
   - Browser save and signed-in merge preview/confirm exist.
   - Multi-device account recovery still needs production database migration, privacy export/delete, account deletion and security audit.

6. Real payment callback and customer portal
   - Checkout-start exists.
   - Payment completion reconciliation, webhook productization and customer portal are not accepted as done.

## Verification Evidence

Commands run from `/Users/james/Documents/PUF/workspaces/integration-harness/app`:

```bash
npm run lint -- --max-warnings=0
npm run build
npm run check:alignment
npm run check:backend-bridge
npm run check:copy-boundary
npm run check:design-system
```

Result:

```text
lint: pass
build: pass
alignment: pass, 28 frontend API calls, 114 OpenAPI paths, 6 routes, 13 required product contracts
backend-bridge: pass
copy-boundary: pass, 7 target groups
design-system: pass
```

Full verifier:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/verify-parallel-universe-prototype.sh
```

Result:

```text
PASS
backend narrow API tests: 32 passed, 2 warnings
local route smoke: /, /story, /story?world=unknown-world, /library, /create, /settings, /studio all 200
```

Deployed API smoke:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/smoke-deployed-api.sh https://pun-api-p0.vercel.app
```

Result:

```json
{
  "api_origin": "https://pun-api-p0.vercel.app",
  "world_count": 12,
  "trend_count": 6,
  "weekly_scan_trends": 6,
  "monthly_scan_trends": 6,
  "reader_choice_events": 2,
  "subscription_tiers": 3,
  "checkout_tier": "play_pass",
  "creator_turn_count": 4
}
```

Visual QA reference:

`artifacts/visual-qa/p8-handoff-20260612T224737Z/qa-screenshot-manifest.json`

This manifest covers desktop `/`, `/library`, `/story`, `/create`, `/settings`, `/studio`, and mobile `/`, `/story`, `/create`, `/settings`. All recorded captures report no horizontal overflow.

Latest P14 acceptance refresh:

`artifacts/visual-qa/p14-acceptance-20260613T034218Z/qa-screenshot-manifest.json`

P14 evidence covers the same acceptance set: desktop `/`, `/library`, `/story`, `/create`, `/settings`, `/studio`, and mobile `/`, `/story`, `/create`, `/settings`.

P14 manifest status:

```text
pass
issue_count: 0
overflowX: false on all captured routes
public forbidden term hits: 0
homepage manuscript residue: false
create textarea and start action: visible in first viewport on desktop and mobile
```

Latest P15 persistence design:

`docs/backend/P15_CREATOR_DIALOGUE_PROJECT_PERSISTENCE_DESIGN_20260612.md`

P15 keeps `/create` as a natural-language creator dialogue and defines the backend bridge that turns a dialogue session into a saved story project only after story text exists. It maps the current creator session into backend-team story-project fields, defines idempotency, errors and tests, and keeps backend-team `/story-projects` behind the product `/v1` contract.

Latest P16 market trend scanner integration:

`docs/backend/P16_MARKET_TREND_SCANNER_BACKEND_INTEGRATION_20260612.md`

P16 turns `scan_market_trends` into a source-adapter backend boundary. Public pages still consume only productized topic labels, trend rows and template recommendations; Studio/Ops can inspect source health, scan audit and template impact. The current implementation keeps the curated fallback but now has adapter aggregation, failure degradation and ops audit.

Latest P17 full narrative quality gate composition:

`docs/backend/P17_FULL_NARRATIVE_QUALITY_GATE_COMPOSITION_20260613.md`

P17 composes content safety, language naturalness, pacing, character consistency, foreshadowing continuity, timeline consistency and release readiness into one `QualityGateResult`. The contract preserves old pass/block fields and adds scores, blockers, warnings, suggested fixes, public-safe message, Studio debug, release decision and canon commit readiness. Reader pages must only consume the public-safe message; creator pages can show summary and next actions; Studio/Ops can inspect the full gate. Learned evaluator and reranker remain shadow-only until promotion workflows are green.

Latest P18 payment completion and account sync:

`docs/backend/P18_PAYMENT_COMPLETION_ACCOUNT_SYNC_20260613.md`

P18 connects the public membership flow to checkout start, preview completion and subscription refresh while keeping production payment completion server-driven. It defines account sync across membership entitlement, reader progress, creator dialogue drafts and future author project drafts. Public account UI can show plan cards, benefit balances, request state and completion/refresh actions; Studio/Ops remains the only place for provider events, reconciliation, retry diagnostics and entitlement audit.

P18 final acceptance evidence:

- Targeted backend billing tests passed.
- TypeScript, build, lint, backend-bridge, design-system, copy-boundary and alignment checks passed.
- Local API smoke passed against `http://127.0.0.1:8000` with `checkout_status: completed`.
- Browser QA on `/settings?qa=p18-payment-sync-live` passed when Vite was started with `VITE_API_ORIGIN=http://127.0.0.1:8000`: plan cards render, `开通这个方案` creates a request, `完成开通` activates the membership, credits refresh to 30 and internal provider/webhook wording stays out of public UI.
- Acceptance warning: starting Vite without an explicit API origin makes public routes call the Vite origin for `/v1`, which creates a false 404 on membership APIs.

Latest P19 production deployment smoke and release candidate freeze:

`docs/product/P19_PRODUCTION_DEPLOYMENT_SMOKE_RC_FREEZE_20260613.md`

P19 creates a release-candidate preview pair:

- Frontend RC: `https://app-i7x25dxxi-james-projects-97742675.vercel.app`
- API RC: `https://pun-api-p19.vercel.app`
- RC manifest: `artifacts/deploy/parallel-universe-p19-rc-20260613T140145Z.json`

P19 final acceptance evidence:

- API package regenerated and deployed with preview-domain CORS regex.
- Frontend preview deployed with `VITE_API_ORIGIN=https://pun-api-p19.vercel.app`.
- RC gate passed: backend target tests, TypeScript, build, lint, audit, backend-bridge, design-system, copy-boundary, alignment and API smoke.
- Deployed browser QA on `/settings?qa=p19-rc-preview` passed: plan cards render, `开通这个方案` creates a request, `完成开通` activates membership, credits refresh to 30 and no forbidden public terms appear.
- Previous stable frontend `https://parallel-universe-novel-p0.vercel.app` remains rollback only; it is not the P19 RC because it lacks the P18 completion action.

Latest P22 production account merge and persistent account storage hardening:

`docs/backend/P22_PRODUCTION_ACCOUNT_MERGE_PERSISTENCE_20260613.md`

P22 connects signed-in identity to current browser profile recovery. `/settings` now supports login/register, merge preview and merge confirmation. The backend can move reader sessions from browser reader id to signed-in account id, and creator dialogue drafts from browser creator id to signed-in actor id. Payment membership remains attached to the signed-in account.

P22 current evidence:

- targeted backend account tests passed: `6 passed, 3 warnings`
- frontend lint passed
- frontend build passed
- capability alignment passed with `33 frontend API calls`, `208 OpenAPI paths`, `18 required product contracts`
- copy-boundary passed
- design-system boundary passed
- backend compatibility bridge passed
- local API smoke passed against `http://127.0.0.1:8013`
  - auth register/login
  - browser profile reader progress and creator draft creation
  - merge preview
  - merge confirm
  - signed-in account snapshot after merge
- browser QA passed against `http://127.0.0.1:5176`
  - `/settings` signed-in merge
  - `/story` resume after merge
  - `/create?session=...` draft resume after merge
  - public route text boundary check
- browser QA screenshots: `artifacts/visual-qa/p22-account-merge-mqckmqhw/`

P22 remaining production risks now move into P23:

- production database, privacy and security review

Latest P23 account data governance and security readiness:

`docs/backend/P23_ACCOUNT_DATA_GOVERNANCE_SECURITY_20260613.md`

P23 connects signed-in accounts to user-facing data governance. `/settings` now exposes signed-in account data export and account deletion preview/confirm. The backend exports only the current account's reader progress, creator drafts, subscription summaries and session summaries; it does not export password hashes, token hashes or raw provider payloads. Account deletion removes reader progress and creator drafts, marks subscriptions for account closure and revokes login sessions.

P23 current evidence:

- targeted backend account tests passed: `9 passed, 3 warnings`
- frontend lint passed
- frontend build passed
- contract alignment passed with `36 frontend API calls`, `211 OpenAPI paths`, `21 required product contracts`
- capability alignment passed
- copy-boundary passed
- design-system boundary passed
- backend compatibility bridge passed
- local API smoke passed against `http://127.0.0.1:8014`
  - data export returned `ready`
  - delete preview returned `requires_confirmation`
  - delete confirm returned `deleted`
  - login sessions were revoked
- browser QA passed against `http://127.0.0.1:5177`
  - signed-in account data export
  - downloaded export JSON
  - delete preview
  - cancel delete
  - confirm delete
  - deleted account login rejected
  - public text boundary checked
- browser QA screenshots and export JSON: `artifacts/visual-qa/p23-account-data-mqcsf5sh/`

P23 remaining production risks now move into P24:

- production database migration, backup/restore, privacy/legal review and security audit
- payment refund, dispute and provider cancellation plan

## Public Copy Boundary

Public routes under acceptance:

- `/`
- `/library`
- `/story`
- `/create`
- `/settings`

These routes must not expose backend, PRD, API, raw prompt, source-platform, binding, provider or internal algorithm wording.

Studio and backend docs may contain implementation details.

## Backend-Team Handoff Boundary

Do:

- Deploy backend-team FastAPI as optional upstream service.
- Keep current `/v1` product contract as the frontend-facing contract.
- Extend `BackendTeamBridge` only after contract tests are added.
- Use backend-team agents, migrations, tests and worker scripts as backend references.

Do not:

- Merge `artifacts/backend-team-inspection/.../apps/web` into `app/src`.
- Deploy backend-team root `vercel.json` as the product frontend.
- Replace current creator dialogue with character chat.
- Replace current public copy with implementation explanations.

## Eight-Hour Manual Acceptance Steps

1. Open the P19 RC frontend: `https://app-i7x25dxxi-james-projects-97742675.vercel.app`.
2. Confirm homepage is a guide/discovery page, not a reading article.
3. Click one topic and confirm `/library?topic=...` activates the same topic.
4. Open one work into `/story`; page through the manuscript and make one choice.
5. Open `/create`; enter one story seed and confirm the assistant writes an opening before asking follow-up questions.
6. Open `/settings`; start one checkout request and confirm `检查开通状态` refreshes benefits to an active membership state.
   - For P21 or later local QA, start the frontend with `VITE_API_ORIGIN=http://127.0.0.1:8000` and confirm the page uses checkout status/return rather than a public webhook call.
7. Open `/studio` directly; confirm it is backstage and not exposed in public navigation.
8. Run `./scripts/smoke-deployed-api.sh https://pun-api-p19.vercel.app` if the API host changes before acceptance.

## Next Five Goal Queue

P14: Browser acceptance refresh and microcopy freeze.

- Re-open stable frontend in browser.
- Capture current desktop/mobile evidence for the six acceptance routes.
- Fix only blockers found during route-level acceptance, not broad redesign.

P15: Creator dialogue to story-project persistence design. Done when `docs/backend/P15_CREATOR_DIALOGUE_PROJECT_PERSISTENCE_DESIGN_20260612.md` and handoff updates pass checks.

- Define when a natural-language creator session becomes a saved work.
- Map creator notes, opening text, characters, setting and tone into backend story-project fields.
- Add contract tests before UI changes.

P16: Market trend scanner backend integration.

Done when `docs/backend/P16_MARKET_TREND_SCANNER_BACKEND_INTEGRATION_20260612.md`, adapter boundary, ops audit and tests pass checks.

- Implement real weekly/monthly source adapter boundary behind `scan_market_trends`.
- Keep public pages source-neutral.
- Persist ranked topic weights and template recommendations.

P17: Full narrative quality gate composition.

- Combine content safety, editorial style, continuity, character consistency and release readiness into one `/v1/quality/evaluate` result.
- Keep reader UI smooth; expose detailed gates only in Studio.
- Done when `docs/backend/P17_FULL_NARRATIVE_QUALITY_GATE_COMPOSITION_20260613.md`, shared `quality_gate.py`, runtime/bridge tests and copy/design/backend checks pass.

P18: Payment completion and account sync.

- Add payment completion reconciliation and customer portal.
- Add cross-device account sync for reader progress and creator drafts.
- Keep local browser save as fallback.
- Done: `docs/backend/P18_PAYMENT_COMPLETION_ACCOUNT_SYNC_20260613.md`, account checkout completion UI, existing billing lifecycle tests, browser QA, API smoke and boundary checks passed.

P19: Production deployment smoke and release candidate freeze.

- Freeze the frontend/API preview pair and RC scope.
- Verify deployed API smoke and deployed browser membership completion.
- Keep old P0 links as rollback until product-owner acceptance.
- Done: `docs/product/P19_PRODUCTION_DEPLOYMENT_SMOKE_RC_FREEZE_20260613.md`, RC manifest, frontend/API preview URLs, remote API smoke, deployed browser QA, CORS regex tests and local RC gates passed.

P20: Production auth and cross-device account snapshot.

- Connect login/account identity, reader progress, creator dialogue drafts, membership entitlement and local fallback merge into one durable account snapshot.
- Do not add new public routes until account snapshot contract is proven.
- Done: `docs/backend/P20_PRODUCTION_AUTH_ACCOUNT_SNAPSHOT_20260613.md`, `GET /v1/account/snapshot`, account snapshot service, `/settings` reading/draft/recovery cards, OpenAPI alignment, targeted backend tests and public copy boundary checks.
- Remaining production warning: guest browser recovery is not full cross-device sync. Durable login, persistent database, creator project persistence and explicit merge UX remain required before production launch claims.

P21: Production payment provider hardening.

- Replace preview completion with provider return-page polling, server callback verification and Ops reconciliation.
- Keep `/settings` user-facing; provider events, retries and disputes stay Studio/Ops only.
- Done: `docs/backend/P21_PRODUCTION_PAYMENT_PROVIDER_HARDENING_20260613.md`, public checkout status/return contracts, callback HMAC verification, public settings API no longer calls webhook, targeted tests and contract/design/backend gates.
- Remaining production warning: real provider credentials, merchant configuration, refunds/disputes and compliance review remain required before launch.

P22: Production auth merge and persistent account storage hardening.

- Make the P20 account snapshot durable behind real login and persistent database storage.
- Add browser-profile merge confirmation UX and conflict resolution.
- Connect creator dialogue sessions into saved story-project drafts.
- Done when cross-device recovery can be claimed without guest-profile caveats.

P23: Account data governance and security readiness.

- Add signed-in account data export, deletion preview, deletion confirmation and session revocation.
- Keep public `/settings` user-facing; audit logs, migration state, provider payloads and repair actions stay Studio/Ops or backend docs.
- Done when local smoke and browser QA prove export/delete works and no credential material appears in public responses.
- Remaining production warning: database migration, backup/restore, privacy/legal, refund/dispute/cancellation and security audit remain required before P24 deployment acceptance.

P24: Deployment launch acceptance and release handoff.

- Keep the current Vite + React + TypeScript app as the only product frontend.
- Verify launch readiness through `scripts/check-launch-readiness.sh`, not through a single preview page.
- Include `/settings` in frontend package route coverage and browser QA because account, payment, merge, export and delete now live there.
- Generate frontend and backend deployable preview packages without promoting them to production.
- Done: `docs/product/P24_DEPLOYMENT_LAUNCH_ACCEPTANCE_20260613.md`, `scripts/check-launch-readiness.sh`, frontend/backend P24 packages, local API smoke, browser QA artifacts and handoff updates.
- Latest evidence:
  - `./scripts/check-launch-readiness.sh http://127.0.0.1:8015` passed.
  - backend targeted tests: `37 passed, 2 warnings`.
  - frontend lint/build/audit and product boundary checks passed.
  - API smoke included market trends, checkout, account snapshot, merge, data export and account delete.
  - Browser QA passed for `/`, `/library`, `/story`, `/create`, `/settings`, `/studio`.
  - Artifacts: `artifacts/visual-qa/p24-launch-routes-mqcszrli/`, `artifacts/integration/launch-readiness-20260613T202710Z.json`.
- Release decision: ready for deployment-team preview handoff; public paid production launch still requires production database migration/restore drill, custom-domain CORS, real payment provider ops, privacy/legal approval, security audit and rollback rehearsal.

P25: Production deployment execution and rollback rehearsal.

- Deploy the current Vite + React + TypeScript frontend and FastAPI `/v1` backend to reachable preview / staging targets.
- Do not merge any external frontend during deployment. Backend-team or outside frontend packages remain reference material until subagent approval explicitly accepts them.
- Verify deployed API smoke, deployed browser QA, CORS preflight and preview env wiring.
- Rehearse rollback without destructive alias changes: frontend env / alias rollback command, API rollback target, runtime backup, restore dry-run, recovery drill and migration dry-run.
- Done: `docs/product/P25_DEPLOYMENT_EXECUTION_ROLLBACK_REHEARSAL_20260613.md`, remote frontend preview, remote API preview / RC, CORS evidence, runtime backup, restore dry-run, recovery drill, migration dry-run, remote browser QA and handoff updates.
- Latest evidence:
  - Frontend preview: `https://app-638zzda7k-james-projects-97742675.vercel.app`.
  - API preview / RC: `https://pun-api-p25.vercel.app`.
  - Remote API smoke passed.
  - Full launch-readiness gate passed: `artifacts/integration/launch-readiness-20260614T043013Z.json`.
  - Remote browser QA passed for `/`, `/library`, `/story`, `/create`, `/settings`, `/studio`.
  - CORS preflight matched `https://app-638zzda7k-james-projects-97742675.vercel.app`.
  - Runtime backup completed, restore dry-run returned `restore_decision: ready_to_restore`, recovery drill returned `status: ready`.
  - Artifacts: `artifacts/visual-qa/p25-remote-routes-mqda04cd/`, `artifacts/integration/p25-deployment-execution/`.
- Release decision: preview / staging deployment rehearsal complete; public paid production launch is still blocked by persistent production database migration/backup/restore, custom-domain CORS, real payment provider ops, privacy/legal approval, security audit and production rollback rehearsal.

P26: Public production release gate.

- Promote nothing automatically from P25. Start only after product-owner confirms the exact public domain, API domain, payment provider account and database target.
- Provision persistent production database, apply / stamp migrations, create runtime backup and run restore dry-run against the production-like database.
- Configure custom domain CORS, cookie policy and security headers.
- Verify real provider return, callback, refund, dispute and cancellation operations.
- Collect privacy/legal and security approvals as explicit artifacts.
- Done: `docs/product/P26_PUBLIC_PRODUCTION_RELEASE_GATE_20260613.md`, `artifacts/integration/p26-production-resource-audit.json`, `scripts/check-production-release-gate.mjs`, `app/vercel.json` security headers and handoff updates.
- Latest evidence:
  - Vercel auth available as `durhamjames-6686`.
  - `vercel domains ls` returned 0 domains under `james-projects-97742675`.
  - `app` project has 0 persistent Vercel env vars.
  - `pun-api-p25` project has 0 persistent Vercel env vars.
  - Current API preview uses `sqlite:////tmp/narrativeos_beta_p25.db`, not persistent production DB.
- Payment env remains preview/stub until real provider credentials, webhook secret and price map are supplied.
- Release decision: public paid production launch is blocked. Preview / staging testing can continue. P27 should either provision production resources or package the blocked launch handoff.

P27: Blocked launch handoff package.

- Start only because P26 returned `blocked` and production resources were not supplied inside the current window.
- Keep the current Vite + React + TypeScript app as the only product frontend; do not merge external frontend source.
- Produce a single transferable package for backend / ops / product owners instead of scattering P25/P26/P27 evidence.
- Package must include P25 preview/staging evidence, P26 production resource audit, P27 blocked launch handoff doc, P27 operator runbook, package manifest, key deployment scripts and README.
- Package must exclude `node_modules`, `dist`, `.env`, `.vercel`, `.venv`, external frontend source and secrets.
- Done: `docs/product/P27_BLOCKED_LAUNCH_HANDOFF_20260613.md`, `docs/product/P27_OPERATOR_RUNBOOK_20260613.md`, `artifacts/integration/p27-blocked-launch-package-manifest.json`, `scripts/check-blocked-launch-handoff.mjs`.
- Package: `artifacts/handoff/parallel-universe-blocked-launch-handoff-p27-20260613T215101.tar.gz`.
- Checksum: `artifacts/handoff/parallel-universe-blocked-launch-handoff-p27-20260613T215101.tar.gz.sha256`.
- Gate script: `npm --prefix app run check:blocked-launch`.
- Release decision: blocked launch handoff is transferable; public paid production launch is still blocked until production domain, database, payment, legal/privacy, security and rollback owners sign off.

P28: Blocked launch review owner board.

- Convert P26/P27 blockers into owner cards instead of continuing frontend or preview work.
- Keep current `app` Vite + React + TypeScript as the only product frontend; no external frontend is approved.
- Owner board must cover product owner, backend, ops, payment, legal/privacy, security and rollback commander.
- Production resource intake must record only owner, presence flags and acceptance artifact paths; real secrets must stay in Vercel or the approved secret manager.
- Meeting brief must keep public paid production launch blocked unless all owner cards have supplied input, verification command output and acceptance artifacts.
- Done: `docs/product/P28_BLOCKED_LAUNCH_REVIEW_OWNER_BOARD_20260613.md`, `docs/product/P28_LAUNCH_REVIEW_MEETING_BRIEF_20260613.md`, `artifacts/integration/p28-production-resource-intake.schema.json`, `scripts/check-launch-review-intake.mjs`.
- Gate script: `npm --prefix app run check:launch-review`.
- P29 branch: production provisioning execution if owners supply resources; otherwise blocked launch governance dashboard.

P29: Blocked launch governance dashboard.

- Convert P28 owner cards into a persistent internal status source for eight-hour acceptance.
- Governance dashboard must show owner, status, missing inputs, current evidence, next action and blocked reason by Product/Ops/Backend/Payment/Legal/Security/Rollback.
- Evidence ledger must cite P25/P26/P27/P28 artifacts by path and keep `public_paid_production_launch` as `blocked`.
- Ledger must keep `external_frontend_merge_approved` as `false`; no second frontend is approved.
- Ledger must record review cadence: daily while active, weekly while waiting on external resources.
- Done: `docs/product/P29_BLOCKED_LAUNCH_GOVERNANCE_DASHBOARD_20260613.md`, `artifacts/integration/p29-blocked-launch-evidence-ledger.json`, `scripts/check-blocked-launch-governance.mjs`.
- Gate script: `npm --prefix app run check:governance`.
- P30 branch: production provisioning execution only if every ledger entry is accepted with artifacts; otherwise owner escalation and governance maintenance.

P30: Owner escalation and governance maintenance.

- Start because P29 ledger shows every production-governance entry still blocked.
- Convert each ledger area into escalation material with owner, severity, required artifact, due cadence, escalation message and blocked release impact.
- Keep `public_paid_production_launch` blocked and `external_frontend_merge_approved` false.
- Do not create UI or merge another frontend while production resources are missing.
- Done: `docs/product/P30_OWNER_ESCALATION_GOVERNANCE_MAINTENANCE_20260613.md`, `artifacts/integration/p30-owner-escalation-matrix.json`, `scripts/check-owner-escalation.mjs`.
- Gate script: `npm --prefix app run check:escalation`.
- P31 branch: production provisioning execution only if all escalation artifacts are resolved; otherwise production owner escalation review.

P31: Production owner acceptance artifact template pack.

- Start because P30 escalation matrix names seven required acceptance artifacts, but owners still need fillable templates.
- Provide one JSON template per required artifact under `artifacts/integration/p31-acceptance-templates/`.
- Templates must default to `pending`, keep public paid production launch blocked, keep preview/staging allowed and keep external frontend merge approval false.
- Templates must record presence and verification output paths only; real secrets stay in Vercel or the approved secret manager.
- Done: `docs/product/P31_ACCEPTANCE_ARTIFACT_TEMPLATE_PACK_20260613.md`, `artifacts/integration/p31-acceptance-templates/`, `scripts/check-acceptance-templates.mjs`.
- Gate script: `npm --prefix app run check:templates`.
- P32 branch: artifact intake validator if owners submit completed artifacts; otherwise owner escalation review.

P32: Submitted acceptance artifact intake validator.

- Start because P31 templates exist, but official owner acceptance artifacts have not been submitted.
- Missing official artifacts are allowed only when their status remains `missing`, validation result remains `not_submitted` and ledger impact remains `blocked`.
- Submitted artifacts must include owner, approval timestamp, verification output path, no secrets and no external frontend approval.
- Done: `docs/product/P32_ACCEPTANCE_ARTIFACT_INTAKE_VALIDATOR_20260613.md`, `artifacts/integration/p32-acceptance-artifact-intake-status.json`, `scripts/check-acceptance-intake.mjs`.
- Gate script: `npm --prefix app run check:intake`.
- P33 branch: completed artifact acceptance runner if any official artifact is submitted; external owner follow-up log if all official artifacts remain missing.

P33: External owner follow-up log.

- Start because P32 shows all seven official acceptance artifacts remain missing.
- Track owner follow-up status without inventing real contacts or review dates.
- Every missing artifact must remain `waiting_on_owner` with `ledger_impact: blocked`.
- Done: `docs/product/P33_EXTERNAL_OWNER_FOLLOW_UP_LOG_20260613.md`, `artifacts/integration/p33-external-owner-follow-up-ledger.json`, `scripts/check-owner-follow-up.mjs`.
- Gate script: `npm --prefix app run check:follow-up`.
- P34 branch: owner response intake if any owner submits artifact or follow-up update; blocked launch waiting-state checkpoint if no owner response arrives.
