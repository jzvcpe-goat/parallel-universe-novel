# Backend Team Handoff - Parallel Universe Novel Commercial Prototype

Last verified: 2026-06-08 16:07 UTC

## Executive State

The reader-facing commercial prototype is live as a static GitHub Pages preview:

```text
https://jzvcpe-goat.github.io/parallel-universe-novel-prototype/
```

This public preview intentionally runs with:

```text
VITE_API_LOCAL=true
VITE_BASE_PATH=/parallel-universe-novel-prototype/
VITE_ROUTER_MODE=hash
```

So the public URL proves the product shell, reader flow, creation flow, responsive layout, and commercial copy. It does not prove a live production backend behind that public host.

The local frontend/backend contract is aligned and verified by:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/verify-parallel-universe-prototype.sh
```

Current result:

```text
PASS
Capability alignment passed: 23 frontend API calls, 110 OpenAPI paths, 5 routes
Backend narrow API tests: 26 passed
Frontend lint/build/audit: passed
Local route smoke: /, /story, /story?world=unknown-world, /library, /create, /studio
```

Full backend test suite is not green:

```text
268 passed, 28 failed, 1 skipped, 2 warnings
```

The failures are not in the commercial reader/creator/runtime narrow gate. They are concentrated in learned evaluator/reranker training and one phase-0 guardrail script.

Latest creator-contract verification added after the original handoff:

```text
backend/tests/test_creator_dialogue_api.py + backend/tests/test_creator_commercial_api.py: 10 passed
Browser QA for /create: seed example -> generated opening -> 2 follow-up questions -> no crash/no horizontal overflow
QA screenshot: app/artifacts/visual-qa/create-contract-aligned-962x885.png
```

## Product Entry Points And Backend Responsibilities

| Frontend route | User-facing purpose | Backend contract already represented | Public preview behavior | Backend next responsibility |
| --- | --- | --- | --- | --- |
| `/` | Commercial book-site home: featured title, categories, rankings, updates, author entry | No required live call for first paint | Static commercial product shell | Later add analytics events for start-reading, book-card click, author-entry click |
| `/library` | Book store/category shelf | `/v1/reader/library/worlds`, `/v1/reader/library/worlds/{world_id}` | Local template catalogue | Provide real world catalogue, ranking/update metadata, availability flags |
| `/story?world=beacon-beyond` | Reader with chapter index, long reading pane, choices, branch feedback | `/v1/reader/sessions`, `/v1/reader/continue`, `/v1/reader/snapshot`, `/v1/scene/advance`, `/v1/timeline/worldlines/{id}/loom` | Local flagship world plus deterministic story simulator | Make session/snapshot/advance the source of truth, persist worldline events, return product-safe reader copy |
| `/create` | Real usable creation dialogue: seed -> assistant draft -> follow-up questions | `/v1/creator/dialogue/sessions`, `/v1/creator/dialogue/sessions/{session_id}`, `/v1/creator/dialogue/sessions/{session_id}/turns` | Calls service first when not local; falls back to local draft | Connect provider-backed generation, keep secrets server-side, persist turns and setting cards |
| `/studio` | Author/ops workbench for review, quality checks, and release decisions | `/v1/quality/evaluate`, `/v1/canon/commit` | Local review cards when public/local | Wire release controls into persistent quality/commit services and world-version publishing |

## API Surfaces Confirmed In OpenAPI

The following surfaces exist in `backend/openapi.json` and are checked by the alignment guard:

```text
/v1/reader/library/worlds
/v1/reader/library/worlds/{world_id}
/v1/reader/sessions
/v1/reader/continue
/v1/reader/snapshot
/v1/reader/sessions/{session_id}/quote
/v1/reader/sessions/{session_id}/prefill
/v1/reader/sessions/{session_id}/replay
/v1/scene/advance
/v1/timeline/worldlines/{worldline_id}/loom
/v1/quality/evaluate
/v1/canon/commit
/v1/creator/dialogue/sessions
/v1/creator/dialogue/sessions/{session_id}
/v1/creator/dialogue/sessions/{session_id}/turns
```

Primary backend files currently involved:

```text
backend/src/narrativeos/api/product_runtime.py
backend/src/narrativeos/api/creator.py
backend/src/narrativeos/services/product_runtime.py
backend/src/narrativeos/services/creator_dialogue.py
backend/src/narrativeos/services/commercial_creator.py
backend/openapi.json
backend/specs/openapi.yaml
```

Narrow tests proving the handoff-critical surface:

```text
backend/tests/test_harness_narrow_api.py
backend/tests/test_creator_commercial_api.py
backend/tests/test_creator_dialogue_api.py
backend/tests/test_product_runtime_api.py
backend/tests/test_ops_frontend_split.py
backend/tests/test_cors_config.py
backend/tests/test_provider_routing.py
```

## Creator Dialogue Contract - Must Preserve

The `/create` product surface is now contract-aligned with the imported novel-starter prompt. Backend work should extend this contract rather than replacing it with a generic chat endpoint.

Frontend sends the prompt context on session creation and subsequent turns:

```json
{
  "context": {
    "prompt_id": "imported_novel_starter_system_prompt",
    "prompt_version": "story_architecture_v2",
    "launch_method": "seed_break_grow",
    "rule": "write_first_ask_later",
    "max_questions_per_turn": 2
  }
}
```

Backend response must keep these invariants:

```text
source.agent = imported_novel_starter_system_prompt
source.prompt_id = imported_novel_starter_system_prompt
source.prompt_version = story_architecture_v2
source.title = 小说启动引导
source.prompt_contract.max_questions_per_turn = 2
source.prompt_contract.first_question = 你脑海里最先浮现的是哪个画面？
source.prompt_contract.creative_dimensions includes characters, scene, world_rule, conflict_engine, reader_hook, outline
source.prompt_contract.input_source_matrix.manual lists author-confirmed fields
source.prompt_contract.input_source_matrix.memo_frozen lists Memo/model-derived frozen defaults
assistant.questions.length <= 2
assistant.story_text is empty only when phase = seed and no seed was provided
assistant.model_status.secret_exposure = server_env_only
```

Product behavior that must not regress:

```text
Seed phase: ask one open image question; no setup worksheet.
Break-soil phase: first seed generates readable opening prose before asking questions.
Growth phase: user answer is written into the next passage before asking the next necessary question.
No complex setup table, no A/B/C questionnaire, no visible provider key, no backend/internal jargon in the reader-facing response.
```

Current implementation files:

```text
app/src/features/creator/novelStarterPrompt.ts
app/src/pages/Create.tsx
app/src/api/creator.ts
backend/src/narrativeos/services/creator_dialogue.py
backend/tests/test_creator_dialogue_api.py
```

Backend team next step for this surface:

1. Replace or augment local fallback in `CreatorDialogueService._build_assistant_turn` with the production provider router.
2. Keep `source.prompt_contract` and `source.request_context` in the public response for QA and frontend alignment.
3. Persist sessions and setting cards beyond the current file-store prototype.
4. Add streaming only after the non-streaming contract above remains green.
5. Run `python -m pytest -q tests/test_creator_dialogue_api.py tests/test_creator_commercial_api.py` before touching frontend integration.

## Novel Architecture Prompt Contract - v2

The imported Kimi/Moonshot source is not a complete product contract by itself. It must be extended into a novel-architecture prompt because real serial fiction creation needs scene, character, setting, conflict, and chapter structure, not only a chat-like opening generator.

Research references used to shape v2:

- Fanqie writer lesson "开书前的六大硬核筹备要点" frames pre-writing around main plot, worldview, power/system rules, special ability hook, character design, and volume outline: `https://fanqienovel.com/writer/zone/article/7409885940115570750`
- Fanqie writer lesson "新手常犯的 10 个错误" calls out POV/person, non-eventful narration, opening, character consistency, hooks, title, and intro as common failure points: `https://fanqienovel.com/writer/zone/article/7361736120746393662`
- Qidian community writing tutorial "怎么写设定及大纲" emphasizes that setting and outline influence each other, should be updated during writing, and that conflict should drive the plot: `https://www.qidianclub.com/threads/830/`

