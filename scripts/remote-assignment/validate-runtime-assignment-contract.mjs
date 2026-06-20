#!/usr/bin/env node
import { defaultPaths, readJson } from './lib/io.mjs'
import {
  assertBoolean,
  assertHttpsUrl,
  assertNoPlaceholder,
  assertNoPrivateTerms,
  assertRuntimeMode,
  assertString,
} from './lib/validators.mjs'

const paths = defaultPaths()
const contract = await readJson(paths.contract)
validateContract(contract)
assertNoPrivateTerms(contract, 'remote assignment contract')
console.log(JSON.stringify({
  status: 'passed',
  runtimeMode: contract.runtime_mode,
  remoteAgentRequired: contract.topology.agent.remote_required,
}, null, 2))

function validateContract(c) {
  if (c.schema_version !== 1) throw new Error('contract.schema_version must be 1')
  assertString(c.contract_id, 'contract_id')
  assertString(c.generated_at, 'generated_at')
  assertString(c.goal, 'goal')
  assertString(c.environment, 'environment')
  assertRuntimeMode(c.runtime_mode)
  assertString(c.operator?.owner, 'operator.owner')
  assertString(c.operator?.provider, 'operator.provider')
  assertNoPlaceholder(c.operator.owner, 'operator.owner')
  assertNoPlaceholder(c.operator.provider, 'operator.provider')

  const frontend = c.topology?.frontend
  assertString(frontend?.service_id, 'topology.frontend.service_id')
  assertHttpsUrl(frontend?.origin, 'topology.frontend.origin')
  assertBoolean(frontend?.secrets_configured, 'topology.frontend.secrets_configured')

  const dataApi = c.topology?.data_api
  assertString(dataApi?.service_id, 'topology.data_api.service_id')
  assertHttpsUrl(dataApi?.origin, 'topology.data_api.origin')
  assertBoolean(dataApi?.secrets_configured, 'topology.data_api.secrets_configured')

  const agent = c.topology?.agent
  assertString(agent?.role, 'topology.agent.role')
  assertBoolean(agent?.remote_required, 'topology.agent.remote_required')
  assertString(agent?.location, 'topology.agent.location')
  assertBoolean(agent?.ai_generation_cloud_runtime, 'topology.agent.ai_generation_cloud_runtime')
  assertBoolean(agent?.reader_can_trigger_ai, 'topology.agent.reader_can_trigger_ai')

  if (c.runtime_mode === 'edge-only') {
    if (agent.remote_required !== false) throw new Error('edge-only contract must not require remote agent')
    if (agent.remote_service_id !== null) throw new Error('edge-only contract must not define remote agent service id')
    if (agent.remote_origin !== null) throw new Error('edge-only contract must not define remote agent origin')
    if (agent.remote_secrets_configured !== false) throw new Error('edge-only contract must not claim remote agent secrets configured')
    if (agent.ai_generation_cloud_runtime !== false) throw new Error('edge-only contract must not have cloud AI runtime')
    if (agent.reader_can_trigger_ai !== false) throw new Error('edge-only reader must not trigger AI generation')
  } else {
    if (agent.remote_required !== true) throw new Error('non edge-only contract requires remote agent')
    assertString(agent.remote_service_id, 'topology.agent.remote_service_id')
    assertHttpsUrl(agent.remote_origin, 'topology.agent.remote_origin')
    assertBoolean(agent.remote_secrets_configured, 'topology.agent.remote_secrets_configured')
  }

  if (c.secret_boundary?.frontend_secret_keys_allowed !== false) throw new Error('frontend secret keys must be disallowed')
  if (c.secret_boundary?.service_role_in_frontend_allowed !== false) throw new Error('service role key in frontend must be disallowed')
  if (c.secret_boundary?.writer_password_in_frontend_allowed !== false) throw new Error('writer password in frontend must be disallowed')
  if (c.secret_boundary?.cloud_ai_api_keys_allowed !== false) throw new Error('cloud AI API keys must be disallowed')
  assertHttpsUrl(c.health?.frontend_url, 'health.frontend_url')
  assertString(c.health?.data_probe_table, 'health.data_probe_table')
  assertString(c.health?.data_probe_id, 'health.data_probe_id')
}
