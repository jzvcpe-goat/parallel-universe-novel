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
  packageJson.scripts?.['check:learned-eval-promotion-workflow'] === 'node scripts/check-learned-eval-promotion-workflow.mjs',
  'package.json must expose check:learned-eval-promotion-workflow',
)
assert(
  testCommand.includes('npm run check:learned-eval-promotion-workflow'),
  'root npm run test must include check:learned-eval-promotion-workflow',
)
assert(
  !testCommand.includes('backend/tests/test_learned_assisted_gate.py'),
  'root npm run test must not directly require optional learned assisted gate promotion tests',
)
assert(
  !testCommand.includes('backend/tests/test_learned_assisted_rerank.py'),
  'root npm run test must not directly require optional learned assisted rerank promotion tests',
)

assertIncludes('backend/src/narrativeos/eval/learned_promotion_workflow.py', [
  'PROMOTION_ASSET_TYPE = "learned_promotion"',
  'PROMOTION_ASSET_ID = "evaluator"',
  'mode": "manual_approval"',
  'approval_status',
  'reconfirm_required',
  'save_evaluator_promotion_decision',
])
assertIncludes('backend/src/narrativeos/eval/learned_reranker_promotion_workflow.py', [
  'PROMOTION_ASSET_TYPE = "learned_promotion"',
  'PROMOTION_ASSET_ID = "reranker"',
  'mode": "manual_approval"',
  'approval_status',
  'reconfirm_required',
  'save_reranker_promotion_decision',
])
assertIncludes('backend/src/narrativeos/eval/learned_rollout.py', [
  'activate_learned_rollout',
  'rollback_learned_rollout',
  'rollout_status',
])
assertIncludes('backend/src/narrativeos/api/ops.py', [
  '@router.get("/learned-promotion")',
  '@router.get("/learned-reranker-promotion")',
  '@router.post("/learned-promotion/approve")',
  '@router.post("/learned-promotion/revoke")',
  '@router.post("/learned-reranker-promotion/approve")',
  '@router.post("/learned-reranker-promotion/revoke")',
  '@router.post("/learned-rollout/{track}/activate")',
  '@router.post("/learned-rollout/{track}/rollback")',
  '@router.post("/learned-assisted-gate/configure")',
])
assertIncludes('backend/tests/test_learned_promotion_workflow.py', [
  'test_promotion_workflow_unapproved_approved_stale_and_revoked_states',
  'test_save_evaluator_promotion_decision_reuses_review_records',
])
assertIncludes('backend/tests/test_learned_reranker_promotion_workflow.py', [
  'test_reranker_promotion_workflow_unapproved_approved_stale_and_revoked_states',
  'test_save_reranker_promotion_decision_reuses_review_records',
])
assertIncludes('backend/tests/test_learned_rollout.py', [
  'test_learned_rollout_requires_approved_candidate_before_activate',
  'test_learned_rollout_can_activate_and_rollback_after_approval',
  'rollback_learned_rollout',
])
assertIncludes('backend/tests/test_learned_training_automation.py', [
  'build_promotion_evidence_pack',
  '/v1/ops/learned-promotion-evidence',
  '/v1/ops/learned-rollout/evaluator/activate',
  '/v1/ops/learned-rollout/evaluator/rollback',
])

assertIncludes('backend/src/narrativeos/services/quality_gate.py', [
  '"id": "learned_evaluator"',
  '"id": "learned_reranker"',
  '"status": "shadow_only"',
  '"production_gate": False',
  '"learned_gate_policy": "shadow_until_promotion_workflow_green"',
])
assertIncludes('docs/backend/P103_LEARNED_EVAL_PROMOTION_WORKFLOW_GATE.md', [
  'P103 Learned Eval Promotion Workflow Gate',
  'manual_approval',
  'shadow_until_promotion_workflow_green',
  'check:learned-eval-promotion-workflow',
  'not a production gate activation',
])
assertIncludes('docs/backend/P45_RUNTIME_ENGINE_COMPLETION_AUDIT.md', [
  'P103 Learned Eval Promotion Workflow Gate',
  'learned promotion workflow is now defined',
])
assertIncludes('scripts/check-runtime-engine-completion.mjs', [
  'scripts/check-learned-eval-promotion-workflow.mjs',
  'P103_LEARNED_EVAL_PROMOTION_WORKFLOW_GATE',
])
assertIncludes('scripts/check-runtime-completion-refresh.mjs', [
  'P103 Learned Eval Promotion Workflow Gate',
  'check:learned-eval-promotion-workflow',
])

const artifact = {
  generatedAt: new Date().toISOString(),
  status: 'passed',
  gate: 'P103_LEARNED_EVAL_PROMOTION_WORKFLOW_GATE',
  decision: 'learned_promotion_workflow_defined_shadow_only',
  productionGateActivated: false,
  rootTestDirectOptionalLearnedPromotion: false,
  tracks: ['evaluator', 'reranker'],
  requiredPromotionEvidence: [
    'promotion_evidence_pack',
    'manual_approval',
    'safe_rollout_activation',
    'rollback_rehearsal_or_rollback_path',
    'false_positive_review',
    'public_boundary_compatibility',
  ],
  strictPromotionSuite: [
    'backend/tests/test_learned_promotion_workflow.py',
    'backend/tests/test_learned_reranker_promotion_workflow.py',
    'backend/tests/test_learned_rollout.py',
    'backend/tests/test_learned_assisted_gate.py',
    'backend/tests/test_learned_assisted_rerank.py',
  ],
}

mkdirSync(artifactDir, { recursive: true })
const artifactPath = join(artifactDir, `learned-eval-promotion-workflow-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`)

console.log(JSON.stringify({
  status: 'passed',
  gate: artifact.gate,
  decision: artifact.decision,
  artifactPath,
}, null, 2))
