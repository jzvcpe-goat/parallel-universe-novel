# P134 Zero-Cost Reader Edge Sync Runbook

Date: 2026-06-20

## Goal

Define the zero-cost Reader Web deployment shape for the next Reader-side
implementation pass. In this shape, cloud services only host the published
reader surface, store published chapters, expose public read APIs and provide
health evidence. AI writing, rewriting, continuation and local manuscript
syncing happen only on the user's edge device.

This is not a replacement for the Creator Studio live runtime path. It is the
Reader Web publication path for already-written and explicitly published
chapters.

## Architecture Boundary

| Surface | Allowed | Forbidden |
| --- | --- | --- |
| User edge device | Local model, local Markdown files, `sync:chapters`, `backup:novels`, `.env.local.sync` | Publishing secrets to Git, Vercel or the browser |
| Supabase | Postgres, Data API, Auth writer user, RLS, `health_probe`, `novels`, `novels_history` | `service_role` or secret keys in public client code |
| Vercel | Static Reader Web, HTTPS deployment URL, public `VITE_SUPABASE_*` variables | Cloud AI runtime, AI API keys, `/api/generate`, `/api/write` |
| Reader browser | Read published chapters and health status | Trigger AI generation, write chapters, see writer credentials |

## Required Tables

The Supabase project must keep these responsibilities separate:

- `public.health_probe`: public read-only health check target. Use this instead
  of inserting fake rows into `novels`.
- `public.novels`: published and draft chapter storage with `author_id`,
  `workspace`, `chapter_order`, `is_published`, `checksum` and RLS.
- `public.novels_history`: old chapter state captured before `UPDATE` or
  `DELETE`.

Reader access must only select `is_published = true`. The writer user may read,
insert, update and delete only rows it owns.

## Operational Details That Must Not Be Missed

### 1. GitHub Actions keep-alive also needs keep-alive

The keep-alive workflow must query Supabase `health_probe` directly. Curling a
Vercel HTML page is not enough because a command-line curl does not execute the
browser JavaScript that reads Supabase.

For public repositories, scheduled workflows may be disabled after roughly 60
days without repository activity. Treat keep-alive as a best-effort guard, not
a strict SLA.

Operational rule:

- Run the keep-alive workflow manually during monthly release checks, or push an
  intentional empty maintenance commit if there has been no repository activity.
- Do not claim Supabase free-tier uptime solely from the scheduled workflow.

### 2. `.env.local.sync` is a single point of failure

The local sync file contains the writer password and Supabase publishable/anon
client configuration. The publishable/anon key is browser-allowed and is not a
private secret; the real security boundary is RLS plus least privilege grants.
It still must stay off GitHub, Vercel and public artifacts to avoid environment
confusion and full-key leakage. The writer password is a true secret and must not
live only inside the project directory.

Operational rule:

- Store `.env.local.sync` in a trusted password manager or encrypted personal
  backup location.
- If it is lost, recover by reading the Supabase publishable/anon key from the
  Supabase Dashboard, resetting the writer password, and recreating the local
  file.
- Never store `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY`, writer
  password or AI API keys in Vercel frontend variables. `service_role` and
  secret keys bypass RLS and are not allowed in browser-facing config.

### 3. `novels_history` supports recovery, not one-click rollback

`novels_history` records old row content before updates or deletes. It does not
automatically roll the production chapter back.

Manual recovery query:

```sql
select *
from public.novels_history
where old_workspace = 'workspace-1'
  and old_chapter_order = 1
order by captured_at desc;
```

After selecting the desired old version, copy `old_content` back into
`public.novels.content` for the matching workspace and chapter. For important
chapters, run a local JSON backup before overwriting published content.

## Acceptance Checklist

- P135 Zero-Cost Reader Edge Sync Gate is present in root `npm run test`.
- Supabase project exists and records `project_ref`, API URL and environment.
- Writer user exists and is used only by the edge sync device.
- `health_probe`, `novels` and `novels_history` exist.
- RLS is enabled for all Reader Web tables.
- Public reader can only read published chapters.
- Writer can update its own unpublished drafts.
- `sync:chapters` loads only `.env.local.sync` once.
- Local `backup:novels` succeeds and writes ignored backup output.
- Vercel environment contains only public reader variables.
- GitHub keep-alive workflow queries Supabase `health_probe` directly and can
  be manually dispatched.
- `.env.local.sync` has an encrypted/password-manager backup outside the repo.
- Manual `novels_history` recovery SQL is documented for operators.
- Reader Web has no cloud AI runtime, AI API key, `/api/generate`, `/api/write`
  or reader-triggered generation path.

## Handoff Note

When this P134 path is implemented, it should produce an operator evidence
document that records Supabase health, Reader URL, RLS checks, local backup
status, keep-alive workflow result, and the explicit AI boundary:

```yaml
ai_boundary:
  cloud_ai_runtime: absent
  cloud_ai_api_keys: absent
  edge_ai_runtime: user_device_only
  reader_can_trigger_ai: false
```
