# P170 Zero-cost PMF Loop

This is the current P0 product goal for the beta release.

## Boundary

- Public Reader Web is hosted on GitHub Pages.
- Local Creator App runs on the author's computer in localhost mode.
- Supabase stores public content, request state, sync state, permissions, and publish trace.
- Cloud AI Runtime is disabled.
- Author model keys, prompts, provider responses, and unpublished draft bodies stay local.

## Product Loop

1. Reader opens a published work and chapter.
2. Reader requests the next chapter, an IF branch, or continuation of a branch.
3. Supabase records `reader_requests` with only reader-writable fields.
4. Local Creator App syncs the request queue from localhost.
5. Author writes or locally generates a draft.
6. Author manually confirms publication.
7. Supabase writes `chapters`, `publish_events`, and request status.
8. Reader refreshes and sees the updated chapter/branch and request status.

## Required Gates

- `check:zero-cost-pmf-loop`
- `check:zero-cost-reader-edge-sync`
- `check:zero-cost-pmf-supabase-sql`
- `check:zero-cost-pmf-live-schema`
- `check:zero-cost-pmf-live-e2e`
- `check:edge-only-data-api-local-secret-guard`
- `check:public-projection-privacy`
- `scan:reference-privacy`

## Supabase SQL

Apply `deploy/supabase/zero_cost_pmf_loop.sql` to the beta Supabase project before using the live PMF loop. The SQL explicitly enables RLS and grants Data API access for `anon` and `authenticated`, because new Supabase projects may not expose SQL-created tables automatically.

## Supabase Auth

Reader requests use Supabase Anonymous Sign-Ins as the P0 lightweight identity
layer. This is an explicit product choice: reading remains public, but request
creation and voting need a stable `auth.uid()` for rate limiting, aggregation,
deduplication, return visits, and future conversion.

Operator setup:

1. Open `Authentication -> Sign In / Providers` in the Supabase Dashboard.
2. Enable `Allow anonymous sign-ins`.
3. Save changes.
4. Run the live schema gate and live E2E gate:

```bash
REQUIRE_ZERO_COST_PMF_LIVE_SCHEMA=true npm run check:zero-cost-pmf-live-schema
RUN_ZERO_COST_PMF_LIVE_E2E=true REQUIRE_ZERO_COST_PMF_LIVE_E2E=true npm run check:zero-cost-pmf-live-e2e
```

RLS must still treat anonymous users as reader-only. Supabase anonymous users
also use the `authenticated` Postgres role, so creator policies must check
`auth.jwt()->>'is_anonymous'` before allowing profile role `creator`, starter
work claiming, branch/chapter writes, request status mutation,
`publish_events`, or `creator_clients`.
