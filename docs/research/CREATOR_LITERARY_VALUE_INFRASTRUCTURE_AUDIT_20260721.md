# Creator AI Writing System: Literary Value Infrastructure Audit

Date: 2026-07-21

Scope: local Creator writing workflow only. No cloud generation, payment, Reader runtime generation, publication change, or Chapter 21 work is included.

## Decision

The repository already has substantial evidence-bound writing infrastructure. The immediate gap was not another free-form literary judge. It was a local, reproducible way to aggregate what the existing review, continuity, Canon and author-decision records can actually establish, while exposing what remains unmeasured.

This audit therefore adds the P0 `creator-literary-value-evidence.v1` report. It records coverage and author-controlled outcomes without producing a composite literary score or claiming stable improvement.

## Current Architecture Map

| Area | Existing owners | Current evidence | Missing or deliberately absent |
| --- | --- | --- | --- |
| Chapter review | `app/src/features/creator-decision/literaryReview.ts`, `literaryReviewVerification.ts`, `candidateQualityGate.ts` | 11 dimensions, exact prose locators, deterministic rules, independent Auditor verification | No aggregate evidence report before this change; no stable quality claim |
| Character and state | `characterState.ts`, `storyStateEvidence.ts`, `historicalStateBackfill.ts` | 22 evidence-bound state dimensions; Canon operations require manuscript evidence | No verified relationship-inconsistency evaluator; state changes are not automatically judged as drift |
| Long-form continuity | `longformContinuity.ts`, `longRangeStoryThreads.ts`, `scripts/run-creator-longform-continuity-campaign.mts` | Adjacent causal/knowledge/timeline/promise/foreshadowing/motivation/setting/voice checks; non-adjacent thread checks | Existing runs are bounded evidence assets, not a 100-chapter quality proof |
| Context and recall | `contextCompiler.ts`, `creatorEditorLocalChapterMemoryService.ts`, manual recall services, `app/src/integrations/creator-rag/` | Kernel, constraints, timeline, selected recall and recent scenes enter a fingerprinted Context Snapshot; author-selected recall is a hard include | Automatic retrieval remains disabled because local retrieval benchmarks did not meet activation criteria; no custom Graph RAG is added |
| Canon recovery | `candidateQualityGate.ts`, `canonPatch.ts`, `longformContinuity.ts`, local repair workflow | Conflicts are located, later text is the only repair target, and Canon requires author confirmation | No author-facing 2-3 recovery-path chooser; no automatic rewrite |
| Publish package | `app/src/features/creator-pivot/publishBundle*`, local publish repositories and routes | Local package, receipt, confirmation and recovery contracts exist | Cloud transaction/production deployment are outside this task and owned elsewhere |
| Author workflow | `creationDecisionWorkflow.ts`, `creatorLocalDecisionRepository.ts` | `finding_accepted`, `finding_deferred`, `finding_dismissed`, `repair_rejected`, repair statuses and local events exist | No previous deduplicated acceptance/rejection/repair-outcome aggregation; trust needs explicit author input |

## P0 Evidence Layer Implemented Now

`app/src/features/creator-decision/literaryValueEvaluation.ts` creates a pure local report from existing records and frozen public campaign receipts:

- Product/advisory finding verification counts and deterministic violations.
- Character signals for personality drift, motivation drift and evidence-backed committed goal changes.
- World/Canon signals for classified Kernel/Constraint receipts when supplied, timeline contradictions and setting consistency.
- Narrative signals for pacing, tension, information control and foreshadowing/payoff.
- Deduplicated latest author choice per finding: adopt, reject, keep original, later or unspecified dismissal.
- Bounded repair outcomes without converting them into a literary score.
- Chapter 1-20 adjacent-continuity and long-range-thread receipts only when they prove independent verification, no Chapter 21 access, no Canon/cloud side effect, and hash-only repository evidence.
- Explicit `not_measured` status for relationship inconsistency and author trust when no qualifying evidence exists.

The report intentionally stores no draft body, evidence quote, repair text or raw manuscript. It does not treat zero findings as proof that no defect exists.

## Priority Ranking

### P0: required to make a literary-value claim testable

