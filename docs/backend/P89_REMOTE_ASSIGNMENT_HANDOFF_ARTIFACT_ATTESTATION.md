# P89 Remote Assignment Handoff Artifact Attestation

P89 closes the evidence gap after P87 uploads `remote-assignment-handoff`.
P43 proves the GitHub Actions artifact exists and is non-empty. P89 downloads
the artifact and validates its JSON content so a green Pages run cannot hide a
stale image tag, private field leak, or malformed assignment template.

## Command

Local mode checks the latest local P87 artifact:

```bash
npm run check:remote-assignment-handoff-artifact
```

If the latest local P87 artifact belongs to an older git head, non-required
local mode records `stale_local_handoff_artifact` and skips. Root `npm run test`
runs P87 immediately before P89, so the root chain still validates a fresh
current-head handoff.

Current GitHub run mode downloads the `remote-assignment-handoff` artifact and
validates exactly one JSON and one Markdown file:

```bash
CHECK_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:remote-assignment-handoff-artifact
```

Strict ready mode is only for after current-head runtime images have been
published and Pages has been rerun:

```bash
REQUIRE_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_READY=true \
npm run check:remote-assignment-handoff-artifact
```

## What This Proves

- The artifact gate is `P87_REMOTE_ASSIGNMENT_HANDOFF`.
- The handoff `headSha` matches the expected current run or local git head.
- API and Agent Runtime image refs use the current head tag.
- The assignment template contains the same current-head images.
- The Agent Runtime assignment depends on the API service.
- P87 public boundary flags remain false for local writes, fixture promotion,
  secrets, reference work names and provider prompt plumbing.
- No `sourceRefs`, `profile.id`, `kernel.id`, raw state, provider prompt
  plumbing or secret-like values are present.
- Ready artifacts must reference passed P72 image evidence for the same head.
- Non-ready artifacts must remain honestly blocked with
  `runtime-image-evidence-current-head` or `runtime-image-evidence-ready`.

## Boundary

`CHECK_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_REQUIRED=true` means the artifact must
exist and be structurally valid. It does not require the artifact to be ready,
because normal push CI runs before a human can publish current-head runtime
images. `REQUIRE_REMOTE_ASSIGNMENT_HANDOFF_ARTIFACT_READY=true` is the stricter
post-image-publish gate.

P89 does not create services, write `remote-assignment.local.json`, set GitHub
variables, check remote health, or enable public live mode.

## Acceptance

- `package.json` exposes `check:remote-assignment-handoff-artifact`.
- Root `npm run test` runs P89 after P87.
- P89 attestation artifacts include top-level `status` so downstream P85/P90
  content checks can distinguish ready from image-evidence blockers.
- Pages workflow runs the current-run artifact content check after P43 metadata
  artifact evidence.
- P16 and P43 describe the P43/P89 split.
- P45/P84/P85 completion docs include P89 as part of the commercial release
  chain evidence.
