# P94 Local Artifact Mode Coherence

## Purpose

P94 hardens the local `remote-runtime-blockers` ledger against mixed artifact
modes. P85 is allowed to read local artifacts, and CI can later validate
current-run artifacts. Those two modes must not be accidentally blended into one
release decision.

The concrete drift this prevents:

- latest local P72 runtime image evidence can belong to an older commit,
- latest local P89 handoff attestation can belong to the current commit,
- a naive "latest artifact" read can produce a false
  `handoff-artifact-head-mismatch` blocker or, worse, treat stale images as
  ready evidence.

## Rule

P85 now treats artifact heads as part of the evidence contract:

1. Runtime image evidence is ready only when P72 `headSha` equals current git
   HEAD.
2. If current-head image evidence is missing, P85 may still write a blocker
   ledger, but the `runtime-images-published` stage is blocked with
   `runtime-image-evidence-current-head`.
3. Handoff artifact evidence is selected to match the image evidence head
   before falling back to the latest local handoff artifact.
4. `handoff-artifact-content` is ready only when the P89 `expectedHeadSha`
   matches the selected P72 image evidence head.
5. P90 still enforces the stricter public-release contract: the final blocker
   artifact must carry current-head P72 and P89 evidence before it can be used
   as release-owner proof.

## Public Boundary

P94 adds only artifact filenames, head match booleans and non-secret head
hashes to P85 source evidence. It must not expose provider secrets, system
prompts, raw runtime state, reference-work vault contents, representative work
names, `sourceRefs`, `profile.id` or `kernel.id`.

## Commands

```bash
npm run check:runtime-image-publish-evidence
npm run check:remote-assignment-handoff-artifact
npm run check:remote-runtime-blockers
npm run check:remote-runtime-blockers-artifact
npm run check:runtime-engine-completion
npm run check:runtime-completion-refresh
```

## Acceptance

- `check:remote-runtime-blockers` prefers current-head P72 evidence and marks
  stale P72 evidence blocked, not ready.
- `check:remote-runtime-blockers` pairs P89 handoff evidence with the selected
  P72 image evidence head.
- `check:remote-runtime-blockers-artifact` keeps requiring current-head P72/P89
  content for release-owner artifact attestation.
- P45 and P52 mention this coherence rule so future remote-runtime work does
  not reintroduce mixed local/current-run evidence.
