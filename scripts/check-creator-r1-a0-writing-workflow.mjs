#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const failures = []

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function requireMarkers(path, markers) {
  const source = read(path)
  for (const marker of markers) {
    if (!source.includes(marker)) failures.push(`${path} missing ${marker}`)
  }
  return source
}

const browser = requireMarkers('scripts/browser-creator-decision-workbench.mjs', [
  "fileURLToPath(new URL('..', import.meta.url))",
  'creator-recall-item',
  'contextSnapshots',
  'manualRecallAdherence',
  'creator-conversation-preview',
  'creator-writing-assist-inline-diff',
  '确认写入本机主宇宙',
  'canon?.state?.world?.informationBoundaries',
  'canon?.state?.promises',
  'author_confirmed',
  'publishReceipts',
  'publicSubmitExecuted: false',
])

if (browser.includes("locator('[data-agent-action=\"submit_publish_bundle\"]').click")) {
  failures.push('R1-A0 browser workflow must stop before public submission')
}

requireMarkers('app/src/features/creator-decision/referenceWritingAgent.ts', [
  'async proposeRepair(input): Promise<LocalRepairCandidate>',
  'async reviewRepair(input): Promise<LocalRepairReview>',
  'createManualRecallAdherenceReceipt',
  'manualRecallAdherenceViolations',
  'matchManualRecallEvidence',
  '/world/informationBoundaries/',
  '/promises/',
])

const recallEvidence = requireMarkers('app/src/features/creator-decision/manualRecallEvidence.ts', [
  'minimumExactEvidenceLength = 6',
  "status: 'violated'",
  "status: 'omitted'",
  'matchedPropositionPolarities',
  'matchedPropositionHasOppositePolarity',
  'oppositePolarityAnchorCount',
])
if (recallEvidence.includes('length >= 2')) {
  failures.push('manual recall evidence must not accept an arbitrary two-character overlap')
}

requireMarkers('app/tests/creator-candidate-quality-gate.ts', [
  'reviewerHardNegativeRecall',
  'reviewerHardNegativeDraft',
  'reviewerPositiveRecallText',
  'reviewerPositiveGate',
  'reviewerLaterContradictionRecallText',
  'reviewerLaterContradictionGate',
  'manual_recall_receipt_rejected',
])

requireMarkers('app/src/features/creator-decision/candidateQualityGate.ts', [
  'manual_recall_receipt_missing',
  'manual_recall_receipt_rejected',
  'pending_repair_decision',
  'active_revision_candidate',
])

requireMarkers('docs/launch/070_R1_A0_WRITING_WORKFLOW_INTEGRATION.md', [
  '最多两次关键追问',
  '手动选择记忆卡',
  '单场景候选',
  '独立审阅',
  '局部修改候选',
  '作者确认',
  '发布包',
  '不公开提交',
])

requireMarkers('.github/workflows/mvp-checks.yml', [
  'r1-a0-writing-workflow:',
  'npm run qa:creator-r1-a0-writing-workflow',
  'r1-a0-writing-workflow-evidence',
])

const packageJson = read('package.json')
for (const script of [
  'check:creator-r1-a0-writing-workflow',
  'qa:creator-r1-a0-writing-workflow',
]) {
  if (!packageJson.includes(`"${script}"`)) failures.push(`package.json missing ${script}`)
}

if (failures.length) {
  console.error('[check-creator-r1-a0-writing-workflow] FAIL')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[check-creator-r1-a0-writing-workflow] PASS')
