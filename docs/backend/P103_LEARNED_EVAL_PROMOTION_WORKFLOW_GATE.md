# P103 Learned Eval Promotion Workflow Gate

Date: 2026-06-18

## Goal

P103 turns the learned evaluator/reranker promotion path into a machine-verifiable workflow boundary without activating either learned track as a production gate.

This is not a production gate activation. The public release chain still uses deterministic publish decisions from P100, and learned tracks remain `shadow_only` under `shadow_until_promotion_workflow_green`.

## Boundary

- `check:learned-eval-promotion-workflow` must be part of root `npm run test`.
- Root `npm run test` must not directly execute optional learned assisted promotion tests.
- Evaluator and reranker promotion workflows must use `manual_approval`.
- Approval records must be review records with `asset_type = learned_promotion`.
- Promotion can be approved, stale, revoked or unapproved; stale recommendations require reconfirmation.
- Safe rollout must have activate and rollback paths before any learned track can affect production publish behavior.
- Quality gate output must keep learned evaluator and learned reranker as `shadow_only` with `production_gate = false`.

## Existing Runtime Surfaces

Evaluator workflow:

- `backend/src/narrativeos/eval/learned_promotion_workflow.py`
- `GET /v1/ops/learned-promotion`
- `POST /v1/ops/learned-promotion/approve`
- `POST /v1/ops/learned-promotion/revoke`

Reranker workflow:

- `backend/src/narrativeos/eval/learned_reranker_promotion_workflow.py`
- `GET /v1/ops/learned-reranker-promotion`
- `POST /v1/ops/learned-reranker-promotion/approve`
- `POST /v1/ops/learned-reranker-promotion/revoke`

Shared rollout workflow:

- `GET /v1/ops/learned-rollout`
- `POST /v1/ops/learned-rollout/{track}/activate`
- `POST /v1/ops/learned-rollout/{track}/rollback`
- `GET /v1/ops/learned-promotion-evidence`
- `POST /v1/ops/learned-assisted-gate/configure`

## Required Promotion Evidence

Before a future gate may promote learned evaluator or learned reranker into production publish decisions, the team must provide:

| Evidence | Requirement |
| --- | --- |
| Promotion evidence pack | Training, validation, test and shadow comparison evidence exists for the target track. |
| Manual approval | Ops reviewer approves the exact recommendation snapshot. |
| Safe rollout activation | Rollout can be activated only after approval and artifact readiness. |
| Rollback path | Rollback can return the track to a non-active state. |
| False positive review | Human review confirms learned blocks/reranks do not over-block viable work. |
| Public boundary compatibility | Reader/Creator public UI and API projections do not expose learned internals. |

## Gates

Required release gate:

```bash
npm run check:learned-eval-promotion-workflow
```

Optional strict promotion suite, only when the ML environment is intentionally installed:

```bash
node scripts/run-backend-python.mjs -m pytest \
  backend/tests/test_learned_promotion_workflow.py \
  backend/tests/test_learned_reranker_promotion_workflow.py \
  backend/tests/test_learned_rollout.py \
  backend/tests/test_learned_assisted_gate.py \
  backend/tests/test_learned_assisted_rerank.py
```

## Non-Goals

- Do not install or pin ML dependencies in P103.
- Do not promote learned evaluator or reranker to production gates in P103.
- Do not expose promotion workflow details to Reader or Creator UI.
- Do not bypass P100 deterministic publish decisions.
