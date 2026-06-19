# P125 Operator Assignment Env Validation Fixture

Status: active gate  
Boundary: operator assignment validation, no deployment side effects  
Owner: release engineering  
Date: 2026-06-19

## Purpose

P123 and P124 prove that the operator assignment evidence packet exists and can
be validated as CI artifact content. P125 proves the next local validator, P117,
can actually accept a complete safe operator input set and reject unsafe input
shapes before any real deployment operator values are supplied.

P125 does not deploy anything. It does not write
`deploy/runtime-production/remote-assignment.local.json`, does not create remote
services, does not set GitHub variables, does not store provider secrets, and
does not promote live runtime.

P126 follows this gate with an apply fixture. P125 proves the no-write P117
validator; P126 proves the explicit-write P116 helper against a temporary
fixture target.

## Command

```bash
npm run check:operator-assignment-env-validation-fixture
```

## What It Exercises

The gate runs a positive strict fixture through P117 with synthetic public-safe
values:

- complete operator owner/provider fields;
- distinct remote HTTPS API and Agent origins;
- service-id-shaped non-secret strings;
- provider secret-store confirmation booleans set to `true`;
- `REQUIRE_REMOTE_ASSIGNMENT_ENV_DRY_RUN_READY=true`.

It also runs negative fixture cases:

- partial operator env;
- localhost origin;
- placeholder origin;
- secret-like service id.

Finally, it runs a follow-up-required fixture where the field shapes are valid
but one provider secret-store confirmation is still `false`. P128 follows with
the local env template gate so the real operator handoff uses the same accepted
key shape.

## Public Boundary

The fixture values are synthetic, but they still must not appear in stdout,
runtime artifacts, Pages artifacts or documentation. P125 verifies that P117
redacts service ids and origins, prints only counts/status, and keeps provider
secrets, provider prompt plumbing, reference-vault material, `sourceRefs`,
`profile.id`, `kernel.id`, candidate prose and raw runtime state out of its
outputs.

## Acceptance

1. `package.json` exposes `check:operator-assignment-env-validation-fixture`.
2. Root `npm run test` runs P125 after P124, then P126 and P128 before dependency audit.
3. Positive strict fixture returns `operator_env_ready_for_p116_apply`.
4. Follow-up fixture with a false secret-store confirmation does not become
   ready for apply.
5. Negative fixtures fail with the expected guardrail messages.
6. P125 proves neither it nor P117 writes the ignored local assignment file.
7. P125 writes a redacted artifact:
   `artifacts/runtime/operator-assignment-env-validation-fixture-*.json`.

## Why This Exists

Without P125, the project could reach the real operator handoff and only then
discover that P117 rejects valid-looking service evidence, leaks an origin in
an artifact, or silently accepts a placeholder. P125 keeps that failure local,
safe and repeatable while the actual remote service assignment remains an
external operator task.

Without P126, P117 and P116 could still drift: the validator might accept a
shape that the apply helper cannot write, or the apply helper might leak fields
the validator kept redacted. P126 closes that apply fixture gap. Without P128,
the real operator could still lack a safe local template for supplying those
same fields.
