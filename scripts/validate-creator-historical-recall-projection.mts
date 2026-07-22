import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { parseArgs } from 'node:util'
import { strFromU8, unzipSync } from 'fflate'
import { buildCreatorLocalChapterMemories } from '../app/src/apps/creator/routes/creatorEditorLocalChapterMemoryService'
import { buildCreatorRecallCandidates } from '../app/src/apps/creator/routes/creatorEditorRecallViewModels'
import { buildHistoricalStateBackfillCommitResult } from '../app/src/features/creator-decision/historicalStateBackfill'
import {
  historicalStateBackfillProposalSchema,
  localCanonStateRecordSchema,
} from '../app/src/features/creator-decision/schemas'
import type { HistoricalStateBackfillProposal } from '../app/src/features/creator-decision/types'
import type { CreatorDecisionRecordEnvelope } from '../app/src/local-db/creatorLocalDecisionRepository'

interface WorkspaceRecord {
  family: string
  id: string
  value: unknown
}

interface WorkspaceExport {
  schemaVersion: number
  records: WorkspaceRecord[]
}

interface ValidationArtifact {
  source: {
    workspaceArchiveSha256: string
  }
  target: {
    workId: string
    chapter: number
    baseCanonRevision: number
    acceptedManuscriptSha256: string
  }
  review: {
    decision: 'pass' | 'reject'
  }
  proposal: unknown
  boundaries: {
    candidateOnly: boolean
    authorConfirmationPending: boolean
    acceptedManuscriptUnchanged: boolean
    repositoryWritePerformed: boolean
    commitFunctionCalled: boolean
    publicPublicationPerformed: boolean
    chapter21OpenedOrChangedByThisValidation: boolean
  }
}

const decisionFamilies = new Set([
  'creationSessions',
  'authorIntents',
  'contextSnapshots',
  'narrativeCandidates',
  'sceneDrafts',
  'literaryReviews',
  'repairProposals',
  'canonPatches',
  'localCanonStates',
  'creationDecisionEvents',
])

