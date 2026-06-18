# P76 Live Cutover Attestation Gate

## Purpose

P76 is the last non-secret gate before GitHub Pages may switch from disabled
public runtime mode to live runtime mode. P23 proves health and workflow
readiness, P66 proves remote origins, P73 proves origin execution, and P75
records the deployment assignment. P76 joins those signals into one cutover
attestation so live mode is not enabled from a verbal handoff.

## Command

```bash
npm run check:live-cutover-attestation
```

Strict mode:

```bash
REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation
```

## Non-Secret CI Attestation Variables

GitHub Actions cannot read the ignored local assignment file. For live public
cutover, the deployment owner may set these non-secret repository variables:

```text
REMOTE_API_SERVICE_ID
REMOTE_AGENT_SERVICE_ID
REMOTE_API_SECRETS_CONFIGURED=true
REMOTE_AGENT_SECRETS_CONFIGURED=true
```

These values confirm that concrete services exist and that provider secret
stores were configured. They must not contain database URLs, Tool Bridge token
values, model keys, private keys, provider API tokens, system prompts, raw
state, or reference-vault contents.
Repository variables must not contain database URLs, Tool Bridge token values, model keys, private keys, provider API tokens, system prompts, raw state, or reference-vault contents.

P109 GitHub Runtime Variable Boundary Guard validates this repository-variable
surface. GitHub repository variables must not contain database URLs, Tool Bridge
token values, model keys, private keys, provider API tokens, system prompts, raw
state, or reference-vault contents.

## Decisions

- `live_cutover_disabled`: public runtime mode is not `live`; this is the safe default.
- `live_cutover_assignment_unattested`: live mode is requested, but neither strict P75 nor CI repository-variable attestation proves service assignment.
- `live_cutover_pending_runtime_evidence`: assignment is attested, but P73, P66, or P23 is not ready.
- `live_cutover_attested`: assignment, origin execution, provisioning, and live runtime readiness are all ready.

## Evidence Inputs

P76 reads the latest local artifacts when available:

- `remote-runtime-assignment-intake-*.json` from P75,
- `remote-origin-execution-*.json` from P73,
- `remote-origin-provisioning-*.json` from P66,
- `live-runtime-readiness-*.json` from P23.

If P75 local evidence is absent in GitHub Actions, P76 accepts the non-secret
`REMOTE_*` repository variables as assignment attestation, while P73/P66/P23
still must prove remote health and workflow behavior.

## Pages Workflow Boundary

The Pages workflow passes only public origins and non-secret attestation flags
into CI:

```text
VITE_PUBLIC_RUNTIME_MODE
VITE_API_ORIGIN
VITE_API_BASE_URL
VITE_AGENT_RUNTIME_BASE_URL
REMOTE_API_SERVICE_ID
REMOTE_AGENT_SERVICE_ID
REMOTE_API_SECRETS_CONFIGURED
REMOTE_AGENT_SECRETS_CONFIGURED
```

No provider secret value is exposed to the frontend build.

## Acceptance

- `package.json` exposes `check:live-cutover-attestation`.
- `package.json` exposes `check:github-runtime-variable-boundary`.
- Root `npm run test` includes `check:live-cutover-attestation` after P75/P73.
- Root `npm run test` includes `check:github-runtime-variable-boundary` so
  repository variables are checked before live runtime readiness is trusted.
- Pages workflow runs `npm run check:live-cutover-attestation`.
- When `VITE_PUBLIC_RUNTIME_MODE=live`, Pages workflow runs strict
  `REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation`
  before public browser QA.
- Default disabled mode produces `live_cutover_disabled` without blocking static preview deploys.
- Strict mode fails until service assignment, P73, P66, and P23 are ready.
- Generated artifacts do not contain provider secrets, database URLs, model keys,
  system prompts, raw state, or private reference mappings.
- After P76, run `npm run check:live-rollback-rehearsal` so the same release
  chain has rollback evidence before live traffic is trusted.
