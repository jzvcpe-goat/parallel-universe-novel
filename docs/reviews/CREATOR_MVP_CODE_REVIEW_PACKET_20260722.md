# Creator MVP Code Review Packet

Status: `historical_superseded`

Date: 2026-07-22

Repository: `jzvcpe-goat/parallel-universe-novel`

Branch: `review/creator-mvp-r0-20260722`

Historical review head before the final evidence commit: `b912da5` (not an authoritative current R0 head)

> This packet preserves the pre-R0 audit context only. The current R0 review authority is `CREATOR_MVP_R0_REVIEW_MANIFEST_20260722.md`, `CREATOR_MVP_R0_EVIDENCE_HASHES_20260722.json`, and `CREATOR_MVP_CURRENT_STATUS_LEDGER_20260722.md`. Do not use this packet's dated dependency counts or commit references as current release evidence.

## 1. Review Objective

Review the current Parallel Universe Novel Creator implementation as a localhost-only, author-controlled MVP. Prioritize correctness, data loss, privacy, stale-state handling, author-control boundaries, long-form continuity, and maintainability.

This is not a request to review payment, production deployment, or unapplied Supabase migrations. Those are separately owned workstreams.

The review must be findings-first. Do not treat passing static gates, fixture tests, or stored validation receipts as proof that runtime behavior or literary quality is correct.

## 2. Critical Source-of-Truth Warning

The current Git commit does not contain most of the code that needs review.

At the pre-R0 worktree snapshot recorded locally:

- `origin/main` is `76ba3f8`.
- the packaging branch starts from one commit ahead at `873b057`;
- the working tree contains 107 tracked changes;
- the working tree contains 883 untracked files;
- no pull request exists for the current work;
- the branch has no upstream;
- GitHub `main` is not protected.

Therefore:

1. Review `origin/main..review/creator-mvp-r0-20260722`, using the five documented commit boundaries.
2. Do not treat the excluded local worktree files as PR evidence.
3. Do not use `git add .`; validation images and local evidence require privacy curation.
4. Treat database/payment files under `deploy/supabase` as out of scope unless a database owner explicitly requests review.

## 3. Product Invariants

Any finding that violates these invariants is release-blocking:

- Reader remains non-generative.
- Unpublished prose and private creative interpretation remain local.
- Model output remains a candidate until an explicit author action.
- Candidate adoption, Canon commit, publication, destructive import, and destructive cleanup require author confirmation.
- A stale Context, draft, review, repair, or Canon Patch must fail closed.
- A repair cannot overwrite a newer author edit.
- A finding must point to locatable current-text evidence.
- Advisory literary lenses cannot become Canon hard blockers.
- Automatic retrieval remains disabled unless the frozen activation benchmark passes.
- Author-selected recall is a hard include and cannot be removed by automatic retrieval.
- MiroFish output cannot directly mutate character cards, manuscript, Canon, or publication state.
- No composite literary score is allowed.

Primary contracts:

- `AGENTS.md`
- `docs/product/CREATOR_DECISION_WORKBENCH_V1.md`
- `docs/product/CREATOR_WRITING_ASSISTANCE_DEVELOPMENT_HANDOFF_20260718.md`
- `docs/research/CREATOR_LITERARY_VALUE_INFRASTRUCTURE_AUDIT_20260721.md`
- `docs/data-contracts/creator-rag-open-source-boundary.md`
- `docs/agent-protocol/creator-working-agent-role-runtime.md`

## 4. Architecture Under Review

### 4.1 Creator routes and orchestration

Review:

- `app/src/apps/creator/LocalCreatorApp.tsx`
- `app/src/apps/creator/creatorRouteRegistry.ts`
- `app/src/apps/creator/routes/CreatorEditorRoute.tsx`
- `app/src/apps/creator/routes/useCreationDecisionSession.ts`
- `app/src/apps/creator/routes/CreatorEditorManuscriptStage.tsx`
- `app/src/apps/creator/routes/CreatorEditorRails.tsx`
- `app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx`

Questions:

- Do routes own only React composition and effects?
- Has business meaning leaked back into routes?
- Are async callbacks protected against stale closure and late-result writes?
- Do canonical Pivot paths behave identically to compatibility paths?
- Can refresh or route restoration replace a newer manuscript with an older draft?

### 4.2 Creation-decision domain

Review:

- `app/src/features/creator-decision/creationDecisionWorkflow.ts`
- `app/src/features/creator-decision/localWorkingAgent.ts`
- `app/src/features/creator-decision/candidateQualityGate.ts`
- `app/src/features/creator-decision/literaryReview.ts`
- `app/src/features/creator-decision/literaryReviewVerification.ts`
- `app/src/features/creator-decision/longformContinuity.ts`
- `app/src/features/creator-decision/longRangeStoryThreads.ts`
- `app/src/features/creator-decision/characterState.ts`
- `app/src/features/creator-decision/storyStateEvidence.ts`
- `app/src/features/creator-decision/canonPatch.ts`
- `app/src/features/creator-decision/literaryValueEvaluation.ts`