const { values } = parseArgs({
  options: {
    workspace: { type: 'string' },
    artifact: { type: 'string', multiple: true },
    output: { type: 'string' },
    work: { type: 'string' },
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

function manuscriptSha256(value: unknown) {
  return sha256(JSON.stringify(value))
}

function upsertDecisionRecord(
  records: CreatorDecisionRecordEnvelope[],
  next: CreatorDecisionRecordEnvelope,
) {
  return [
    ...records.filter(record => !(record.family === next.family && record.id === next.id)),
    next,
  ]
}

const workspacePath = required('workspace') as string
const artifactPaths = required('artifact') as string[]
const outputPath = required('output') as string
const workId = required('work') as string
const createdAt = required('createdAt') as string
assert.ok(artifactPaths.length > 0, 'At least one --artifact is required.')

const workspaceBytes = new Uint8Array(await readFile(workspacePath))
const workspaceSha256 = sha256(workspaceBytes)
const archive = unzipSync(workspaceBytes)
const recordsBytes = archive['records.json']
assert.ok(recordsBytes, 'Workspace archive must contain records.json.')
const workspace = JSON.parse(strFromU8(recordsBytes)) as WorkspaceExport
assert.equal(workspace.schemaVersion, 1)
assert.ok(Array.isArray(workspace.records))

let stagedRecords = workspace.records
  .filter(record => decisionFamilies.has(record.family)) as CreatorDecisionRecordEnvelope[]
const artifacts = await Promise.all(artifactPaths.map(async path => ({
  path,
  value: JSON.parse(await readFile(path, 'utf8')) as ValidationArtifact,
})))
artifacts.sort((left, right) => left.value.target.chapter - right.value.target.chapter)

const seenChapters = new Set<number>()
const simulated: Array<{
  chapter: number
  proposal: HistoricalStateBackfillProposal
  canonRevisionBefore: number
  canonRevisionAfter: number
  acceptedManuscriptSha256: string
}> = []

for (const artifact of artifacts) {
  const { target, boundaries } = artifact.value
  assert.equal(target.workId, workId)
  assert.ok(target.chapter <= 20, 'Historical recall validation must not cross the Chapter 20 stop line.')
  assert.equal(seenChapters.has(target.chapter), false, `Duplicate Chapter ${target.chapter} artifact.`)
  seenChapters.add(target.chapter)
  assert.equal(artifact.value.source.workspaceArchiveSha256, workspaceSha256)
  assert.equal(artifact.value.review.decision, 'pass')
  assert.equal(boundaries.candidateOnly, true)
  assert.equal(boundaries.authorConfirmationPending, true)
  assert.equal(boundaries.acceptedManuscriptUnchanged, true)
  assert.equal(boundaries.repositoryWritePerformed, false)
  assert.equal(boundaries.commitFunctionCalled, false)
  assert.equal(boundaries.publicPublicationPerformed, false)
  assert.equal(boundaries.chapter21OpenedOrChangedByThisValidation, false)

  const proposal = historicalStateBackfillProposalSchema.parse(artifact.value.proposal)
  assert.equal(proposal.status, 'proposed')
  assert.equal(proposal.workId, workId)
  const canonRecord = stagedRecords.find(record => (
    record.family === 'localCanonStates' && record.id === proposal.canonId
  ))
  assert.ok(canonRecord, `Missing canon ${proposal.canonId}.`)
  const canon = localCanonStateRecordSchema.parse(canonRecord.value)
  const acceptedManuscriptBefore = manuscriptSha256(canon.acceptedContentBlocks)
  assert.equal(acceptedManuscriptBefore, target.acceptedManuscriptSha256)
  assert.equal(canon.revision, target.baseCanonRevision)

  const dryRun = buildHistoricalStateBackfillCommitResult({
    proposal,
    currentCanon: canon,
    authorConfirmed: true,
    confirmedAt: createdAt,
  })
  assert.equal(dryRun.canon.revision, canon.revision + 1)
  assert.equal(manuscriptSha256(dryRun.canon.acceptedContentBlocks), acceptedManuscriptBefore)
  assert.equal(dryRun.canon.acceptedDraftId, canon.acceptedDraftId)
  assert.equal(dryRun.canon.acceptedDraftRevision, canon.acceptedDraftRevision)
  assert.equal(dryRun.canon.committedPatchId, canon.committedPatchId)
  assert.equal(dryRun.canon.committedAt, canon.committedAt)

  stagedRecords = upsertDecisionRecord(stagedRecords, {
    family: 'localCanonStates',
    id: dryRun.canon.id,
    value: dryRun.canon,
  })
  stagedRecords = upsertDecisionRecord(stagedRecords, {
    family: 'canonPatches',
    id: dryRun.proposal.id,
    value: dryRun.proposal,
  })
  simulated.push({
    chapter: target.chapter,
    proposal: dryRun.proposal,
    canonRevisionBefore: canon.revision,
    canonRevisionAfter: dryRun.canon.revision,
    acceptedManuscriptSha256: acceptedManuscriptBefore,
  })
}

const branchIds = new Set(simulated.map(item => item.proposal.branchId))
assert.equal(branchIds.size, 1, 'All candidate chapters must share one branch for this recall projection.')
const branchId = [...branchIds][0]!
const memories = buildCreatorLocalChapterMemories({
  records: stagedRecords,
  drafts: [],
  workId,
  branchId,
})
const simulatedByChapter = new Map(simulated.map(item => [item.chapter, item]))
const projectedChapters = memories
  .filter(memory => simulatedByChapter.has(memory.chapterNumber))
  .map(memory => {
    const source = simulatedByChapter.get(memory.chapterNumber)!
    const projectedItems = memory.stateRecallItems.filter(item => item.sourceId === source.proposal.id)
    assert.equal(projectedItems.length, source.proposal.operations.length)
    assert.deepEqual(
      new Set(projectedItems.map(item => item.statePath)),
      new Set(source.proposal.operations.map(operation => operation.path)),
    )
    return {
      chapter: memory.chapterNumber,
      proposalId: source.proposal.id,
      operationCount: source.proposal.operations.length,
      projectedRecallItemCount: projectedItems.length,
      canonRevisionBefore: source.canonRevisionBefore,
      simulatedCanonRevisionAfter: source.canonRevisionAfter,
      acceptedManuscriptSha256: source.acceptedManuscriptSha256,
    }
  })
assert.equal(projectedChapters.length, simulated.length)

const recallCandidates = buildCreatorRecallCandidates({
  chapters: [],
  localChapterMemories: memories,
  settingAssets: [],
  linkedRequest: null,
  workId,
  branchId,
  chapterId: null,
  chapterNumber: 20,
})
const historicalProposalIds = new Set(simulated.map(item => item.proposal.id))
const visibleHistoricalRecall = recallCandidates.filter(item => historicalProposalIds.has(item.sourceId))
assert.ok(visibleHistoricalRecall.length > 0)

const pathSources = new Map<string, Array<{ chapter: number; proposalId: string }>>()
for (const item of simulated) {
  for (const operation of item.proposal.operations) {
    const current = pathSources.get(operation.path) || []
    current.push({ chapter: item.chapter, proposalId: item.proposal.id })
    pathSources.set(operation.path, current)
  }
}
const repeatedPaths = [...pathSources.entries()]
  .filter(([, sources]) => sources.length > 1)
  .map(([path, sources]) => ({
    path,
    chapters: sources.map(source => source.chapter),
    latestChapter: sources.at(-1)!.chapter,
    latestProposalId: sources.at(-1)!.proposalId,
  }))
const visibleSourceByPath = new Map<string, string>()
for (const item of visibleHistoricalRecall) {
  const statePath = (item as typeof item & { statePath?: string }).statePath
  if (statePath) visibleSourceByPath.set(statePath, item.sourceId)
}
for (const repeated of repeatedPaths) {
  const visibleSource = visibleSourceByPath.get(repeated.path)
  if (visibleSource) assert.equal(
    visibleSource,
    repeated.latestProposalId,
    `Visible recall for ${repeated.path} must come from its latest committed chapter.`,
  )
}

const artifact = {
  schemaVersion: 'creator-historical-recall-projection-validation.v1',
  generatedAt: createdAt,
  source: {
    workspaceArchive: basename(workspacePath),
    workspaceArchiveSha256: workspaceSha256,
    validationArtifacts: artifactPaths.map(path => basename(path)),
  },
  workId,
  branchId,
  projectedChapters,
  totals: {
    passingChapterCount: simulated.length,
    operationCount: simulated.reduce((sum, item) => sum + item.proposal.operations.length, 0),
    projectedRecallItemCount: projectedChapters.reduce(
      (sum, item) => sum + item.projectedRecallItemCount,
      0,
    ),
    visibleRecallItemCountAtChapter20: visibleHistoricalRecall.length,
    visibleRepeatedPathCount: repeatedPaths.filter(item => visibleSourceByPath.has(item.path)).length,
  },
  repeatedPaths,
  boundaries: {
    simulationOnly: true,
    simulatedAuthorConfirmation: true,
    realAuthorConfirmationPerformed: false,
    repositoryOpened: false,
    repositoryWritePerformed: false,
    commitFunctionCalled: false,
    acceptedManuscriptsUnchanged: true,
    originalCommittedPatchIdsPreserved: true,
    chapter21OpenedOrChanged: false,
    publicPublicationPerformed: false,
  },
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')
process.stdout.write(`${JSON.stringify({
  outputPath,
  projectedChapters,
  totals: artifact.totals,
  repeatedPaths,
  boundaries: artifact.boundaries,
}, null, 2)}\n`)
