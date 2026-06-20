#!/usr/bin/env node
import { defaultPaths, nowIso, readJson, writeJson } from './lib/io.mjs'
import { assertNoPrivateTerms } from './lib/validators.mjs'

const paths = defaultPaths()
const contract = await readJson(paths.contract)
const patch = {
  status: 'unblocked-pending-health-evidence',
  previous_status: 'blocked',
  previous_blocked_reason: 'missing_operator_assignment_evidence',
  generated_at: nowIso(),
  current_head: process.env.GIT_HEAD || null,
  operator_assignment_evidence_intake: {
    status: 'compiled',
    contract_id: contract.contract_id,
    runtime_mode: contract.runtime_mode,
    remote_services: {
      frontend: {
        provider: contract.topology.frontend.provider,
        service_id: contract.topology.frontend.service_id,
        origin: contract.topology.frontend.origin,
      },
      data_api: {
        provider: contract.topology.data_api.provider,
        service_id: contract.topology.data_api.service_id,
        origin: contract.topology.data_api.origin,
      },
      agent: {
        remote_required: contract.topology.agent.remote_required,
        location: contract.topology.agent.location,
        remote_service_id: contract.topology.agent.remote_service_id,
        remote_origin: contract.topology.agent.remote_origin,
      },
    },
    security_boundary: {
      frontend_secret_keys_allowed: false,
      service_role_in_frontend_allowed: false,
      writer_password_in_frontend_allowed: false,
      cloud_ai_api_keys_allowed: false,
      data_access_guard: contract.secret_boundary.data_access_guard,
    },
  },
  next_step: 'remote-health-evidence-intake',
}

assertNoPrivateTerms(patch, 'ledger patch')
await writeJson(paths.ledgerPatch, patch)
console.log(JSON.stringify({
  status: 'generated',
  ledgerPatchPath: paths.ledgerPatch,
  nextStep: patch.next_step,
}, null, 2))
