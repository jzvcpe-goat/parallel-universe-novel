import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { requestAuditedStoryStateEvidenceFromWorkingAgent } from '../app/src/features/creator-decision/localWorkingAgent'
import { sceneDraftResultSchema } from '../app/src/features/creator-decision/schemas'
import { buildStoryStateEvidenceOperations } from '../app/src/features/creator-decision/storyStateEvidence'
import type {
  AuthorIntentContract,
  CandidateSearchResult,
  ContextSnapshot,
  CreationSession,
  LiteraryReview,
} from '../app/src/features/creator-decision/types'

interface SourcePayload {
  session: CreationSession
  intent: AuthorIntentContract
  context: ContextSnapshot
}

const { values } = parseArgs({
  options: {
    'base-url': { type: 'string', default: 'http://127.0.0.1:4318' },
    'source-prompt': { type: 'string' },
    draft: { type: 'string' },
    review: { type: 'string' },
    candidates: { type: 'string' },
    'candidate-id': { type: 'string' },
    output: { type: 'string' },
    'private-output': { type: 'string' },
  },
  strict: true,
})

function required(name: 'source-prompt' | 'draft' | 'review' | 'candidates' | 'candidate-id' | 'output' | 'private-output') {
  const value = values[name]
  if (!value) throw new Error(`Missing required --${name} argument.`)
  return value
}

function sha256(value: string | Uint8Array) {
  return createHash('sha256').update(value).digest('hex')
}

function sourcePayload(prompt: string) {
  const marker = '当前资料：'
  const markerIndex = prompt.lastIndexOf(marker)
  assert.notEqual(markerIndex, -1)
  return JSON.parse(prompt.slice(markerIndex + marker.length).trim()) as SourcePayload
}

const prompt = await readFile(resolve(required('source-prompt')), 'utf8')
const source = sourcePayload(prompt)
assert.match(source.session.chapterId, /:chapter:20$/)
const draft = sceneDraftResultSchema.parse(JSON.parse(await readFile(resolve(required('draft')), 'utf8')))
const review = JSON.parse(await readFile(resolve(required('review')), 'utf8')) as LiteraryReview
const search = JSON.parse(await readFile(resolve(required('candidates')), 'utf8')) as CandidateSearchResult
const candidate = search.candidates.find(item => item.id === required('candidate-id'))
assert.ok(candidate, 'The selected Planner candidate must exist in the private trial data.')

const audited = await requestAuditedStoryStateEvidenceFromWorkingAgent({
  baseUrl: values['base-url']!.replace(/\/$/, ''),
  mode: 'quality_trial',
  payload: {
    session: source.session,
    intent: source.intent,
    candidate,
    context: source.context,
    draft,
    review,
  },
})
const operations = audited.passed
  ? buildStoryStateEvidenceOperations({
      result: audited.evidence,
      session: source.session,
      blocks: draft.contentBlocks,
      context: source.context,
    })
  : []

const privateOutputPath = resolve(required('private-output'))
await mkdir(dirname(privateOutputPath), { recursive: true })
await writeFile(privateOutputPath, `${JSON.stringify(audited, null, 2)}\n`, 'utf8')

const initialIssueCounts = audited.initialReview?.issues.reduce<Record<string, number>>((counts, issue) => {
  counts[issue.code] = (counts[issue.code] || 0) + 1
  return counts
}, {}) || {}
const summary = {
  schemaVersion: 'creator-state-memory-quality-trial.v1',
  completedAt: new Date().toISOString(),
  chapter: 20,
  sourcePromptSha256: sha256(prompt),
  draftSha256: sha256(draft.contentBlocks.map(block => block.text).join('\n\n')),
  manualRecallCount: source.context.manualRecallItems.length,
  attempts: audited.attempts,
  initial: {
    characterStateProposalCount: audited.initialEvidence.characterStateProposals.length,
    continuityProposalCount: audited.initialEvidence.continuityProposals.length,
    reviewDecision: audited.initialReview?.decision || 'empty_evidence_valid',
    issueCounts: initialIssueCounts,
    verifiedCharacterProposalCount: audited.initialReview?.verifiedCharacterProposalIndexes.length || 0,
    verifiedContinuityProposalCount: audited.initialReview?.verifiedContinuityProposalIndexes.length || 0,
  },
  final: {
    characterStateProposalCount: audited.evidence.characterStateProposals.length,
    continuityProposalCount: audited.evidence.continuityProposals.length,
    reviewDecision: audited.finalReview?.decision || 'empty_evidence_valid',
    issueCount: audited.finalReview?.issues.length || 0,
    passed: audited.passed,
    locatableOperationCount: operations.length,
    characterDimensions: audited.evidence.characterStateProposals.map(item => item.path.split('/').at(-1)),
    continuityKinds: audited.evidence.continuityProposals.map(item => item.kind),
  },
  boundedRevision: {
    maximumObserverRevisions: 1,
    revisionUsed: audited.attempts === 2,
    rejectedCandidatesMayNotBypassAuditor: true,
  },
  sideEffects: {
    repositoryWritePerformed: false,
    canonCommitPerformed: false,
    acceptedChapterChanged: false,
    chapter21AccessedOrChanged: false,
    publicationPerformed: false,
  },
  privateArtifactSha256: sha256(await readFile(privateOutputPath)),
  containsManuscriptText: false,
}
const outputPath = resolve(required('output'))
await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
