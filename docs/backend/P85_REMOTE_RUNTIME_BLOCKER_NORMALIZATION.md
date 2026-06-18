# P85 Remote Runtime Blocker Normalization

## Purpose

P85 turns the remote runtime launch blockers into one normalized ledger. Earlier
gates are intentionally precise but scattered: P23 owns live readiness, P65 owns
remote trace, P66/P73 own origin provisioning and execution, P72 owns image
evidence, P75/P79 own service assignment, P76 owns cutover attestation, P77 owns
rollback, and P78 owns the activation board.

P85 does not provision infrastructure, set GitHub variables, store secrets or
enable live runtime. It only answers: which stage is blocked, who owns it, which
gate proves it, what input is missing, and which strict command must pass next.

## Command

```bash
npm run check:remote-runtime-blockers
```

Strict mode:

```bash
REQUIRE_REMOTE_RUNTIME_BLOCKERS_READY=true npm run check:remote-runtime-blockers
```

## Generated Artifacts

```text
artifacts/runtime/remote-runtime-blockers-*.json
artifacts/runtime/remote-runtime-blockers-*.md
```

The JSON artifact is for CI and audits. The Markdown artifact is for the
deployment owner.

P85 reads `deploy/runtime-production/remote-assignment.local.json` evidence for
real launch blockers. It treats `deploy/runtime-production/remote-assignment.fixture.json`
only as the P81 fixture contract: a ready fixture execution pack proves command
generation, but it must never mark the real remote service assignment ready.

## Normalized Stages

| Stage | Owner | Gate |
| --- | --- | --- |
| Runtime images published | release engineering | P72 |
| Remote service assignment exists | deployment operator | P75/P79 |
| Remote assignment health ready | backend runtime owner | P75 |
| Remote origin execution ready | platform operator | P73 |
| Remote origin provisioned | platform operator | P66 |
| Public live readiness | release operator | P23 |
| Remote live runtime trace | runtime owner | P65 |
| Live cutover attested | release owner | P76 |
| Rollback rehearsal ready | release owner | P77 |
| Privacy release evidence | privacy/release reviewer | P80/P83 |
| Assignment fixture contract | release engineering | P81 |
| Activation control board | release owner | P78 |

## Decisions

- `remote_runtime_waiting_for_operator_inputs`: one or more stages are still
  blocked; this is the safe default while remote services are not assigned.
- `remote_runtime_ready_for_strict_cutover`: all normalized stages are ready;
  strict mode may be used before public live runtime.

## Public Boundary

P85 artifacts may include:

- blocker ids,
- owner labels,
- gate names,
- artifact filenames,
- non-secret next actions,
- strict command names.

P85 artifacts must not include:

- database URLs,
- Tool Bridge token values,
- model keys,
- provider API tokens,
- private keys,
- system prompts,
- raw runtime state,
- reference-work vault contents,
- representative work names,
- `sourceRefs`,
- `profile.id` or `kernel.id`.

## Acceptance

- `package.json` exposes `check:remote-runtime-blockers`.
- Root `npm run test` includes `check:remote-runtime-blockers`.
- Pages workflow uploads `remote-runtime-blockers` after root runtime checks.
- Current-run artifact gate requires `remote-runtime-blockers`.
- `check:runtime-engine-completion` includes P85 and
  `remote-runtime-blockers` in the commercial release evidence chain.
- Fixture assignment artifacts remain separated from real local assignment
  artifacts.
- Non-strict mode reports blockers without failing normal static preview CI.
- Strict mode fails until all normalized stages are ready.
