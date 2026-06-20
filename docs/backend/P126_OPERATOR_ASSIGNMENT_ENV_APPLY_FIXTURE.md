# P126 Operator Assignment Env Apply Fixture

Status: active gate  
Boundary: P116 apply-path fixture, no production assignment writes  
Owner: release engineering + deployment operator  
Date: 2026-06-19

## Purpose

P125 proves that P117 can validate a complete safe operator env set and reject
unsafe inputs without writing state. P126 proves the next helper, P116, can
actually apply that same shape of non-secret operator evidence to an isolated
temporary fixture target.

P126 does not write `deploy/runtime-production/remote-assignment.local.json`.
It does not create remote services, does not set GitHub variables, does not
store provider secrets and does not enable live runtime.

P128 follows this fixture gate with the real operator handoff template. P126
proves the write path; P128 proves the tracked env template and ignored local
copy are safe before real values enter P117/P116. P129 then proves the same
ignored local env copy can be loaded directly by P117/P116.

## Command

```bash
npm run check:operator-assignment-env-apply-fixture
```

## Fixture Behavior

P126 creates a temporary fixture target under `artifacts/runtime/`, runs P116
with `REMOTE_RUNTIME_ASSIGNMENT_FILE` pointed at that file, verifies the P116
write path, then deletes the temporary target.

Positive fixture:

- uses complete synthetic non-secret operator inputs;
- requires `REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true`;
- applies current P72 runtime images;
- writes only the temporary fixture target.

Negative fixtures:

- missing confirmation;
- placeholder origin;
- secret-like service id.

Each negative fixture must be rejected before writing the temporary target.

## Public Boundary

P126 artifacts may say which checks passed, which negative fixtures were
rejected, which temporary target was used and which redacted P116 artifact was
validated.

P126 artifacts must not expose service ids, origins, provider tokens, provider
secret values, prompt plumbing, raw state, reference-vault material, profile ids
or kernel ids.

## Acceptance

1. `package.json` exposes `check:operator-assignment-env-apply-fixture`.
2. Root `npm run test` runs P126 after P125, then P128, P129, P130 and P131
   before dependency audit.
3. P126 uses the existing P116 apply helper; it does not duplicate apply logic.
4. P126 proves a safe positive fixture can write a temporary assignment target.
5. P126 proves unsafe negative fixtures fail without modifying that target.
6. P126 proves the production ignored assignment file is unchanged.
7. P126 removes the temporary fixture target after validation.
8. P126 writes a redacted artifact:
   `artifacts/runtime/operator-assignment-env-apply-fixture-*.json`.
9. P128 runs after P126 in root test and verifies the local env template before
   dependency audit.
10. P129 runs after P128 and verifies explicit ignored env-file loading before
    dependency audit.
11. P130 runs after P129 and verifies loop command consistency before
    dependency audit.

## Why This Exists

P125 proves validation readiness. P126 proves apply-path readiness. Together
they reduce the chance that the real deployment operator reaches the handoff
and discovers that the no-write validator and the explicit-write helper disagree
about accepted inputs or redaction boundaries.
