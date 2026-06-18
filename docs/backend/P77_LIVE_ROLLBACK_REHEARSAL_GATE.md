# P77 Live Rollback Rehearsal Gate

## Purpose

P77 turns the public-live rollback path from a runbook paragraph into a
machine-checkable rehearsal gate. P73/P74 already carry rollback commands and
P76 decides whether live cutover is attested. P77 verifies that those rollback
commands are still present, that static preview is reachable, and that a real
rollback rehearsal can be confirmed by an owner without exposing secrets.

P77 does not execute destructive GitHub variable changes by default.

## Command

```bash
npm run check:live-rollback-rehearsal
```

Strict mode for an actual rollback rehearsal:

```bash
ROLLBACK_OWNER_ID=<owner> \
ROLLBACK_REHEARSAL_CONFIRMED=true \
ROLLBACK_GITHUB_RUN_ID=<pages-run-id> \
REQUIRE_LIVE_ROLLBACK_REHEARSED=true \
npm run check:live-rollback-rehearsal
```

## Required Rollback Shape

The rehearsal gate requires these rollback commands to stay present in the
runtime production materials:

```bash
gh variable set VITE_PUBLIC_RUNTIME_MODE --repo jzvcpe-goat/parallel-universe-novel --body disabled
gh variable delete VITE_API_ORIGIN --repo jzvcpe-goat/parallel-universe-novel --confirm
gh variable delete VITE_AGENT_RUNTIME_BASE_URL --repo jzvcpe-goat/parallel-universe-novel --confirm
gh workflow run "Deploy Creator Studio Preview" --repo jzvcpe-goat/parallel-universe-novel
```

`VITE_API_BASE_URL` cleanup is also documented in P20 when the API host is
unsafe or compromised.

## Decisions

- `live_rollback_static_preview_verified`: rollback commands are present, public runtime mode is not live, and the public site is reachable.
- `live_rollback_execution_unconfirmed`: commands exist, but strict rehearsal owner/run evidence has not been supplied.
- `live_rollback_rehearsed`: strict rollback rehearsal has owner confirmation, run id, static preview, and current rollback evidence.

## Evidence Inputs

P77 reads:

- `deploy/runtime-production/service-manifest.json`,
- `deploy/runtime-production/origin-execution-plan.json`,
- latest P76 `live-cutover-attestation-*.json` when present,
- GitHub repository variables when available,
- public GitHub Pages HEAD response.

## Boundary

P77 does not:

- change GitHub repository variables,
- delete remote origins,
- dispatch a Pages workflow,
- restore databases,
- roll back a cloud provider service,
- expose provider secrets, database URLs, model keys, system prompts, raw state,
  or private reference mappings.

## Acceptance

- `package.json` exposes `check:live-rollback-rehearsal`.
- Root `npm run test` includes `check:live-rollback-rehearsal`.
- P20 includes the rollback command and the rehearsal command.
- Pages workflow runs `npm run check:live-rollback-rehearsal`.
- Pages workflow uploads `live-rollback-rehearsal`.
- Default disabled public mode produces `live_rollback_static_preview_verified`
  when commands and public URL are healthy.
- Strict mode fails until `ROLLBACK_OWNER_ID`,
  `ROLLBACK_REHEARSAL_CONFIRMED=true`, and `ROLLBACK_GITHUB_RUN_ID` are
  supplied.
- Generated artifacts do not contain provider secrets, database URLs, model
  keys, system prompts, raw state, or private reference mappings.
