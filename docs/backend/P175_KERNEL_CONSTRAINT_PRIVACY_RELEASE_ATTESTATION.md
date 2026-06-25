# P175 Kernel Constraint Privacy Release Attestation

P173 proves locally that kernel and constraint materials do not expose
representative work names. P175 closes the release-evidence gap: the same Pages
run that deploys the public build must upload the P173 artifact and P92 must
download-validate it before the release gate proceeds.

## Why This Exists

Representative work names are legal-risk material. Keeping them encrypted in
the local repository is necessary, but not sufficient for launch confidence:
non-team members and public users only interact with the deployed build,
workflow artifacts and handoff docs. The release chain therefore needs current
run evidence that the kernel/constraint legal privacy loop stayed closed after
the production Pages build.

## Boundary

This does not introduce a new privacy model.

- P111 proves representative work names are stored as encrypted-vault-only
  material.
- P127 proves the non-team custody boundary.
- P139 proves kernel, constraint and runtime registry refs are anonymous.
- P173 aggregates the local kernel/constraint legal privacy loop.
- P92 now download-attests the uploaded P173 artifact for the current Pages run.

## Commands

Local evidence:

```bash
npm run check:kernel-constraint-legal-privacy-loop
npm run check:public-privacy-artifacts
```

Current Pages run evidence:

```bash
CHECK_PUBLIC_PRIVACY_ARTIFACTS_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
CHECK_GITHUB_ARTIFACTS_RUN_ID=<pages-run-id> \
npm run check:public-privacy-artifacts
```

## Acceptance Table

| Area | Checked | Issue Found | Fix Applied | Gate |
| ---- | ------- | ----------- | ----------- | ---- |
| Pages workflow | Runs P173 after P139 and uploads `kernel-constraint-legal-privacy-loop` | Yes: P173 was local-only release evidence | Added P173 run and upload step | `check:pages-live-release-gate` |
| Artifact metadata | Current-run artifact list includes P173 | Yes: P43 did not require the P173 artifact | Added P173 to artifact metadata requirements | `check:github-actions-artifacts` |
| Artifact content | P92 downloads and validates P173 JSON | Yes: P92 stopped at P139 | Added P173 validator to `check:public-privacy-artifacts` | `check:public-privacy-artifacts` |
| Coverage matrix | P107 classifies P173 as download-attested | Yes: no coverage row existed | Added P173 row and count update | `check:ci-artifact-content-coverage` |
| Human docs | P16/P43/P92/P107/P173 explain the same boundary | Yes: docs did not mention release-uploaded P173 | Updated release docs | docs review + gates |

## Privacy Invariant

P175 artifacts must not contain representative work titles, author names,
decrypted mappings, source-ref mappings, provider prompt payloads, vault key
values or violation detail strings. The public surface remains anonymous
`rwref_*` IDs plus encrypted vault ciphertext only.
