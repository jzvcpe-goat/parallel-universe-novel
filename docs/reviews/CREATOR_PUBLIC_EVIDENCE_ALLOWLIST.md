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
- `validation/creator-ui/schemas/*.json`: public JSON schemas only; no browser logs, screenshots, or run outputs.

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
