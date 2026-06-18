#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const artifactDir = join(root, 'artifacts/runtime')

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

function readJson(rel) {
  return JSON.parse(read(rel))
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertIncludes(file, terms) {
  const body = read(file)
  for (const term of terms) {
    assert(body.includes(term), `${file} must include ${term}`)
  }
}

const packageJson = readJson('package.json')
const testCommand = String(packageJson.scripts?.test || '')

assert(
  packageJson.scripts?.['check:agent-eval-publish-decision'] === 'node scripts/check-agent-eval-publish-decision.mjs',
  'package.json must expose check:agent-eval-publish-decision',
)
assert(
  testCommand.includes('npm run check:agent-eval-publish-decision'),
  'root npm run test must include check:agent-eval-publish-decision',
)

assertIncludes('backend/src/narrativeos/services/quality_gate.py', [
  'P100_AGENT_EVAL_PUBLISH_DECISION_BOUNDARY',
  'PRODUCTION_AGENT_EVAL_GATES',
  'deterministic_quality_gate',
  'eligible_production_gates',
  'shadow_only_checks',
  'learned_gate_policy',
  'shadow_until_promotion_workflow_green',
  '"learned_evaluator"',
  '"learned_reranker"',
  '"production_gate": False',
])

assertIncludes('backend/tests/test_product_runtime_api.py', [
  'P100_AGENT_EVAL_PUBLISH_DECISION_BOUNDARY',
  'deterministic_quality_gate',
  'eligible_production_gates',
  'shadow_only_checks',
  'production_publish_allowed',
  'shadow_until_promotion_workflow_green',
])

assertIncludes('app/src/api/runtime.ts', [
  'AgentEvalPublishDecision',
  'agent_eval_publish_decision',
  'P100_AGENT_EVAL_PUBLISH_DECISION_BOUNDARY',
  'shadow_until_promotion_workflow_green',
])

assertIncludes('docs/backend/P17_FULL_NARRATIVE_QUALITY_GATE_COMPOSITION_20260613.md', [
  'agent_eval_publish_decision',
  'P100_AGENT_EVAL_PUBLISH_DECISION_BOUNDARY',
  'deterministic_quality_gate',
])

assertIncludes('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'P100 Agent Eval Publish Decision Boundary',
  'agent_eval_publish_decision',
])

assertIncludes('docs/backend/P100_AGENT_EVAL_PUBLISH_DECISION_BOUNDARY.md', [
  'P100 Agent Eval Publish Decision Boundary',
  'deterministic_quality_gate',
  'learned evaluator',
  'learned reranker',
  'shadow_until_promotion_workflow_green',
  'check:agent-eval-publish-decision',
])

const forbiddenPublicUi = [
  'agent_eval_publish_decision',
  'P100_AGENT_EVAL_PUBLISH_DECISION_BOUNDARY',
  'learned_gate_policy',
]
for (const file of [
  'app/src/pages/Home.tsx',
  'app/src/pages/Library.tsx',
  'app/src/pages/Story.tsx',
  'app/src/pages/Create.tsx',
  'app/src/pages/Welcome.tsx',
]) {
  const body = read(file)
  for (const term of forbiddenPublicUi) {
    assert(!body.includes(term), `${file} must not render P100 internal Agent Eval term ${term}`)
  }
}

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  gate: 'P100_AGENT_EVAL_PUBLISH_DECISION_BOUNDARY',
  decisionSource: 'deterministic_quality_gate',
  learnedPolicy: 'shadow_until_promotion_workflow_green',
  publicUiInternalTermLeak: false,
  rootTest: true,
}

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `agent-eval-publish-decision-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  gate: artifact.gate,
  artifactPath,
}, null, 2))
