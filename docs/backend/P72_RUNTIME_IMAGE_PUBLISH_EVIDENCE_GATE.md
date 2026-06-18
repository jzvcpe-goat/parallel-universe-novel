# P72 Runtime Image Publish Evidence Gate

Date: 2026-06-18

## Goal

P72 verifies that the runtime images published by P71 are evidenced for the
current commit. It exists because GitHub package version APIs can require a
`read:packages` token scope that is not always available to local operators.

Command:

```bash
npm run check:runtime-image-publish-evidence
```

Strict mode:

```bash
REQUIRE_RUNTIME_IMAGE_PUBLISHED=true npm run check:runtime-image-publish-evidence
```

## Evidence Source

The gate reads the latest successful GitHub Actions run for:

```text
Publish Runtime Images
```

It then checks the run log for image references and digest evidence:

- `ghcr.io/jzvcpe-goat/parallel-universe-novel-api:<commit-sha>`
- `ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime:<commit-sha>`
- `ghcr.io/jzvcpe-goat/parallel-universe-novel-api:runtime-latest`
- `ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime:runtime-latest`
- API `runtime-latest` digest
- Agent Runtime `runtime-latest` digest

## Boundary

P72 does not:

- call the package versions API,
- require `read:packages`,
- pull or run the images,
- provision remote infrastructure,
- set GitHub Pages live variables,
- enable public live runtime.

P72 is evidence-only. It does not enable public live runtime. P66 still owns
remote HTTPS origin readiness, and P65 still owns public remote trace proof.

## Decisions

Default mode exits successfully even if the current commit has not yet had a
successful image publish run. In that case it writes
`passed_with_publish_blockers` so normal Pages CI can run before the manual image
publish workflow.

Strict mode fails if the current commit lacks a successful publish run or if the
run log lacks image refs/digests. Use strict mode after triggering P71.

## Acceptance

1. `package.json` exposes `check:runtime-image-publish-evidence`.
2. Root `npm run test` includes `check:runtime-image-publish-evidence`.
3. The script can produce a non-strict blocker artifact before image publish.
4. The script can pass strict mode after `Publish Runtime Images` succeeds for
   the current commit.
5. The artifact does not include provider secrets, database URLs, Tool Bridge
   tokens, system prompts, candidate prose or private reference mappings.
