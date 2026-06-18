# P65 Remote Live Runtime Trace Gate

Date: 2026-06-18

## Goal

P65 decides whether the product may claim a remote live runtime trace on GitHub
Pages. It does not deploy infrastructure and does not fake live generation. It
only consumes existing evidence from:

- P23 live runtime readiness ledger,
- P46 remote runtime activation gate,
- P47 runtime trace continuity gate.

Command:

```bash
npm run audit:live-runtime-readiness
npm run check:runtime-readiness-ledger
npm run check:remote-runtime-activation
npm run check:runtime-trace-continuity
npm run check:remote-live-runtime-trace
```

## Decisions

The gate can output three decisions:

- `hold_remote_live_trace_unproven`: remote FastAPI, remote Agent Runtime, or
  Pages live variables are not fully proven.
- `creator_remote_trace_ready_reader_partial`: Creator seed-to-candidate trace
  is ready remotely, but Reader trace continuity is still partial.
- `remote_live_trace_ready`: Creator, Reader, Studio trace continuity and remote
  runtime activation are all proven.

Only `remote_live_trace_ready` may be used as a release input for public live
generation. The other two decisions are acceptable gate outputs, but they must
not be described as commercial live runtime readiness.

## Required Upstream Checks

P65 requires these P23 readiness checks:

- `public-runtime-mode`
- `api-origin`
- `agent-origin`
- `api-base-url`
- `local-fallback-disabled`
- `api-health`
- `agent-health`
- `creator-workflow-preflight`

It also requires P46 to output one of:

- `hold_public_live_runtime_disabled`
- `can_enable_public_live_runtime`

And it requires P47 trace gates:

- `creator-trace`
- `reader-trace`
- `studio-trace`

## Artifact Boundary

The generated `remote-live-runtime-trace` artifact may include:

- source artifact filenames,
- readiness check ids and statuses,
- activation release decision,
- trace gate ids and statuses,
- next actions.

It must not include provider secrets, system prompts, candidate draft bodies,
raw state vectors, private reference mappings, or database connection material.

## Current Expected State

Until remote FastAPI and remote Agent Runtime HTTPS origins are deployed and
GitHub repository runtime variables are configured, the expected decision is:

```text
hold_remote_live_trace_unproven
```

This is a successful gate result because it prevents the release from
overclaiming a live runtime that is not yet reachable from the public Pages app.

## Acceptance

1. `package.json` exposes `check:remote-live-runtime-trace`.
2. Root `npm run test` includes `check:remote-live-runtime-trace` after P46/P47.
3. The gate reads latest P23/P46/P47 artifacts instead of duplicating their
   checks.
4. Missing public runtime variables keep the decision at
   `hold_remote_live_trace_unproven`.
5. A ready Creator trace with partial Reader trace returns
   `creator_remote_trace_ready_reader_partial`.
6. A fully ready chain returns `remote_live_trace_ready`.
7. The artifact passes the privacy boundary.