Questions:

- Can any Agent result enter manuscript or Canon without a separate author action?
- Are draft, Context, review, repair, and Canon revisions compared at every write boundary?
- Can evidence remain syntactically valid while pointing to superseded prose?
- Are independent review and repair verification genuinely separate calls and identities?
- Can one finding consume multiple blocks or trigger a whole-chapter rewrite?
- Are zero-finding and rejected-finding results represented honestly?
- Are Kernel, Constraint, timeline, relationship, and trust metrics left unmeasured when no typed receipt exists?

### 4.3 Local persistence and recovery

Review:

- `app/src/local-db/schema.ts`
- `app/src/local-db/creatorLocalRepository.ts`
- `app/src/local-db/creatorLocalDecisionRepository.ts`
- `app/src/local-db/creatorLocalDraftBodyStore.ts`
- `app/src/local-db/creatorLocalWorkspacePackage.ts`

Questions:

- Are schema v3-v10 migrations idempotent and one-way where required?
- Can legacy import run again after its receipt exists?
- Are OPFS and IndexedDB fallback writes atomic from the caller's perspective?
- Do Web Locks/CAS and BroadcastChannel handling prevent silent lost updates?
- Does export/import preserve integrity without including prohibited private or transient data?
- Can a failed import be rolled back without changing current work?

### 4.4 Agent action surface

Review:

- `app/src/agent-surface/actions.ts`
- `app/src/agent-surface/executor.ts`
- `app/public/creator/agent-manifest.json`
- `scripts/creator-working-agent-bridge.mjs`
- `scripts/creator-working-agent-roles.mjs`

Questions:

- Does every declared manifest action have one executable owner?
- Are high-risk actions impossible without an unexpired local confirmation receipt?
- Can an Agent widen its read scope or write public state by altering input fields?
- Are operation logs redacted and free of manuscript bodies, credentials, and raw model reasoning?
- Are role identities and independent-review separation enforced rather than prompt-only?

### 4.5 Recall and retrieval

Review:

- `app/src/integrations/creator-rag/`
- `app/src/apps/creator/routes/creatorEditorLocalChapterMemoryService.ts`
- `app/src/features/creator-decision/longRangeThreadRecall.ts`
- `scripts/creator-rag-benchmark-evaluator.mts`

Questions:

- Is product retrieval only a thin adapter around upstream libraries?
- Is automatic retrieval still shadow-only and disabled?
- Can automatic results remove or override author-selected recall?
- Do all memory items retain work, branch, chapter, revision, locator, and Canon-fingerprint boundaries?
- Are candidate-only narrative mechanisms excluded from historical Canon recall?

### 4.6 Publish package boundary

Review:

- `app/src/features/creator-pivot/publishBundle*`
- `app/src/apps/creator/routes/creatorPublishBundle*`
- `app/src/apps/creator/routes/CreatorPublishBundleRoute.tsx`

Questions:

- Is a package immutable after author confirmation?
- Is checksum/idempotency binding preserved through retry and receipt import?
- Can uncertain publication outcomes be retried unsafely?
- Is browser-owned direct multi-table publication excluded from the canonical path?
- Are cloud transaction claims kept separate from repository-only contracts?

## 5. Highest-Risk Files

The following files deserve focused maintainability and ownership review because of their current size or responsibility density:

| File | Approximate lines | Review concern |
| --- | ---: | --- |
| `app/src/features/creator-decision/localWorkingAgent.ts` | 1570 | schema, role routing and runtime concerns may be too coupled |
| `app/src/features/creator-decision/creationDecisionWorkflow.ts` | 1393 | large state-transition and side-effect surface |
| `app/src/features/creator-decision/types.ts` | 1064 | domain contract drift and overly broad shared types |
| `app/src/local-db/creatorLocalRepository.ts` | 1052 | persistence, migration and concurrency ownership density |
| `app/src/local-db/creatorLocalDecisionRepository.ts` | 867 | decision persistence and invalidation correctness |
| `app/src/apps/creator/routes/useCreationDecisionSession.ts` | 647 | React/runtime orchestration and stale async risk |
| `app/src/apps/creator/routes/CreatorEditorRoute.tsx` | 598 | route-controller regression risk |
| `app/src/index.css` | 5220 | global cascade and obsolete selector leakage |

Large files are not defects by themselves. Report only concrete cohesion, ownership, testability, race, or behavior problems.

## 6. Known Open Issues

These are known before review and should not be rediscovered as if they were new:

