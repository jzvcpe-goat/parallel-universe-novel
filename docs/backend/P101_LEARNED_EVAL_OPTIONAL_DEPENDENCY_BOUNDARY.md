# P101 Learned Eval Optional Dependency Boundary

Date: 2026-06-18

## Goal

P101 prevents learned evaluator/reranker experiments from being mistaken for a required public release dependency.

The learned promotion suite is useful for Ops validation, but it depends on optional ML packages such as `joblib` and `scikit-learn`. When those packages are absent, the suite should skip the promotion-only training case instead of failing a release gate.

## Boundary

- Root `npm run test` must run `check:learned-eval-optional-boundary`.
- Root `npm run test` must not directly require `backend/tests/test_learned_assisted_gate.py`.
- `backend/tests/test_learned_assisted_gate.py` must use `pytest.importorskip` for optional learned eval dependency checks.
- P100 production decisions remain deterministic-only.
- Learned evaluator and learned reranker remain shadow-only until a separate promotion workflow is green.

## Optional Promotion Suite

Run this only when the optional ML environment is intentionally installed:

```bash
node scripts/run-backend-python.mjs -m pytest backend/tests/test_learned_assisted_gate.py
```

Expected behavior:

- with `joblib` and `scikit-learn`: the full promotion suite can execute;
- without those dependencies: the promotion-only test is skipped, while shadow-mode and API configuration tests still run.

## Gate

```bash
npm run check:learned-eval-optional-boundary
```

The gate writes `artifacts/runtime/learned-eval-optional-boundary-*.json`.

## Non-Goals

- Do not install or pin new ML dependencies in P101.
- Do not promote learned evaluator or learned reranker to production gates.
- Do not expose learned promotion details to Reader or Creator UI.
