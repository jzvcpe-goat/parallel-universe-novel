# P149 Runtime Assignment Intent Env Local Bootstrap

Status: active gate  
Boundary: local edge-only operator env preparation, no remote side effects  
Owner: release engineering + deployment operator  
Date: 2026-06-21

## Purpose

P146 introduced the dedicated edge-only runtime assignment env template, and
P147 packages the operator evidence still needed for the GitHub Pages plus
managed Data API path. The remaining operational risk was small but expensive:
operators could still copy the template by hand, skip the ignored local file, or
fall back to legacy full-remote env material.

P149 makes the local bootstrap explicit and checkable. It creates the ignored
edge-only env file from the tracked template only when requested, refuses to
overwrite existing operator notes unless forced, and writes a redacted artifact
that proves the boundary. It does not create services, set GitHub variables,
store Supabase keys, store provider keys, promote live runtime, or treat legacy
full-remote env as primary evidence.

## Commands

Check the bootstrap contract without writing local files:

```bash
npm run check:runtime-assignment-intent-env-local-bootstrap
```

Create the ignored local env file from the tracked edge-only template:

```bash
npm run prepare:runtime-assignment-intent-env-local
```

After the operator fills only public Data API/Supabase routing evidence in the
ignored local file, continue with:

```bash
RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=deploy/runtime-production/runtime-assignment.intent.env.local \
RUNTIME_ASSIGNMENT_INTENT_FORCE=true \
npm run prepare:runtime-assignment-intent

npm run remote-assignment:prepare
npm run check:remote-runtime-assignment-intake
npm run remote-health:check
REQUIRE_REMOTE_HEALTH_EVIDENCE_READY=true npm run check:remote-health-evidence-artifact
npm run check:remote-operator-return-intake
npm run check:loop-next-goal-ledger
```

## Boundary

P149 is intentionally narrow:

- it writes only `deploy/runtime-production/runtime-assignment.intent.env.local`
  in write mode;
- that local file must be ignored by Git;
- it rejects tracked-file writes, remote service creation, GitHub variable
  changes, provider key storage, Supabase secret storage and live promotion;
- it keeps `remote-assignment.env.local` as legacy full-remote fallback only;
- it never includes local env values in the artifact.

## Acceptance

1. `package.json` exposes `prepare:runtime-assignment-intent-env-local`.
2. `package.json` exposes `check:runtime-assignment-intent-env-local-bootstrap`.
3. Root `npm run test` runs the P149 check immediately before P146.
4. P146, P147 and development notes point to the P149 command instead of
   manual template copying as the current operator path.
5. The tracked template contains the P140 edge-only key set and no secrets,
   provider plumbing, prompt material, private reference material, `sourceRefs`,
   `profile.id` or `kernel.id`.
6. If the ignored local env exists, it contains the template keys, remains
   ignored by Git and still exposes no secret-like values.
7. P149 writes a redacted artifact:
   `artifacts/runtime/runtime-assignment-intent-env-local-bootstrap-*.json`.

## Next Goal Effect

When P149 is green, the loop no longer depends on a manual copy step before the
operator can provide Data API evidence. The remaining external input is still
the real managed Data API/Supabase evidence and health readiness; P149 only
prepares the ignored local place where that evidence can be recorded.
