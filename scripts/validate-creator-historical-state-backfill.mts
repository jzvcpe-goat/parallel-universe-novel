import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import { strFromU8, unzipSync } from 'fflate'
import {
  characterStateDimensions,
  parseCharacterStatePath,
} from '../app/src/features/creator-decision/characterState'
import {
  createHistoricalStateBackfillProposal,
  validateHistoricalStateBackfillCommit,
} from '../app/src/features/creator-decision/historicalStateBackfill'
import {
  canonStatePatchSchema,
  creationSessionSchema,
  localCanonStateRecordSchema,
} from '../app/src/features/creator-decision/schemas'
import {
  assertDistinctStoryStateOperationPaths,
  buildStoryStateEvidenceOperations,
  storyStateEvidenceOutputSchema,
  storyStateEvidenceReviewSchema,
  validateStoryStateEvidenceReview,
} from '../app/src/features/creator-decision/storyStateEvidence'
import { CreationDecisionError } from '../app/src/features/creator-decision/types'

interface WorkspaceRecord {
  family: string
  id: string
  value: unknown
}

interface WorkspaceExport {
  schemaVersion: number
  records: WorkspaceRecord[]
}

interface RunManifest {
  schemaVersion: string
  pipelineId: string
  sequence: number
  role: string
  operation: string
  status: string
  startedAt: string
  completedAt: string
  privateDataBoundary: string
  canonCommitAllowed: boolean
}

const { values } = parseArgs({
  options: {
    workspace: { type: 'string' },
    response: { type: 'string' },
    output: { type: 'string' },
    work: { type: 'string' },
    chapter: { type: 'string' },
    createdAt: { type: 'string' },
  },
  strict: true,
})

function required(name: keyof typeof values) {
  const value = values[name]
  if (!value) throw new Error(`Missing required --${name} argument.`)
  return value
}

function sha256(value: Uint8Array | string) {
  return createHash('sha256').update(value).digest('hex')
}

function recordValue(
  records: WorkspaceRecord[],
  family: string,
  predicate: (value: Record<string, unknown>, record: WorkspaceRecord) => boolean,
) {
  const matches = records.filter(record => (
    record.family === family
    && typeof record.value === 'object'
    && record.value !== null
    && predicate(record.value as Record<string, unknown>, record)
  ))
  assert.equal(matches.length, 1, `Expected one ${family} record, found ${matches.length}.`)
  return matches[0]!.value
}

function chapterNumber(chapterId: unknown) {
  const match = /:chapter:(\d+)$/.exec(String(chapterId || ''))
  return match ? Number(match[1]) : null
}

const workspacePath = required('workspace')
const responsePath = required('response')
const outputPath = required('output')
const workId = required('work')
const chapter = Number(required('chapter'))
const createdAt = required('createdAt')
assert.ok(Number.isInteger(chapter) && chapter > 0, '--chapter must be a positive integer.')
assert.ok(chapter <= 20, 'This validation must not cross the Chapter 20 stop line.')

const workspaceBytes = new Uint8Array(await readFile(workspacePath))
const archive = unzipSync(workspaceBytes)
const recordsBytes = archive['records.json']
assert.ok(recordsBytes, 'Workspace archive must contain records.json.')
const workspace = JSON.parse(strFromU8(recordsBytes)) as WorkspaceExport
assert.equal(workspace.schemaVersion, 1)
assert.ok(Array.isArray(workspace.records))

const chapterSuffix = `:chapter:${chapter}`
const session = creationSessionSchema.parse(recordValue(
  workspace.records,
  'creationSessions',
  (value, record) => (
    value.workId === workId
    && String(value.chapterId || '').endsWith(chapterSuffix)
    && record.id.startsWith('creation-session:editor:')
  ),
))
const canon = localCanonStateRecordSchema.parse(recordValue(
  workspace.records,
  'localCanonStates',
  value => value.workId === workId && String(value.chapterId || '').endsWith(chapterSuffix),
))
const currentPatch = canonStatePatchSchema.parse(recordValue(
  workspace.records,
  'canonPatches',
  value => value.workId === workId && String(value.chapterId || '').endsWith(chapterSuffix),
))

assert.equal(session.phase, 'canon_committed')
assert.equal(session.chapterId, canon.chapterId)
assert.equal(session.branchId, canon.branchId)
assert.equal(currentPatch.sessionId, session.id)

