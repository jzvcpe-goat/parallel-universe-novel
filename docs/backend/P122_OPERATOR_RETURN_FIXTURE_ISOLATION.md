# P122 Operator Return Fixture Isolation

Status: active gate  
Boundary: operator-return evidence selection, no deployment side effects  
Owner: release engineering  
Date: 2026-06-19

## Purpose

P122 prevents fixture evidence from flowing back into the operator-return loop.
P81 intentionally runs a no-secret assignment fixture at
`deploy/runtime-production/remote-assignment.fixture.json` so CI can prove that
reserved origins do not count as production readiness. That fixture can create
a newer P75 artifact with `remote_assignment_pending_health`. P120 must not
read that newer fixture artifact when judging the real operator return.

The source of truth for P120 is the current production assignment path set:

```text
deploy/runtime-production/runtime-assignment.intent.example.json
deploy/runtime-production/runtime-assignment.intent.local.json
deploy/runtime-production/generated/remote-assignment.contract.json
deploy/runtime-production/remote-assignment.local.json
```

The first three paths are the P138/P140 edge-only path: tracked projection,
ignored local intent and generated contract. The legacy
`remote-assignment.local.json` path remains valid only when the operator
explicitly chooses full-remote deployment. P122 verifies that P120 selects one
of those production paths and never the fixture assignment, then verifies P121
routes the next goal from that real assignment state.
If that real state still needs operator assignment evidence, P123 must run next
and emit the safe operator intake packet, then P124 must validate that packet
after Pages uploads it. P125 then validates that the P117 operator env dry-run
gate accepts a complete safe synthetic operator input set and rejects unsafe
inputs before real operator values arrive. P126 then validates P116 apply-path
behavior against a temporary fixture target. P128 then validates the local env
template that operators copy before entering real values. P129 then validates
the explicit ignored env-file loader used by P117 and P116. P130 then validates
the loop command sequence built on top of that loader. P131 validates the
uploaded P130 artifact content, and P132 proves P119/P120/P121/P123/P130/P131
all belong to the same current head.

## Command

```bash
npm run check:operator-return-fixture-isolation
npm run check:operator-assignment-evidence-intake
npm run check:operator-assignment-evidence-intake-artifact
npm run check:operator-assignment-env-validation-fixture
npm run check:operator-assignment-env-apply-fixture
npm run check:operator-assignment-env-template
npm run check:operator-assignment-env-file-loader
npm run check:operator-assignment-loop-command-consistency
npm run check:operator-assignment-loop-command-consistency-artifact
npm run check:operator-assignment-current-head-coherence
```

## Inputs

P122 reads the latest evidence from:

- P75 remote assignment intake for the current production assignment path set
- P75 fixture assignment intake for `remote-assignment.fixture.json`
- P120 remote operator return intake
- P121 loop next goal ledger

## Output

P122 emits:

- `artifacts/runtime/operator-return-fixture-isolation-*.json`

The artifact is safe for engineering handoff. It contains only gate decisions,
file paths, assignment-path classifications and next-goal ids. It must not
include secrets, candidate prose, prompt plumbing, private title lists, profile
ids, kernel ids or raw runtime state.

## Acceptance

1. `package.json` exposes `check:operator-return-fixture-isolation`.
2. Root `npm run test` runs P122 after P121, then P123, P124, P147, P148,
   P125, P126, P128, P129, P130, P131, P132 and P133, before dependency
   audit.
3. P120 filters P75 assignment evidence by the current production assignment
   path set.
4. P120 packet cites the selected production assignment path in
   `sourceEvidence.assignmentIntake`.
5. If P120 reports `operator_return_waiting_for_assignment`, P121 must select
   `operator-assignment-evidence-intake`.
6. If P120 reports `operator_return_waiting_for_health`, P121 must select
   `remote-health-evidence-intake`.
7. A fixture P75 artifact may exist and may be newer, but it must never decide
   P120 or P121.
8. P122 does not write the ignored assignment file, does not create services,
   does not set GitHub variables and does not promote live runtime.

## Failure Modes

- Missing current production P75 evidence means P122 fails; P120 cannot be
  trusted without assignment evidence.
- Missing current-head P120/P121 evidence means P122 fails; the loop ledger
  cannot be audited without both gates.
- P120 selecting a fixture assignment path fails immediately.
- P121 selecting a goal that contradicts P120 fails immediately.
