# P113 Remote Assignment Image Drift Gate

Status: active gate  
Boundary: Remote Runtime Assignment Boundary  
Date: 2026-06-19

## Goal

P112 prepares `deploy/runtime-production/remote-assignment.local.json` with
current GHCR image refs. After any new commit, that ignored local draft can
become stale without Git noticing. P113 prevents the deployment operator from
using old API or Agent Runtime images.

This gate does not create services, set GitHub variables or mark live runtime
ready. It only proves that, if a local assignment draft exists, its image refs
match the current P72 runtime-image evidence for the checked-out commit.

## Command

```bash
npm run check:remote-assignment-image-drift
```

If drift is detected, refresh the ignored draft:

```bash
REMOTE_ASSIGNMENT_DRAFT_FORCE=true npm run prepare:remote-assignment-local
```

## Contract

The gate validates:

- `package.json` exposes `check:remote-assignment-image-drift`;
- root `npm run test` includes `check:remote-assignment-image-drift`;
- the local assignment path remains ignored by Git;
- source workspace without git passes only in `source_workspace_no_git` mode;
- CI / release runs without a local assignment pass as
  `remote_assignment_local_absent`;
- release runs with a local assignment require current-head P72 image evidence;
- `services.api.image` exactly equals the current API image ref;
- `services.agent.image` exactly equals the current Agent Runtime image ref;
- the artifact does not print secrets, raw runtime state, provider prompt
  plumbing, representative work names or reference-vault material.

## Why P75 Is Not Enough

P75 verifies that the assignment has valid service evidence and image repository
shape. It intentionally accepts incomplete local drafts while operators fill
provider service ids, HTTPS origins and secret-store confirmations. P113 adds
the stricter local-draft invariant: image refs must not drift from the current
published runtime images.

## Public Boundary

The P113 artifact may include public GHCR image refs and blocked placeholder
stage ids. It must not include database URLs, model keys, provider API tokens,
Tool Bridge token values, private keys, system prompts, raw runtime state,
`sourceRefs`, `profile.id`, `kernel.id`, plaintext representative works or the
reference-work vault payload.

## Acceptance

1. `npm run check:remote-assignment-image-drift` passes with no local assignment.
2. The same command passes with a P112-generated local draft for the current
   commit.
3. The command fails if local draft images point at an older commit.
4. Root `npm run test` runs P113 before `check:remote-assignment-local-boundary`.
5. P113 is synced to the source workspace and documented in development notes.
