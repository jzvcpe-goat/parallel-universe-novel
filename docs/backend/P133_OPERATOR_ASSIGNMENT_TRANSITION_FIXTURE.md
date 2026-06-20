# P133 Operator Assignment Transition Fixture

Status: active gate  
Boundary: operator assignment transition fixture, no production deployment side effects  
Owner: release engineering + deployment operator  
Date: 2026-06-20

## Purpose

P133 proves the handoff transition that sits between P123/P132 and the next
real remote-runtime goal. P123 and P132 prove the loop is correctly waiting for
operator assignment evidence. P133 proves that, when syntactically valid
non-secret operator evidence is supplied through the approved env-file path,
the chain can move from assignment intake toward remote health evidence intake.

P133 does not write production `deploy/runtime-production/remote-assignment.local.json`.
It uses a temporary ignored env file and a temporary assignment file, runs the
same P117 dry-run, P116 apply and P75 assignment-intake scripts, then removes
the temporary files. The fixture uses safe synthetic service ids and remote
HTTPS origins; it must stop at `remote_assignment_pending_health` and must not
claim live runtime readiness.

## Commands

```bash
npm run check:operator-assignment-transition-fixture
npm run check:operator-assignment-transition-fixture-artifact
```

Current-run GitHub Actions mode:

```bash
CHECK_OPERATOR_ASSIGNMENT_TRANSITION_FIXTURE_ARTIFACT_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:operator-assignment-transition-fixture-artifact
```

## Artifact

Pages uploads:

```text
operator-assignment-transition-fixture
```

with:

```text
artifacts/runtime/operator-assignment-transition-fixture-*.json
```

## Checks

P133 verifies that:

1. P117 accepts a complete ignored `.env.local` operator-evidence file and
   reports `operator_env_ready_for_p116_apply`.
2. P116 applies that evidence only to a temporary assignment fixture.
3. P75 reads the temporary assignment and reports
   `remote_assignment_pending_health`.
4. API and Agent health remain blocked, so fixture evidence cannot masquerade
   as production readiness.
5. P121 still contains the branch from `operator_return_waiting_for_health` to
   `remote-health-evidence-intake`.
6. The production ignored assignment file fingerprint is unchanged.
7. Temporary env and assignment files are removed before P133 exits.
8. The artifact contains no service ids, origins, provider tokens, prompt
   plumbing, candidate text, private reference material, `profile.id`,
   `kernel.id` or `sourceRefs`.

## Release Chain

- Root `npm run test` runs P133 after P132 and before dependency audit.
- Pages uploads `operator-assignment-transition-fixture`.
- Pages validates the uploaded P133 artifact after P132 current-head coherence
  and before runtime-image local-smoke content validation.
- P107 counts `operator-assignment-transition-fixture` as a
  `download_content_gate`.

## Acceptance

1. `package.json` exposes `check:operator-assignment-transition-fixture`.
2. `package.json` exposes
   `check:operator-assignment-transition-fixture-artifact`.
3. Root `npm run test` runs P133 after P132 and before dependency audit.
4. P133 proves the env-file based transition without writing production
   assignment evidence.
5. P133 preserves the health boundary and expected next goal:
   `remote-health-evidence-intake`.
6. Pages uploads and validates the current-run P133 artifact.
