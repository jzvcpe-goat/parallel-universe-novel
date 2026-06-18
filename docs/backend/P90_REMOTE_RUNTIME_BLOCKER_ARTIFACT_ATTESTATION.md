# P90 Remote Runtime Blocker Artifact Attestation

## Purpose

P90 downloads or reads the `remote-runtime-blockers` artifact and validates the
ledger content, not just its presence. P43 proves the artifact exists. P85
builds the normalized blocker ledger. P90 proves the uploaded P85 ledger is
current for the run head, privacy-safe and consistent with already-cleared gates.

P90 does not provision remote services, mark assignment ready, set GitHub
variables, write secrets or override P85. It only checks that the blocker ledger
is trustworthy enough to hand to the release owner.

## Command

Local latest artifact:

```bash
npm run check:remote-runtime-blockers-artifact
```

Current GitHub run artifact:

```bash
CHECK_REMOTE_RUNTIME_BLOCKERS_ARTIFACT_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:remote-runtime-blockers-artifact
```

Specific GitHub run:

```bash
CHECK_REMOTE_RUNTIME_BLOCKERS_ARTIFACT_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
CHECK_GITHUB_ARTIFACTS_RUN_ID=<run-id> \
npm run check:remote-runtime-blockers-artifact
```

## What It Checks

- `gate` is `P85_REMOTE_RUNTIME_BLOCKER_NORMALIZATION`.
- `repository` and `headSha` match the checked run or local HEAD.
- The ledger contains every normalized stage, including the P89 handoff content
  stage.
- `blockerCount` matches the number of blocked stages.
- P72 image evidence is passed for the same head.
- P89 handoff artifact attestation is passed for the same head.
- Privacy evidence, assignment fixture evidence and handoff artifact content are
  not incorrectly reported as blockers.
- The artifact contains no secrets, provider prompt plumbing, reference-work
  names, `sourceRefs`, `profile.id` or `kernel.id`.

## Expected Current State

Until the deployment operator fills the ignored remote assignment file and remote
health checks pass, P90 should normally report:

```text
passed_with_remote_runtime_blockers
```

That is an acceptable state for static preview and operator handoff. It means the
blocker ledger itself is valid, while remote runtime cutover is still waiting for
operator inputs.

## Acceptance

- `package.json` exposes `check:remote-runtime-blockers-artifact`.
- Root `npm run test` includes `check:remote-runtime-blockers-artifact` after
  `check:remote-runtime-blockers`.
- Pages workflow runs P90 after P43 and P89.
- P85 artifacts include `repository`, `headSha`, P72 source evidence and P89
  source evidence.
- P90 rejects stale, private, incomplete or contradictory blocker artifacts.
