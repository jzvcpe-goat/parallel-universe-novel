# P16 Market Trend Scanner Backend Integration - 2026-06-12

## Decision

`scan_market_trends` is now a backend adapter boundary, not just a hardcoded product snapshot.

The product still keeps public pages source-neutral:

- `/` shows topic labels, heat, ranked works and reading entry.
- `/library` shows filters, ranked lists and read/create split.
- `/create` shows story directions and writing tone.

Public pages must not show source names, scheduler names, function-call details, backend route names, ranking platform names or implementation wording. Studio/Ops and backend docs may show internal scan details.

## Current Implementation

Backend files:

- `backend/src/narrativeos/services/market_trends.py`
- `backend/src/narrativeos/api/market.py`
- `backend/tests/test_market_trends_api.py`

Frontend files:

- `app/src/api/market.ts`
- `app/src/features/market/trends.ts`
- `app/src/pages/Home.tsx`
- `app/src/pages/Library.tsx`
- `app/src/pages/Create.tsx`
- `app/src/pages/Studio.tsx`
- `app/src/components/design-system/StudioTrendOpsPanel.tsx`

Routes:

- `GET /v1/market/trends`
- `POST /v1/market/trends/scan`
- `GET /v1/market/trends/cron/weekly`
- `GET /v1/market/trends/cron/monthly`

Current P16 code adds:

- `MarketTrendSourceAdapter`
- `MarketTrendScanContext`
- `MarketTrendSourceResult`
- `CuratedSeedTrendAdapter`
- Adapter error capture
- Deduplication by `template_id` or trend id
- Heat normalization to `0-100`
- Recommendation weight recomputation
- `ops.source_health`
- `ops.audit`
- `ops.weight_changes`
- `ops.manual_locks`

The default adapter remains deterministic and curated until licensed, editorial or first-party sources are configured.

## Source Adapter Contract

Every real source adapter must implement this shape:

```py
class MarketTrendSourceAdapter(Protocol):
    source_id: str

    def scan(self, context: MarketTrendScanContext) -> MarketTrendSourceResult:
        ...
```

Input:

```py
@dataclass(frozen=True)
class MarketTrendScanContext:
    cadence: Literal["weekly", "monthly"]
    force: bool
    window_days: int
    generated_at: str
```

Output:

```py
@dataclass(frozen=True)
class MarketTrendSourceResult:
    source_id: str
    status: Literal["active", "fallback", "error", "locked"]
    trends: list[dict]
    message: str
    scanned_at: str
    weight: float = 1.0
```

Each source trend item must normalize to the current public trend fields:

```json
{
  "id": "stable-topic-id",
  "rank": 1,
  "label": "脑洞都市",
  "category": "都市脑洞",
  "sample": "反内卷、摸鱼变强、异能反转",
  "signals": ["系统流", "都市异能", "快节奏"],
  "tone": "高热",
  "heat": 98,
  "template_id": "algorithm-city",
  "template_title": "算法城市",
  "hooks": "身份错位、记忆备份、自我定义",
  "keywords": "算法城市、备份人格、都市高压、异常规则"
}
```

Adapter implementation rule:

- Source-specific raw fields stay inside the adapter.
- Public trend payloads must be normalized before leaving the adapter.
- Raw source names and URLs must not be rendered on public pages.
- Failed sources return `status: "error"` through service wrapping; they do not fail the whole scan.

## Scan Cadence

Weekly scan:

- Route: `GET /v1/market/trends/cron/weekly`
- Function call: `scan_market_trends({ cadence: "weekly", force: true })`
- Window: 7 days
- Product effect: homepage and creator ordering.

Monthly scan:

- Route: `GET /v1/market/trends/cron/monthly`
- Function call: `scan_market_trends({ cadence: "monthly", force: true })`
- Window: 30 days
- Product effect: template weight recalibration and new template candidate review.

Scheduler rule:

Hosted schedulers may call the GET cron routes. Agents or ops tools may call `POST /v1/market/trends/scan`.

## Aggregation Rules

The service aggregates adapter outputs with these rules:

1. Drop failed adapter results from public ranking.
2. Deduplicate by `template_id`; if absent, deduplicate by trend `id`.
3. Apply source weight between `0.1` and `2.0`.
4. Sort by weighted heat desc, then source rank asc.
5. Re-rank from 1.
6. Clamp heat into `0-100`.
7. Recompute recommendation weight as `101 - rank`, lower bounded at 1.
8. Strip internal aggregation fields before returning public `trends`.

Fallback rule:

If all configured sources fail or return no usable trends, the curated adapter is used so public pages continue to work.

