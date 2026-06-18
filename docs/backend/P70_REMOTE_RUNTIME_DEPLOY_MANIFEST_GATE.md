# P70 Remote Runtime Deploy Manifest Gate

Date: 2026-06-18

## Goal

P70 turns the selected host target into a concrete, provider-neutral deployment
manifest. It still does not claim the remote origins are live. It gives the
runtime/deployment team one machine-readable contract for creating the two
services that P66 will later verify.

Command:

```bash
npm run check:remote-deploy-manifest
```

## Source Of Truth

```text
deploy/runtime-production/service-manifest.json
```

The manifest defines:

- the selected P69 host target,
- API and Agent service names,
- Dockerfiles and build contexts,
- container ports and health paths,
- required runtime environment variables,
- provider-secret-store-only variables,
- public GitHub Pages variables,
- preflight, post-provision and rollback commands.

## Boundary

P70 preserves the same sovereignty boundary as the runtime architecture:

- FastAPI is the business runtime and database owner.
- Agent Runtime orchestrates workflows and calls FastAPI through Tool Bridge.
- Agent Runtime direct database access is forbidden.
- Canon and branch writes must go through FastAPI.
- Service secrets use `provider_secret_store_only`.
- GitHub Pages receives only public `VITE_*` origin variables.

## Relationship To P66 Remote Runtime Origin Provisioning Gate

P70 answers:

```text
What exact services and environment contracts should the host provision?
```

P66 answers:

```text
Are those provisioned HTTPS origins and Pages variables actually ready?
```

So the order is:

1. `npm run check:remote-host-target`
2. `npm run check:remote-deploy-manifest`
3. provision remote API and Agent services
4. `npm run check:remote-origin-provisioning`
5. `npm run audit:live-runtime-readiness`
6. `npm run qa:live-runtime-browser`

## Acceptance

1. `deploy/runtime-production/service-manifest.json` exists.
2. The manifest targets the P69 default host profile.
3. Exactly two services are defined: API and Agent Runtime.
4. API uses `deploy/api/Dockerfile`, port `8787`, and `/health`.
5. Agent uses `deploy/agent-runtime/Dockerfile`, port `4111`, and `/health`.
6. Agent depends on API and calls `MASTRA_TOOL_BRIDGE_BASE_URL=https://<api-host>`.
7. `DATABASE_URL`, Tool Bridge tokens and reference-vault keys are forbidden as public variables.
8. GitHub Pages variables are limited to public `VITE_*` runtime config.
9. Preflight includes P69, deploy-readiness and runtime-preview-compose gates.
10. Post-provision includes P66, readiness ledger and live browser QA.
11. Root `npm run test` includes `check:remote-deploy-manifest`.
