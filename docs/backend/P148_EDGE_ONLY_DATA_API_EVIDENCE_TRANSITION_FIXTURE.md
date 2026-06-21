# P148 Edge-Only Data API Evidence Transition Fixture

Status: active gate  
Boundary: fixture-only Data API evidence transition, no production readiness claim  
Owner: release engineering + deployment operator  
Date: 2026-06-20

## Purpose

P148 proves the positive edge-only transition that P142/P145 describe without
requiring real Supabase credentials in CI. P147 packages the evidence request.
P148 shows that, when an operator later returns production-shaped Data API
service evidence, the current scripts can:

1. prepare an ignored runtime assignment intent;
2. compile the edge-only runtime contract;
3. stop at `remote_assignment_pending_health` before health evidence exists;
4. accept a strict P145 Data API health result shape;
5. advance P75 to `remote_assignment_ready` only inside the fixture;
6. restore the repo-local runtime-production files so the current state remains
   honest and still waits for real operator evidence;
7. leave exactly one current waiting P145 attestation for the public
   `remote-health-evidence` Pages artifact.

This is a fixture-only gate. It does not run `remote-health:check`, does not
query Supabase, does not create services, does not set GitHub variables, does
not store provider secrets, does not write canon, and does not promote live
runtime readiness.

## Commands

```bash
npm run check:edge-only-data-api-evidence-transition-fixture
npm run check:edge-only-data-api-evidence-transition-fixture-artifact
```

Current-run GitHub Actions mode:

```bash
CHECK_EDGE_ONLY_DATA_API_EVIDENCE_TRANSITION_FIXTURE_ARTIFACT_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:edge-only-data-api-evidence-transition-fixture-artifact
```

## Artifact

Pages uploads:

```text
edge-only-data-api-evidence-transition-fixture
```

with:

```text
artifacts/runtime/edge-only-data-api-evidence-transition-fixture-*.json
```

The artifact must include `fixtureOnly=true`, `valuesIncluded=false`, and
`leavesHealthReadyArtifactAsCurrentState=false`. It must also include
`leavesSingleCurrentHealthAttestation=true`, proving the temporary strict P145
fixture evidence was summarized inside P148 instead of uploaded as current
remote-health evidence.

## Acceptance

1. `package.json` exposes
   `check:edge-only-data-api-evidence-transition-fixture`.
2. `package.json` exposes
   `check:edge-only-data-api-evidence-transition-fixture-artifact`.
3. Root `npm run test` runs both P148 scripts after P147.
4. Pages uploads and validates the P148 artifact in the current run.
5. P148 proves pending-health before the fixture health result.
6. P148 proves `REQUIRE_REMOTE_HEALTH_EVIDENCE_READY=true
   npm run check:remote-health-evidence-artifact` accepts the production-shaped
   health projection.
7. P148 proves P75 becomes `remote_assignment_ready` only during the fixture.
8. P148 restores runtime-production generated files and writes a fresh waiting
   P145 attestation afterward.
9. P148 removes older P145 fixture attestations so the public
   `remote-health-evidence` artifact contains exactly one current waiting
   attestation.
10. P148 does not leak publishable keys, service-role keys, writer passwords,
   model keys, provider prompt plumbing, source refs, profile ids, kernel ids,
   candidate text, or private reference material.

## Relationship To P142

P148 does not complete P142. P142 still requires the real operator-run
`remote-health:check` result against the production Data API. P148 only proves
that the chain will accept the returned evidence and that the fixture cannot
masquerade as production readiness.
