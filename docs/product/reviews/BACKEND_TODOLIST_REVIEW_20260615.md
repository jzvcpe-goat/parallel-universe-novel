# Backend Todo List Review 2026-06-15

Reviewed package:

`/Users/james/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/mo456123zz_036c/temp/drag/parallel-novel-dev-inspection-20260615-152647.zip`

Temporary inspection path:

`/tmp/parallel-novel-dev-inspection-20260615-152647`

## Executive Judgment

The backend team filled the breakpoint documents and delivered a substantial Next.js + FastAPI implementation, but it is not ready to merge directly into the current product mainline.

The strongest parts are API depth, persisted story-project state, quality blocking, BYOK model connection, local commercial smoke tests, and production-readiness blockers that stay explicit. The weakest parts are product-front alignment, creator UX alignment, genre-constraint abstraction, full time-engine completion, Agent Eval, and proof that the claimed backend test suite passed in a reproducible handoff environment.

Current decision:

- Do not merge the delivered `apps/web` into the current Vite frontend.
- Treat `apps/api`, schemas, tests, and scripts as backend reference implementation.
- Require a contract bridge into the current frontend routes before integration.
- Require a second review after backend provides reproducible test evidence or a runnable dev container.

## Verification Performed

Passed during this review:

- Python syntax compile:
  - `python3 -m compileall -q apps/api/app scripts`
- Node dependency install in temp directory:
  - `corepack pnpm install --frozen-lockfile`
- Shared TypeScript typecheck:
  - `corepack pnpm --filter @parallel-novel/shared typecheck`
- Web TypeScript typecheck:
  - `corepack pnpm --filter @parallel-novel/web typecheck`
- Web commercial smoke:
  - `corepack pnpm --filter @parallel-novel/web test:commercial`
  - 12/12 subtests passed.
- Next production build:
  - `corepack pnpm --filter @parallel-novel/web build`

Not fully verified:

- Backend pytest was not completed in this review.
- The package did not include `.venv` or a ready dependency cache.
- Installing Python dependencies from `apps/api/requirements-local.txt` became too slow on `cryptography==44.0.3` and was cancelled.
- Therefore README claims such as `pytest app/tests passed with 196 tests` remain unverified by this review.

## Major Gaps

### 1. Product Frontend Alignment Is Not Solved

The delivered package includes its own Next.js frontend under `apps/web`.

Current product direction says the active frontend is still:

`/Users/james/Documents/PUF/workspaces/integration-harness/app`

That frontend uses Vite + React and exposes the current product routes:

- `/`
- `/story`
- `/create`
- `/library`
- `/studio`
- `/settings`

The delivered Next.js package uses a different route system:

- `/reader`
- `/stories`
- `/stories/{projectId}/reader`
- `/account`
- `/status`
- `/worldlines`
- `/chat/{characterId}`
- `/admin/agents`

This means the backend team's work is not yet wired to the current accepted product shell. It may be useful, but it cannot be treated as the frontend source of truth.

Required fix:

- Backend team must provide a route/API mapping table from their endpoints to the current Vite routes.
- Any proposed frontend import must go through subagent review before merge.
- The current Vite frontend remains canonical unless explicitly replaced.

### 2. Master TODO Document Is Not Self-Contained

`docs/product/breakpoints/BREAKPOINT_TODO_AND_DELIVERY_STANDARD.md` in the delivered package is only a pointer:

`/Users/lili/Desktop/BREAKPOINT_TODO_AND_DELIVERY_STANDARD.md`

This breaks handoff portability. The package should contain the actual filled checklist, not a local desktop pointer.

Required fix:

- Replace the pointer file with the full checklist content.
- Include owner, implementation status, proof command, proof artifact, and unresolved blocker for each breakpoint.
- Remove user-specific paths from handoff docs.

### 3. Breakpoint Docs Are Too Template-Like

All 11 breakpoint documents are exactly 46 lines, with repeated structure. They are useful as a first filing pass, but they do not yet prove that each breakpoint is implemented.

Missing fields:

- owner
- commit or package version
- implemented endpoints
- linked tests
- current proof artifact
- known failing case
- integration status against current Vite frontend
- production or beta scope

Required fix:

