# P100 Agent Eval Publish Decision Boundary

Date: 2026-06-18

## Goal

P100 makes the Agent Eval publish decision explicit and machine-verifiable without turning experimental learned checks into production blockers.

The boundary is intentionally narrow:

- FastAPI remains the business authority for quality and canon decisions.
- `agent_eval_publish_decision` is returned inside the backend quality gate contract for Studio/Ops and API typing.
- Reader and Creator public UI must not render the internal field name, contract id, learned policy or provider prompt plumbing.

## Production Decision Source

Current production decisions use only `deterministic_quality_gate`.

Eligible production gates:

| Gate | Source | Production Gate | Decision Role |
| --- | --- | --- | --- |
| `hard_validators` | `deterministic_eval` | true | block on hard failure |
| `narrative_quality_scores` | `deterministic_eval` | true | rewrite or pass threshold |
| `content_safety` | `deterministic_eval` | true | block on safety failure |

The response contract id is `P100_AGENT_EVAL_PUBLISH_DECISION_BOUNDARY`.

## Shadow-Only Learned Tracks

The learned evaluator and learned reranker are not production gates.

Policy:

```text
shadow_until_promotion_workflow_green
```

Required behavior:

- learned evaluator: `production_gate = false`
- learned reranker: `production_gate = false`
- neither learned track may appear in `eligible_production_gates`
- both may appear only as `shadow_only_checks`

Promotion to production requires a future gate that proves model rollout, dependency stability, false positive review, rollback ownership and public boundary compatibility.

## API Boundary

`/v1/quality/evaluate` and `/v1/canon/commit` may return:

```json
{
  "agent_eval_publish_decision": {
    "contract": "P100_AGENT_EVAL_PUBLISH_DECISION_BOUNDARY",
    "decision_source": "deterministic_quality_gate",
    "production_publish_allowed": true,
    "release_decision": "pass",
    "blocking_reasons": [],
    "eligible_production_gates": [],
    "shadow_only_checks": [],
    "learned_gate_policy": "shadow_until_promotion_workflow_green"
  }
}
```

The field is part of internal release reasoning. Public product copy must stay story-facing.

## Gates

Required local gates:

```bash
npm run check:agent-eval-publish-decision
node scripts/run-backend-python.mjs -m pytest backend/tests/test_product_runtime_api.py
npm run scan:public-ui-boundary
npm run scan:internal-terms
npm run test
```

`npm run test` must include `check:agent-eval-publish-decision`.

The learned promotion suite remains outside the required P100 gate until its optional dependencies and rollout policy are green:

```bash
node scripts/run-backend-python.mjs -m pytest backend/tests/test_learned_assisted_gate.py
```

## Non-Goals

- Do not expose Agent Eval internals to Reader or Creator.
- Do not promote learned evaluator or learned reranker in P100.
- Do not add a new frontend panel for this contract.
- Do not create a parallel quality gate outside the existing FastAPI quality gate.
