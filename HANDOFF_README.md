# NarrativeOS Kimi Integration Handoff

> Current product handoff for the Parallel Universe Novel commercial prototype lives in `PARALLEL_UNIVERSE_PROTOTYPE_HANDOFF.md`. This file is the earlier integration-baseline handoff and is kept for historical backend harness context.

Prepared for the next development team.

## What This Bundle Contains

- `backend/`: clean backend git clone on harness branch.
- `app/`: Kimi Vite frontend snapshot scoped to the committed backend baseline.
- `scripts/`: harness initialization, environment, contract, artifact, smoke, and review scripts.
- `artifacts/integration/`: endpoint matrix, latency report, curl harness, Postman collection, browser smoke notes, npm audit report, and WebSocket transcript.
- `artifacts/review_report.md`: automated review result.
- `.harness-baseline`: locked base commit, branch, source paths, and checksums.
- `INTEGRATION_ISSUES.md`: accumulated blockers and resolved gate notes.

Excluded from the archive:

- `app/node_modules/`
- `app/dist/`
- `.toolchain/`
- `artifacts/integration/runtime_smoke.db`

These are intentionally excluded because they are large or runtime-local and can be regenerated.

## Current Verified Status

- Frontend build: PASS
- Frontend typecheck: PASS
- Frontend lint: PASS
- npm audit: PASS, zero moderate+ vulnerabilities after lockfile update
- Backend narrow tests: PASS
- Harness env gate: PASS
- Harness contract gate: PASS
- Automated review: PASS

Backend harness branch commits:

- `caafcd0` `[test][harness] Add committed-baseline narrow API checks`
- `d4818c0` `[harness][contract] Normalize OpenAPI refs for generated types`
- `aa35b02` `[harness][baseline] Lock clean integration baseline`
- Base commit: `7bbfa93`

## How To Resume

From the extracted `integration-harness/` directory:

```bash
# Install toolchains or provide explicit paths.
export NODE_BIN=/path/to/node-20.19.0/bin/node
export NPM_BIN=/path/to/node-20.19.0/bin/npm
export PYTHON_BIN=/path/to/python3.11

export VITE_API_ORIGIN=http://127.0.0.1:8000
export VITE_WS_URL=ws://127.0.0.1:8000/ws/v1/narrative
export NARRATIVEOS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://rhdrrmzncad2e.ok.kimi.link

./scripts/harness-check-env.sh
./scripts/harness-check-contract.sh

cd app
npm ci
npm run build
npx tsc --noEmit -p tsconfig.app.json
npm run lint -- --max-warnings=0
npm audit --audit-level=moderate
```

Backend narrow tests:

```bash
cd integration-harness
PYTHONPATH=backend "$PYTHON_BIN" -m pytest \
  backend/tests/test_cors_config.py \
  backend/tests/test_harness_narrow_api.py \
  -q
```

Regenerate integration artifacts:

```bash
VITE_API_ORIGIN=http://127.0.0.1:8000 ./scripts/harness-generate-artifacts.sh
```

## Commercialization Blockers Still Open

The current committed backend baseline is integration-safe but not commercial-complete. Before real launch, the next team must add clean backend commits for:

- checkout completion reconcile
- customer portal
- customer exports and audit exports
- email verification or explicit production auth policy
- WebSocket server for `/ws/v1/narrative`

After those backend capabilities are committed, re-run `harness-init.sh` against the new clean backend commit and repeat all gates.