- Expand each breakpoint from descriptive checklist to acceptance record.
- Every claim must point to code, test, route, or external artifact.

### 4. Genre Constraints Are Not Abstracted Enough

The delivered `GENRE_CONSTRAINT_RULES.md` covers global quality constraints, but it does not implement the required abstraction from user premise into structured constraint cards.

Missing or not found in package search:

- `setting_cards.genre_constraints`
- `genre_constraint_facts`
- selected-genre constraint profiles
- negative override logic
- explicit abstractions for user premise conditions
- scenario-level constraints such as `western_fantasy_transmigration`, `non_game`, `ban_ancient_chinese_official_roles`

The code has a `genre_kernel` field, but the current kernel creation remains mostly suspense-oriented:

- default `都市悬疑`
- family mystery detection
- evidence/relationship/reversal language

This is not enough to support "user chooses genre first, then constraints are derived from that genre."

Required fix:

- Add a first-class `genre_constraints` structure to story project state.
- Derive constraints from selected genre, premise, negative statements, explicit overrides, and world substrate.
- Store both human-readable cards and machine-enforced facts.
- Add tests for western fantasy transmigration, non-game dungeon fantasy, no ancient Chinese official roles, no game UI terms, no accidental Chinese-office terms unless explicitly requested.

### 5. Time Engine Is Only a Candidate Hook System

The delivered docs correctly say the complete non-homogeneous Poisson/Hawkes simulation is not complete.

Current code supports `TimeCandidateEvent` and select/reject/regenerate flows, but the time engine is not yet the PRD-level engine:

- no visible non-homogeneous Poisson parameterization
- no Hawkes excitation state
- no pressure/maturity/intensity tuning UI
- no event-density controls per phase
- no weekly/monthly tuning loop from reading behavior or market trends

Required fix:

- Keep current candidate events as P0 state primitives.
- Mark PRD time engine as P1 until actual stochastic rhythm logic is implemented.
- Do not present candidate events as "time engine completed."

### 6. Agent Eval Is Mostly Future Contract

The delivered Agent Eval breakpoint explicitly says:

- no public API in current beta
- full 10-case provider comparison is not complete
- no user-facing eval surface

This is honest, but it means Agent Eval is not implemented as a release gate.

Required fix:

- Add an internal eval runner or endpoint.
- Cover genre recognition, constraint application, prohibited terms, era mismatch, state writeback, natural dialogue, quality brake, and multi-model provider differences.
- Make eval output visible only to Studio/Ops.

### 7. Creator UX Still Risks Becoming Form/Status-Oriented

The backend team's creator workbench is centered around `/stories` and story-project forms. It is functional, but it does not yet match the product requirement that creation feel like a natural-language, Socratic dialogue similar to a modern model assistant.

Current accepted frontend already has `/create` with:

- natural language first
- creator reasoning map
- story notes
- market template context
- prompt-driven dialogue session

Required fix:

- Backend should expose dialogue capabilities that support current `/create`, not force users into multi-field story-project forms.
- Story project fields should be derived from conversation and shown as editable notes, not become the primary entry interaction.

### 8. Public Copy Boundary Still Needs Scrubbing If Their Frontend Is Used

Search found public/admin-facing terms in the delivered frontend such as:

- `Agent Console`
- `MOCK_MODE=true`
- `LiteLLM`
- `Mem0`
- `Letta`
- `Graphiti`
- `Dify`
- `provider`
- `mock`
- `fallback`

Some of this is inside admin surfaces, which is acceptable if properly gated. But if any part of `apps/web` leaks into public product surfaces, it violates the current product rule against backend/platform jargon in public routes.

Required fix:

- Keep these terms out of `/`, `/reader`, `/story`, `/create`, `/library`, `/settings`, and share pages.
- Use product copy such as "创作连接", "记忆服务", "发布证据", "运营状态" only inside authorized Studio/Ops.
- Retain current Vite copy-boundary checks and extend them to new routes.

### 9. Multi-Model Support Is More BYOK Than True Orchestration

The package has useful BYOK/provider support:

- DeepSeek
- OpenAI
- OpenAI-compatible
- LiteLLM
- Kimi/Moonshot

