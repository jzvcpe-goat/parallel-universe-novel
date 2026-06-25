# P176 Narrative OKF Release Artifact Attestation

P165/P166/P167 already prove the Narrative OKF knowledge layer locally:
Markdown cards exist, Agent Runtime consumes only a safe internal summary, and
the Agent Runtime image context carries the same cards. P176 closes the release
evidence gap: the Pages run must upload those three OKF artifacts and download
validate their content before the release gate proceeds.

## Why This Exists

OKF-style cards are internal-agent-readable knowledge. They are useful only if
the deployed release keeps the same boundary as local development:

- OKF cards are not a second runtime truth.
- FastAPI remains the business fact owner.
- Agent Runtime may use OKF summaries internally, but public projection must
  not expose card bodies, source authority paths, provider plumbing or
  representative work names.
- The deployment image may copy OKF cards, but must not copy private vault keys
  or create remote services.

## Artifacts

The Pages workflow uploads:

- `narrative-okf-knowledge-layer`
- `narrative-okf-runtime-consumption`
- `okf-runtime-image-context`

The content gate is:

```bash
CHECK_NARRATIVE_OKF_RELEASE_ARTIFACTS_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:narrative-okf-release-artifacts
```

## Acceptance Table

| Area | Checked | Issue Found | Fix Applied | Gate |
| ---- | ------- | ----------- | ----------- | ---- |
| Pages workflow | Uploads P165/P166/P167 OKF artifacts | Yes: OKF gates were root-test only | Added three OKF upload steps | `check:pages-live-release-gate` |
| Artifact metadata | Current-run artifact list includes OKF artifacts | Yes: P43 did not require them | Added three required artifact names | `check:github-actions-artifacts` |
| Artifact content | Downloads and validates OKF artifact JSON | Yes: no current-run content attestation existed | Added P176 checker | `check:narrative-okf-release-artifacts` |
| Coverage matrix | P107 classifies OKF artifacts as download-attested | Yes: OKF artifacts were unowned in release coverage | Added P176 rows and count update | `check:ci-artifact-content-coverage` |
| Human docs | P16/P43/P107 describe the same OKF release boundary | Yes: docs only covered local OKF gates | Updated release docs | docs review + gates |

## Privacy Invariant

P176 artifacts must not contain OKF card bodies, `source_authority` values,
representative work names, source-ref mappings, provider prompt payloads,
database URLs, keys or candidate story text. Public surfaces still receive only
redacted story guidance through product DTOs.
