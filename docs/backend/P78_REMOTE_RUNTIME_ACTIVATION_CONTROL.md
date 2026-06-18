# P78 Remote Runtime Activation Control

## Purpose

P78 turns the remote runtime cutover into one operator-facing control board. It
does not provision infrastructure, store secrets, choose a provider or modify
GitHub repository variables. Instead, it aggregates the already-owned gates:

- P72 runtime image publish evidence,
- P75 remote runtime assignment intake,
- P76 live cutover attestation,
- P77 live rollback rehearsal.

This keeps the project from drifting back into oral handoff. The operator can
see exactly whether the blocker is image evidence, service assignment, remote
health, live variables, or rollback ownership.

## Command

```bash
npm run check:remote-runtime-activation-control
```

Strict mode:

```bash
REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control
```

## Decisions

- `remote_activation_waiting_for_images`: runtime images are not yet published
  or cannot be proven for the current repository.
- `remote_activation_waiting_for_assignment`: no non-secret remote assignment
  file has been provided.
- `remote_activation_waiting_for_health`: assignment exists, but service ids,
  HTTPS origins, image refs, provider-secret-store confirmations or `/health`
  are not ready.
- `remote_activation_waiting_for_live_vars`: remote services are assigned, but
  public live GitHub variables are not attested.
- `remote_activation_ready_for_cutover`: images, assignment, live cutover
  attestation and rollback rehearsal are all ready.

## Operator Flow

1. Publish runtime images and verify P72.
2. Copy `deploy/runtime-production/remote-assignment.example.json` to
   `deploy/runtime-production/remote-assignment.local.json`.
3. Fill only non-secret service evidence: owner, provider, service ids, HTTPS
   origins, image refs and provider-secret-store confirmation flags.
4. Run strict P75 until remote API and Agent `/health` pass.
5. Set non-secret GitHub repository variables from the P75 assignment only after
   health passes.
6. Run strict P76.
7. Run P77 once in static-preview mode and again in strict mode when an owner and
   rollback run id exist.
8. Run strict P78 before public cutover.

## Public Boundary

P78 artifacts may include:

- run ids,
- service id presence flags,
- sanitized origins,
- gate decisions,
- blocked stage ids,
- public static preview HEAD evidence.

P78 artifacts must not include:

- database URLs,
- Tool Bridge tokens,
- model provider keys,
- provider API tokens,
- private keys,
- system prompts,
- raw runtime state,
- reference-work vault contents.

## Acceptance

- `package.json` exposes `check:remote-runtime-activation-control`.
- Root `npm run test` includes `check:remote-runtime-activation-control`.
- The check emits `artifacts/runtime/remote-activation-control-*.json`.
- Non-strict mode reports blockers without failing normal CI.
- Strict mode fails until P72, P75, P76 and P77 are ready.
- The artifact is safe to share with the deployment operator.