But the orchestration layer is still mostly provider selection and connection testing. It does not yet prove task-specific model routing:

- cheap model for classification
- strong model for prose
- small/memo model for structure extraction
- evaluator model for quality brake
- fallback model for retry
- provider-neutral eval comparison

Required fix:

- Define model roles by task, not only by provider.
- Add a routing trace that is internal-only.
- Add tests proving the same story request can run on more than one provider without Kimi/DeepSeek-specific assumptions.

### 10. Commercial Release Chain Is Correctly Blocked, But Not Launchable

The delivered package has a strong commercial-readiness evidence model. It correctly keeps production readiness blocked without external evidence.

Still missing:

- real payment provider evidence
- real OIDC provider evidence
- production observability
- production queue/DLQ evidence
- external load test
- real adapter integration evidence
- legal/privacy/security artifacts
- remote CI evidence

Required fix:

- Keep this as launch-governance infrastructure, not as completed launch.
- Product can proceed to external beta only if beta scope excludes paid production launch.

### 11. Reproducible Backend Test Evidence Is Missing From The Package

The README claims extensive test success, including backend 196 tests, commercial audit, browser regression, and release local runs. The zip does not include the generated evidence bundle or CI logs needed to independently verify those claims.

Required fix:

- Include latest test logs or CI artifact URLs.
- Include commercial evidence bundle output.
- Include browser regression screenshots/artifacts.
- Include exact command transcript with environment variables redacted.
- Include a one-command dev container or bootstrap script that can finish dependency installation reliably.

## Breakpoint Status After Review

| Breakpoint | Status | Judgment |
| --- | --- | --- |
| 世界引擎 | Partial | Strong data model and endpoints exist, but not bridged to current Vite frontend. |
| 类型内核 | Partial | `genre_kernel` exists, but constraints are too generic and suspense-biased. |
| 时间引擎 | Partial | Candidate events exist; PRD stochastic engine not complete. |
| 状态回写 | Partial | Story state models exist; needs current frontend contract and state-card acceptance proof. |
| 多模型编排 | Partial | BYOK/provider support exists; role-based orchestration not proven. |
| 质量刹车 | Good partial | Strong quality-blocking model exists; needs current route integration and broader genre constraints. |
| Agent Eval | Not done | Mostly future contract; no implemented gate. |
| Codex Harness | Partial | Many scripts exist, but reproducible evidence not packaged. |
| Web 阅读入口 | Not aligned | Delivered routes differ from accepted current frontend routes. |
| 创作者工作台 | Partial | Functional story-project flow; not yet Socratic/natural-language-first. |
| 商业化发布链路 | Partial | Good governance model; production remains blocked by design. |

## Recommended Next Actions

1. Ask backend team to resend a self-contained evidence bundle:
   - full filled breakpoint checklist
   - backend pytest log
   - browser regression artifacts
   - commercial audit JSON/Markdown
   - external smoke result or explicit blocker

2. Create a contract bridge document:
   - current Vite route
   - required API
   - delivered backend endpoint
   - gap
   - owner
   - acceptance test

3. Extract only backend/API assets for integration:
   - `apps/api/app/main.py`
   - `apps/api/app/schemas.py`
   - `apps/api/app/db/*`
   - relevant tests
   - scripts that support smoke/evidence

4. Do not import `apps/web` unless reviewed separately:
   - current frontend remains canonical
   - any imported component must pass design-system and public-copy gates

5. Make genre constraints the next backend integration goal:
   - add `setting_cards.genre_constraints`
   - add `genre_constraint_facts`
   - add selected-genre derived constraints
   - add tests for western-fantasy transmigration and non-game dungeon constraints

6. Treat time engine, Agent Eval, and commercial production readiness as P1/P2:
   - do not block the next external beta on them
   - do not claim them complete

## Merge Recommendation

Do not merge the zip wholesale.

Accept as reference:

- backend schema ideas
- quality-blocking implementation
- story-project persistence
- BYOK vault and provider tests
- launch evidence governance
- commercial smoke scripts

Reject for direct merge:

- duplicate Next.js frontend
- route system replacing current Vite frontend
- template-like breakpoint docs as final proof
- local desktop pointer master checklist
- incomplete Agent Eval
- incomplete PRD time engine

