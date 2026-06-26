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
- `check:edge-only-data-api-local-secret-guard`
- `check:public-projection-privacy`
- `scan:reference-privacy`

## Supabase SQL

Apply `deploy/supabase/zero_cost_pmf_loop.sql` to the beta Supabase project before using the live PMF loop. The SQL explicitly enables RLS and grants Data API access for `anon` and `authenticated`, because new Supabase projects may not expose SQL-created tables automatically.

