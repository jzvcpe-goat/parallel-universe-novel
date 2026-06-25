# P168 Operator Evidence Return Fast Path

Status: local helper + lightweight release gate  
Boundary: external evidence return path only, no deployment side effects  
Owner: release engineering + deployment operator  
Date: 2026-06-25

## Purpose

P168 closes the handoff gap after P164. P164 refreshes the current-head
`operator-assignment-evidence-intake` proof chain while Data API evidence is
still missing. P168 defines the safe single command to run after the deployment
operator has filled the local Data API assignment evidence and the local
publishable-key file.

The command is intentionally a wrapper around existing gates. It does not add a
second compiler, does not create cloud services, does not set GitHub variables
or secrets, does not store provider keys, and does not write canon. It only runs
the existing local-secret guard, assignment compiler, health check, strict
intake and current-head refresh in one ordered path.

## Operational Continuity

P168 assumes the P134/P135/P136 operations contract is already being followed:
the scheduled keep-alive directly checks `health_probe`, `.env.local.sync` is
backed up outside Git in a trusted password manager or encrypted personal
storage, and `novels_history` recovery is manual SQL plus human confirmation.

The fast path only replays gates. It does not recover lost local env files,
automate chapter rollback, create Data API services or mark
`operator-assignment-evidence-intake` complete without real returned evidence.

## Commands

Lightweight contract check, included in root `npm run test`:

```bash
npm run check:operator-evidence-return-fast-path
```

Operator-only fast path, not included in root `npm run test`:

```bash
npm run prepare:operator-evidence-return-fast-path
```

Run the fast path only after the operator has filled the local edge-only Data API
evidence from the P147 packet. Until that evidence exists, the selected goal
remains `operator-assignment-evidence-intake`.

## Sequence

The fast path runs this fixed order:

```bash
REQUIRE_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD_READY=true npm run check:edge-only-data-api-local-secret-guard
RUNTIME_ASSIGNMENT_INTENT_ENV_FILE=deploy/runtime-production/runtime-assignment.intent.env.local RUNTIME_ASSIGNMENT_INTENT_FORCE=true npm run prepare:runtime-assignment-intent
npm run remote-assignment:prepare
npm run remote-health:check
npm run prepare:edge-only-data-api-strict-intake
npm run prepare:current-head-operator-evidence
```

This order preserves the P147/P150/P151 contract: secret hygiene first, local
intent compilation second, generated assignment artifacts third, remote health
evidence fourth, strict intake fifth, and current-head coherence last.

## Artifacts

The prepare command writes:

```text
artifacts/runtime/operator-evidence-return-fast-path-*.json
```

The contract check writes:

```text
artifacts/runtime/operator-evidence-return-fast-path-contract-*.json
```

Both artifacts contain command names, statuses, blocker stages, durations and the
current head sha only. They do not contain service origins, service ids, keys,
provider prompt plumbing, private reference material, profile ids, kernel ids,
source references or generated story text.

## Checks

P168 verifies that:

1. `package.json` exposes both P168 scripts.
2. Root `npm run test` runs the lightweight P168 contract check after P164,
   then P174 artifact attestation and P170 operations continuity, before P121.
3. Root `npm run test` does not run the operator-only prepare command.
4. The prepare command runs exactly the sequence above.
5. Failure artifacts preserve the external-evidence blocker stage without
   copying command output or local values.
6. P123, P147, P164, development notes and release-sync manifest all point to
   the same fast-path command.

## Non-Goals

P168 does not:

- create, provision or configure managed Data API services;
- set GitHub variables or secrets;
- store provider keys, writer passwords, publishable keys or service-role keys;
- expose provider, system prompt, source reference, profile id or kernel id
  plumbing;
- promote live runtime;
- write canon, branch content or generated story text;
- change P121 selection logic by itself.

## Acceptance

1. `npm run check:operator-evidence-return-fast-path` passes.
2. `npm run prepare:operator-evidence-return-fast-path` is available for the
   operator-return moment but excluded from root test.
3. `docs/baseline/RELEASE_SYNC_MANIFEST.json` syncs P168 docs and scripts to
   the source workspace.
4. P123/P147/P164 docs mention P168 as the preferred command after local Data
   API evidence has been filled.
5. The selected next goal remains `operator-assignment-evidence-intake` until
   real external evidence is available and accepted by the strict intake chain.