## Product Payload Boundary

Public pages may consume only:

- `top_categories`
- `trends[].label`
- `trends[].category`
- `trends[].sample`
- `trends[].tone`
- `trends[].heat`
- `trends[].template_id`
- `trends[].template_title`
- `trends[].hooks`
- `trends[].keywords`
- `template_recommendations`

Studio/Ops may consume:

- `source_status`
- `source_adapters`
- `scan_schedule`
- `function_call`
- `ops.source_health`
- `ops.audit`
- `ops.weight_changes`
- `ops.manual_locks`

Implementation docs may discuss sources, schedulers, adapters, function calls and backend routes. Public pages must not.

## Studio/Ops State

`StudioTrendOpsPanel` should show:

- Source health: source id, status, scanned item count, scanned time.
- Scan audit: attempted/succeeded/failed source counts, dedupe key, normalization strategy.
- Template impact: template id, rank and recommendation weight.
- Manual locks: reserved for future editorial lock rules.
- Refresh controls: weekly and monthly scan buttons.

The Studio panel can show the scan contract and cron values because Studio is internal and not in the public navigation.

## Backend Data Persistence Plan

Current P16 keeps results in memory. The next backend step should persist:

```sql
market_trend_scan_runs
- id
- cadence
- requested_by
- source_status
- sources_attempted
- sources_succeeded
- sources_failed
- fallback_used
- generated_at
- completed_at
- audit_json

market_trend_items
- scan_run_id
- trend_id
- rank
- label
- category
- heat
- template_id
- recommendation_weight
- payload_json

market_trend_source_health
- scan_run_id
- source_id
- status
- items
- message
- scanned_at
```

Use the most recent successful weekly scan for public pages. Use the most recent successful monthly scan for template weight recalibration. If there is no successful scan, use the curated fallback.

## Adapter Sources

P16 intentionally does not hardcode public source names into product UI.

Possible backend adapter classes:

- `LicensedRankingFeedAdapter`
- `EditorialTrendInputAdapter`
- `FirstPartyReaderBehaviorAdapter`
- `CreatorSeedAggregateAdapter`
- `ManualLockedTrendAdapter`

Source policy:

- External source adapters require licensing or permission review before production use.
- Scraping adapters must be disabled until legal and operational rules are approved.
- First-party behavior adapters must aggregate data and avoid exposing individual user behavior.
- Manual locks must override ranking only inside Studio/Ops and be recorded in audit.

## Tests

Current tests:

- `test_market_trends_expose_weekly_function_call_contract`
- `test_market_trends_scan_supports_monthly_refresh_contract`
- `test_market_trends_cron_get_routes_are_scheduler_safe`
- `test_market_trend_service_aggregates_source_adapters_and_audit`

Required future tests:

1. External adapter normalizes raw records into public trend items.
2. Multiple sources with duplicate `template_id` keep one public item.
3. Failed source does not fail scan.
4. All-source failure falls back to curated snapshot.
5. Weekly scan changes homepage order but not public copy boundary.
6. Monthly scan writes template weight candidates, not direct public template mutation.
7. Public `/`, `/library`, `/create` snapshots do not render source IDs, function-call names or cron values.
8. Studio renders source health, audit and template impact.

## Deployment Acceptance

Before claiming P16 deployed:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/app
npm run check:alignment
npm run check:backend-bridge
npm run check:copy-boundary
npm run check:design-system
```

Backend targeted tests:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness/backend
python -m pytest tests/test_market_trends_api.py
```

API smoke:

```bash
cd /Users/james/Documents/PUF/workspaces/integration-harness
./scripts/smoke-deployed-api.sh https://pun-api-p0.vercel.app
```

Browser QA:

- `/` shows product topic labels only.
- `/library` filter works with topic query.
- `/create` uses story direction and writing tone.
- `/studio` shows source health and scan audit.

## Non-Goals

P16 does not:

- Add source names to public pages.
- Replace current Vite/React frontend.
- Merge backend-team `apps/web`.
- Claim live external ranking feeds are already licensed and connected.
- Let a failed source break homepage, library or creation.
- Convert Studio operational copy into public product copy.

## Completion Verdict

P16 is complete when:

- Adapter boundary exists in backend service.
- Ops audit is available in payload and Studio.
- Tests cover adapter aggregation and failure degradation.
- Handoff and development notes describe the public/internal boundary.
- Alignment, backend bridge, copy-boundary and design-system checks pass.

P17 can start after P16: compose full narrative quality gates across safety, editorial style, continuity, character consistency and release readiness.