const responseBytes = await readFile(responsePath)
const evidence = storyStateEvidenceOutputSchema.parse(JSON.parse(responseBytes.toString('utf8')))
const manifestPath = join(dirname(responsePath), 'run-manifest.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as RunManifest
assert.equal(manifest.schemaVersion, 'creator-working-agent-run.v1')
assert.equal(manifest.role, 'Observer')
assert.equal(manifest.operation, 'state_evidence')
assert.equal(manifest.status, 'succeeded')
assert.equal(manifest.privateDataBoundary, 'local_ephemeral')
assert.equal(manifest.canonCommitAllowed, false)
const review = storyStateEvidenceReviewSchema.parse(JSON.parse(await readFile(
  join(dirname(responsePath), 'review.json'),
  'utf8',
)))
const reviewManifest = JSON.parse(await readFile(
  join(dirname(responsePath), 'review-run-manifest.json'),
  'utf8',
)) as RunManifest
assert.equal(reviewManifest.schemaVersion, 'creator-working-agent-run.v1')
assert.ok(reviewManifest.role === 'Auditor' || reviewManifest.role === 'Normalizer')
assert.ok(
  reviewManifest.operation === 'state_evidence_review'
  || reviewManifest.operation === 'state_evidence_review:schema_repair',
)
assert.equal(reviewManifest.status, 'succeeded')
assert.equal(reviewManifest.privateDataBoundary, 'local_ephemeral')
assert.equal(reviewManifest.canonCommitAllowed, false)

const manuscriptBefore = sha256(JSON.stringify(canon.acceptedContentBlocks))
const operations = buildStoryStateEvidenceOperations({
  result: evidence,
  session,
  blocks: canon.acceptedContentBlocks,
  context: {
    currentCanonState: canon.state,
    activePromises: [],
    unresolvedForeshadowing: [],
    manualRecallItems: [],
  },
})
assert.ok(operations.length > 0, 'Observer evidence must produce at least one located operation.')
assertDistinctStoryStateOperationPaths(operations)
let semanticReviewPassed = false
let reviewValidationError: { code: string; message: string } | null = null
try {
  semanticReviewPassed = validateStoryStateEvidenceReview({ evidence, review })
} catch (error) {
  if (!(error instanceof CreationDecisionError)) throw error
  reviewValidationError = {
    code: error.code,
    message: error.message,
  }
}
const proposal = semanticReviewPassed
  ? createHistoricalStateBackfillProposal({
      id: `historical-state-backfill:${workId}:chapter:${chapter}:${manifest.pipelineId}`,
      sessionId: session.id,
      canon,
      operations,
      createdAt,
    })
  : null
if (proposal) {
  assert.equal(proposal.status, 'proposed')
  assert.equal(proposal.baseCanonRevision, canon.revision)
  assert.equal(proposal.sourceDraftId, canon.acceptedDraftId)
  assert.equal(proposal.sourceDraftRevision, canon.acceptedDraftRevision)
}
assert.equal(
  operations.length,
  evidence.characterStateProposals.length + evidence.continuityProposals.length,
)

const acceptedBlockIds = new Set(canon.acceptedContentBlocks.map(block => block.id))
for (const operation of operations) {
  assert.ok(operation.evidenceBlockIds.length > 0)
  assert.ok(operation.evidenceBlockIds.every(blockId => acceptedBlockIds.has(blockId)))
}
assert.equal(
  sha256(JSON.stringify(canon.acceptedContentBlocks)),
  manuscriptBefore,
  'Candidate preparation must not mutate accepted prose.',
)

let unconfirmedCommitError: string | null = null
if (proposal) {
  try {
    validateHistoricalStateBackfillCommit({
      proposal,
      currentCanon: canon,
      authorConfirmed: false,
      confirmedAt: createdAt,
    })
    assert.fail('Unconfirmed historical state backfill must fail closed.')
  } catch (error) {
    assert.ok(error instanceof CreationDecisionError)
    assert.equal(error.code, 'author_confirmation_required')
    unconfirmedCommitError = error.code
  }
}

const updatedCharacterDimensions = operations.flatMap(operation => {
  const parsed = parseCharacterStatePath(operation.path)
  return parsed ? [parsed.dimension] : []
})
const uniqueUpdatedDimensions = Array.from(new Set(updatedCharacterDimensions))
const untouchedCharacterDimensions = characterStateDimensions.filter(
  dimension => !uniqueUpdatedDimensions.includes(dimension),
)

const coverage = Array.from({ length: 13 }, (_, index) => index + 8).map(number => {
  const patchRecord = workspace.records.find(record => {
    if (record.family !== 'canonPatches' || typeof record.value !== 'object' || !record.value) return false
    const value = record.value as Record<string, unknown>
    return value.workId === workId && chapterNumber(value.chapterId) === number
  })
  const canonRecord = workspace.records.find(record => {
    if (record.family !== 'localCanonStates' || typeof record.value !== 'object' || !record.value) return false
    const value = record.value as Record<string, unknown>
    return value.workId === workId && chapterNumber(value.chapterId) === number
  })
  assert.ok(patchRecord, `Missing canon patch for chapter ${number}.`)
  assert.ok(canonRecord, `Missing local canon state for chapter ${number}.`)
  const patch = canonStatePatchSchema.parse(patchRecord.value)
  const chapterCanon = localCanonStateRecordSchema.parse(canonRecord.value)
  return {
    chapter: number,
    canonRevision: chapterCanon.revision,
    acceptedDraftRevision: chapterCanon.acceptedDraftRevision,
    acceptedBlockCount: chapterCanon.acceptedContentBlocks.length,
    committedPatchOperationCount: patch.operations.length,
    needsHistoricalStateReview: patch.operations.length === 0,
  }
})

const artifact = {
  schemaVersion: 'creator-historical-state-backfill-validation.v1',
  generatedAt: createdAt,
  source: {
    workspaceArchive: basename(workspacePath),
    workspaceArchiveSha256: sha256(workspaceBytes),
    observerResponseSha256: sha256(responseBytes),
  },
  observerRun: {
    pipelineId: manifest.pipelineId,
    sequence: manifest.sequence,
    role: manifest.role,
    operation: manifest.operation,
    status: manifest.status,
    startedAt: manifest.startedAt,
    completedAt: manifest.completedAt,
    privateDataBoundary: manifest.privateDataBoundary,
    canonCommitAllowed: manifest.canonCommitAllowed,
  },
  stateEvidenceReviewRun: {
    pipelineId: reviewManifest.pipelineId,
    sequence: reviewManifest.sequence,
    role: reviewManifest.role,
    operation: reviewManifest.operation,
    status: reviewManifest.status,
    startedAt: reviewManifest.startedAt,
    completedAt: reviewManifest.completedAt,
    privateDataBoundary: reviewManifest.privateDataBoundary,
    canonCommitAllowed: reviewManifest.canonCommitAllowed,
  },
  target: {
    workId,
    chapter,
    sessionId: session.id,
    sessionPhase: session.phase,
    canonId: canon.id,
    baseCanonRevision: canon.revision,
    sourceDraftId: canon.acceptedDraftId,
    sourceDraftRevision: canon.acceptedDraftRevision,
    acceptedBlockCount: canon.acceptedContentBlocks.length,
    acceptedManuscriptSha256: manuscriptBefore,
    originalCommittedPatchOperationCount: currentPatch.operations.length,
  },
  stateCoverage: {
    registeredCharacterDimensionCount: characterStateDimensions.length,
    updatedCharacterDimensionCount: uniqueUpdatedDimensions.length,
    updatedCharacterDimensions: uniqueUpdatedDimensions,
    untouchedCharacterDimensions,
    continuityProposalKinds: evidence.continuityProposals.map(item => item.kind),
    noFillerRequired: true,
  },
  review,
  reviewValidationError,
  proposal,
  extractedOperations: operations,
  boundaries: {
    semanticReviewPassed,
    reviewValidationError,
    candidateOnly: proposal?.status === 'proposed',
    acceptedManuscriptUnchanged: true,
    evidenceLocatedInAcceptedBlocks: true,
    repositoryWritePerformed: false,
    commitFunctionCalled: false,
    unconfirmedCommitRejectedWith: unconfirmedCommitError,
    authorConfirmationPending: proposal?.status === 'proposed',
    chapter21OpenedOrChangedByThisValidation: false,
    publicPublicationPerformed: false,
  },
  chapters8To20Coverage: coverage,
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')
process.stdout.write(`${JSON.stringify({
  outputPath,
  extractedOperationCount: operations.length,
  proposalOperationCount: proposal?.operations.length || 0,
  reviewDecision: review.decision,
  reviewValidationError,
  updatedCharacterDimensions: uniqueUpdatedDimensions,
  continuityKinds: evidence.continuityProposals.map(item => item.kind),
  chaptersNeedingHistoricalReview: coverage.filter(item => item.needsHistoricalStateReview).map(item => item.chapter),
  candidateOnly: proposal?.status === 'proposed',
}, null, 2)}\n`)
