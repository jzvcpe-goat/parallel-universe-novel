# P20 Remote Runtime Activation Runbook

Date: 2026-06-17

## Goal

把公开 Creator Studio 从静态预览推进到 live runtime。P20 不伪装远端服务已经接好；它定义部署方需要完成的 API、Agent Runtime、CORS、GitHub repository variables、live smoke、回滚和验收证据。

Current state from P19:

- GitHub Pages deploys successfully.
- Repository variables are not configured for live runtime.
- Public site is therefore `VITE_PUBLIC_RUNTIME_MODE=disabled`.
- Public `/create` must show “创作服务待连接” until this runbook is completed.

## Service Ownership

| Surface | Owner | Public URL Requirement | Responsibility |
| --- | --- | --- | --- |
| FastAPI runtime | backend/runtime deployment | `https://<api-host>` | Business state, Tool Bridge, quality check, candidate-only state preview. |
| Agent Runtime | agent/workflow deployment | `https://<agent-host>` | Socratic workflow, candidate drafting, run ledger, calls FastAPI through Tool Bridge. |
| GitHub Pages | frontend release | `https://jzvcpe-goat.github.io/parallel-universe-novel/` | Static Creator Studio shell and live runtime configuration. |

## Runtime Environment

### Host Target Gate

Before provisioning a cloud or self-hosted runtime, run:

```bash
npm run check:remote-host-target
```

Use `deploy/runtime-production/host-profiles.json` as the source of truth for
the selected deployment shape. The current preferred target is
`docker-compatible-two-service-paas`: FastAPI and Agent Runtime are separate
container services, each with its own HTTPS origin, while secrets stay in the
hosting provider secret store.

### Deploy Manifest Gate

After the host target is selected, validate the concrete two-service manifest:

```bash
npm run check:remote-deploy-manifest
```

Use `deploy/runtime-production/service-manifest.json` as the source of truth for
service names, Dockerfiles, ports, health paths, provider-secret-store-only
variables and public GitHub Pages variables.

### Runtime Image Publish Gate

Before provisioning a remote host, validate and publish the checked runtime
images:

```bash
npm run check:runtime-image-workflow
gh workflow run "Publish Runtime Images" --repo jzvcpe-goat/parallel-universe-novel
```

The host should pull these image names or their `runtime-latest` tags:

- `ghcr.io/jzvcpe-goat/parallel-universe-novel-api:<commit-sha>`
- `ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime:<commit-sha>`

### Operator Handoff

After strict image evidence is green, generate the no-secret operator handoff
pack:

```bash
npm run check:remote-origin-operator-pack
```

The generated artifacts under `artifacts/runtime/remote-origin-operator-pack-*`
list the current commit images, service assignment inputs, provider secret
names, GitHub Pages variable commands, verification commands and rollback
commands. The pack is intentionally blocked until the deployment owner supplies
remote service ids, HTTPS origins and provider secret-store confirmations.

### Assignment Intake

After the remote deployment owner creates concrete services, copy the template
and fill only non-secret service evidence:

```bash
cp deploy/runtime-production/remote-assignment.example.json \
  deploy/runtime-production/remote-assignment.local.json
npm run check:remote-runtime-assignment-intake
```

Strict assignment check:

```bash
REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake
```

`remote-assignment.local.json` is ignored by Git. It may contain service ids,
public HTTPS origins and provider-secret-store confirmation flags. It must not
contain database URLs, Tool Bridge token values, model keys or provider tokens.

### Origin Execution Gate

After image evidence is green and before writing GitHub Pages live variables,
run:

```bash
npm run check:remote-origin-execution
```

Use `deploy/runtime-production/origin-execution-plan.json` as the deployment
execution checklist. It binds P70 service names, P71/P72 image evidence,
provider-secret-store evidence, service ids, remote origins and health checks
into one operator-facing gate.

Strict execution check:

```bash
REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution
```

### Live Cutover Attestation

Before switching GitHub Pages to live mode, join the assignment, origin
execution, provisioning and readiness evidence:

```bash
npm run check:live-cutover-attestation
```

Strict cutover check:

```bash
REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation
```

### Live Rollback Rehearsal

Before or immediately after a live cutover attempt, verify the rollback path
without changing repository variables:

```bash
npm run check:live-rollback-rehearsal
```

Strict rehearsal after an operator has intentionally tested rollback:

```bash
ROLLBACK_OWNER_ID=<owner> \
ROLLBACK_REHEARSAL_CONFIRMED=true \
ROLLBACK_GITHUB_RUN_ID=<pages-run-id> \
REQUIRE_LIVE_ROLLBACK_REHEARSED=true \
npm run check:live-rollback-rehearsal
```

