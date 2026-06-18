# P104 Learned Eval Strict Suite Readiness

Date: 2026-06-18

## Goal

P104 adds a machine-readable preflight for the optional strict learned evaluator/reranker promotion suite.

It does not install ML packages, it does not activate learned tracks as production gates, and it does not make the optional strict suite part of the public release blocker chain.

## Relationship To P101 And P103

- P101 keeps optional learned dependencies from failing the public release chain.
- P103 defines the learned promotion workflow and keeps learned evaluator/reranker `shadow_only`.
- P104 checks whether the current environment can intentionally run the strict learned promotion suite.

## Readiness Contract

Required release gate:

```bash
npm run check:learned-eval-strict-suite-readiness
```

The gate exits successfully in both states:

| State | Meaning | Public Release Blocking |
| --- | --- | --- |
| `ready` | `joblib`, `sklearn` and `scipy` are importable by the selected Python runtime. | No |
| `blocked_optional_ml_dependencies` | One or more optional ML dependencies are absent. The strict suite should not be run in this environment. | No |

## Strict Suite

Only run this suite in an intentionally provisioned ML environment:

```bash
PYTHON_BIN=/path/to/python node scripts/run-backend-python.mjs -m pytest \
  backend/tests/test_learned_promotion_workflow.py \
  backend/tests/test_learned_reranker_promotion_workflow.py \
  backend/tests/test_learned_rollout.py \
  backend/tests/test_learned_training_automation.py \
  backend/tests/test_learned_assisted_gate.py \
  backend/tests/test_learned_assisted_rerank.py
```

## Output

The gate writes:

```text
artifacts/runtime/learned-eval-strict-suite-readiness-*.json
```

Required fields:

- `gate = P104_LEARNED_EVAL_STRICT_SUITE_READINESS`
- `status = ready | blocked_optional_ml_dependencies`
- `publicReleaseBlocking = false`
- `productionGateActivated = false`
- `dependencyProbe.missing`
- `strictPromotionSuite`
- `nextAction`

## Non-Goals

- Do not install `joblib`, `scikit-learn` or `scipy` in P104.
- Do not promote learned evaluator/reranker into production publish decisions.
- Do not expose learned promotion or dependency details in Reader or Creator UI.
- Do not replace P100 deterministic publish decisions.
