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

The source of truth for P120 is always:

`deploy/runtime-production/remote-assignment.local.json`

P122 verifies that P120 selects the P75 artifact for that local ignored file,
then verifies P121 routes the next goal from that real local assignment state.
If that real state still needs operator assignment evidence, P123 must run next
and emit the safe operator intake packet, then P124 must validate that packet
after Pages uploads it.

## Command

```bash
npm run check:operator-return-fixture-isolation
npm run check:operator-assignment-evidence-intake
npm run check:operator-assignment-evidence-intake-artifact
```

## Inputs

P122 reads the latest evidence from:

- P75 remote assignment intake for `remote-assignment.local.json`
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
2. Root `npm run test` runs P122 after P121, then P123 and P124, before dependency audit.
3. P120 filters P75 assignment evidence by `remote-assignment.local.json`.
4. P120 packet cites the local assignment path in `sourceEvidence.assignmentIntake`.
5. If P120 reports `operator_return_waiting_for_assignment`, P121 must select
   `operator-assignment-evidence-intake`.
6. If P120 reports `operator_return_waiting_for_health`, P121 must select
   `remote-health-evidence-intake`.
7. A fixture P75 artifact may exist and may be newer, but it must never decide
   P120 or P121.
8. P122 does not write the ignored assignment file, does not create services,
   does not set GitHub variables and does not promote live runtime.

## Failure Modes

- Missing current local P75 evidence means P122 fails; P120 cannot be trusted
  without local assignment evidence.
- Missing P120/P121 evidence means P122 fails; the loop ledger cannot be
  audited without both gates.
- P120 selecting a fixture assignment path fails immediately.
- P121 selecting a goal that contradicts P120 fails immediately.