Backend must support these creative dimensions in the prompt/runtime contract:

```text
premise            Story hook / first image / core anomaly
protagonist        Name, identity, desire, wound, flaw, bottom line
characters         Relationship web, opponent, ally, witness, emotional debt
scene              Opening location, visible objects, pressure source, atmosphere
world_rule         Rules that create choice pressure, not inert lore
conflict_engine    Genre-specific escalation mechanism
reader_hook        Opening hook, chapter-end hook, payoff density
pov_tone           POV, narrative distance, sentence density, emotional temperature
outline            First 3-10 chapter scaffold and volume direction
```

The product must distinguish what humans provide from what Memo/model distillation provides.

Human-confirmed inputs:

```text
story seed / first image / core anomaly
protagonist name, identity, desire, wound, bottom line
key relationships and emotional debt
opening scene's unique object, place, and period texture
world-rule boundaries and hard no-go items
POV, prose tone, reader emotion, and whether the opening feels right
```

Memo/model-derived frozen defaults:

```text
genre rhythm: opening, escalation, reversal, chapter-end hook density
role slots: opponent, ally, tempter, witness, mentor
conflict models: resource contest, truth pursuit, court power game, relationship pull
scene-library parameters: high-pressure opening site, reversal site, information-gap site, cost site
outline scaffold: first detailed chapters, later sparse beats, climax and payoff cadence
quality thresholds: character consistency, opening load, conflict-driven plot, hook clarity
```

