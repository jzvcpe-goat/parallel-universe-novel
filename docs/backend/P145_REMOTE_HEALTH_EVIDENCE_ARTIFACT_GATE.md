# P145 Remote Health Evidence Artifact Gate

Status: active evidence gate  
Boundary: Data API health proof, no secrets in Git or CI artifacts  
Owner: release engineering + operator  
Date: 2026-06-20

## Purpose

P145 closes the operational gap left after P142 pointed the loop at
`remote-health:check`. The health check itself uses a local publishable/anon key
to query the managed Data API, so its raw inputs must never be committed or
uploaded. P145 turns the result into a privacy-safe attestation that Pages can
upload and re-download in the same workflow.

The gate deliberately separates two meanings:

- `CHECK_REMOTE_HEALTH_EVIDENCE_ARTIFACT_REQUIRED=true` means the release run
  must contain a downloadable P145 artifact.
- `REQUIRE_REMOTE_HEALTH_EVIDENCE_READY=true` means P142 cannot pass unless the
  operator has run `remote-health:check` and the attestation has
  `healthReady=true`.

This lets CI stay green without local Supabase credentials while still refusing
to treat missing health evidence as production readiness.

## Commands

Normal root-test mode:

```bash
npm run check:remote-health-evidence-artifact
```

Operator-ready strict mode, after local `.env.local.sync` or `.env.local`
contains the publishable Data API key:

```bash
REQUIRE_EDGE_ONLY_DATA_API_LOCAL_SECRET_GUARD_READY=true \
npm run check:edge-only-data-api-local-secret-guard
npm run remote-health:check
REQUIRE_REMOTE_HEALTH_EVIDENCE_READY=true npm run check:remote-health-evidence-artifact
```

Current-run artifact content mode inside GitHub Actions:

```bash
CHECK_REMOTE_HEALTH_EVIDENCE_ARTIFACT_REQUIRED=true \
CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true \
npm run check:remote-health-evidence-artifact
```

## Output

The command writes:

```text
artifacts/runtime/remote-health-evidence-attestation-*.json
```

When local health evidence is absent, the attestation is explicit:

- `status=waiting_for_remote_health_evidence`;
- `healthReady=false`;
- `nextCommand=npm run remote-health:check`;
- `rawHealthEvidenceIncluded=false`.

When `remote-health:check` has succeeded, P145 validates and projects:

- `status=passed`;
- `healthReady=true`;
- `runtimeMode=edge-only`;
- Data API origin uses production HTTPS;
- table is `health_probe`;
- probe id is `reader`;
- probe status is `ok`;
- remote Agent requirement is false and evidence is `not-required-edge-only`.

## Public Boundary

The P145 artifact may include public-safe Data API origin, table name, probe id,
probe status, remote-agent-not-required flag, and a digest of stable public
evidence. It must not include:

- publishable/anon key values;
- service-role keys;
- writer passwords;
- database URLs;
- provider API keys;
- authorization headers;
- system prompts, provider prompts, raw state, source refs, profile ids or
  kernel ids.

## Workflow Placement

Root `npm run test` runs P156 before P150 and runs P145 after
`check:remote-assignment-compiler-coherence` and before the CI artifact
coverage matrix. P145 assumes the local files used by `remote-health:check`
have already passed `check:edge-only-data-api-local-secret-guard` when the
operator is in strict mode. Pages uploads the generated `remote-health-evidence`
artifact, then downloads it again with
`CHECK_CURRENT_GITHUB_RUN_ARTIFACTS=true` to verify its content.

P148 may invoke P145 in strict fixture mode to prove the returned Data API
evidence shape. P148 must then restore the runtime-production files and write a
fresh waiting P145 attestation, so the latest repo state does not pretend that
fixture health equals production health.
After P148 cleanup, the public `remote-health-evidence` Pages artifact must
contain exactly one P145 attestation: the restored waiting attestation. The
strict fixture-ready P145 result may be summarized by P148, but it must not be
uploaded as current remote health evidence.

## Acceptance

1. `package.json` exposes `check:remote-health-evidence-artifact`.
2. Root `npm run test` includes `check:remote-health-evidence-artifact`.
3. Operator strict mode runs P156 before `remote-health:check`.
4. Pages uploads `remote-health-evidence`.
5. Pages runs `check:remote-health-evidence-artifact` in current-run artifact
   mode after upload.
6. P107 includes `remote-health-evidence` as a `download_content_gate`.
7. Waiting CI artifacts remain honest and do not claim P142 completion.
8. Strict operator mode fails unless P156 has accepted the local health-input
   files and `remote-health:check` produced a valid
   Data API health result.
9. No P145 artifact contains secrets, provider plumbing, raw runtime state,
   private research material or candidate story text.
