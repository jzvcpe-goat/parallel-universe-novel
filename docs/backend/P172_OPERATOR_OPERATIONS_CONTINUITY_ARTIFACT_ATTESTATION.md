# P172 Operator Operations Continuity Artifact Attestation

Status: active release evidence gate  
Boundary: current-run artifact content check only  
Owner: release engineering  
Date: 2026-06-25

## Purpose

P170 generates the operations-continuity proof for the zero-cost Reader path:
GitHub Actions keep-alive needs manual/monthly attention, `.env.local.sync`
must stay local-only and backed up outside Git, and `novels_history` is manual
SQL recovery material rather than one-click rollback.

P171 made that proof visible as the `operator-operations-continuity` artifact.
P172 downloads that artifact from the same Pages run and verifies its content,
so the release chain no longer relies on "uploaded therefore trusted" logic.

## Content Contract

`check:operator-operations-continuity-artifact` verifies:

- the downloaded packet has `gate: P170_OPERATOR_OPERATIONS_CONTINUITY`;
- `status` is `passed`;
- all nine continuity flags remain `true`;
- boundary flags still say the gate does not create services, write local env
  values, upload secrets, promote live runtime, or mark operator evidence
  complete;
- `valuesIncluded` is `false`;
- `nextGoal` remains `operator-assignment-evidence-intake`;
- the payload contains no provider keys, database URLs, Supabase origins, prompt
  plumbing, profile ids, kernel ids, source refs or representative-work terms.

## Workflow Placement

Pages runs the content check after:

```text
Check operator assignment current-head coherence artifact content
```

and before:

```text
Check operator assignment transition fixture artifact content
```

That placement keeps the operator loop ordered as:

```text
P130/P131 command consistency -> P132 current head -> P172 operations continuity -> P133 transition fixture
```

## Commands

Local/generator mode:

```bash
npm run check:operator-operations-continuity
npm run check:operator-operations-continuity-artifact
```

Current-run mode:

```bash
CHECK_OPERATOR_OPERATIONS_CONTINUITY_ARTIFACT_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
CHECK_GITHUB_ARTIFACTS_RUN_ID=<pages-run-id> \
npm run check:operator-operations-continuity-artifact
```

Release chain:

```bash
npm run check:ci-artifact-content-coverage
npm run check:pages-live-release-gate
npm run test
```

## Acceptance

1. `package.json` exposes `check:operator-operations-continuity-artifact`.
2. Root `npm run test` runs P172 immediately after P170 and before P121 loop
   goal selection.
3. Pages workflow runs P172 in current-run mode after the current-head
   coherence content gate and before the transition fixture content gate.
4. P107 classifies `operator-operations-continuity` as `download_content_gate`.
5. P16/P43/P171 describe P170/P171/P172 without contradiction.
6. No launch state changes: the selected goal remains
   `operator-assignment-evidence-intake` until real external Data API evidence
   is returned and accepted.

## Non-Goals

P172 does not read `.env.local.sync`, does not create Supabase/Data API
resources, does not set GitHub variables, does not upload secrets, does not
promote live runtime, and does not mark the operator assignment complete.
