# P97 Cost-Aware Provider Routing Contract

Date: 2026-06-18

## Goal

Bring the existing backend provider routing work into the release gate without
rewriting it. P97 proves that model orchestration is not just a vendor-neutral
configuration check: the runtime already has a budget-aware routing surface,
fallback behavior, rollout receipts, and an Ops-only diagnostic boundary.

P97 does not claim that public live mode is enabled. Remote FastAPI and Agent
origins are still owned by the P85 blocker ledger.

## Contract

The product can use any explicit OpenAI-compatible or provider-specific model
only after the runtime owner configures that provider in the server secret store.
The public Creator and Reader surfaces must never expose provider names, model
ids, prompt plumbing, fallback flags, routing receipts, cost estimates, or raw
debug payloads.

The internal runtime may retain:

- selected provider and model metadata,
- budget estimates and budget-block status,
- cache-hit and retry metadata,
- rollout status for candidate and renderer tracks,
- runtime receipts for Ops diagnosis,
- local fallback reason when a provider is unavailable.

The public runtime may return only story-facing output:

- candidate draft,
- up to two questions,
- setting cards,
- public quality guidance,
- user-readable service availability.

## Evidence

- `backend/src/narrativeos/providers.py` owns `LLMBackend`,
  `BudgetedLLMBackend`, `RuntimePromptCache`, retrying providers, and request
  cost estimation.
- `backend/src/narrativeos/services/provider_routing.py` owns
  `ProviderRoutingService`, candidate/renderer rollout decisions, fallback
  chains, and policy summary.
- `backend/tests/test_provider_runtime_routing.py` proves:
  - primary candidate and renderer backends are used when available,
  - budget blocks fall back safely,
  - candidate rollout rollback disables the runtime backend,
  - authoring simulation preserves routing receipts without public writes.
- `check:provider-agnostic-config` keeps defaults protocol-first and requires
  explicit model/base URL for OpenAI-compatible gateways.
- `check:cost-aware-provider-routing` binds these proofs into the root release
  chain and checks the public projection boundary.

## Commands

```bash
npm run check:provider-agnostic-config
npm run check:cost-aware-provider-routing
node scripts/run-backend-python.mjs -m pytest backend/tests/test_provider_runtime_routing.py
```

## Remaining Gap

P97 proves cost-aware provider routing locally and in backend/Ops contracts.
It does not clear public live runtime blockers. Public remote provider smoke can
only be proven after P75/P73/P66/P23 produce healthy remote service evidence.
