# P135 Zero-Cost Reader Edge Sync Gate

Date: 2026-06-20

## Goal

Turn the P134 zero-cost Reader Web runbook into an executable repository gate.
The gate verifies that the public Reader cloud path remains storage/read/health
only, while writing, generation, rewriting and local manuscript sync stay on the
operator's edge device.

## What This Gate Proves

- GitHub has a dedicated `keep-supabase-alive` workflow.
- The keep-alive workflow can be scheduled and manually dispatched.
- The workflow queries Supabase `health_probe` directly, instead of only
  requesting the static Reader page.
- The workflow skips safely when `SUPABASE_URL` or `SUPABASE_PUBLISHABLE_KEY`
  is not configured.
- The workflow uses only public Reader Supabase credentials.
- `.env.local.sync` and backup outputs remain local and ignored by Git.
- The public frontend and keep-alive workflow do not expose cloud AI writing
  routes, model-provider keys, writer passwords or service-role credentials.
- P134 and P135 docs agree that `novels_history` is manual recovery material,
  not a one-click rollback system.

## Command

```bash
npm run check:zero-cost-reader-edge-sync
```

The root `npm run test` chain includes this command so the zero-cost Reader
boundary cannot silently drift.

## Limits

- This gate does not create the Supabase project or tables.
- This gate does not prove live Supabase health until repository secrets are
  configured and the workflow is run.
- This gate does not turn `novels_history` into automatic rollback.
- This gate does not allow any Reader browser action to trigger AI generation.

## Acceptance

- `npm run check:zero-cost-reader-edge-sync` passes locally and in CI.
- The generated `zero-cost-reader-edge-sync` artifact contains only redacted
  boundary status, not secrets.
- The keep-alive workflow remains best-effort; monthly release checks should
  still run it manually or keep the repository active with an intentional
  maintenance commit.