The rehearsal proves the rollback command bundle exists, static preview remains
reachable, and a rollback owner/run id can be attached without exposing secrets.

### Remote Activation Control Board

Use the control board after P72, P75, P76 and P77 to see the exact live runtime
cutover blocker in one artifact:

```bash
npm run check:remote-runtime-activation-control
```

Strict cutover control check:

```bash
REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control
```

The control board is intentionally read-only. It does not write GitHub
variables, mutate provider services, or store secrets; it only aggregates image
evidence, remote assignment, live cutover attestation, rollback rehearsal and
static preview reachability.

### Remote Assignment Execution Pack

### Remote Assignment Handoff

After images are published and before anyone fills the ignored assignment file,
generate the current-image handoff template:

```bash
npm run check:remote-assignment-handoff
```

Strict check:

```bash
REQUIRE_REMOTE_ASSIGNMENT_HANDOFF_READY=true npm run check:remote-assignment-handoff
```

The generated handoff artifact includes the current API/Agent image refs, the
target `deploy/runtime-production/remote-assignment.local.json` path, a
no-secret assignment template and the strict validation order. It must not write
the ignored assignment file or mark fixture evidence as ready.

### Remote Assignment Execution Pack

After the deployment owner fills
`deploy/runtime-production/remote-assignment.local.json`, generate the safe
operator command bundle:

```bash
npm run check:remote-assignment-execution-pack
```

Strict check:

```bash
REQUIRE_REMOTE_ASSIGNMENT_EXECUTION_READY=true npm run check:remote-assignment-execution-pack
```

The generated Markdown artifact contains health commands, strict gate commands,
GitHub Variable commands, rollback commands and an ordered checklist. It does
not store database URLs, Tool Bridge token values, model keys, provider API
tokens, private keys, system prompts or raw runtime state.

GitHub Actions may use non-secret repository variables for service-assignment
attestation: `REMOTE_API_SERVICE_ID`, `REMOTE_AGENT_SERVICE_ID`,
`REMOTE_API_SECRETS_CONFIGURED=true`, and
`REMOTE_AGENT_SECRETS_CONFIGURED=true`. These are flags and service ids only;
never store database URLs, Tool Bridge token values, model keys or provider API
tokens in repository variables.

Use `deploy/runtime-production/origin.env.example` as the operator checklist.
Validate it with:

```bash
npm run check:remote-origin-provisioning
```

FastAPI required environment:

```bash
NARRATIVEOS_DEPLOY_ENV=production
DATABASE_URL=<production-or-preview-database-url>
NARRATIVEOS_ALLOWED_ORIGINS=https://jzvcpe-goat.github.io
NARRATIVEOS_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret>
NARRATIVEOS_CREATOR_DIALOGUE_DIR=<persistent-or-mounted-session-dir>
NARRATIVEOS_CANON_LEDGER_DIR=<persistent-or-mounted-ledger-dir>
```

Optional provider environment, only when real model calls are enabled:

```bash
NARRATIVEOS_CREATOR_PROVIDER=openai_compatible
NARRATIVEOS_CREATOR_API_KEY=<secret>
NARRATIVEOS_CREATOR_BASE_URL=https://<provider-compatible-base-url>
NARRATIVEOS_CREATOR_MODEL=<model-name>
```

Agent Runtime required environment:

```bash
NARRATIVEOS_DEPLOY_ENV=production
NODE_ENV=production
MASTRA_HOST=0.0.0.0
MASTRA_PORT=4111
MASTRA_TOOL_BRIDGE_BASE_URL=https://<api-host>
MASTRA_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret>
MASTRA_ALLOWED_ORIGINS=https://jzvcpe-goat.github.io
```

`FASTAPI_TOOL_BRIDGE_BASE_URL` is supported only as a legacy fallback. New deployments must use `MASTRA_TOOL_BRIDGE_BASE_URL`.

## CORS Contract

FastAPI:

- Must allow `https://jzvcpe-goat.github.io`.
- Must keep `NARRATIVEOS_ALLOWED_ORIGINS` environment-driven for future staging domains.
- Must not require browser clients to see provider, prompt, database, or fallback details.

Agent Runtime:

- Must allow `https://jzvcpe-goat.github.io` through `MASTRA_ALLOWED_ORIGINS`.
- Must allow request headers `Content-Type`, `Authorization`, and `Idempotency-Key`.
- Should avoid wildcard CORS in public deployment unless the host platform terminates and rewrites CORS separately.

## Health Contract

FastAPI:

```bash
curl -fsS https://<api-host>/health
```

Expected:

```json
{"status":"ok"}
```

Agent Runtime:

```bash
curl -fsS https://<agent-host>/health
```

Expected:

```json
{"status":"ok","service":"narrativeos-agent-runtime"}
```

