# P74 Remote Runtime Operator Handoff

## Purpose

P74 turns the remote runtime deployment boundary into a non-secret operator handoff packet.
It does not deploy services by itself and it does not claim a live backend. It packages the current
commit images, service assignment inputs, provider secret names, public GitHub Pages variable commands,
verification commands, and rollback commands so the remote deployment operator can execute P73 without
guessing.

This gate exists because the repository can publish Docker images and validate runtime contracts, but it
cannot safely invent a provider account, service ids, origins, database, or secret-store state.

## Command

```bash
npm run check:remote-origin-operator-pack
```

Strict mode for operator-ready status:

```bash
REMOTE_API_SERVICE_ID=<provider-service-id> \
REMOTE_AGENT_SERVICE_ID=<provider-service-id> \
REMOTE_API_ORIGIN=https://<api-host> \
REMOTE_AGENT_ORIGIN=https://<agent-host> \
REMOTE_API_SECRETS_CONFIGURED=true \
REMOTE_AGENT_SECRETS_CONFIGURED=true \
REQUIRE_REMOTE_OPERATOR_PACK_READY=true \
npm run check:remote-origin-operator-pack
```

## Decisions

- `operator_pack_waiting_for_service_assignment`: the pack is valid, but service ids, origins, or provider secret confirmations are not present.
- `operator_pack_ready_for_strict_origin_execution`: both remote services are assigned, origins are HTTPS, and provider secret confirmations are present.

## Generated Artifacts

The command writes:

- `artifacts/runtime/remote-origin-operator-pack-*.json`
- `artifacts/runtime/remote-origin-operator-pack-*.md`

The artifacts contain:

- Current commit SHA and GHCR image references for FastAPI and Agent Runtime.
- Required operator inputs such as `REMOTE_API_SERVICE_ID`, `REMOTE_AGENT_SERVICE_ID`, `REMOTE_API_ORIGIN`, and `REMOTE_AGENT_ORIGIN`.
- Provider secret names only, never secret values.
- GitHub Pages variable commands to run only after both health endpoints pass.
- Strict verification commands for P72, P73, and live runtime readiness.
- Rollback commands that disable public live mode and remove remote origins.

## Boundary

The operator handoff packet may include public origins, image names, service ids, port numbers, and secret
names. It must never include `DATABASE_URL`, tool bridge token values, model API keys, private keys, system
prompt payloads, raw state dumps, or reference-work vault contents.

FastAPI remains the business runtime owner. Mastra Agent Runtime remains orchestration-only. The Agent
Runtime must call FastAPI through Tool Bridge and must not connect to PostgreSQL directly.

## Acceptance

- `package.json` exposes `check:remote-origin-operator-pack`.
- Root `npm run test` includes `check:remote-origin-operator-pack`.
- The generated pack uses the current `git rev-parse HEAD` image tag.
- The pack includes API and Agent Runtime service assignments.
- The pack includes strict P73 verification using `REQUIRE_REMOTE_ORIGIN_EXECUTED=true`.
- The pack includes strict live readiness verification using `REQUIRE_LIVE_RUNTIME_READY=true`.
- The pack scans clean for private material.
- P20 and P73 reference this handoff gate.
