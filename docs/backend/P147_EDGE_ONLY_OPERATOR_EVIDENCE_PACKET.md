# P147 Edge-Only Operator Evidence Packet

Status: active gate  
Boundary: GitHub Pages plus managed Data API handoff, no secret handling  
Owner: release engineering + deployment operator  
Date: 2026-06-21

## Purpose

P147 is the operator handoff packet for the current edge-only launch path. It
exists because P119 still covers the older full-remote API plus Agent Runtime
handoff, while the active release route keeps AI generation off the cloud and
uses GitHub Pages plus a managed Data API for the reader surface.

P147 turns P123 and P146 into one operator-safe packet:

- P123 says which edge-only assignment evidence is still missing.
- P146 defines the allowed `runtime-assignment.intent.env.local` fields.
- P149 creates the ignored local env file from the P146 template without
  requiring operators to hand-copy files or touch the legacy full-remote env.
- P156 verifies that the ignored local env and local publishable-key files do
  not contain forbidden secret classes before any compile or health command.
- P150 checks the local Data API evidence readiness without printing values or
  claiming P142 completion.
- P147 packages the concrete next commands without leaking local values or
  treating the legacy full-remote env as primary evidence.

## Commands

```bash
npm run check:edge-only-operator-evidence-packet
npm run check:edge-only-operator-evidence-packet-artifact
```

CI current-run content check:

```bash
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
CHECK_EDGE_ONLY_OPERATOR_EVIDENCE_PACKET_ARTIFACT_REQUIRED=true \
npm run check:edge-only-operator-evidence-packet-artifact
```

## Inputs

P147 reads:

- `deploy/runtime-production/runtime-assignment.intent.env.example`
- `deploy/runtime-production/runtime-assignment.intent.env.local` if present
- latest P149 runtime assignment intent env local bootstrap artifact if present
- latest P123 operator assignment evidence intake artifact
- latest P146 edge-only intent env template artifact

It may detect `deploy/runtime-production/remote-assignment.env.local`, but that
file is legacy full-remote fallback evidence. P147 must not use it to satisfy
the edge-only Data API/Supabase path.

## Output

P147 emits:

- `artifacts/runtime/edge-only-operator-evidence-packet-*.json`
- `artifacts/runtime/edge-only-operator-evidence-packet-*.md`
- `artifacts/runtime/edge-only-operator-evidence-packet-attestation-*.json`

The packet is safe to share with a deployment operator. It contains no Supabase
publishable key, writer password, service-role key, provider key, database URL,
candidate prose, model-routing internals, representative work names, profile
ids, kernel ids or raw state.

## Required Evidence

The packet keeps these as operator-owned inputs:

- `RUNTIME_ASSIGNMENT_DATA_API_SERVICE_ID` or `SUPABASE_PROJECT_REF`
- `RUNTIME_ASSIGNMENT_DATA_API_ORIGIN` or `SUPABASE_URL`
- `RUNTIME_ASSIGNMENT_DATA_API_CONFIGURED=true`
- local-only `VITE_SUPABASE_PUBLISHABLE_KEY`,
  `VITE_SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY` or
  `SUPABASE_ANON_KEY` for `remote-health:check`
- `health_probe` row with `id=reader` and `status=ok`

## Acceptance

1. `package.json` exposes both P147 scripts.
2. Root `npm run test` runs P147 after P124 and before P148 and the legacy
   full-remote compatibility fixtures.
3. Pages workflow uploads `edge-only-operator-evidence-packet`.
4. Pages workflow downloads and checks the same current-run P147 artifact.
5. `check:github-actions-artifacts` current-run mode requires the P147 artifact.
6. P43 and P107 document the artifact, producer and content verifier.
7. P147 cites P123 and P146 as source evidence.
8. P147 preserves Data API blockers while refusing to require remote Agent
   Runtime evidence in the primary path.
9. P147 does not require a remote Agent Runtime, does not write local
   assignment files, does not create remote services, does not store keys and
   does not promote live runtime.
10. P148 separately proves the returned Data API evidence transition, so P147
    remains only the operator packet and does not need fixture health evidence.
11. P147 operator steps begin with
    `npm run prepare:runtime-assignment-intent-env-local`, the P149 bootstrap,
    instead of a manual copy command.
12. P147's follow-up chain includes
    `REQUIRE_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD_READY=true npm run check:edge-only-data-api-local-secret-guard`
    before compile/health commands so the operator catches local secret hygiene
    failures before attempting Data API verification.
13. P147 still emits `nextStrictCommand` as
    `npm run prepare:edge-only-data-api-strict-intake` for the sealed strict
    P142 intake step after local compile and health evidence are available.
14. P147 also keeps `npm run check:edge-only-data-api-evidence-readiness` as the
    local readiness diagnosis gate; P156 catches forbidden local secret classes
    first, while P150 distinguishes missing Data API fields from health evidence
    that is still waiting.

## Failure Modes

- Missing current P123 evidence fails P147; the packet cannot be made without
  the selected goal and current blockers.
- Missing P146 evidence fails P147; operators must use the dedicated edge-only
  env template.
- Missing P149 docs or script exposure fails the local bootstrap gate before
  operators can be pointed at the edge-only env path.
- Any secret-like value, model-routing internal, representative work name,
  `sourceRefs`, `profile.id` or `kernel.id` in the packet fails the gate.
- Any primary-path `REMOTE_AGENT_*` requirement fails the gate.