| Change | Decision | Why | Owners and tests | Regression risk |
| --- | --- | --- | --- | --- |
| Aggregate evidence ledger | Implemented now | Existing records could not answer what was reviewed, independently verified, author-decided or left unmeasured | `literaryValueEvaluation.ts`, `creator-literary-value-evidence.ts`, `validate-creator-literary-value-evidence.mts` | Reporting code could overclaim; the checker rejects stable-improvement, human-review, automatic-RAG and private-prose claims |
| Classify Kernel/Constraint outcomes | Interface only | Context contains Kernel/Constraint inputs, but current review receipts do not classify their outcomes separately | `ConstraintEvaluationSignal` in `literaryValueEvaluation.ts`; feed from an existing gate only after its output is typed and evidence-located | Misclassifying generic deterministic violations as Kernel failures |
| Explicit trust pulse | Interface only | Interaction behavior is not author trust | `AuthorTrustSignal` in `literaryValueEvaluation.ts`; add local author-controlled capture only after consent/copy/retention design | Treating acceptance rate as satisfaction |
| Frozen comparison protocol | Keep and extend only after human review design | Existing anonymous paired campaigns are useful evidence, but do not establish a winner or a general improvement | Existing paired campaign scripts and `validation/creator-ui/frozen-paired-quality-*` | Prompt tuning from a single sample |

### P1: required for stronger long-form scale evidence

| Change | Decision | Why | Existing files | Tests required |
| --- | --- | --- | --- | --- |
| Relationship-inconsistency evaluator | Interface only | The 22 dimensions persist `relationshipStances` and `trust`, but no independently verified contradiction evaluator exists | `characterState.ts`, `storyStateEvidence.ts`, `longformContinuity.ts` | Evidence locator, state-path boundary, independent verification and author-choice tests |
| Canon recovery-path chooser | Interface only | Current repair flow correctly avoids automatic rewrite; recovery options need an explicit author choice contract | `longformContinuity.ts`, `creationDecisionWorkflow.ts`, `localRepairIntentPreservation.ts` | 2-3 genuinely distinct paths, no prior-chapter rewrite, no Canon commit without confirmation |
| Arc/book evaluation cadence | Do not implement until validation design exists | Chapter and bounded-window evidence cannot be averaged into a book verdict | `longformContinuity.ts`, `longRangeStoryThreads.ts` | Frozen corpus, blinded reviewers, predefined sampling and stopping rules |
| Automatic retrieval activation | Do not implement until benchmark passes | Current open-source adapter/benchmark is intentionally disabled | `docs/data-contracts/creator-rag-open-source-boundary.md`, `app/src/integrations/creator-rag/` | Activation threshold, source locators, author-selected hard includes and no-custom-RAG gate |

### P2: future expansion only

- Professional-editor blind evaluation across multiple genres and authors.
- Longitudinal author-trust and revision-time study with explicit consent.
- Production publication analytics or Reader continuation correlation.
- Any cloud or hosted runtime. These are excluded by the frozen product architecture.

## Incremental Implementation Plan

| Step | Why needed | Existing files involved | New files | Data impact | Required tests | Risk control |
| --- | --- | --- | --- | --- | --- | --- |
| 1. Evidence aggregation | Convert local facts into an auditable report | review, repair, event and Canon Patch contracts | `literaryValueEvaluation.ts` | Read-only; no new persistence | Unit fixture for verified findings, decisions, repairs, trust absence | No composite score; no prose fields |
| 2. Real package run | Prove the aggregator consumes actual local records, not only fixture data | workspace package schema and decision records | `validate-creator-literary-value-evidence.mts` | Reads package only | Real v10 workspace package run | Output contains package hash/counts only |
| 3. Claim-boundary gate | Prevent later report drift into unsupported claims | package scripts and validation report | `check-creator-literary-value-evidence.mjs` | None | Fail closed on private prose or false readiness flags | Wired into `test:creator` |
| 4. Kernel/Constraint adapter | Separate world-rule measurements from generic violations | Context/gate owners | no new owner until source contract is typed | Interface only | Typed receipt mapping tests | Do not infer category from error text |
| 5. Recovery path chooser | Give the author alternatives instead of automatic repair | continuity and local repair workflow | future bounded recovery-path module | New local decision only | Choice, stale, no-auto-write, Canon confirmation tests | Never touch accepted history automatically |

## Real Local Evidence Run

The command below reads the current v10 local workspace package without importing it, changing Canon, changing publication state, enabling automatic retrieval, or accessing Chapter 21:

```bash
npm run validate:creator-literary-value-evidence:chapter-1-20
```

The generated report records 93 review records, six latest author finding decisions and 56 repair records. It also includes one independently verified adjacent-continuity receipt and one independently verified long-range-thread receipt, both bounded to Chapters 1-20. It records zero accepted/rejected repair outcomes in that package and therefore leaves repair acceptance rate `null`; it does not convert that absence into either success or failure. Relationship inconsistency and author trust are both `not_measured` because qualifying evidence is not present.

## Non-claims

- This work does not prove stable literary-quality improvement.
- It does not complete professional human blind review.
- It does not enable automatic RAG, Graph RAG, cloud generation, payment, publication or Chapter 21.
- It does not interpret a dismissed suggestion as a negative trust signal or an adopted suggestion as a quality gain.
