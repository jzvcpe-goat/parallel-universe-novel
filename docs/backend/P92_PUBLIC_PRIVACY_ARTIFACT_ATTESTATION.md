# P92 Public Privacy Artifact Attestation

Date: 2026-06-18

## Goal

P80 and the Public Projection Privacy Audit already create release artifacts.
P92 verifies the contents of those uploaded artifacts, not just their presence.

This gate protects the legal/privacy boundary for representative works:

- `reference-privacy` must prove representative work names stay in the encrypted
  vault and public refs stay anonymous.
- `public-projection-privacy` must prove public API/UI/build outputs do not
  expose profile ids, kernel ids, source refs, provider prompt plumbing, vault
  metadata or deprecated case logic.
- The attestation output is redacted and never prints titles, authors, decrypted
  mappings, prompt text, provider payloads or violation detail strings.

## Command

Local latest-artifact check:

```bash
npm run check:public-privacy-artifacts
```

Strict current GitHub Pages run check:

```bash
CHECK_PUBLIC_PRIVACY_ARTIFACTS_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
CHECK_GITHUB_ARTIFACTS_RUN_ID=<pages-run-id> \
npm run check:public-privacy-artifacts
```

## What This Proves

- Both downloadable privacy artifacts exist for the run being checked.
- Every JSON file inside the `reference-privacy` artifact has
  `artifactContract = P80_REFERENCE_PRIVACY_ARTIFACT_GATE`, `status = passed`,
  zero violations and redaction flags set to false.
- Every JSON file inside the `public-projection-privacy` artifact has
  `artifactContract = PUBLIC_PROJECTION_PRIVACY_AUDIT`, `status = passed`, zero
  violations and redaction flags set to false.
- The artifact payloads do not include representative work titles, author
  fields, decrypted mappings, vault key values, prompt text, provider payloads
  or violation details.

## What This Does Not Prove

- It does not decrypt the vault in CI.
- It does not provide legal advice.
- It does not replace the private team vault governance process.

## CI Placement

Pages CI runs this after `check:github-actions-artifacts` confirms the current
run uploaded all required artifacts, and before P89/P90 validate the handoff and
blocker artifacts:

```bash
CHECK_PUBLIC_PRIVACY_ARTIFACTS_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:public-privacy-artifacts
```

## Acceptance

1. `package.json` exposes `check:public-privacy-artifacts`.
2. Root `npm run test` includes `check:public-privacy-artifacts` after
   `scan:reference-privacy`.
3. Pages workflow runs `check:public-privacy-artifacts` in current-run mode.
4. P16/P43/P45 handoff docs mention P92 so artifact metadata and content
   responsibilities stay aligned.
5. The attestation writes
   `artifacts/runtime/public-privacy-artifact-attestation-*.json`.
