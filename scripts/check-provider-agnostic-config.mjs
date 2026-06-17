#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const providers = read('backend/src/narrativeos/providers.py')
const appFactory = read('backend/src/narrativeos/api/app_factory.py')
const providerTests = read('backend/tests/test_provider_routing.py')
const contract = read('docs/backend/P34_MODEL_AGNOSTIC_CREATOR_RUNTIME.md')
const packageJson = JSON.parse(read('package.json'))

assert(
  providers.includes('["openai_compatible", "local"]'),
  'default provider_order must be protocol-first plus local, not a vendor list',
)
assert(
  !providers.includes('else ([provider_raw] if provider_raw else ["openai_compatible", "openai", "anthropic", "gemini", "deepseek", "kimi", "local"])'),
  'provider policy must not default to concrete vendor fan-out',
)
assert(
  providers.includes('raise ValueError("openai_compatible_model_required")')
    && providers.includes('openai_compatible_base_url_required'),
  'OpenAI-compatible adapter must require explicit model and base URL',
)
assert(
  !providers.includes('or "deepseek-chat"')
    && !providers.includes('or "https://api.deepseek.com/v1"'),
  'OpenAI-compatible adapter must not hardcode DeepSeek as the default model or base URL',
)
assert(
  !appFactory.includes('ok.kimi.link'),
  'FastAPI default CORS origins must not include old Kimi preview domains',
)
assert(
  providerTests.includes('test_default_llm_policy_is_protocol_first_without_vendor_defaults')
    && providerTests.includes('test_openai_compatible_provider_requires_explicit_model_and_base_url'),
  'provider routing tests must cover vendor-neutral defaults and explicit OpenAI-compatible config',
)
assert(
  contract.includes('NARRATIVEOS_CREATOR_BASE_URL=https://<openai-compatible-host>/v1')
    && contract.includes('NARRATIVEOS_CREATOR_MODEL=<model-name>')
    && contract.includes('DeepSeek, Qwen, OpenRouter, Kimi/Moonshot and other gateways are examples'),
  'model-agnostic runtime doc must use neutral defaults and keep concrete providers as explicit examples',
)
assert(
  packageJson.scripts['check:provider-agnostic-config'] === 'node scripts/check-provider-agnostic-config.mjs',
  'package.json must expose check:provider-agnostic-config',
)
assert(
  String(packageJson.scripts.test).includes('npm run check:provider-agnostic-config'),
  'root npm run test must include check:provider-agnostic-config',
)

console.log(JSON.stringify({
  status: 'passed',
  defaultProviderOrder: ['openai_compatible', 'local'],
  concreteProviders: 'explicit_env_only',
  publicCors: 'no_kimi_preview_domain',
}, null, 2))
