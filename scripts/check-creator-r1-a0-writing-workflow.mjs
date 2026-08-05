#!/usr/bin/env node

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readR1A0RepositoryIdentity } from './lib/r1-a0-repository-identity.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const failures = []
const repositoryIdentity = readR1A0RepositoryIdentity({ root })
try {
  readR1A0RepositoryIdentity({
    root,
    expectedHeadSha: `${repositoryIdentity.checkoutSha}-mismatch`,
  })
  failures.push('R1-A0 repository identity must reject a mismatched PR head')
} catch (error) {
  if (!String(error).includes('does not match PR head')) {
    failures.push('R1-A0 repository identity mismatch must fail with a precise error')
  }
}

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
  'repositoryIdentity',
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
  "sourceCategory: 'synthetic-r1-a0-workflow'",
  "approval: 'approved-sanitized-synthetic-fixture'",
  "createHash('sha256')",
])

requireMarkers('scripts/lib/r1-a0-repository-identity.mjs', [
  'checkoutSha',
  'pullRequestHeadSha',
  'pullRequestHeadTreeSha',
  'does not match PR head',
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
  'matchedPropositionOccurrences',
  'matchedPropositionAssessment',
  'oppositePolarityAnchorCount',
  'structuredRetentionAssessment',
  'assertionModeAt',
  'extractedActionTarget',
  'transitionTimeRelation',
  'timeRelationFromText',
  'subjectAliases',
  'containerAliases',
  'normalizedEntity',
  'mentionsContainer',
  'latestExplicitEntity',
  'latestEntity',
  "relation: 'uncertain'",
  'contradictingSentence',
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
  'staleRecallRevisionReview',
  'reviewerTerminalRecallMatrix',
  'unchanged normative constraint',
  'ordinary took-out contradiction',
  'plain speech attribution',
  'unrelated removal in a supporting sentence',
  'unrelated removal joined without punctuation',
  'pronoun follows the nearest explicit map object',
  'unclassified pronoun state change fails closed',
  'container lookup cannot find the key',
  'key leaves the clock',
  'key is handed to the captain',
  'later threshold reminder does not excuse early removal',
  'fourth-tide extraction plan is not actual removal',
  'speech attribution before comma',
  'whether concession',
  'plain question',
  'so-called speculative claim',
  'pending confirmation',
  'container alias and key alias extraction',
  'seal inspection preserves prior support',
  'empty constrained container',
  'executed action according to plan',
  'cross-block threshold time permits extraction',
  'quoted direct speech',
  'postposed direct-speech attribution',
  'unrelated question after factual support',
  'manual_recall_receipt_rejected',
])

requireMarkers('app/src/features/creator-decision/candidateQualityGate.ts', [
  'manual_recall_receipt_missing',
  'manual_recall_receipt_rejected',
  'pending_repair_decision',
  'active_revision_candidate',
  'check.sourceRevision === selectedRecalls[index]?.sourceRevision',
])

requireMarkers('app/src/apps/creator/routes/useCreationDecisionSession.ts', [
  'operationQueueRef',
  'recordAuthorEdit: async (content: string)',
])

requireMarkers('app/src/components/creator/workspace/CreatorConversationTimeline.tsx', [
  'manuscriptHasUnsavedChanges',
  'savingManuscript',
])

requireMarkers('app/src/local-db/creatorLocalDecisionRepository.ts', [
  'assertCanonCommitSessionCurrent',
  'stored.currentDraftRevision !== proposed.currentDraftRevision',
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

requireMarkers('docs/reviews/CREATOR_PUBLIC_EVIDENCE_ALLOWLIST.md', [
  'R1-A0 approved synthetic browser evidence',
  'creator-decision-workbench.png',
  'approved-sanitized-synthetic-fixture',
])

const workflow = requireMarkers('.github/workflows/mvp-checks.yml', [
  'r1-a0-writing-workflow:',
  'npm run qa:creator-r1-a0-writing-workflow',
  'r1-a0-writing-workflow-evidence',
  'ref: ${{ github.event.pull_request.head.sha }}',
  'PR_HEAD_SHA: ${{ github.event.pull_request.head.sha }}',
])
const r1A0Workflow = workflow.slice(workflow.indexOf('r1-a0-writing-workflow:'))
if (
  r1A0Workflow.indexOf('ref: ${{ github.event.pull_request.head.sha }}')
  > r1A0Workflow.indexOf('npm run qa:creator-r1-a0-writing-workflow')
) {
  failures.push('R1-A0 workflow must checkout the exact PR head before browser verification')
}

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
