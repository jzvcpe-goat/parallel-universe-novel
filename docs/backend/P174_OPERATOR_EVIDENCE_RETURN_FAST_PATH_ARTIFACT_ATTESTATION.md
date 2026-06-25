# P174 Operator Evidence Return Fast Path Artifact Attestation

Status: active release evidence gate  
Boundary: current-run artifact content proof only  
Owner: release engineering  
Date: 2026-06-25

## Purpose

P168 defines the safe operator command for returning Data API evidence after the
local evidence file is filled. P169 makes the P168 contract visible as a Pages
artifact. P174 closes the remaining evidence gap: the Pages run must download
that same `operator-evidence-return-fast-path` artifact and validate its JSON
content before the release gate continues.

This prevents a weak release state where the artifact exists but the current
run never proves that the uploaded contract still has the expected sequence and
boundary flags.

## Attestation Contract

The checker downloads:

```text
operator-evidence-return-fast-path
artifacts/runtime/operator-evidence-return-fast-path-contract-*.json
```

and verifies:

- `gate` is `P168_OPERATOR_EVIDENCE_RETURN_FAST_PATH`.
- `status` is `passed`.
- `prepareCommand` remains `npm run prepare:operator-evidence-return-fast-path`.
- The six expected commands are present exactly once in the checked sequence.
- Root test does not run the operator-only prepare command.
- The contract has no command values, service creation, GitHub variable writes,
  provider secret storage or canon writes.
- The selected next loop remains `operator-assignment-evidence-intake`.

The attestation writes:

```text
artifacts/runtime/operator-evidence-return-fast-path-attestation-*.json
```

## Commands

```bash
npm run check:operator-evidence-return-fast-path
npm run check:operator-evidence-return-fast-path-artifact
npm run check:ci-artifact-content-coverage
npm run check:pages-live-release-gate
```

CI runs the current-run check with:

```bash
CHECK_OPERATOR_EVIDENCE_RETURN_FAST_PATH_ARTIFACT_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:operator-evidence-return-fast-path-artifact
```

## Non-Goals

P174 does not create remote services, read `.env.local.sync`, upload secrets,
set GitHub variables, promote live runtime, write canon or mark Data API
evidence complete. It only proves that the uploaded P168 fast-path contract is
present and valid in the same GitHub Actions run.

## Acceptance

1. `package.json` exposes `check:operator-evidence-return-fast-path-artifact`.
2. Root `npm run test` runs P174 after P168 and before P170/P172.
3. `.github/workflows/pages.yml` runs the P174 current-run artifact content
   check after current-head coherence and before operations continuity.
4. P107 classifies `operator-evidence-return-fast-path` as a
   `download_content_gate`.
5. P16, P43 and P169 describe the P168/P174 split without claiming that
   operator evidence is complete.
