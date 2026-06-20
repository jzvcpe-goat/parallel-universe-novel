#!/usr/bin/env node
import { execFileSync } from 'node:child_process'

const repo = process.env.GITHUB_REPOSITORY || 'jzvcpe-goat/parallel-universe-novel'
const branch = process.env.GITHUB_REF_NAME || process.env.CHECK_GITHUB_ARTIFACTS_BRANCH || 'main'
const workflowName = process.env.CHECK_GITHUB_ARTIFACTS_WORKFLOW || 'Deploy Creator Studio Preview'
const required = process.env.CHECK_GITHUB_ACTIONS_ARTIFACTS_REQUIRED === 'true'
const checkCurrentRun = process.env.CHECK_CURRENT_GITHUB_RUN_ARTIFACTS === 'true'
const defaultArtifacts = [
  'runtime-readiness-ledger',
  'local-live-runtime-visual-qa',
  'github-pages',
]
if (checkCurrentRun) {
  defaultArtifacts.splice(
    1,
    0,
    'live-cutover-attestation',
    'live-rollback-rehearsal',
    'remote-runtime-activation-control',
    'remote-assignment-handoff',
    'remote-assignment-schema',
    'remote-assignment-execution-pack',
    'remote-assignment-fixture-gate',
    'remote-runtime-blockers',
    'remote-assignment-fill-plan',
    'remote-assignment-strict-run-package',
    'remote-operator-readiness-packet',
    'remote-operator-return-intake',
    'operator-assignment-evidence-intake',
    'operator-assignment-loop-command-consistency',
    'operator-assignment-current-head-coherence',
    'operator-assignment-transition-fixture',
    'runtime-image-local-smoke',
    'reference-privacy',
    'public-projection-privacy',
    'reference-work-encryption-completion',
    'representative-work-custody',
  )
}
const requiredArtifacts = (process.env.CHECK_GITHUB_ARTIFACTS_REQUIRED_NAMES || defaultArtifacts.join(','))
  .split(',')
  .map(item => item.trim())
  .filter(Boolean)

function ghApi(path) {
  const output = execFileSync('gh', ['api', path], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 20000,
  })
  return JSON.parse(output)
}

function skip(reason) {
  if (required) throw new Error(reason)
  console.log(JSON.stringify({
    status: 'skipped',
    reason,
    required,
  }, null, 2))
  process.exit(0)
}

function latestSuccessfulRun() {
  const response = ghApi(`repos/${repo}/actions/runs?branch=${encodeURIComponent(branch)}&status=success&per_page=20`)
  const runs = Array.isArray(response.workflow_runs) ? response.workflow_runs : []
  return runs.find(run => (
    run.name === workflowName
    && run.conclusion === 'success'
    && run.status === 'completed'
  ))
}

let run
try {
  if (checkCurrentRun) {
    const runId = String(process.env.GITHUB_RUN_ID || process.env.CHECK_GITHUB_ARTIFACTS_RUN_ID || '').trim()
    if (!runId) skip('CHECK_CURRENT_GITHUB_RUN_ARTIFACTS requires GITHUB_RUN_ID or CHECK_GITHUB_ARTIFACTS_RUN_ID')
    run = ghApi(`repos/${repo}/actions/runs/${runId}`)
  } else {
    run = latestSuccessfulRun()
    if (!run) skip(`No successful ${workflowName} run found on ${repo}@${branch}`)
  }
} catch (error) {
  skip(`Unable to inspect GitHub Actions runs: ${error instanceof Error ? error.message : String(error)}`)
}

let artifacts
try {
  const response = ghApi(`repos/${repo}/actions/runs/${run.id}/artifacts`)
  artifacts = Array.isArray(response.artifacts) ? response.artifacts : []
} catch (error) {
  skip(`Unable to inspect GitHub Actions artifacts for run ${run.id}: ${error instanceof Error ? error.message : String(error)}`)
}

const byName = new Map(artifacts.map(artifact => [artifact.name, artifact]))
const missing = requiredArtifacts.filter(name => !byName.has(name))
const expired = requiredArtifacts.filter(name => byName.get(name)?.expired)
const empty = requiredArtifacts.filter(name => Number(byName.get(name)?.size_in_bytes || 0) <= 0)

if (missing.length || expired.length || empty.length) {
  throw new Error(JSON.stringify({
    code: 'github_actions_artifact_gate_failed',
    runId: run.id,
    missing,
    expired,
    empty,
  }, null, 2))
}

console.log(JSON.stringify({
  status: 'passed',
  mode: checkCurrentRun ? 'current_run' : 'latest_successful_run',
  repo,
  branch,
  workflowName,
  runId: run.id,
  headSha: run.head_sha,
  artifacts: requiredArtifacts.map(name => ({
    name,
    size: byName.get(name).size_in_bytes,
    expired: Boolean(byName.get(name).expired),
  })),
}, null, 2))
