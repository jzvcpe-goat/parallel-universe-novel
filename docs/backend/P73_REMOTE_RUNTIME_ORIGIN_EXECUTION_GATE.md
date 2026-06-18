# P73 Remote Runtime Origin Execution Gate

Date: 2026-06-18

## Goal

P73 is the execution gate between image evidence and public live runtime. P70
defines the two-service manifest, P71/P72 publish and evidence the runtime
images, and P66 verifies configured origins. P73 binds those pieces into an
operator-executable checklist:

- which images are deployed,
- which remote services must exist,
- which provider-secret-store checks must be complete,
- which health checks must pass,
- when GitHub Pages live variables may be written,
- how to roll back public live mode.

Command:

```bash
npm run check:remote-origin-execution
```

Strict mode:

```bash
REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution
```

## Runtime Source

Execution source:

```text
deploy/runtime-production/origin-execution-plan.json
```

The plan depends on:

- `P66_REMOTE_RUNTIME_ORIGIN_PROVISIONING_GATE`
- `P70_REMOTE_RUNTIME_DEPLOY_MANIFEST_GATE`
- `P71_RUNTIME_IMAGE_PUBLISH_GATE`
- `P72_RUNTIME_IMAGE_PUBLISH_EVIDENCE_GATE`

Before creating or updating remote services, run:

```bash
REQUIRE_RUNTIME_IMAGE_PUBLISHED=true npm run check:runtime-image-publish-evidence
```

## Required Operator Inputs

P73 does not own a cloud provider. The deployment owner supplies proof that the
provider has concrete services and secret-store configuration:

```bash
export REMOTE_API_SERVICE_ID=<provider-api-service-id>
export REMOTE_AGENT_SERVICE_ID=<provider-agent-service-id>
export REMOTE_API_ORIGIN=https://<api-host>
export REMOTE_AGENT_ORIGIN=https://<agent-host>
export REMOTE_API_SECRETS_CONFIGURED=true
export REMOTE_AGENT_SECRETS_CONFIGURED=true
```

The `*_SECRETS_CONFIGURED` values are evidence flags only. Do not put secret
values in env files, GitHub Pages variables, artifacts or docs.

## Decisions

The gate can output:

- `remote_origin_execution_unassigned`: service ids, origins or provider secret
  evidence are missing.
- `remote_origin_execution_pending_health`: services are assigned and origins
  exist, but one or both `/health` checks are not ready.
- `remote_origin_execution_ready`: both services are assigned, provider-secret
  evidence is present, both origins are remote HTTPS, and both health checks
  pass.

Default mode exits successfully with `passed_with_execution_blockers` when
execution is incomplete, so normal CI can keep publishing static Pages safely.
Strict mode fails until `remote_origin_execution_ready`.

## Execution Order

1. Verify image evidence:

```bash
REQUIRE_RUNTIME_IMAGE_PUBLISHED=true npm run check:runtime-image-publish-evidence
```

2. Provision FastAPI from:

```text
ghcr.io/jzvcpe-goat/parallel-universe-novel-api:<commit-sha>
```

3. Provision Agent Runtime from:

```text
ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime:<commit-sha>
```

4. Configure provider secret stores:

- FastAPI: `DATABASE_URL`, `NARRATIVEOS_TOOL_BRIDGE_TOKEN`
- Agent Runtime: `MASTRA_TOOL_BRIDGE_TOKEN`

5. Verify health:

```bash
curl -fsS $REMOTE_API_ORIGIN/health
curl -fsS $REMOTE_AGENT_ORIGIN/health
```

6. Run strict origin provisioning:

```bash
REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning
```

7. Only after both health checks pass, write GitHub repository variables:

```bash
gh variable set VITE_PUBLIC_RUNTIME_MODE --repo jzvcpe-goat/parallel-universe-novel --body live
gh variable set VITE_API_ORIGIN --repo jzvcpe-goat/parallel-universe-novel --body $REMOTE_API_ORIGIN
gh variable set VITE_AGENT_RUNTIME_BASE_URL --repo jzvcpe-goat/parallel-universe-novel --body $REMOTE_AGENT_ORIGIN
```

8. Verify readiness and browser smoke:

```bash
REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness
npm run qa:live-runtime-browser
```

## Rollback

If live runtime health, browser QA or trace proof fails:

```bash
gh variable set VITE_PUBLIC_RUNTIME_MODE --repo jzvcpe-goat/parallel-universe-novel --body disabled
gh variable delete VITE_API_ORIGIN --repo jzvcpe-goat/parallel-universe-novel --confirm
gh variable delete VITE_AGENT_RUNTIME_BASE_URL --repo jzvcpe-goat/parallel-universe-novel --confirm
gh workflow run "Deploy Creator Studio Preview" --repo jzvcpe-goat/parallel-universe-novel
```

## Boundary

P73 does not:

- choose a cloud provider,
- store provider secrets,
- expose database URLs or Tool Bridge tokens,
- enable public live runtime before health is ready,
- replace P66 origin provisioning,
- replace P65 remote trace proof,
- claim paid commercial launch readiness.

P73 only proves the remote-origin execution step is assigned, evidenced and
health-checked.

## Acceptance

1. `deploy/runtime-production/origin-execution-plan.json` exists.
2. `package.json` exposes `check:remote-origin-execution`.
3. Root `npm run test` includes `check:remote-origin-execution`.
4. The plan matches `service-manifest.json` image names, ports, health paths and
   Pages variable names.
5. Default mode returns `remote_origin_execution_unassigned` while no provider
   execution evidence is present.
6. Strict mode fails until service ids, origins, provider secret evidence and
   health checks are present.
7. The artifact does not include API keys, database URLs, Tool Bridge tokens,
   provider secret values, system prompts, candidate prose, raw runtime state or
   private reference mappings.
8. P73 appears in the runtime activation package and release sync manifest.