Runtime auto-derived cards:

```text
setting cards extracted from generated prose
candidate character cards, scene cards, foreshadowing cards, and outline cards
answers written back into the next passage
quality reports for rhythm, character consistency, timeline consistency, foreshadowing, and AI smell
```

Implementation rule:

```text
Do not ask users to fill Memo-derived template parameters.
Do not expose corpus/model/distillation wording on reader or creator surfaces.
Studio may show source policy, distillation status, prompt version, and quality traces.
```

## Full Backend Failures To Clear Before Production Claim

The full suite currently fails with:

```text
28 failed, 268 passed, 1 skipped, 2 warnings
```

Failure group 1: missing learned-eval dependencies.

Representative error:

```text
RuntimeError: scikit_learn_required:No module named 'joblib'
```

Affected areas include:

```text
tests/test_artifact_registry.py
tests/test_beta_api.py::test_ops_eval_metrics_can_report_learned_shadow_summary
tests/test_beta_platform.py::test_authoring_simulation_can_include_learned_evaluation_summary_when_artifact_exists
tests/test_learned_analysis.py
tests/test_learned_assisted_gate.py
tests/test_learned_assisted_rerank.py
tests/test_learned_baseline.py
tests/test_learned_cadence.py
tests/test_learned_dashboard.py
tests/test_learned_impact_tracking.py
tests/test_learned_inference.py
tests/test_learned_reranker_baseline.py
tests/test_learned_reranker_shadow.py
tests/test_learned_rollout.py
tests/test_learned_shadow.py
tests/test_learned_training_automation.py
```

Backend fix options:

1. Add `joblib` and `scikit-learn` to the backend toolchain/runtime dependencies and ensure CI installs them.
2. If learned gates must remain optional, mark the training/inference tests behind a clear optional dependency marker and keep production gates disabled until artifacts exist.
3. Update ops endpoints so failed optional learned training reports explicit `dependency_missing` rather than silently showing zero succeeded tracks.

Failure group 2: phase-0 guardrail script assumes `.venv`.

Representative error:

```text
scripts/run_phase0_guardrails.sh: line 7: .venv/bin/activate: No such file or directory
```

Backend fix options:

1. Make `scripts/run_phase0_guardrails.sh` use `$PYTHON_BIN` when provided.
2. Fall back to `/Users/james/Documents/PUF/workspaces/integration-harness/.toolchain/python/bin/python`.
3. Only source `.venv/bin/activate` if it exists.

## Productionization Sequence

Recommended next backend implementation order:

1. Make full backend test suite green by resolving learned dependency handling and phase-0 guardrail script.
2. Keep public frontend in `VITE_API_LOCAL=true` until there is a hosted API origin with CORS configured.
3. Stand up staging API with explicit env:

```text
VITE_API_LOCAL=false
VITE_API_ORIGIN=https://<api-host>
VITE_API_BASE_URL=https://<api-host>/v1
```

4. Verify `/create` against real `/v1/creator/dialogue/*` and confirm no client-visible provider secret or model key.
5. Verify `/story` against real `/v1/reader/sessions`, `/v1/reader/snapshot`, `/v1/scene/advance`, and `/v1/timeline/worldlines/{id}/loom`.
6. Wire `/studio` release buttons to persistent `/v1/quality/evaluate` and `/v1/canon/commit`, then add a world-version publish table.
7. Add product analytics for home CTA, library card clicks, reading completion, choice completion, create-start, and studio publish-check.
8. Only after the above, disable static/demo fallback for a staging build and run browser QA against the hosted API.

## Deployment Notes

Vercel preview is still blocked by local credentials:

```text
command -v vercel -> empty
VERCEL_TOKEN -> absent
Vercel auth files -> absent
Codex Vercel fallback -> attempted, no previewUrl returned
```

Latest Vercel-ready artifacts:

```text
artifacts/deploy/parallel-universe-vercel-preview-20260608T131932Z.tgz
artifacts/deploy/parallel-universe-static-preview-20260608T131932Z.tgz
artifacts/deploy/parallel-universe-vercel-preview-20260608T131932Z.json
```

After Vercel auth is available:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/deploy-vercel-preview.sh
```

## Handoff Decision

This is ready to hand to the backend team as a concrete implementation target.

It is not ready to claim full backend production completion until:

- full backend pytest is green,
- a hosted API origin exists,
- public/staging frontend is built with `VITE_API_LOCAL=false`,
- `/story`, `/create`, and `/studio` are browser-tested against that hosted API,
- Vercel preview credentials are available or a final hosting target is formally changed to GitHub Pages.
