# P106 Remote Assignment Fill Plan Artifact Attestation

P106 validates the contents of the P105 `remote-assignment-fill-plan` artifact.
P43 proves the artifact exists; P106 proves the JSON and Markdown inside it are
current, operator-safe, and still preserve the remote-runtime blockers.

Command:

```bash
npm run check:remote-assignment-fill-plan-artifact
```

Current-run CI mode:

```bash
CHECK_REMOTE_ASSIGNMENT_FILL_PLAN_ARTIFACT_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:remote-assignment-fill-plan-artifact
```

## Contract

The gate validates:

- artifact version, gate, repository and `headSha`;
- `status=passed_with_operator_inputs_required`;
- `decision=remote_assignment_fill_plan_ready`;
- target path `deploy/runtime-production/remote-assignment.local.json`;
- current API and Agent Runtime image references;
- six required fill areas:
  deployment ownership, API service, Agent Runtime service, origin execution,
  Pages runtime variables and activation control;
- strict validation sequence through assignment, origin, readiness, cutover,
  activation and blocker gates;
- blocker preservation for `remote-assignment-file-present` and
  `activation-control`;
- boundary booleans proving the artifact does not write local assignment state,
  create services, set GitHub variables, promote live runtime or treat fixtures
  as production readiness.

## Source Workspace Mode

The source workspace is intentionally not a git checkout. In that mode P106
accepts `headSha=source-workspace-no-git` only when the fill plan keeps
`runtime-images-published` and `handoff-artifact-content` blocked. Release and
CI mode remain strict and require current-head image references.

## Public Boundary

The attestation must not print or store secrets, database URLs, provider prompt
plumbing, raw runtime state, private research vault payloads, representative
work names, `sourceRefs`, `profile.id` or `kernel.id`.

## Acceptance

- `package.json` exposes `check:remote-assignment-fill-plan-artifact`.
- Root `npm run test` runs P106 immediately after P105.
- Pages workflow runs P106 after P43/P92/P93/P89/P90 artifact content gates.
- The generated P106 attestation artifact records only metadata and blocked
  stage ids, not the fill-plan contents themselves.
