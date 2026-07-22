import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { tmpdir } from 'node:os'
import { isDeepStrictEqual, parseArgs } from 'node:util'
import { strFromU8, unzipSync } from 'fflate'
import {
  proposeHistoricalStateBackfillWithWorkingAgent,
} from '../app/src/features/creator-decision/historicalStateBackfillAgent'
import {
  canonStatePatchSchema,
  creationSessionSchema,
  localCanonStateRecordSchema,
} from '../app/src/features/creator-decision/schemas'

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
  completedAt: string | null
  privateDataBoundary: string
  canonCommitAllowed: boolean
}

const { values } = parseArgs({
  options: {
    workspace: { type: 'string' },
    outputDir: { type: 'string' },
    work: { type: 'string' },
    chapter: { type: 'string' },
    baseUrl: { type: 'string', default: 'http://127.0.0.1:4318' },
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

async function findRoleRuns(input: {
  sessionId: string
  startedAfter: number
  role: 'Observer' | 'Auditor' | 'Normalizer'
  operation: string
  allowEmpty?: boolean
}) {
  const logRoot = join(tmpdir(), 'parallel-universe-creator-working-agent')
  const pipelineEntries = await readdir(logRoot, { withFileTypes: true })
  const matches: Array<{ manifest: RunManifest; response: unknown }> = []
  for (const pipelineEntry of pipelineEntries) {
    if (!pipelineEntry.isDirectory()) continue
    const runDirectory = join(logRoot, pipelineEntry.name, `01-${input.role.toLowerCase()}`)
    try {
      const [manifestText, prompt, responseText] = await Promise.all([
        readFile(join(runDirectory, 'run-manifest.json'), 'utf8'),
        readFile(join(runDirectory, 'prompt.txt'), 'utf8'),
        readFile(join(runDirectory, 'response.json'), 'utf8'),
      ])
      const manifest = JSON.parse(manifestText) as RunManifest
      if (
        manifest.role === input.role
        && manifest.operation === input.operation
        && manifest.status === 'succeeded'
        && Date.parse(manifest.startedAt) >= input.startedAfter - 1_000
        && prompt.includes(input.sessionId)
      ) {
        matches.push({ manifest, response: JSON.parse(responseText) })
      }
    } catch {
      // Other role pipelines do not own the requested role directory.
    }
  }
  matches.sort((left, right) => Date.parse(right.manifest.startedAt) - Date.parse(left.manifest.startedAt))
  if (!input.allowEmpty) {
    assert.ok(matches.length > 0, `Expected a new ${input.role}/${input.operation} run.`)
  }
  return matches
}

function finalRoleRun<T>(input: {
  value: T
  primaryRuns: Array<{ manifest: RunManifest; response: unknown }>
  repairRuns: Array<{ manifest: RunManifest; response: unknown }>
  label: string
}) {
  const match = [...input.primaryRuns, ...input.repairRuns]
    .find(run => isDeepStrictEqual(run.response, input.value))
  assert.ok(match, `Could not locate the final ${input.label} role response.`)
  return match
}

const workspacePath = required('workspace')
const outputDir = required('outputDir')
const workId = required('work')
const chapter = Number(required('chapter'))
const baseUrl = required('baseUrl').replace(/\/$/, '')
const createdAt = values.createdAt || new Date().toISOString()
assert.ok(Number.isInteger(chapter) && chapter > 0, '--chapter must be a positive integer.')
assert.ok(chapter <= 20, 'This validation runner must not cross the Chapter 20 stop line.')

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
const patch = canonStatePatchSchema.parse(recordValue(
  workspace.records,
  'canonPatches',
  value => value.workId === workId && String(value.chapterId || '').endsWith(chapterSuffix),
))
assert.equal(session.phase, 'canon_committed')
assert.equal(session.chapterId, canon.chapterId)
assert.equal(session.branchId, canon.branchId)
assert.equal(patch.sessionId, session.id)
assert.equal(patch.status, 'committed')
assert.equal(patch.operations.length, 0, 'Historical extraction is only needed for an empty committed Patch.')
assert.ok(canon.acceptedDraftRevision > 0)
assert.ok(canon.acceptedContentBlocks.length > 0)

const healthResponse = await fetch(`${baseUrl}/health`)
assert.equal(healthResponse.status, 200, 'Local Working Agent bridge is not ready.')
const health = await healthResponse.json() as {
  status?: string
  operations?: string[]
  roleRuntime?: Array<{ role?: string; status?: string }>
  privateDraftsRemainLocal?: boolean
}
assert.equal(health.status, 'ready')
assert.equal(health.privateDraftsRemainLocal, true)
assert.ok(health.operations?.includes('state_evidence'))
assert.equal(health.roleRuntime?.find(role => role.role === 'Observer')?.status, 'wired')

const invocationStartedAt = Date.now()
const result = await proposeHistoricalStateBackfillWithWorkingAgent({
  baseUrl,
  proposalId: `historical-state-backfill:${workId}:chapter:${chapter}:${createdAt}`,
  session,
  canon,
  createdAt,
})
assert.ok(result.review, 'Non-empty Observer evidence must receive an independent semantic review.')

const observerRuns = await findRoleRuns({
  sessionId: session.id,
  startedAfter: invocationStartedAt,
  role: 'Observer',
  operation: 'state_evidence',
})
const evidenceRepairRuns = await findRoleRuns({
  sessionId: session.id,
  startedAfter: invocationStartedAt,
  role: 'Normalizer',
  operation: 'state_evidence:schema_repair',
  allowEmpty: true,
})
const reviewRuns = await findRoleRuns({
  sessionId: session.id,
  startedAfter: invocationStartedAt,
  role: 'Auditor',
  operation: 'state_evidence_review',
})
const reviewRepairRuns = await findRoleRuns({
  sessionId: session.id,
  startedAfter: invocationStartedAt,
  role: 'Normalizer',
  operation: 'state_evidence_review:schema_repair',
  allowEmpty: true,
})
const observerRun = finalRoleRun({
  value: result.evidence,
  primaryRuns: observerRuns,
  repairRuns: evidenceRepairRuns,
  label: 'state evidence',
})
const reviewRun = finalRoleRun({
  value: result.review,
  primaryRuns: reviewRuns,
  repairRuns: reviewRepairRuns,
  label: 'state evidence review',
})
const allRuns = [
  ...observerRuns,
  ...evidenceRepairRuns,
  ...reviewRuns,
  ...reviewRepairRuns,
]
for (const run of allRuns) {
  assert.equal(run.manifest.schemaVersion, 'creator-working-agent-run.v1')
  assert.equal(run.manifest.privateDataBoundary, 'local_ephemeral')
  assert.equal(run.manifest.canonCommitAllowed, false)
}

await mkdir(outputDir, { recursive: true })
await writeFile(
  join(outputDir, 'response.json'),
  `${JSON.stringify(result.evidence, null, 2)}\n`,
  { encoding: 'utf8', flag: 'wx' },
)
await writeFile(
  join(outputDir, 'run-manifest.json'),
  `${JSON.stringify(observerRun.manifest, null, 2)}\n`,
  { encoding: 'utf8', flag: 'wx' },
)
await writeFile(
  join(outputDir, 'review.json'),
  `${JSON.stringify(result.review, null, 2)}\n`,
  { encoding: 'utf8', flag: 'wx' },
)
await writeFile(
  join(outputDir, 'review-run-manifest.json'),
  `${JSON.stringify(reviewRun.manifest, null, 2)}\n`,
  { encoding: 'utf8', flag: 'wx' },
)
await writeFile(
  join(outputDir, 'run-receipt.json'),
  `${JSON.stringify({
    schemaVersion: 'creator-historical-state-observer-receipt.v1',
    workspaceArchive: basename(workspacePath),
    workspaceArchiveSha256: sha256(workspaceBytes),
    workId,
    chapter,
    sessionId: session.id,
    canonId: canon.id,
    canonRevision: canon.revision,
    acceptedDraftId: canon.acceptedDraftId,
    acceptedDraftRevision: canon.acceptedDraftRevision,
    acceptedBlockCount: canon.acceptedContentBlocks.length,
    originalCommittedPatchOperationCount: patch.operations.length,
    observerPipelineId: observerRun.manifest.pipelineId,
    reviewPipelineId: reviewRun.manifest.pipelineId,
    observerPipelineIds: observerRuns.map(run => run.manifest.pipelineId),
    reviewPipelineIds: reviewRuns.map(run => run.manifest.pipelineId),
    evidenceRepairPipelineIds: evidenceRepairRuns.map(run => run.manifest.pipelineId),
    reviewRepairPipelineIds: reviewRepairRuns.map(run => run.manifest.pipelineId),
    semanticRevisionCount: result.semanticRevisionCount,
    observerRunCount: observerRuns.length,
    reviewRunCount: reviewRuns.length,
    reviewRole: reviewRun.manifest.role,
    reviewDecision: result.review.decision,
    reviewValidationError: result.reviewValidationError,
    candidateOperationCount: result.proposal?.operations.length || 0,
    candidateStatus: result.proposal?.status
      || (result.reviewValidationError ? 'review_invalid' : 'review_rejected'),
    repositoryWritePerformed: false,
    authorConfirmationPending: Boolean(result.proposal),
    canonCommitAllowed: allRuns.some(run => run.manifest.canonCommitAllowed),
    chapter21OpenedOrChanged: false,
  }, null, 2)}\n`,
  { encoding: 'utf8', flag: 'wx' },
)

process.stdout.write(`${JSON.stringify({
  outputDir,
  observerPipelineId: observerRun.manifest.pipelineId,
  reviewPipelineId: reviewRun.manifest.pipelineId,
  chapter,
  operationCount: result.proposal?.operations.length || 0,
  reviewDecision: result.review.decision,
  reviewValidationError: result.reviewValidationError,
  semanticRevisionCount: result.semanticRevisionCount,
  observerRunCount: observerRuns.length,
  reviewRunCount: reviewRuns.length,
  candidateOnly: result.proposal?.status === 'proposed',
  repositoryWritePerformed: false,
}, null, 2)}\n`)