## Tool Bridge Contract

Agent Runtime must call FastAPI through:

- `POST /v1/tools/runtime/socratic-turn`
- `POST /v1/tools/runtime/quality-check`
- `POST /v1/tools/runtime/state-preview`

Every write-like Tool Bridge call must include `Idempotency-Key`. Public creator generation remains `candidate`; it must not write canon or branch content.

Every Tool Bridge call must also include `Authorization: Bearer <shared-tool-bridge-secret>`. Configure the same value in `NARRATIVEOS_TOOL_BRIDGE_TOKEN` on FastAPI and `MASTRA_TOOL_BRIDGE_TOKEN` on Agent Runtime. Do not expose this secret to the browser or GitHub Pages build variables.

In protected deploy envs (`production`, `live`, `staging`, `preview`, `remote`), both services reject the local `dev-local-token` default. If the secret is missing or left as `dev-local-token`, Tool Bridge calls must fail before any runtime state preview is accepted.

Protected Agent Runtime deploys also fail closed when FastAPI Tool Bridge is unreachable. A live creator request must not return a local candidate draft unless FastAPI accepted the Tool Bridge call.

## GitHub Repository Variables

Set only repository variables, not frontend code defaults:

```bash
gh variable set VITE_PUBLIC_RUNTIME_MODE --repo jzvcpe-goat/parallel-universe-novel --body live
gh variable set VITE_API_ORIGIN --repo jzvcpe-goat/parallel-universe-novel --body https://<api-host>
gh variable set VITE_AGENT_RUNTIME_BASE_URL --repo jzvcpe-goat/parallel-universe-novel --body https://<agent-host>
```

Optional:

```bash
gh variable set VITE_API_BASE_URL --repo jzvcpe-goat/parallel-universe-novel --body https://<api-host>/v1
```

Do not set `VITE_ALLOW_LOCAL_CREATOR_FALLBACK`. The workflow hard-codes it to `false`.

## Activation Sequence

1. Run `npm run check:remote-host-target` and pick the host profile.
2. Run `npm run check:remote-deploy-manifest` and use `deploy/runtime-production/service-manifest.json` as the service contract.
3. Run `npm run check:runtime-image-workflow`.
4. Publish images with `gh workflow run "Publish Runtime Images" --repo jzvcpe-goat/parallel-universe-novel`.
5. Run `REQUIRE_RUNTIME_IMAGE_PUBLISHED=true npm run check:runtime-image-publish-evidence`.
6. Run `npm run check:remote-assignment-handoff` and use the generated current-image template when preparing `remote-assignment.local.json`.
7. Run `npm run check:remote-origin-operator-pack` and hand the generated artifact to the deployment owner.
8. Deploy FastAPI with `NARRATIVEOS_DEPLOY_ENV=production`, `NARRATIVEOS_ALLOWED_ORIGINS=https://jzvcpe-goat.github.io`, and `NARRATIVEOS_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret>`.
9. Deploy Agent Runtime with `NARRATIVEOS_DEPLOY_ENV=production`, `NODE_ENV=production`, `MASTRA_TOOL_BRIDGE_BASE_URL=https://<api-host>`, `MASTRA_TOOL_BRIDGE_TOKEN=<shared-tool-bridge-secret>`, and `MASTRA_ALLOWED_ORIGINS=https://jzvcpe-goat.github.io`.
10. Fill `deploy/runtime-production/remote-assignment.local.json`.
11. Generate the execution pack with `npm run check:remote-assignment-execution-pack`.
12. Run `REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake`.
13. Export `REMOTE_API_SERVICE_ID`, `REMOTE_AGENT_SERVICE_ID`, `REMOTE_API_ORIGIN`, `REMOTE_AGENT_ORIGIN`, `REMOTE_API_SECRETS_CONFIGURED=true`, and `REMOTE_AGENT_SECRETS_CONFIGURED=true`.
14. Run `REQUIRE_REMOTE_ORIGIN_EXECUTED=true npm run check:remote-origin-execution`.
15. Verify both health endpoints with the commands from the P79 Markdown artifact.
16. Set the non-secret remote assignment attestation variables locally or as GitHub repository variables: `REMOTE_API_SERVICE_ID`, `REMOTE_AGENT_SERVICE_ID`, `REMOTE_API_SECRETS_CONFIGURED=true`, and `REMOTE_AGENT_SECRETS_CONFIGURED=true`.
17. Run local strict config check:

```bash
REQUIRE_PUBLIC_LIVE_CONFIG=true \
VITE_PUBLIC_RUNTIME_MODE=live \
VITE_API_ORIGIN=https://<api-host> \
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
npm run check:public-live-config
```

17. Run public runtime preview check:

