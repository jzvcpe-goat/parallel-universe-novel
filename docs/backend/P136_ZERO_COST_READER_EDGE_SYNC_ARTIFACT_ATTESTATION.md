# P136 Zero-Cost Reader Edge Sync Artifact Attestation

Date: 2026-06-20

## Goal

Promote the P135 zero-cost Reader edge-sync gate from a local/runtime-check log
entry into a retained Pages artifact with downloadable content validation.

## What This Gate Proves

- Pages uploads a `zero-cost-reader-edge-sync` artifact from the same run that
  built the public Reader/Creator preview.
- The artifact content is downloaded and validated in current-run mode.
- The artifact says cloud AI runtime and cloud AI API keys are absent.
- The artifact says Reader users cannot trigger AI generation.
- The artifact keeps `.env.local.sync` and backup recovery as local/operator
  responsibilities.
- The artifact contains no provider key names, writer passwords, service-role
  references, raw runtime payloads or private reference material.
- The artifact preserves the three operator details from P134/P135: manual workflow keep-alive, sync env backup, and manual recovery SQL.

## Commands

```bash
npm run check:zero-cost-reader-edge-sync
npm run check:zero-cost-reader-edge-sync-artifact
```

The root `npm run test` chain runs both commands, and the Pages workflow runs
the artifact command again with `CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true`.

## Acceptance

- Local mode validates the latest generated P135 artifact.
- GitHub current-run mode validates the uploaded `zero-cost-reader-edge-sync`
  artifact.
- P43 metadata coverage, P107 content coverage and P16 live release gate all
  list this artifact and its content gate.
- The artifact validator rejects a P135 packet if the three practical operator
  details are missing from its machine-readable checks.
