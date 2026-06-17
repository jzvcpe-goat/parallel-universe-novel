# Reuse Audit

Status: active execution baseline  
Last updated: 2026-06-16

This audit prevents duplicate development while the project adopts the NarrativeOS Quantum v3 onboarding contract. The current repository is an integration harness, not the final physical monorepo. The first execution round adds adapters and facades around existing assets before moving folders.

## Decisions

| Area | Current asset | Decision | Rationale |
|---|---|---|---|
| Product frontend | `app` Vite + React + TypeScript | use as-is | This is the only approved product frontend. External frontends remain reference-only until explicit review. |
| Creator entry | `app/src/pages/Create.tsx` and design-system creator components | wrap | Keep the current conversational UI and switch the submit path through the agent workflow. |
| Reader entry | current `/`, `/library`, `/story`, `/settings` routes | use as-is for now | Reader Web physical split is out of scope for this round. |
| shadcn/glass UI | `app/src/components/*`, `app/src/styles/*`, design-system docs | use as-is | The product already has an established glass UI surface. |
| Creator dialogue backend | `CreatorDialogueService` and `/v1/creator/dialogue/*` | wrap | Reuse existing Socratic prompt, constraints, and local fallback through Tool Bridge. |
| Product runtime backend | `/v1/reader/snapshot`, `/v1/scene/advance`, `/v1/quality/evaluate`, `/v1/canon/commit` | wrap | Existing services remain business facts behind FastAPI facades. |
| Constraint logic | existing prompt-specific guardrails in `creator_dialogue.py` | retire for new chain | The new Mastra/Tool Bridge path must use the v3 documentation registry. Legacy rules remain only to avoid breaking old endpoints. |
| Agent framework | ad hoc services and final-package `AgentContract` schema | migrate | Mastra becomes the orchestration and run-ledger layer, but cannot own business state. |
| Runtime engine | current Python pipeline/product runtime services | wrap | Runtime stays FastAPI-side. Mastra calls it through Tool Bridge only. |
| Backend team assets | prior FastAPI models/routes/tests/docs | migrate selectively | Backend/non-UI code may be mined after file-level review. No whole-package merge. |
| External frontend code | backend-team `apps/web` or other UI packages | retire by default | Duplicate frontend is blocked unless a later approval accepts a small extract. |

## Current Transition Strategy

1. Keep current folders in place.
2. Add `packages/agent-runtime` as the Mastra-compatible orchestration package.
3. Add FastAPI Tool Bridge endpoints under `/v1/tools/runtime/*`.
4. Point `/create` to agent workflow first, falling back to the existing Creator Dialogue API and local draft generation.
5. Only after this chain is verified, consider physical folder migration into `apps/*`, `packages/*`, and `services/*`.

## Guardrails

- Do not move the current frontend during this round.
- Do not merge any external frontend without separate review.
- Do not let Mastra connect directly to business PostgreSQL.
- Do not let Reader Web call high-cost live generation by default.
- Do not allow AI output to enter canon without Quality Brake and author confirmation.
- Do not reuse prompt-specific guardrails for the new P4 chain; rebuild constraints from the v3 baseline and final seeds.
