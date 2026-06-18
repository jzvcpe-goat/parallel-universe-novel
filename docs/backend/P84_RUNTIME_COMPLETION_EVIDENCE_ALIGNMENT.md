# P84 Runtime Completion Evidence Alignment

## Purpose

P83 added `public-projection-privacy` as a Pages artifact and root gate. P84
aligns the runtime completion matrix with that new evidence so P45 does not
silently report an older release-chain shape.

This is not a new product feature and does not change public behavior. It is an
evidence alignment gate: the runtime completion audit must describe the same
artifact set that the Pages workflow and current-run artifact checker require.

## Command

```bash
npm run check:runtime-engine-completion
npm run check:runtime-completion-refresh
```

## Required Alignment

- P45 commercial release chain evidence includes both `reference-privacy` and
  `public-projection-privacy`.
- P45 commercial release chain evidence includes `remote-runtime-blockers`
  whenever P85 is part of the release chain.
- P45 commercial release chain evidence includes `remote-assignment-handoff`
  whenever P87 is part of the release chain.
- P45 commercial release chain evidence includes P89 handoff artifact content
  attestation whenever P87 uploads `remote-assignment-handoff`.
- P45 required evidence artifacts list contains the same public privacy evidence
  uploaded by `.github/workflows/pages.yml`.
- `check:runtime-engine-completion` validates the Pages upload step, the public
  projection scan script, and the current-run artifact checker.
- `check:runtime-completion-refresh` validates that future refreshes keep the
  script and human-readable P45 document synchronized.
- `check:remote-assignment-handoff-artifact` validates handoff content after
  P43 validates artifact metadata.

## Public Boundary

The new evidence is a redacted pass/fail artifact only. It must not include
representative work titles, authors, decrypted vault mappings, provider prompt
plumbing, `profile.id`, `kernel.id`, `sourceRefs`, raw runtime state, or
deprecated case logic.

## Acceptance

- `npm run check:runtime-engine-completion` passes.
- `npm run check:runtime-completion-refresh` passes.
- `npm run check:pages-live-release-gate` still reports
  `publicProjectionPrivacy`.
- `npm run check:pages-live-release-gate` still reports
  `remoteRuntimeBlockers`.
- `npm run check:pages-live-release-gate` still reports
  `assignmentHandoff`.
- `npm run check:pages-live-release-gate` still reports
  `assignmentHandoffContent`.
- `npm run test` keeps both privacy artifacts in the root release chain.
