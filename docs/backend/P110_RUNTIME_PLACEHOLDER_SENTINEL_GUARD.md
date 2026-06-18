# P110 Runtime Placeholder Sentinel Guard

## Purpose

P110 prevents remote runtime templates from being mistaken for real deployment
evidence. P87 handoff artifacts intentionally contain placeholders such as
`FILL_API_SERVICE_ID` and `https://FILL_API_HOST`; P75, P79 and P109 must treat
those values exactly like `<api-host>` placeholders.

This is a release-safety guard. It does not create remote services, write the
ignored assignment file, set GitHub variables, store secrets, or mark public live
runtime ready.

## Command

```bash
npm run check:runtime-placeholder-sentinel
```

The command creates a temporary artifact fixture under `artifacts/runtime/` with
`FILL_*` values and verifies:

- P75 returns `remote_assignment_incomplete`.
- P79 returns `assignment_execution_incomplete`.
- `https://FILL_API_HOST` and `https://FILL_AGENT_HOST` are not accepted as real
  remote HTTPS origins.
- `FILL_API_SERVICE_ID` and `FILL_AGENT_SERVICE_ID` are not accepted as real
  service ids.
- P109 recognizes the same placeholder sentinels for GitHub repository
  variables.

## Placeholder Sentinels

The runtime release chain must reject all of these placeholders:

- `<...>`
- `FILL_*`
- `REPLACE_ME`
- `YOUR_*`
- `TODO_*`

## Acceptance

- `package.json` exposes `check:runtime-placeholder-sentinel`.
- Root `npm run test` includes `check:runtime-placeholder-sentinel`.
- P75 and P79 reject placeholder assignment files before health checks can be
  treated as the only blocker.
- P109 rejects placeholder GitHub repository variables before live runtime is
  trusted.
- Generated artifacts contain no database URLs, Tool Bridge token values, model
  keys, private keys, provider API tokens, provider prompt plumbing, raw runtime
  state or reference-vault content.
