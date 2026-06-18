# P66 Remote Runtime Origin Provisioning Gate

Date: 2026-06-18

## Goal

P66 turns the P65 blockers into an operator-facing and machine-checkable origin
provisioning gate. It does not deploy a cloud provider by itself. It verifies
whether the two required remote services are reachable and whether GitHub Pages
has the public runtime variables needed to use them.

P73 Remote Runtime Origin Execution Gate sits immediately before P66. P73 checks
that concrete provider services, service ids, provider-secret-store evidence,
remote origins and health probes are assigned from the P70/P71/P72 deployment
materials. P66 then verifies those origins and Pages variables.

Command:

```bash
npm run check:remote-origin-provisioning
```

Strict mode:

```bash
REQUIRE_REMOTE_ORIGIN_PROVISIONED=true npm run check:remote-origin-provisioning
```

## Decisions

The gate can output:

- `remote_origin_unprovisioned`: one or both remote origins are missing or not
  remote HTTPS.
- `remote_origin_health_ready`: FastAPI and Agent Runtime health endpoints are
  both reachable, but Pages variables are not fully ready.
- `pages_variables_ready`: GitHub Pages variables are set for live runtime.
- `ready_for_public_live_runtime`: API origin, Agent origin, health checks,
  Pages runtime variables and local fallback boundary are all ready.

Only `ready_for_public_live_runtime` may be used before enabling public live
runtime. The other decisions are valid evidence outputs but remain release
blockers.

## Required Origins

Before origin provisioning, run P69:

```bash
npm run check:remote-host-target
npm run check:remote-deploy-manifest
npm run check:runtime-image-workflow
```

Use `deploy/runtime-production/host-profiles.json` to select the host profile.
Use `deploy/runtime-production/service-manifest.json` to provision the concrete
API and Agent services. P66 then verifies the remote HTTPS origins produced by
that host.

Execution checklist:

```bash
npm run check:remote-origin-execution
```

P71 publishes the runtime images referenced by the service manifest. The current
image names are:

- `ghcr.io/jzvcpe-goat/parallel-universe-novel-api:<commit-sha>`
- `ghcr.io/jzvcpe-goat/parallel-universe-novel-agent-runtime:<commit-sha>`

P66 does not publish images. It only checks whether the deployed services are
reachable after the host pulls and runs them.

FastAPI:

```text
https://<api-host>
```

Expected health:

```bash
curl -fsS https://<api-host>/health
```

Agent Runtime:

```text
https://<agent-host>
```

Expected health:

```bash
curl -fsS https://<agent-host>/health
```

The Agent Runtime should return:

```json
{"status":"ok","service":"narrativeos-agent-runtime"}
```

## Operator Template

Use `deploy/runtime-production/origin.env.example` as the deployment checklist.
It separates:

- provider-hosted FastAPI secrets,
- provider-hosted Agent Runtime secrets,
- public GitHub repository variables for Pages.

Real secrets must stay in the hosting provider secret store. They must not be
written to GitHub Pages variables or committed files.

## GitHub Pages Variables

After both origins are healthy:

```bash
gh variable set VITE_PUBLIC_RUNTIME_MODE --repo jzvcpe-goat/parallel-universe-novel --body live
gh variable set VITE_API_ORIGIN --repo jzvcpe-goat/parallel-universe-novel --body https://<api-host>
gh variable set VITE_AGENT_RUNTIME_BASE_URL --repo jzvcpe-goat/parallel-universe-novel --body https://<agent-host>
gh variable set VITE_API_BASE_URL --repo jzvcpe-goat/parallel-universe-novel --body https://<api-host>/v1
```

Do not set a local creator fallback variable for public Pages. The workflow
keeps `VITE_ALLOW_LOCAL_CREATOR_FALLBACK=false`.

## Relationship To P65

P65 answers whether the public Pages app may claim a remote live trace. P66
answers whether the infrastructure origins and Pages variables are provisioned
well enough for P65 to become ready.

P66 feeds P65; it does not replace:

- P23 readiness ledger,
- P46 activation decision,
- P47 trace continuity,
- P65 remote live trace decision.

## Artifact Boundary

The generated `remote-origin-provisioning` artifact may include:

- public origin URLs,
- health statuses,
- GitHub repository variable presence,
- provisioning decision,
- next actions.

It must not include API keys, provider secrets, database URLs, Tool Bridge
tokens, system prompts, candidate prose bodies, raw state, or private reference
material.

## Acceptance

1. `deploy/runtime-production/origin.env.example` exists and uses placeholders.
2. `package.json` exposes `check:remote-origin-provisioning`.
3. Root `npm run test` includes `check:remote-origin-provisioning`.
4. Missing origins return `remote_origin_unprovisioned`.
5. Healthy API and Agent origins return at least `remote_origin_health_ready`.
6. Live Pages variables return at least `pages_variables_ready`.
7. All stages ready returns `ready_for_public_live_runtime`.
8. Strict mode fails if provisioning is incomplete.
9. The artifact passes the privacy boundary.
10. P71 runtime image publishing has a separate green gate before remote host
    provisioning.
11. P73 records the concrete remote-origin execution evidence before this gate
    is used for public live runtime.
