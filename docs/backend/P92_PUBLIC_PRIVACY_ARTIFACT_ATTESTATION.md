# P92 Public Privacy Artifact Attestation

Date: 2026-06-18

## Goal

P80, the Public Projection Privacy Audit, P111, P127, P139 and P173 create release
artifacts. P92 verifies the contents of those uploaded artifacts, not just their
presence.

This gate protects the legal/privacy boundary for representative works:

- `reference-privacy` must prove representative work names stay in the encrypted
  vault and public refs stay anonymous.
- `public-projection-privacy` must prove public API/UI/build outputs do not
  expose profile ids, kernel ids, source refs, provider prompt plumbing, vault
  metadata or deprecated case logic.
- `reference-work-encryption-completion` must prove representative work names
  have been reduced to encrypted-vault-only storage plus anonymous public refs.
- `representative-work-custody` must prove the non-team access boundary still
  agrees with constraints, kernels, runtime registry, Pages workflow and docs.
- `kernel-constraint-reference-encryption` must prove kernel, constraint and
  runtime registry refs remain encrypted-vault-backed anonymous IDs.
- `kernel-constraint-legal-privacy-loop` must prove the full kernel/constraint
  legal privacy loop is closed for the current Pages run, not only locally.
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

- All six downloadable privacy artifacts exist for the run being checked.
- Every JSON file inside the `reference-privacy` artifact has
  `artifactContract = P80_REFERENCE_PRIVACY_ARTIFACT_GATE`, `status = passed`,
  zero violations and redaction flags set to false.
- Every JSON file inside the `public-projection-privacy` artifact has
  `artifactContract = PUBLIC_PROJECTION_PRIVACY_AUDIT`, `status = passed`, zero
  violations and redaction flags set to false.
- Every JSON file inside the `reference-work-encryption-completion` artifact has
  `artifactContract = P111_REFERENCE_WORK_ENCRYPTION_COMPLETION_GATE`,
  `status = passed`, zero violations and redaction flags set to false.
- Every JSON file inside the `representative-work-custody` artifact has
  `artifactContract = P127_REPRESENTATIVE_WORK_CUSTODY_GATE`, `status = passed`,
  zero violations and redaction flags set to false.
- Every JSON file inside the `kernel-constraint-reference-encryption` artifact
  has `artifactContract = P139_KERNEL_CONSTRAINT_REFERENCE_ENCRYPTION_GATE`,
  `status = passed`, zero violations and redaction flags set to false.
- Every JSON file inside the `kernel-constraint-legal-privacy-loop` artifact has
  `artifactContract = P173_KERNEL_CONSTRAINT_LEGAL_PRIVACY_LOOP`,
  `status = passed`, zero violations and redaction flags set to false.
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
   `scan:reference-privacy`, `check:reference-work-encryption-completion` and
   `check:representative-work-custody`, with P139 and P173 also present in the
   root chain before this content attestation.
3. Pages workflow runs `check:public-privacy-artifacts` in current-run mode.
4. P16/P43/P45 handoff docs mention P92 so artifact metadata and content
   responsibilities stay aligned.
5. The attestation writes
   `artifacts/runtime/public-privacy-artifact-attestation-*.json`.
