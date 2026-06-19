# P112 Remote Assignment Local Draft Preparation

Status: active helper  
Boundary: Remote Runtime Assignment Boundary  
Date: 2026-06-19

## Goal

P112 reduces operator friction after the current runtime images are published.
It prepares the ignored local assignment file with the current API and Agent
Runtime image refs while keeping every real deployment fact as an explicit
operator input.

This does not make remote runtime ready. It only changes the first blocker from
"copy the template and find current images" to "fill real provider service
evidence and health".

## Commands

Read-only gate for CI and root test:

```bash
npm run check:remote-assignment-draft-prep
```

Local helper for the deployment operator:

```bash
npm run prepare:remote-assignment-local
```

The helper writes:

```text
deploy/runtime-production/remote-assignment.local.json
```

The file is ignored by Git and must stay local-only.

In the source workspace, which is not a Git checkout, the read-only check may
pass in `passed_with_source_workspace_no_git` mode. That mode only proves wiring
and non-write behavior. Preparing an image-filled local assignment still requires
the release repository or an explicit `RUNTIME_IMAGE_HEAD_SHA`.

## What The Helper Fills

- current API image from P72 runtime image evidence;
- current Agent Runtime image from P72 runtime image evidence;
- stable schema fields;
- `FILL_*` placeholders for owner, provider, service ids and HTTPS origins;
- `providerSecretsConfigured: false` until the operator confirms provider-side
  secret stores.

## What The Helper Must Not Do

- create remote services;
- set GitHub repository variables;
- write provider secrets;
- mark health checks ready;
- commit or upload the local assignment file;
- replace P75/P79/P108/P110 readiness gates;
- turn placeholders into production evidence.

## Acceptance

1. `package.json` exposes `prepare:remote-assignment-local`.
2. `package.json` exposes `check:remote-assignment-draft-prep`.
3. Root `npm run test` includes `check:remote-assignment-draft-prep`.
4. The check mode does not write `remote-assignment.local.json`.
5. The prepare mode refuses to overwrite an existing local assignment unless
   `REMOTE_ASSIGNMENT_DRAFT_FORCE=true` is set.
6. Generated drafts pass schema shape but remain `remote_assignment_incomplete`
   because `FILL_*` placeholders and false secret-store flags are still blocked.
7. `npm run check:remote-assignment-image-drift` fails if the ignored local
   assignment points at images from an older commit.
8. Generated drafts contain no database URL, Tool Bridge token, model key,
   provider API token, private key, system prompt, raw state or reference vault
   material.

## Next Strict Step

After preparing the draft, the deployment operator must fill real provider
values and run:

```bash
REQUIRE_REMOTE_ASSIGNMENT_READY=true npm run check:remote-runtime-assignment-intake
```

P116 provides the preferred non-secret apply path for those real provider
values:

```bash
REMOTE_ASSIGNMENT_ENV_APPLY_CONFIRM=true \
REMOTE_OPERATOR_OWNER=<owner-id> \
REMOTE_OPERATOR_PROVIDER=<provider-name> \
REMOTE_API_SERVICE_ID=<provider-api-service-id> \
REMOTE_AGENT_SERVICE_ID=<provider-agent-service-id> \
REMOTE_API_ORIGIN=https://<api-host> \
REMOTE_AGENT_ORIGIN=https://<agent-host> \
REMOTE_API_SECRETS_CONFIGURED=true \
REMOTE_AGENT_SECRETS_CONFIGURED=true \
npm run apply:remote-assignment-env
```

Until that strict command passes, public live runtime remains disabled.
