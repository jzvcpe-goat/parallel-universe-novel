# P17 Full Narrative Quality Gate Composition

Date: 2026-06-13

Owner surface: `/v1/quality/evaluate`, `/v1/canon/commit`, Studio/Ops release checks

## Goal

P17 upgrades the release check from a thin pass/block field into one composed `QualityGateResult`. The result combines:

- content safety
- language naturalness
- pacing
- character consistency
- foreshadowing continuity
- timeline consistency
- release readiness

Reader pages must stay smooth and story-facing. Creator pages should see only actionable suggestions. Studio/Ops may inspect detailed scores, blockers, warnings, shadow checks and canon commit readiness.

## Current Implementation Evidence

The current implementation already has reusable signals:

- `backend/src/narrativeos/eval/scorers.py`
  - `readability`
  - `scene_density`
  - `character_fidelity`
  - `causal_continuity`
  - `pacing`
  - `choice_distinctness`
  - `hook_quality`
  - `monetize_ready`
  - `overall_score`
- `backend/src/narrativeos/eval/validators.py`
  - hard checks for engineering leak, meta narration, repetition, chapter structure and premature ending
- `backend/src/narrativeos/services/backend_team_bridge.py`
  - maps backend-team content safety into the current `/v1/quality/evaluate` product contract
- backend-team inspection package
  - story project quality snapshot and release candidate gates already inspect chapter count, content pollution, unsafe chapters, time event completion and release blockers

P17 does not replace these checks. It composes them into a stable product contract.

## QualityGateResult Contract

The backend now returns the legacy keys plus the new P17 keys:

```json
{
  "status": "passed | blocked | waiting",
  "candidate_status": "canon_ready | candidate",
  "can_commit_canon": true,
  "decision": "pass | rewrite | block | pending",
  "overall_score": 0.91,
  "blocking_reasons": [],
  "summary": "质量组合已通过，可等待创作者确认发布。",
  "scores": {
    "content_safety": 1.0,
    "language_naturalness": 0.82,
    "pacing": 0.79,
    "character_consistency": 0.76,
    "foreshadowing_continuity": 0.83,
    "timeline_consistency": 0.88,
    "release_readiness": 0.86,
    "overall_score": 0.91
  },
  "blockers": [
    {
      "code": "Q07",
      "severity": "high",
      "message": "当前章节与既有因果链衔接不足。",
      "evidence": ["causal_continuity=0.250"],
      "source": "continuity",
      "layer": "realtime_blocker"
    }
  ],
  "warnings": [],
  "suggested_fixes": ["补上上一章选择到这一章结果之间的因果桥。"],
  "public_safe_message": "这一段还在打磨，阅读体验不会被打断。",
  "studio_debug": {
    "source": "local_evaluator",
    "raw_decision": "rewrite",
    "issue_count": 2,
    "blocking_issue_count": 1,
    "warning_issue_count": 1,
    "shadow_checks": [
      {
        "id": "learned_evaluator",
        "status": "shadow_only",
        "production_gate": false,
        "reason": "promotion_not_green"
      },
      {
        "id": "learned_reranker",
        "status": "shadow_only",
        "production_gate": false,
        "reason": "promotion_not_green"
      }
    ]
  },
  "release_decision": "pass | rewrite | block | hold",
  "canon_commit_readiness": {
    "ready": true,
    "required_confirmation": true,
    "missing": []
  },
  "agent_eval_publish_decision": {
    "contract": "P100_AGENT_EVAL_PUBLISH_DECISION_BOUNDARY",
    "decision_source": "deterministic_quality_gate",
    "production_publish_allowed": true,
    "release_decision": "pass",
    "blocking_reasons": [],
    "eligible_production_gates": [
      {
        "id": "hard_validators",
        "source": "deterministic_eval",
        "production_gate": true,
        "decision_role": "block_on_hard_failure"
      },
      {
        "id": "narrative_quality_scores",
        "source": "deterministic_eval",
        "production_gate": true,
        "decision_role": "rewrite_or_pass_threshold"
      },
      {
        "id": "content_safety",
        "source": "deterministic_eval",
        "production_gate": true,
        "decision_role": "block_on_safety_failure"
      }
    ],
    "shadow_only_checks": [
      {
        "id": "learned_evaluator",
        "status": "shadow_only",
        "production_gate": false,
        "reason": "promotion_not_green"
      },
      {
        "id": "learned_reranker",
        "status": "shadow_only",
        "production_gate": false,
        "reason": "promotion_not_green"
      }
    ],
    "learned_gate_policy": "shadow_until_promotion_workflow_green"
  }
}
```

Backward compatibility is preserved through:

- `status`
- `candidate_status`
- `can_commit_canon`
- `decision`
- `overall_score`
- `blocking_reasons`

## Gate Layers

Realtime blockers:

- content safety block
- engineering leak in published text
- meta narration that exposes planning or system language
- high-severity causal continuity failure
- premature ending before the configured minimum route length
- missing quality report when trying to commit canon
- missing operator confirmation when committing

Warnings:

- short chapter body
- low scene detail density
- low dialogue/action ratio
- repeated paragraphs
- weak choice distinctness
- weak hook or pacing that does not require full block
- character consistency below preferred floor

Shadow-only checks:

- learned evaluator
- learned reranker

The shadow tracks must not block production release until their promotion workflows are green. P17 exposes them only in `studio_debug.shadow_checks` with `production_gate: false`.

## P100 Publish Decision Boundary

P100 adds the explicit `agent_eval_publish_decision` boundary so Agent Eval can participate in publish decisions without silently promoting experimental learned checks.

- `decision_source` is `deterministic_quality_gate`.
- Production-blocking decisions may use only deterministic hard validators, deterministic narrative quality scores and deterministic content safety.
- Learned evaluator and learned reranker remain `shadow_only` with `production_gate: false`.
- The learned track policy is `shadow_until_promotion_workflow_green`.
- Public Reader and Creator surfaces must not render `agent_eval_publish_decision`, raw gate ids, learned policy strings or provider prompt plumbing.

## Frontend Display Boundary

Reader:

- May consume `public_safe_message`.
- Must not render detailed scores, blockers, raw issue codes, debug, learned tracks or release internals.
- If a generated scene is not ready, keep the reading flow smooth and show a light product-facing state only.

Creator:

- May show `summary` and a short subset of `suggested_fixes`.
- Should keep the interaction natural-language and Socratic.
- Should not show raw issue codes, source modules, gate layers, or learned track status.

Studio/Ops:

- May show `scores`, `blockers`, `warnings`, `suggested_fixes`, `release_decision`, `canon_commit_readiness` and `studio_debug`.
- Should keep all release checks behind Studio/Ops routes.
- May show shadow-only learned track state, but must label it as not production-blocking.

## Implementation Notes

Current P17 code added:

- `backend/src/narrativeos/services/quality_gate.py`
  - `compose_quality_gate_result`
  - `add_commit_confirmation_requirement`
  - `agent_eval_publish_decision`
  - `P100_AGENT_EVAL_PUBLISH_DECISION_BOUNDARY`
- `ProductRuntimeService._quality_gate` now delegates to the composer.
- `BackendTeamBridge._quality_gate` now delegates to the same composer.
- `app/src/api/runtime.ts` now types the expanded quality gate fields.
- `app/src/pages/Studio.tsx` can display summary, blockers, warnings and suggested fixes after a release check.

## Backend-Team Integration Contract

Backend-team services can keep their internal quality snapshot and release candidate logic, but the frontend-facing response must be mapped into `QualityGateResult`.

Recommended mapping:

| Backend-team signal | QualityGateResult field |
| --- | --- |
| content safety severity | `scores.content_safety`, `blockers`, `warnings` |
| story project quality blockers | `blockers`, `blocking_reasons`, `release_decision` |
| content pollution issues | `blockers` or `warnings` |
| chapter count / length limits | `warnings`, `scores.release_readiness` |
| unsafe or unvalidated chapters | `blockers` |
| time event completeness | `scores.timeline_consistency`, `warnings` |
| preview share readiness | `scores.release_readiness`, `canon_commit_readiness` |
| learned evaluator/reranker status | `studio_debug.shadow_checks` only |

## Tests

Required current tests:

```bash
.toolchain/python/bin/pytest backend/tests/test_product_runtime_api.py backend/tests/test_backend_team_bridge.py -q
npx tsc --noEmit -p app/tsconfig.app.json
npm --prefix app run check:backend-bridge
npm --prefix app run check:design-system
npm --prefix app run check:copy-boundary
npm --prefix app run check:alignment
```

P17-specific assertions:

- `/v1/quality/evaluate` returns the expanded QualityGateResult fields.
- engineering/meta leakage blocks canon commit.
- missing confirmation appends `operator_confirmation`.
- learned evaluator/reranker remain `shadow_only` and `production_gate: false`.
- `agent_eval_publish_decision.decision_source` remains `deterministic_quality_gate`.
- learned evaluator/reranker stay out of `eligible_production_gates`.
- backend bridge fake and real mapping preserve the expanded contract.
- Studio may display detailed gate output; public pages may not.

## Non-Goals

- Do not promote learned evaluator or learned reranker to a production blocker in P17.
- Do not rewrite the reader UI.
- Do not merge the backend-team frontend.
- Do not expose implementation terms on public routes.

## P18 Readiness

P18 can start after P17 checks pass. The next target is payment completion and account sync:

- checkout completion reconciliation
- customer portal or entitlement refresh
- cross-device reader progress sync
- creator draft sync
- local browser save remains fallback
