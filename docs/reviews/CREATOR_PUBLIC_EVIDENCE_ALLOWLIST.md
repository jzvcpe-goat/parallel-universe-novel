# Creator Public Evidence Allowlist

## Purpose

Creator review evidence is public only when it proves a bounded contract without exposing unpublished prose, private creative interpretation, credentials, browser sessions, or local workspace contents.

## Allowed by default

- Synthetic fixtures with clear fixture IDs and no user-authored prose.
- Hashes, schema versions, timestamps, exit status, revision or fingerprint identifiers.
- Sanitized test manifests that name a command and result without embedding raw model input or output.
- Small, explicitly approved screenshots stored under `docs/reviews/approved-screenshots/` with a recorded approval reason.
- Current-status ledgers and review manifests that state non-claims and owners.

## Requires explicit approval

- Any image, browser screenshot, video, or copied text excerpt.
- Any evidence created from a real local workspace.
- Any evidence that includes a title, character name, chapter identifier, reader signal, or source prompt that could identify unpublished work.

## R0 approved sanitized evidence

- `validation/creator-rag/langchain-textsplitters-1.0.1-receipt.json`: package/version/license and disabled-activation receipt only.
- `validation/creator-rag/open-source-local-retrieval-dependencies-2026-07-17.json`: package/model hashes and disabled-activation receipt only.
- `validation/creator-rag/local-hybrid-benchmark-2026-07-17.json`: synthetic benchmark metrics only.
- `validation/creator-rag/real-thread-evidence-benchmark-2026-07-17.json`: hash-and-metrics-only receipt; local work identity is redacted and no manuscript or evidence text is included.
- `scripts/fixtures/creator-rag-frozen-benchmark.mts`: explicitly synthetic fixture and leakage decoys only.
- `scripts/fixtures/creator-frozen-paired-quality-fixture.mts`: explicitly synthetic paired-quality fixture only.
- `validation/story_seeds.json`: synthetic validation seeds only.

Public JSON schemas under `validation/creator-ui/schemas/` remain source contracts, not R0 approved evidence artifacts. They are reviewed as code and are not represented by a wildcard entry in the R0 hash inventory.

## R1-A0 approved synthetic browser evidence

- `creator-decision-workbench.png` in the `r1-a0-writing-workflow-evidence`
  GitHub Actions artifact is approved only when its adjacent JSON manifest marks
  `sourceCategory = synthetic-r1-a0-workflow` and
  `approval = approved-sanitized-synthetic-fixture`.
- The manifest must record the screenshot's relative filename and SHA-256. It
  must not contain a runner or local absolute path.
- The adjacent JSON manifest may record IDs, revisions, counts, status arrays,
  fingerprints, and SHA-256 values for this synthetic workflow. It must not
  embed Context statements, Candidate prose, accepted Canon blocks, review
  quotations, or other continuous synthetic manuscript text.
- This approval covers the repository's synthetic Fog Harbor fixture only. It
  does not approve screenshots from a real author workspace, unpublished prose,
  browser authentication state, or local workspace exports.

## Never commit

- Unpublished chapters, character cards, relationship maps, workspace exports, OPFS or IndexedDB data.
- Raw prompts, raw model responses, reasoning, browser authentication state, environment files, or credentials.
- Generated benchmark outputs that contain source prose or unredacted local paths.
- Database migrations, payment artifacts, or production deployment evidence in Creator-only review branches.

## Review procedure

1. Confirm the file is covered by the allowed list or has written approval.
2. Search its staged content for credentials, absolute local paths, and continuous prose.
3. Record its path, SHA-256, source category, and review decision in the R0 review manifest.
4. Keep rejected evidence local only; removing it from a later commit does not make an already-pushed sensitive revision safe.
