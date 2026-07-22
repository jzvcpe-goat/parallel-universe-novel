# ColinLi98 R0 Review Handoff

Date: 2026-07-22

## Purpose

`ColinLi98` is joining this repository first as the independent reviewer for Creator MVP R0.

R1 has not started. Do not begin R1 implementation, database work, payment work, deployment work, or product redesign until R0 receives an independent approval, is merged, and is frozen on `main`.

## Required Order

```text
Independent R0 review
-> approve or request changes
-> merge R0 into main
-> create creator-mvp-r0 tag
-> create R1-A0 from main
-> implement and review R1
```

The current review target is [Draft PR #1](https://github.com/jzvcpe-goat/parallel-universe-novel/pull/1): `Creator MVP R0 review package`.

## R0 Scope

R0 is a reviewable local Creator baseline. It includes governance, local workspace boundaries, agent action surface, decision and quality safeguards, route cleanup, and sanitized review evidence.

R0 does not claim or include:

- Applied database migrations, RLS verification, or cloud publish transactions.
- Payment, entitlements, or production deployment.
- Stable literary-quality improvement.
- Public storage of unpublished prose or private creative decisions.
- Automatic canon commits or automatic publishing.

## Read First

1. `AGENTS.md`
2. `docs/reviews/CREATOR_MVP_R0_REVIEW_MANIFEST_20260722.md`
3. `docs/reviews/CREATOR_MVP_CODE_REVIEW_PACKET_20260722.md`
4. `docs/reviews/CREATOR_MVP_CURRENT_STATUS_LEDGER_20260722.md`
5. `docs/reviews/CREATOR_PUBLIC_EVIDENCE_ALLOWLIST.md`
6. `docs/launch/MVP_COLLABORATION_HANDOFF_20260721.md`
7. GitHub issue [#6](https://github.com/jzvcpe-goat/parallel-universe-novel/issues/6), the post-merge freeze checklist.

## Review Responsibilities

Review the R0 changes as an independent collaborator, not as the PR author.

### 1. Product and local-data boundary

- Creator remains a localhost author workspace.
- Unpublished prose and private creative decisions remain local.
- Reader remains non-generative.
- No database, payment, or deployment work is silently mixed into R0.

### 2. Agent action safety

- Agent actions have explicit risk and side-effect metadata.
- Candidate, Canon, and publish states remain distinct.
- No path lets an agent commit Canon or publish without author confirmation.
- Private payloads do not enter ordinary logs or public evidence.

### 3. Recall and writing-quality boundary

- Author-selected recall items stay hard includes.
- Retrieval code remains an upstream-adapter boundary, not a custom RAG engine.
- Findings locate evidence in prose or state instead of relying on an aggregate literary score.
- The PR does not overclaim literary-quality improvement.

### 4. Review-package integrity

- Public evidence contains no unpublished prose, private workspace packages, credentials, or screenshots with sensitive data.
- The narrow Gitleaks annotations are limited to exact artifact digests.
- CI checks correspond to the stated R0 boundary.

## Required Local Verification

Run these from the repository root after checkout:

```bash
npm ci --include=optional
npm --prefix app ci --include=optional
npm run check:pivot
npm run test:creator
npm run build:creator
```

Expected R0 limitation: a successful local Creator build may still emit a bundle-size warning. This is not a performance acceptance result.

## GitHub Review Procedure

1. Open [PR #1](https://github.com/jzvcpe-goat/parallel-universe-novel/pull/1).
2. Confirm all three checks are green: `Local Creator MVP boundary`, `Diff hygiene`, and `Secret scan`.
3. Read the PR description and the documents above.
4. Review `Files changed`; add line comments for concrete defects or boundary violations.
5. Submit one of: `Comment`, `Request changes`, or `Approve`.
6. If code changes after approval, re-review the updated commit before approving again.

Do not approve if the PR includes unreviewed cloud, payment, deployment, private-artifact, or literary-quality claims.

## Decision After Review

### If changes are required

- Use `Request changes` with file and line references.
- Keep new scope out of R0. Open a separate issue for work that belongs in R1 or in a cloud/payment/deployment workstream.
- Re-review only after CI is green again.

### If R0 is acceptable

- Submit `Approve` on PR #1.
- The repository owner resolves all conversations and merges the PR through GitHub branch protection.
- The owner follows issue #6 to create the `creator-mvp-r0` tag and record the frozen commit.

## R1 Starts Only After the Tag

After `creator-mvp-r0` exists on `main`, the first R1 task is [#7](https://github.com/jzvcpe-goat/parallel-universe-novel/issues/7): `R1-A0: Enforce Creator tool orchestration safety contract`.

R1-A0 must land before the author-guided workflow in [#2](https://github.com/jzvcpe-goat/parallel-universe-novel/issues/2). It owns the safety boundary for tool-result validation, risk classification, confirmation, retry limits, idempotency, private audit, and abnormal-path tests.

## External Repository Boundary

The collaborator's repository, [ColinLi98/narrativeos-agent](https://github.com/ColinLi98/narrativeos-agent), is not part of this repository's R0 scope.

- Do not copy code, add dependencies, or couple runtime behavior across repositories without a separate proposal and review.
- It may be used as a reference during R1 planning only when the source, license, compatibility, privacy boundary, and test plan are recorded.
- This repository remains the source of truth for Creator MVP work.

## Escalation

Escalate to the repository owner when a review finding affects product scope, private-data handling, Canon/publish permissions, cloud authorization, or the validity of a public claim.
