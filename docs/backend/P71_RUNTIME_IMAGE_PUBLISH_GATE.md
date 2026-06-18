# P71 Runtime Image Publish Gate

Date: 2026-06-18

## Goal

P71 publishes the two runtime containers as GitHub Container Registry images.
This makes the P70 deploy manifest executable by any Docker-compatible host
without choosing a cloud vendor in the repository.

Command:

```bash
npm run check:runtime-image-workflow
```

Manual publish workflow:

```bash
gh workflow run "Publish Runtime Images" --repo jzvcpe-goat/parallel-universe-novel
```

## Images

```text
ghcr.io/jzvcpe-goat/parallel-universe-novel-api:<commit-sha>
ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime:<commit-sha>
```

The workflow also pushes:

```text
ghcr.io/jzvcpe-goat/parallel-universe-novel-api:runtime-latest
ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime:runtime-latest
```

## Boundary

The image workflow builds Docker images only. It does not:

- set provider secrets,
- set GitHub Pages live variables,
- enable public live runtime,
- write canon or branch state,
- decrypt reference-vault content.

Runtime secrets still belong in the hosting provider secrets store:

- `DATABASE_URL`
- `NARRATIVEOS_TOOL_BRIDGE_TOKEN`
- `MASTRA_TOOL_BRIDGE_TOKEN`
- future model provider keys

## Relationship To P66 Remote Runtime Origin Provisioning Gate

P71 answers:

```text
Are the runtime containers published for a remote host to pull?
```

P66 answers:

```text
Are the pulled services actually running behind remote HTTPS origins?
```

P71 does not enable public live runtime. P66 and P65 remain the gates for public
origin readiness and remote trace proof.

## Acceptance

1. `.github/workflows/runtime-images.yml` exists.
2. The workflow has `packages: write`.
3. It builds `deploy/api/Dockerfile`.
4. It builds `deploy/agent-runtime/Dockerfile`.
5. It pushes API and Agent Runtime images to GHCR.
6. It retries transient registry push failures through `push_with_retry`.
7. It does not reference runtime secrets.
8. `deploy/runtime-production/service-manifest.json` records the image names.
9. Root `npm run test` includes `check:runtime-image-workflow`.
