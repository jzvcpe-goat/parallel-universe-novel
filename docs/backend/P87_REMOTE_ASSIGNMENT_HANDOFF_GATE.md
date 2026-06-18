# P87 Remote Assignment Handoff Gate

P87 closes the collaboration gap after P86 image publication and before P75
assignment intake. P86 proves the deployable API and Agent Runtime images exist.
P75 requires real service ids, HTTPS origins and provider secret-store
attestation. P87 packages the exact current images and the no-secret assignment
shape so a deployment operator can fill `remote-assignment.local.json` without
copying stale tags or reading scattered runbooks.

P87 does not create remote services, set GitHub repository variables, write the
ignored assignment file, or mark a fixture as ready.

## Command

```bash
npm run check:remote-assignment-handoff
```

Strict mode requires image evidence to be ready for the current git HEAD:

```bash
REQUIRE_REMOTE_ASSIGNMENT_HANDOFF_READY=true npm run check:remote-assignment-handoff
```

## Inputs

- latest `runtime-image-publish-evidence-*.json` whose `headSha` matches the
  current git HEAD,
- `deploy/runtime-production/service-manifest.json`,
- `deploy/runtime-production/remote-assignment.example.json`,
- P75/P79/P85 docs and gate scripts.

## Outputs

```text
artifacts/runtime/remote-assignment-handoff-*.json
artifacts/runtime/remote-assignment-handoff-*.md
```

The artifact contains current image refs, target assignment path, a no-secret
`remote-assignment.local.json` template, required operator inputs, strict
validation command order, and public boundary flags proving the gate did not
write local assignment evidence or promote fixture evidence.

## Decisions

- `assignment_handoff_waiting_for_images`: P72 has not proven current image
  publication yet, or the latest P72 evidence belongs to an older commit.
- `assignment_handoff_ready_for_operator`: P72 image evidence is ready and the
  evidence `headSha` matches the current git HEAD, so the handoff can be sent
  to the deployment operator.

## Boundary

P87 may contain service ids only after an operator fills the ignored assignment
file. Its generated handoff artifact must not contain database URLs, Tool
Bridge token values, model keys, provider API tokens, private keys, private
prompt plumbing, reference vault contents, representative work names,
`sourceRefs`, `profile.id` or `kernel.id`.

P87 intentionally leaves P75/P79/P73/P66/P23/P76/P78 blocked until real remote
services exist and pass their own strict checks.

P89 downloads the CI `remote-assignment-handoff` artifact and validates its
content. P87 is the producer; P89 is the artifact content attestation gate.

## Acceptance

- `package.json` exposes `check:remote-assignment-handoff`.
- Root `npm run test` runs P87 after P72 image evidence.
- Pages workflow uploads `remote-assignment-handoff` artifact.
- Current-run artifact gate requires `remote-assignment-handoff`.
- P89 validates the uploaded artifact content and public boundary flags.
- P87 appears in P45/P84/P85 completion and blocker documents.
- The handoff artifact includes current commit image refs and blocks stale image
  evidence with `runtime-image-evidence-current-head`.
- The handoff artifact does not write or commit
  `deploy/runtime-production/remote-assignment.local.json`.
