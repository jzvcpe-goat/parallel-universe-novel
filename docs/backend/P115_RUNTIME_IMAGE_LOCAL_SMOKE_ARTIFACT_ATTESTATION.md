# P115 Runtime Image Local Smoke Artifact Attestation

Status: active gate  
Boundary: CI Artifact Content Boundary  
Date: 2026-06-19

## Goal

P114 produces a privacy-safe `runtime-image-local-smoke-*.json` artifact while
root release checks run. P115 makes that proof first-class release evidence:
Pages must upload the P114 artifact as `runtime-image-local-smoke`, then download
the same current-run artifact and validate its content.

This prevents a release chain where the current GHCR image smoke result only
exists in CI logs or in a local `artifacts/` directory.

## Command

Local artifact content check:

```bash
npm run check:runtime-image-local-smoke-artifact
```

Current GitHub Actions run content check:

```bash
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
CHECK_RUNTIME_IMAGE_LOCAL_SMOKE_ARTIFACT_REQUIRED=true \
npm run check:runtime-image-local-smoke-artifact
```

## Contract

The gate validates:

1. The artifact has `gate: P114_RUNTIME_IMAGE_LOCAL_SMOKE_GATE`.
2. The artifact version is `1`.
3. The artifact status is one of:
   - `passed`
   - `skipped`
   - `passed_with_source_workspace_no_git`
4. In release mode, `currentHead` matches the GitHub run head or local git head.
5. API and Agent Runtime image refs match the current P72 image evidence tags.
6. A passed smoke run includes only summarized API health, Agent health and
   workflow metadata.
7. A skipped smoke run must declare one of the allowed non-strict decisions:
   `docker_daemon_unavailable`, `images_not_local`, or
   `container_registry_unavailable`.
8. Source-workspace no-git mode must not invent image refs.
9. No artifact payload contains credentials, candidate正文, provider prompt
   plumbing, raw runtime state, `sourceRefs`, `profile.id`, `kernel.id`,
   plaintext reference works or reference-vault material.

## Pages Artifact

Pages uploads:

```text
runtime-image-local-smoke
```

from:

```text
artifacts/runtime/runtime-image-local-smoke-*.json
```

The P115 attestation file intentionally uses the prefix
`runtime-image-smoke-artifact-attestation-*` so the uploaded evidence artifact
contains the smoke result, not the verifier's own report.

## Acceptance

1. `package.json` exposes `check:runtime-image-local-smoke-artifact`.
2. Root `npm run test` runs P114 followed by P115.
3. Pages uploads `runtime-image-local-smoke`.
4. Pages runs P115 after P43 current-run artifact metadata is checked.
5. P107 includes `runtime-image-local-smoke` as a `download_content_gate`.
6. P16 and P43 document the new artifact and its content attestation owner.