1. The Chapter 1-20 literary-evidence npm command contains a machine-specific absolute workspace path.
2. Canonical Pivot routes currently reuse compatibility page elements; browser route QA mainly covers compatibility URLs.
3. Recommendation/finding no-op, stale, error and refresh browser coverage is incomplete.
4. One-sentence story-seed entry is not fully integrated into the current Creator route.
5. Relationship-inconsistency evaluation has an interface but no independently verified evaluator.
6. Kernel, Constraint and timeline outcomes do not yet produce typed, evidence-located evaluation receipts.
7. The author-facing Canon recovery-path chooser is not implemented.
8. A successful real-model post-repair author-direction receipt has not been demonstrated.
9. Provider disconnect, throttling and recovery lack complete browser E2E.
10. Stable literary-quality improvement and professional human blind-review agreement remain unproven.
11. Automatic retrieval is intentionally disabled; current benchmark evidence does not authorize activation.
12. MiroFish remains conditional on AGPL distribution review and human evidence.
13. Creator production JS is approximately 1.15 MB minified; the `pmfSupabase.ts` dynamic import is neutralized by static imports.
14. `npm audit --omit=dev` currently reports 7 high, 4 moderate and 1 low production-dependency vulnerabilities.
15. The root README security note understates the current audit result.
16. No authoritative Gitleaks scan has been completed in this worktree.
17. GitHub `main` lacks branch protection and the repository has no CODEOWNERS or issue templates.
18. The proposed MVP CI workflow has not run on GitHub from a clean clone.
19. The scheduled Reader health workflow currently fails with DNS resolution failure for the configured Supabase project; the root cause is separately owned and not proven by this packet.
20. Some validation-document status lines are chronologically stale relative to later Chapter 20 evidence.

## 7. Current Verification Snapshot

Executed locally on 2026-07-22:

| Command | Result | Boundary |
| --- | --- | --- |
| `npm run check:pivot` | PASS | contracts, ownership, storage, Agent, Echo, bundle and UI gates |
| `npm run test:creator` | PASS | Creator domain, recall, quality, evidence and static product checks |
| `npm --prefix app run build:creator` | PASS with bundle-size warning | build success, not performance acceptance |
| `git diff --check` | PASS | whitespace only |
| `npm run qa:local-creator-routes` | PASS | signed-out compatibility routes in Google Chrome |
| `npm run qa:local-creator-authenticated-routes` | PASS | authenticated compatibility routes in Google Chrome |
| `npm audit --omit=dev` | FAILS policy target | 7 high, 4 moderate, 1 low vulnerabilities |
| Gitleaks | NOT RUN | command is not installed |

Passing checks do not prove production deployment, payment, cloud database application, stable literary improvement, professional human preference, or automatic retrieval quality.

## 8. Review Priorities

Order findings by:

1. P0: data loss, private-data disclosure, unauthorized Canon/public write, author-edit overwrite, confirmation bypass, unsafe import/publication retry, exploitable dependency.
2. P1: stale result accepted, wrong recall/Canon scope, invalid evidence locator, route behavior divergence, migration corruption, model role separation failure.
3. P2: missing edge-case tests, excessive coupling, bundle/performance regression, global CSS leakage, documentation that can cause an incorrect release claim.
4. P3: naming, duplication, local cleanup and low-impact maintainability issues.

Do not report generic preferences such as “split this file” without identifying a concrete responsibility conflict or defect risk.

## 9. Required Reviewer Output

Use this format:

```md
## Findings

### [P0/P1/P2/P3] Short title
- File and exact line
- Current behavior
- Reproduction or failing scenario
- User/product impact
- Smallest safe fix
- Missing regression test

## Open Questions
- Only questions that block a correctness judgment

## Verified Strengths
- Evidence-backed strengths only

## Residual Risk
- What remains unverified after the proposed fixes
```

If no actionable finding exists in an area, say so explicitly and identify the remaining test gap. Do not infer correctness from file naming, comments, static gate strings, or validation JSON alone.

## 10. Prompt For GPT Code Review

```text
You are reviewing the current live worktree of Parallel Universe Novel, not only the committed HEAD.

Read AGENTS.md and docs/reviews/CREATOR_MVP_CODE_REVIEW_PACKET_20260722.md first. Then inspect the actual code and diff. Prioritize bugs, behavioral regressions, data loss, privacy leakage, stale async writes, incorrect revision/fingerprint handling, author-confirmation bypass, retrieval-scope mistakes, migration/recovery faults, and missing tests.

Keep Reader and Creator boundaries separate. Do not propose cloud generation, automatic Canon writes, automatic publishing, a custom RAG engine, a composite literary score, or storage of unpublished prose in public/cloud evidence.

Database migrations, RLS, payment and production deployment are out of scope except where Creator code incorrectly claims or bypasses those boundaries.

Lead with findings ordered by severity. Every finding must include an exact file/line, a concrete failing scenario, impact, smallest safe fix and regression test. Do not praise or summarize before findings. Do not call interface-only code implemented. Do not treat passing gates or stored receipts as proof of runtime or literary quality.
```

## 11. Pre-Review Packaging Requirement

For a complete review, first create bounded commits or a draft PR so the reviewer can see all intended source files without including raw workspaces, unpublished manuscript screenshots, local exports, secrets, generated build output, or database/payment changes.

Recommended commit boundaries:

1. governance, contracts and checks;
2. local data, migration and Agent surface;
3. Creator decision and long-form quality domain;
4. Creator routes and UI composition;
5. curated hash-only validation evidence and documentation.

Until that packaging is complete, any code review is necessarily partial.
