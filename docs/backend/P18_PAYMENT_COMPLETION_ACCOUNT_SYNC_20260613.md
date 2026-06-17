# P18 Payment Completion and Account Sync

Date: 2026-06-13

Owner surface: `/settings`, `/v1/reader/subscription`, `/v1/reader/checkout/start`, `/v1/reader/checkout/webhook`, reader session runtime, creator dialogue sessions

## Goal

P18 turns membership from "checkout request created" into a productized completion and account-sync path:

- readers can start a membership request
- preview users can complete the current web-stub request and refresh benefits
- production payment completion must be applied by server-side callback or Ops reconciliation
- membership, reader progress and creator drafts have one account-sync contract
- the current Vite/React frontend remains the only product frontend

## Current Implementation Evidence

Already available:

- `GET /v1/reader/subscription`
  - returns subscription, wallets, checkout session summary, lifecycle summary, retryable/renewable state and plan tiers
- `POST /v1/reader/checkout/start`
  - creates a checkout session with provider, status, expiry and idempotency data
- `POST /v1/reader/checkout/webhook`
  - processes `checkout_session_completed`, payment failure, renewal and cancellation lifecycle events
- `POST /v1/reader/subscription/{account_id}/retry-payment`
- `POST /v1/reader/subscription/{account_id}/renew`
- `POST /v1/reader/subscription/{account_id}/cancel`
- Ops routes already support subscription reconcile, event replay and entitlement actions
- reader sessions persist by `session_id` and can replay/prefill
- creator dialogue persists by `session_id` and can continue from prior session payload
- author draft APIs exist behind author access checks

P18 does not merge any backend-team frontend or replace the current app.

## Product Contract

### Start Checkout

Frontend:

```http
POST /v1/reader/checkout/start
```

Payload:

```json
{
  "account_id": "web_reader_demo",
  "tier_id": "play_pass"
}
```

Response:

```json
{
  "checkout": {
    "provider": "web_stub",
    "tier_id": "play_pass",
    "checkout_session_id": "checkout_xxx",
    "session_id": "checkout_xxx",
    "status": "created",
    "checkout_url": null,
    "expires_at": "2026-06-13T..."
  }
}
```

Public UI may show:

- selected plan
- request state
- pay/complete action
- refreshed benefit status

Public UI must not show:

- provider
- event id
- idempotency key
- webhook wording
- ledger or lifecycle internals

### Complete Checkout

Production rule:

- Real providers must complete through server-side callbacks.
- The browser may poll or refresh status after returning from a hosted checkout page.
- The browser must not forge provider events in production.

Preview rule:

- For `web_stub`, the account page may call the current lifecycle endpoint to complete the request and refresh subscription state.
- This is an implementation bridge for product QA and local preview only.

Current frontend bridge:

```ts
settingsApi.completeCheckout({ accountId, checkoutSession })
```

Current backend target:

```http
POST /v1/reader/checkout/webhook
```

Event:

```json
{
  "provider": "web_stub",
  "event_type": "checkout_session_completed",
  "account_id": "web_reader_demo",
  "checkout_session_id": "checkout_xxx"
}
```

After processing, the frontend immediately calls:

```http
GET /v1/reader/subscription?account_id=web_reader_demo
```

### Account Sync

P18 account sync has four layers:

1. Membership entitlement
   - source: `/v1/reader/subscription`
   - canonical key: `account_id`
   - sync result: active plan, wallets, lifecycle and retry/renew actions

2. Reader progress
   - source: `/v1/reader/sessions`, `/v1/reader/snapshot`, `/v1/reader/sessions/{session_id}/replay`
   - canonical keys: `account_id`, `reader_id`, `session_id`, `world_id`, `world_version_id`
   - sync result: resume reading, preserve current branch, restore latest choice state

3. Creator dialogue draft
   - source: `/v1/creator/dialogue/sessions`, `/v1/creator/dialogue/sessions/{session_id}/turns`
   - canonical keys: `account_id`, `creator_session_id`, `template_id`
   - sync result: resume the Socratic creation thread and recover story notes

4. Author project draft
   - source: future productized bridge from creator dialogue to backend story project / author draft
   - canonical keys: `account_id`, `project_id`, `world_version_id`
   - sync result: open saved work, continue editing, publish after quality gate

## Frontend Display Boundary

Reader:

- sees continue reading, current membership benefit and restore state
- does not see provider, lifecycle event, ledger, replay id or sync diagnostic details

Creator:

- sees resume creation, saved story seed and latest assistant draft
- does not see author draft internals until a saved project exists

Account:

- sees plan cards, benefit balances, request state, complete/refresh action and local fallback state
- may say that login sync is not fully connected yet
- must not expose provider, webhook, event id or idempotency details

Studio/Ops:

- may inspect provider, lifecycle history, retries, reconciliation, event replay, entitlement audit and sync diagnostics
- should keep these details out of public navigation

## Current P18 Frontend Changes

- `app/src/api/settings.ts`
  - `completeCheckout` now calls the existing lifecycle endpoint for the current preview chain and refreshes subscription state.
