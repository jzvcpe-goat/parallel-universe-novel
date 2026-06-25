# P170 Operator Operations Continuity

Status: active release gate  
Boundary: operator operations continuity only, no service provisioning  
Owner: release engineering + deployment operator  
Date: 2026-06-25

## Purpose

P170 binds the existing P134/P135/P136 zero-cost Reader operations contract to
the current P147/P168 operator evidence return path. It exists because the
launch blocker is still `operator-assignment-evidence-intake`: the operator
must return real managed Data API evidence, and that evidence chain depends on
practical operating rules that cannot live in a separate runbook only.

This gate does not create Supabase/Data API resources, does not recover lost
local files, does not run chapter rollback and does not promote live runtime.
It only proves that the current handoff still carries these operational rules:

- keep-alive must query `health_probe` directly and can be manually triggered;
- `.env.local.sync` remains local-only and must be backed up in a trusted
  password manager or encrypted personal storage;
- `novels_history` is manual SQL recovery material, not an automatic rollback
  button.

## Command

```bash
npm run check:operator-operations-continuity
```

Root `npm run test` runs P170 after `check:operator-evidence-return-fast-path`
and `check:operator-evidence-return-fast-path-artifact`, then before
`check:loop-next-goal-ledger`. That order keeps P168's return command contract
visible and P174 download-attested before P121 selects the next goal, while
ensuring the operator-facing continuity rules cannot drift.

## What This Gate Checks

P170 verifies that:

1. P134 still documents the GitHub Actions keep-alive caveat, direct
   `health_probe` checks, `.env.local.sync` backup, and manual
   `novels_history` recovery SQL.
2. P135 and P136 still expose those same rules as executable and artifact
   expectations.
3. `.github/workflows/keep-supabase-alive.yml` has both `schedule` and
   `workflow_dispatch`, and queries `.from('health_probe')` for the reader row.
4. The edge-only evidence card keeps `.env.local.sync`, `health_probe`, and the
   strict return command in one operator-local template.
5. P147 and P168 explicitly inherit the P134/P135/P136 continuity contract.
6. The P170 artifact contains only booleans, gate labels and status; no secrets,
   service values, prompt plumbing, private references, candidate text or live
   promotion claims.

## Relationship To Existing Gates

P170 is intentionally narrow:

- P134 is the human runbook.
- P135 is the executable zero-cost Reader edge-sync gate.
- P136 is the artifact attestation for P135.
- P147 is the current edge-only operator evidence packet.
- P168 is the return fast path after local Data API evidence has been filled.
  Its operator-only command is `prepare:operator-evidence-return-fast-path`.
- P170 confirms those documents and scripts remain one coherent operator path.

## Acceptance

1. `package.json` exposes `check:operator-operations-continuity`.
2. Root `npm run test` runs P170 after P168/P174 and before P121.
3. `docs/baseline/RELEASE_SYNC_MANIFEST.json` syncs this document and the P170
   script to the source workspace.
4. P147 and P168 mention P134/P135/P136, `health_probe`, `.env.local.sync`,
   `novels_history` and the still-selected
   `operator-assignment-evidence-intake` goal.
5. The generated `operator-operations-continuity` artifact says
   `valuesIncluded: false`.
6. P170 does not mark the operator evidence complete. The next goal remains
   `operator-assignment-evidence-intake` until real external Data API evidence
   is returned and accepted by the existing strict gates.