```bash
REQUIRE_PUBLIC_RUNTIME=true \
VITE_API_ORIGIN=https://<api-host> \
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
npm run check:public-runtime-preview
```

18. Generate the readiness ledger:

```bash
REQUIRE_LIVE_RUNTIME_READY=true \
VITE_PUBLIC_RUNTIME_MODE=live \
VITE_API_ORIGIN=https://<api-host> \
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
npm run audit:live-runtime-readiness
```

19. Run strict live cutover attestation:

```bash
REQUIRE_LIVE_CUTOVER_ATTESTED=true \
VITE_PUBLIC_RUNTIME_MODE=live \
VITE_API_ORIGIN=https://<api-host> \
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> \
REMOTE_API_SERVICE_ID=<provider-api-service-id> \
REMOTE_AGENT_SERVICE_ID=<provider-agent-service-id> \
REMOTE_API_SECRETS_CONFIGURED=true \
REMOTE_AGENT_SECRETS_CONFIGURED=true \
npm run check:live-cutover-attestation
```

20. Run rollback rehearsal control:

```bash
npm run check:live-rollback-rehearsal
```

21. Run the remote activation control board:

```bash
REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control
```

22. Run Live Smoke:

```bash
REQUIRE_PUBLIC_RUNTIME=true \
VITE_API_ORIGIN=https://<api-host> \
VITE_AGENT_RUNTIME_BASE_URL=https://<agent-host> \
VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false \
npm run qa:live-runtime-browser
```

23. Set GitHub repository variables.
24. Push or manually dispatch `Deploy Creator Studio Preview`.
25. Confirm GitHub Actions build and deploy jobs are green. In live mode, the workflow must run `REQUIRE_LIVE_RUNTIME_READY=true npm run audit:live-runtime-readiness`, `REQUIRE_LIVE_CUTOVER_ATTESTED=true npm run check:live-cutover-attestation` and `REQUIRE_REMOTE_ACTIVATION_CONTROL_READY=true npm run check:remote-runtime-activation-control` before `qa:live-runtime-browser`.
26. Open public `/#/create` and verify it shows `创作服务可用`.

## Live Smoke

The live browser smoke must prove:

- API `/health` returns ok.
- Agent `/health` returns ok.
- Creator Studio builds with `VITE_PUBLIC_RUNTIME_MODE=live`.
- `/create` displays `创作服务可用`.
- Submitting a seed returns a 300-900 character candidate draft.
- Follow-up question count is 0-2.
- Public UI does not show provider, system prompt, fallback, raw state, database, or internal runtime labels.
- Candidate output does not write canon or branch state.

## Rollback

Fast rollback to static preview:

```bash
gh variable set VITE_PUBLIC_RUNTIME_MODE --repo jzvcpe-goat/parallel-universe-novel --body disabled
gh workflow run "Deploy Creator Studio Preview" --repo jzvcpe-goat/parallel-universe-novel
```

Optional cleanup if a host is unsafe or compromised:

```bash
gh variable delete VITE_API_ORIGIN --repo jzvcpe-goat/parallel-universe-novel
gh variable delete VITE_API_BASE_URL --repo jzvcpe-goat/parallel-universe-novel
gh variable delete VITE_AGENT_RUNTIME_BASE_URL --repo jzvcpe-goat/parallel-universe-novel
```

Rollback acceptance:

- GitHub Pages deploy succeeds.
- `npm run check:live-rollback-rehearsal` returns `live_rollback_static_preview_verified` or strict `live_rollback_rehearsed`.
- Public `/create` displays `创作服务待连接`.
- Submitting a seed does not create a local fake draft.

## Acceptance Evidence

Capture and attach:

- API health response.
- Agent health response.
- `npm run check:public-live-config` output.
- `npm run check:public-runtime-preview` output.
- `npm run audit:live-runtime-readiness` output and generated `artifacts/runtime/live-runtime-readiness-*.json`.
- `npm run check:live-cutover-attestation` output and generated `artifacts/runtime/live-cutover-attestation-*.json`.
- `npm run check:live-rollback-rehearsal` output and generated `artifacts/runtime/live-rollback-rehearsal-*.json`.
- GitHub Actions `runtime-readiness-ledger` artifact.
- GitHub Actions `live-rollback-rehearsal` artifact.
- `npm run smoke:creator-chain` output, or `npm run test` output proving the smoke ran inside the root gate.
- `npm run qa:live-runtime-browser` output and screenshot path.
- GitHub Actions run URL.
- Public URL proof after deploy.
- Rollback command and result, if rollback was tested.

## Privacy And Product Boundary

Do not expose provider names, API keys, model names, system prompts, raw state, representative work names, source evidence mappings, or decrypted reference vault content in public Creator/Reader UI.
