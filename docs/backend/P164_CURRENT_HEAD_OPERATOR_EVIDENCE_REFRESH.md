# P164 Current-Head Operator Evidence Refresh

Status: local helper + lightweight release gate  
Boundary: evidence refresh only, no deployment side effects  
Owner: release engineering + deployment operator  
Date: 2026-06-24

## Purpose

P164 closes the loop-engineering gap exposed after P163: the
operator-assignment chain is current-head safe only when its dependent artifacts
are refreshed in order. Running the checks in parallel can make P124, P147,
P131 or P132 read stale local artifacts even when the latest release head is
otherwise healthy.

The selected goal remains `operator-assignment-evidence-intake` until real
managed Data API evidence is provided. P164 does not change readiness semantics;
it gives operators and agents one safe local command for refreshing the current
head proof chain before continuing.

## Commands

Lightweight contract check, included in root `npm run test`:

```bash
npm run check:current-head-operator-evidence-refresh
```

Local sequential refresh, not included in root `npm run test`:

```bash
npm run prepare:current-head-operator-evidence
```

The refresh command runs this fixed sequence:

```bash
npm run check:edge-only-data-api-evidence-card
npm run prepare:loop-next-goal-local-tail
npm run check:operator-assignment-loop-command-consistency
npm run check:operator-assignment-loop-command-consistency-artifact
npm run check:operator-assignment-current-head-coherence
```

`prepare:loop-next-goal-local-tail` is the delegated P137 path that refreshes
current-head P113/P119/P120/P121/P122 evidence and then runs the safe
P123/P124/P147 continuation without inserting another P121 between linked
artifacts.

## Artifact

The local refresh writes a redacted artifact:

```text
artifacts/runtime/current-head-operator-evidence-refresh-*.json
```

The contract check writes:

```text
artifacts/runtime/current-head-operator-evidence-refresh-contract-*.json
```

Both artifacts contain command names, statuses, durations and the current head
sha only. They do not contain URLs, service ids, keys, provider prompt plumbing,
private reference material, profile ids, kernel ids or source references.

## Checks

P164 verifies that:

1. `package.json` exposes both P164 scripts.
2. Root `npm run test` runs the lightweight P164 contract check before P121.
3. Root `npm run test` does not run the local/network refresh command.
4. The prepare script runs P163 before delegating current-head loop evidence to
   P137 so the Data API evidence vocabulary is checked before operator evidence
   gets interpreted.
5. The prepare script delegates P113/P119/P120/P121/P122 and the safe
   P123/P124/P147 continuation to `prepare:loop-next-goal-local-tail` instead
   of maintaining a second copy of that ordering.
6. P130, P131 and P132 run after the P137 tail.
7. P164 docs, scripts and release-sync manifest stay aligned.
8. Public-boundary privacy terms remain absent from artifacts and docs.

## Non-Goals

P164 does not:

- create or configure managed Data API services;
- set GitHub variables or secrets;
- store provider keys, writer passwords or service-role keys;
- promote live runtime;
- write canon or generated story content;
- weaken P121/P123/P132 current-head coherence;
- expose provider, system prompt, source reference, profile id or kernel id
  plumbing.

## Acceptance

1. `npm run check:current-head-operator-evidence-refresh` passes.
2. `npm run prepare:current-head-operator-evidence` runs the full sequence and
   writes a redacted local artifact.
3. `docs/baseline/RELEASE_SYNC_MANIFEST.json` syncs the P164 docs and scripts
   to the source workspace.
4. P123/P147/P132 docs point operators at P164 when a current-head evidence
   refresh is needed.
5. The selected next goal remains `operator-assignment-evidence-intake` while
   managed Data API evidence is still missing.
