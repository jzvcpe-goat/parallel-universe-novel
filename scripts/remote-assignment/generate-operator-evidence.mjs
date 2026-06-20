#!/usr/bin/env node
import { defaultPaths, nowIso, readJson, writeJson, writeText } from './lib/io.mjs'
import { assertNoPrivateTerms } from './lib/validators.mjs'

const paths = defaultPaths()
const contract = await readJson(paths.contract)
const isEdgeOnly = contract.runtime_mode === 'edge-only'

const healthRequest = {
  runtime_mode: contract.runtime_mode,
  frontend_health: {
    url: contract.health.frontend_url,
    expected: 'HTTP 200 and reader page loads',
  },
  data_api_health: {
    provider: contract.topology.data_api.provider,
    origin: contract.topology.data_api.origin,
    probe: {
      table: contract.health.data_probe_table,
      id: contract.health.data_probe_id,
    },
    expected: 'status ok',
  },
  remote_agent_health: {
    required: contract.health.remote_agent_health_required,
    reason: isEdgeOnly ? 'edge-only runtime: AI generation occurs on user-owned edge device' : 'remote agent runtime is required',
  },
}

const md = `# Operator Assignment Evidence Intake

## Status

\`\`\`yaml
status: evidence-intake-generated
generated_at: "${nowIso()}"
goal: "${contract.goal}"
environment: "${contract.environment}"
runtime_mode: "${contract.runtime_mode}"
\`\`\`

## Remote Services

\`\`\`yaml
frontend_service:
  provider: "${contract.topology.frontend.provider}"
  role: "${contract.topology.frontend.role}"
  service_id: "${contract.topology.frontend.service_id}"
  origin: "${contract.topology.frontend.origin}"
  secrets_configured: ${contract.topology.frontend.secrets_configured}

data_api_service:
  provider: "${contract.topology.data_api.provider}"
  role: "${contract.topology.data_api.role}"
  service_id: "${contract.topology.data_api.service_id}"
  origin: "${contract.topology.data_api.origin}"
  secrets_configured: ${contract.topology.data_api.secrets_configured}
  public_key_model: "${contract.topology.data_api.public_key_model}"

agent_runtime:
  role: "${contract.topology.agent.role}"
  remote_required: ${contract.topology.agent.remote_required}
  remote_service_id: ${isEdgeOnly ? 'null' : `"${contract.topology.agent.remote_service_id}"`}
  remote_origin: ${isEdgeOnly ? 'null' : `"${contract.topology.agent.remote_origin}"`}
  location: "${contract.topology.agent.location}"
\`\`\`

## Secret Boundary

\`\`\`yaml
frontend_public_config_allowed: ${contract.secret_boundary.frontend_public_config_allowed}
frontend_secret_keys_allowed: ${contract.secret_boundary.frontend_secret_keys_allowed}
service_role_in_frontend_allowed: ${contract.secret_boundary.service_role_in_frontend_allowed}
writer_password_in_frontend_allowed: ${contract.secret_boundary.writer_password_in_frontend_allowed}
cloud_ai_api_keys_allowed: ${contract.secret_boundary.cloud_ai_api_keys_allowed}
data_access_guard: "${contract.secret_boundary.data_access_guard}"
\`\`\`

## Health Evidence Request

\`\`\`yaml
frontend_url: "${contract.health.frontend_url}"
data_probe_table: "${contract.health.data_probe_table}"
data_probe_id: "${contract.health.data_probe_id}"
remote_agent_health_required: ${contract.health.remote_agent_health_required}
\`\`\`

## Decision

\`\`\`yaml
operator_assignment_evidence_intake: ready-for-validation
blocked_reason: "external deployment evidence converted into runtime assignment contract"
next_step: "remote-health-evidence-intake"
\`\`\`
`

assertNoPrivateTerms(md, 'operator evidence markdown')
assertNoPrivateTerms(healthRequest, 'health request')
await writeText(paths.evidence, md)
await writeJson(paths.healthRequest, healthRequest)
console.log(JSON.stringify({
  status: 'generated',
  evidencePath: paths.evidence,
  healthRequestPath: paths.healthRequest,
}, null, 2))
