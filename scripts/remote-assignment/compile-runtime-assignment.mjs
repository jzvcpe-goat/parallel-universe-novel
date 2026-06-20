#!/usr/bin/env node
import { defaultPaths, nowIso, readJson, writeJson } from './lib/io.mjs'
import {
  assertBoolean,
  assertHttpsUrl,
  assertNoPlaceholder,
  assertNoPrivateTerms,
  assertRuntimeMode,
  assertString,
} from './lib/validators.mjs'

const paths = defaultPaths()
const intent = await readJson(paths.intent)
validateIntent(intent)
const contract = compileContract(intent)
assertNoPrivateTerms(contract, 'remote assignment contract')
await writeJson(paths.contract, contract)
console.log(JSON.stringify({
  status: 'compiled',
  runtimeMode: contract.runtime_mode,
  contractPath: paths.contract,
}, null, 2))

function validateIntent(input) {
  if (input.schema_version !== 1) throw new Error('schema_version must be 1')
  assertString(input.goal, 'goal')
  assertString(input.environment, 'environment')
  assertRuntimeMode(input.runtime_mode)

  assertString(input.operator?.owner, 'operator.owner')
  assertString(input.operator?.provider, 'operator.provider')
  assertNoPlaceholder(input.operator.owner, 'operator.owner')
  assertNoPlaceholder(input.operator.provider, 'operator.provider')

  assertString(input.frontend?.provider, 'frontend.provider')
  assertString(input.frontend?.service_id, 'frontend.service_id')
  assertHttpsUrl(input.frontend?.origin, 'frontend.origin')
  assertBoolean(input.frontend?.secrets_configured, 'frontend.secrets_configured')
  assertNoPlaceholder(input.frontend.service_id, 'frontend.service_id')
  assertNoPlaceholder(input.frontend.origin, 'frontend.origin')

  assertString(input.data_api?.provider, 'data_api.provider')
  assertString(input.data_api?.service_id, 'data_api.service_id')
  assertHttpsUrl(input.data_api?.origin, 'data_api.origin')
  assertBoolean(input.data_api?.secrets_configured, 'data_api.secrets_configured')
  assertString(input.data_api?.public_key_model, 'data_api.public_key_model')
  assertNoPlaceholder(input.data_api.service_id, 'data_api.service_id')
  assertNoPlaceholder(input.data_api.origin, 'data_api.origin')

  assertBoolean(input.agent?.remote_required, 'agent.remote_required')
  assertString(input.agent?.location, 'agent.location')
  assertBoolean(input.agent?.ai_generation_cloud_runtime, 'agent.ai_generation_cloud_runtime')
  assertBoolean(input.agent?.reader_can_trigger_ai, 'agent.reader_can_trigger_ai')

  if (input.runtime_mode === 'edge-only') {
    if (input.agent.remote_required !== false) throw new Error('edge-only mode requires agent.remote_required=false')
    if (input.agent.ai_generation_cloud_runtime !== false) throw new Error('edge-only mode requires cloud AI runtime to be false')
    if (input.agent.reader_can_trigger_ai !== false) throw new Error('edge-only mode requires reader_can_trigger_ai=false')
  } else {
    assertString(input.agent?.service_id, 'agent.service_id')
    assertHttpsUrl(input.agent?.origin, 'agent.origin')
    assertBoolean(input.agent?.secrets_configured, 'agent.secrets_configured')
    assertNoPlaceholder(input.agent.service_id, 'agent.service_id')
    assertNoPlaceholder(input.agent.origin, 'agent.origin')
  }

  assertHttpsUrl(input.health?.frontend_url, 'health.frontend_url')
  assertString(input.health?.data_probe_table, 'health.data_probe_table')
  assertString(input.health?.data_probe_id, 'health.data_probe_id')
  assertNoPrivateTerms(input, 'runtime assignment intent')
}

function compileContract(input) {
  const isEdgeOnly = input.runtime_mode === 'edge-only'
  return {
    schema_version: 1,
    contract_id: `remote-assignment-${Date.now()}`,
    generated_at: nowIso(),
    goal: input.goal,
    environment: input.environment,
    runtime_mode: input.runtime_mode,
    operator: {
      owner: input.operator.owner,
      provider: input.operator.provider,
    },
    topology: {
      frontend: {
        role: 'reader-frontend',
        provider: input.frontend.provider,
        service_id: input.frontend.service_id,
        origin: input.frontend.origin.replace(/\/+$/, ''),
        secrets_configured: input.frontend.secrets_configured,
      },
      data_api: {
        role: 'managed-data-api',
        provider: input.data_api.provider,
        service_id: input.data_api.service_id,
        origin: input.data_api.origin.replace(/\/+$/, ''),
        secrets_configured: input.data_api.secrets_configured,
        public_key_model: input.data_api.public_key_model,
      },
      agent: isEdgeOnly
        ? {
            role: 'edge-local-ai-runtime',
            remote_required: false,
            remote_service_id: null,
            remote_origin: null,
            remote_secrets_configured: false,
            location: input.agent.location,
            ai_generation_cloud_runtime: false,
            reader_can_trigger_ai: false,
          }
        : {
            role: 'remote-agent-runtime',
            remote_required: true,
            remote_service_id: input.agent.service_id,
            remote_origin: input.agent.origin.replace(/\/+$/, ''),
            remote_secrets_configured: input.agent.secrets_configured,
            location: input.agent.location,
            ai_generation_cloud_runtime: input.agent.ai_generation_cloud_runtime,
            reader_can_trigger_ai: input.agent.reader_can_trigger_ai,
          },
    },
    secret_boundary: {
      frontend_public_config_allowed: true,
      frontend_secret_keys_allowed: false,
      service_role_in_frontend_allowed: false,
      writer_password_in_frontend_allowed: false,
      cloud_ai_api_keys_allowed: false,
      data_access_guard: 'supabase-rls-policies',
    },
    health: {
      frontend_url: input.health.frontend_url.replace(/\/+$/, ''),
      data_probe_table: input.health.data_probe_table,
      data_probe_id: input.health.data_probe_id,
      remote_agent_health_required: !isEdgeOnly,
    },
  }
}