- `app/src/hooks/useSettings.ts`
  - tracks checkout completion and refreshes membership after completion.
- `app/src/pages/Account.tsx`
  - after a checkout request exists, users can complete the preview opening and refresh benefits.
  - public copy stays product-facing.
- `app/src/types/index.ts`
  - subscription status now includes checkout session and lifecycle summary fields.

## Backend-Team Integration Contract

Backend-team billing and account services should map into the product `/v1` contract:

| Backend capability | Product route |
| --- | --- |
| entitlement lookup | `GET /v1/reader/subscription` |
| checkout creation | `POST /v1/reader/checkout/start` |
| provider callback | `POST /v1/reader/checkout/webhook` or server-only equivalent |
| subscription retry | `POST /v1/reader/subscription/{account_id}/retry-payment` |
| cancellation | `POST /v1/reader/subscription/{account_id}/cancel` |
| reconciliation | Studio/Ops only |
| reader progress sync | `GET /v1/account/snapshot` |
| creator draft sync | `GET /v1/account/snapshot` and future project persistence bridge |

Recommended future unified sync response:

```json
{
  "account_id": "web_reader_demo",
  "membership": {},
  "reader_progress": {
    "latest_session_id": "session_xxx",
    "world_id": "beacon-beyond",
    "chapter_index": 1,
    "resume_available": true
  },
  "creator_drafts": [
    {
      "session_id": "creator_xxx",
      "title": "未命名故事",
      "updated_at": "2026-06-13T..."
    }
  ],
  "local_fallback": {
    "enabled": true,
    "reason": "login_sync_pending"
  }
}
```

## Tests

Required:

```bash
.toolchain/python/bin/pytest backend/tests/test_monetization_m0.py::test_checkout_webhook_lifecycle_retry_cancel_reconcile_and_replay backend/tests/test_harness_narrow_api.py::test_harness_reader_and_billing_core_routes -q
(cd app && npx tsc --noEmit -p tsconfig.app.json)
npm --prefix app run check:backend-bridge
npm --prefix app run check:design-system
npm --prefix app run check:copy-boundary
npm --prefix app run check:alignment
(cd app && npm run build)
(cd app && npm run lint -- --max-warnings=0)
NARRATIVEOS_API_ORIGIN=http://127.0.0.1:8000 ./scripts/smoke-deployed-api.sh
```

P18-specific assertions:

- checkout start returns a session and plan tier
- checkout completion activates subscription for `web_stub`
- subscription status returns active subscription and completed checkout session
- account page has plan cards, start checkout and completion action
- public copy boundary remains clean
- provider and lifecycle diagnostics stay in Studio/Ops docs or routes

## Final Verification Evidence

Completed on 2026-06-13:

- Backend targeted tests: `2 passed, 2 warnings`.
- TypeScript: `npx tsc --noEmit -p tsconfig.app.json` passed.
- Frontend gates: `check:backend-bridge`, `check:design-system`, `check:copy-boundary`, `check:alignment` passed.
- Build and lint: `npm run build` and `npm run lint -- --max-warnings=0` passed. Build still reports the non-blocking Browserslist data-age warning.
- Local API smoke: `NARRATIVEOS_API_ORIGIN=http://127.0.0.1:8000 ./scripts/smoke-deployed-api.sh` passed with `checkout_status: completed`, `subscription_tiers: 3`, reader choice events and creator dialogue turns present.
  - The smoke script uses a unique account id per run so repeated acceptance checks cannot overwrite a completed checkout with a new created checkout for the same demo account.
- Browser QA:
  - Start FastAPI on `http://127.0.0.1:8000`.
  - Start Vite with `VITE_API_ORIGIN=http://127.0.0.1:8000`.
  - Open `/settings?qa=p18-payment-sync-live`.
  - Confirm no 404 appears and three public plan cards render as `阅读会员 / 创作会员 / 工作室会员`.
  - Click `阅读会员 -> 开通这个方案`; confirm `完成开通` appears and no public provider/internal copy appears.
  - Click `完成开通`; confirm page changes to `已开通`, reading credits refresh to `30`, completion action disappears, and the visible status says benefits were refreshed.

Important local QA note:

- If Vite is started without `VITE_API_ORIGIN` or `VITE_API_BASE_URL`, the frontend defaults API calls to the Vite origin. `/settings` will then call `http://127.0.0.1:3000/v1/...` and show a 404 even when the P18 backend contract is correct.
- Product QA must therefore start the frontend with an explicit API origin whenever the goal is to validate real backend completion paths.

## Non-Goals

- Do not implement a second frontend.
- Do not expose provider internals in public UI.
- Do not claim third-party live payment processing is connected until provider secrets, hosted checkout and callback verification are configured.
- Do not claim cross-device sync is complete until account snapshot and creator project persistence are connected.

## P19 Readiness

P19 can start after P18 checks pass. The next target should be production deployment smoke and release candidate freeze:

- stable frontend preview
- stable API preview
- deployed API smoke
- route-level browser QA
- public copy freeze
- handoff archive and release checklist
