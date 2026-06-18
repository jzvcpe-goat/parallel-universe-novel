#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const outputDir = join(root, 'artifacts/runtime')

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function includesAll(text, values, label) {
  for (const value of values) {
    assert(text.includes(value), `${label} must include ${value}`)
  }
}

const packageJson = readJson('package.json')
const providers = read('backend/src/narrativeos/providers.py')
const routingService = read('backend/src/narrativeos/services/provider_routing.py')
const routingTests = read('backend/tests/test_provider_runtime_routing.py')
const creatorDialogue = read('backend/src/narrativeos/services/creator_dialogue.py')
const creatorApiTests = read('backend/tests/test_creator_dialogue_api.py')
const registry = read('app/src/design-system/registry.ts')
const opsRenderer = read('backend/src/narrativeos/web/ops_render_sections.js')
const p34 = read('docs/backend/P34_MODEL_AGNOSTIC_CREATOR_RUNTIME.md')
const p45 = read('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md')
const p52 = read('docs/backend/P52_RUNTIME_COMPLETION_MATRIX_REFRESH.md')
const p97 = read('docs/backend/P97_COST_AWARE_PROVIDER_ROUTING_CONTRACT.md')

assert(
  packageJson.scripts['check:cost-aware-provider-routing'] === 'node scripts/check-cost-aware-provider-routing.mjs',
  'package.json must expose check:cost-aware-provider-routing',
)
assert(
  String(packageJson.scripts.test).includes('backend/tests/test_provider_runtime_routing.py'),
  'root npm run test must include backend provider runtime routing tests',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:cost-aware-provider-routing'),
  'root npm run test must include check:cost-aware-provider-routing',
)

includesAll(providers, [
  'class LLMBackend',
  'class BudgetedLLMBackend',
  'class RuntimePromptCache',
  'def estimate_request_budget',
  'build_llm_policy_from_env',
  'max_estimated_cost_usd',
  'estimated_cost_per_1k_chars',
  'cache_policy',
  'RetryingLLMBackend',
  'RoutingLLMBackend',
  'fallback_used',
], 'providers.py')

includesAll(routingService, [
  'class ProviderRoutingService',
  'build_candidate_provider',
  'build_renderer',
  'policy_summary',
  'fallback_chain',
  'rollout_service',
  'candidate_backend',
  'renderer_backend',
], 'ProviderRoutingService')

includesAll(routingTests, [
  'test_reader_runtime_uses_primary_candidate_and_renderer_backends',
  'test_reader_runtime_falls_back_when_budget_blocks_primary',
  'test_reader_runtime_respects_candidate_rollout_rollback',
  'test_authoring_simulation_preserves_routing_trace_and_fallback',
  'budget_blocked',
  'fallback_used',
  'selected_provider',
  'authoring_simulation',
], 'backend provider routing tests')

includesAll(creatorDialogue, [
  'projected.pop("model_status", None)',
  'projected.pop("harness_trace", None)',
  '"secret_exposure": "server_env_only"',
], 'Creator public projection')

includesAll(creatorApiTests, [
  'assert "model_status" not in assistant',
  'assert "harness_trace" not in assistant',
  'assert "provider" not in public_text',
], 'Creator public API tests')

assert(
  registry.includes("readerForbidden: ['API', 'OpenAPI', 'PRD', 'fallback', 'demo', 'provider', 'database', 'endpoint'"),
  'design-system registry must keep provider/fallback out of reader public copy',
)
assert(
  opsRenderer.includes('opsProviderRouting') && opsRenderer.includes('opsProviderRuntimeMetrics'),
  'Ops renderer must remain the place where provider routing and runtime metrics are visible',
)

includesAll(p34, [
  'NARRATIVEOS_CREATOR_BASE_URL=https://<openai-compatible-host>/v1',
  'NARRATIVEOS_CREATOR_MODEL=<model-name>',
  'server-side only',
], 'P34 model-agnostic contract')

includesAll(p97, [
  'BudgetedLLMBackend',
  'ProviderRoutingService',
  'runtime receipts',
  'public Creator and Reader surfaces must never expose',
  'check:cost-aware-provider-routing',
], 'P97 document')

includesAll(p45, [
  'P97 cost-aware provider routing',
  'backend/tests/test_provider_runtime_routing.py',
  'check:cost-aware-provider-routing',
], 'P45 completion matrix')

includesAll(p52, [
  'P97 Cost-Aware Provider Routing Contract',
  'budget-aware provider routing',
  'check:cost-aware-provider-routing',
], 'P52 refresh doc')

const artifact = {
  status: 'passed',
  gate: 'P97_COST_AWARE_PROVIDER_ROUTING_CONTRACT',
  scope: 'backend provider routing plus public projection boundary',
  evidence: {
    providerPolicy: 'protocol_first_explicit_provider_config',
    runtimeRouting: 'budget_cache_retry_rollout_receipts',
    publicProjection: 'no_provider_cost_or_debug_fields',
    opsBoundary: 'provider_metrics_visible_only_in_ops',
    rootTest: 'backend/tests/test_provider_runtime_routing.py',
  },
  checked: [
    'backend/src/narrativeos/providers.py',
    'backend/src/narrativeos/services/provider_routing.py',
    'backend/tests/test_provider_runtime_routing.py',
    'backend/src/narrativeos/services/creator_dialogue.py',
    'backend/tests/test_creator_dialogue_api.py',
    'app/src/design-system/registry.ts',
    'backend/src/narrativeos/web/ops_render_sections.js',
    'docs/backend/P34_MODEL_AGNOSTIC_CREATOR_RUNTIME.md',
    'docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md',
    'docs/backend/P52_RUNTIME_COMPLETION_MATRIX_REFRESH.md',
    'docs/backend/P97_COST_AWARE_PROVIDER_ROUTING_CONTRACT.md',
  ],
}

const serialized = JSON.stringify(artifact)
for (const forbidden of [
  /api[_-]?key/i,
  /sk-[A-Za-z0-9_-]{12,}/,
  /system prompt/i,
  /raw state/i,
  /representative work/i,
  /sourceRefs/,
]) {
  assert(!forbidden.test(serialized), `P97 artifact must not contain forbidden token ${forbidden}`)
}

mkdirSync(outputDir, { recursive: true })
const artifactPath = join(outputDir, `cost-aware-provider-routing-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  artifactPath: relative(root, artifactPath),
  gate: artifact.gate,
  rootTest: artifact.evidence.rootTest,
}, null, 2))
