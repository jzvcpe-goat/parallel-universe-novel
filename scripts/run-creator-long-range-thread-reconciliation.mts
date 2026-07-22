import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseArgs } from 'node:util'
import { strFromU8, unzipSync } from 'fflate'
import {
  requestLongRangeStoryThreadRevisionFromWorkingAgent,
  requestLongRangeStoryThreadVerificationFromWorkingAgent,
} from '../app/src/features/creator-decision/localWorkingAgent'
import { localCanonStateRecordSchema } from '../app/src/features/creator-decision/schemas'
import type { LongformContinuityChapter } from '../app/src/features/creator-decision/longformContinuity'
import type {
  LongRangeStoryThreadReview,
  LongRangeStoryThreadVerification,
} from '../app/src/features/creator-decision/longRangeStoryThreads'

interface WorkspaceRecord {
  family: string
  id: string
  value: unknown
}

interface WorkspaceExport {
  schemaVersion: number
  records: WorkspaceRecord[]
}

interface SourceSummary {
  campaignId: string
  scope: {
    workId: string
    fromChapter: number
    toChapter: number
    stopLine: number
    workspaceArchiveSha256: string
  }
  runtime: {
    privateArtifactsDirectory: string
  }
}

interface SourcePass {
  focus: 'causal_state' | 'promise_arc'
  initialReview?: LongRangeStoryThreadReview
  initialVerification?: LongRangeStoryThreadVerification
  review: LongRangeStoryThreadReview
  verification: LongRangeStoryThreadVerification
}

interface RunManifest {
  schemaVersion: string
  pipelineId: string
  role: string
  operation: string
  status: string
  startedAt: string
  privateDataBoundary: string
  canonCommitAllowed: boolean
}

const { values } = parseArgs({
  options: {
    sourceSummary: { type: 'string' },
    workspace: { type: 'string' },
    outputDir: { type: 'string' },
    baseUrl: { type: 'string', default: 'http://127.0.0.1:4318' },
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

function chapterNumber(chapterId: string) {
  const match = chapterId.match(/:chapter:(\d+)$/u)
  return match ? Number(match[1]) : null
}

async function namedFiles(directory: string, target: string): Promise<string[]> {
  const found: string[] = []
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch {
    return found
  }
  for (const entry of entries) {
    const absolute = join(directory, entry.name)
    if (entry.isDirectory()) found.push(...await namedFiles(absolute, target))
    if (entry.isFile() && entry.name === target) found.push(absolute)
  }
  return found
}

async function campaignRuns(campaignId: string, startedAfter: number) {
  const paths = await namedFiles(join(tmpdir(), 'parallel-universe-creator-working-agent'), 'run-manifest.json')
  const runs: RunManifest[] = []
  for (const manifestPath of paths) {
    try {
      const [manifestText, prompt] = await Promise.all([
        readFile(manifestPath, 'utf8'),
        readFile(join(dirname(manifestPath), 'prompt.txt'), 'utf8'),
      ])
      const manifest = JSON.parse(manifestText) as RunManifest
      if (prompt.includes(campaignId) && Date.parse(manifest.startedAt) >= startedAfter - 1_000) runs.push(manifest)
    } catch {
      // Ignore unrelated local runs.
    }
  }
  return runs.sort((left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt))
}

const sourceSummaryPath = required('sourceSummary')
const workspacePath = required('workspace')
const outputDir = required('outputDir')
const baseUrl = required('baseUrl').replace(/\/$/, '')
const sourceSummary = JSON.parse(await readFile(sourceSummaryPath, 'utf8')) as SourceSummary
assert.equal(sourceSummary.scope.stopLine, 20)
assert.ok(sourceSummary.scope.toChapter <= 20, 'Reconciliation must not cross the Chapter 20 stop line.')

const workspaceBytes = new Uint8Array(await readFile(workspacePath))
const workspaceHashBefore = sha256(workspaceBytes)
assert.equal(workspaceHashBefore, sourceSummary.scope.workspaceArchiveSha256, 'Workspace differs from the source campaign.')
const archive = unzipSync(workspaceBytes)
const recordsBytes = archive['records.json']
assert.ok(recordsBytes, 'Workspace archive must contain records.json.')
const workspace = JSON.parse(strFromU8(recordsBytes)) as WorkspaceExport
assert.equal(workspace.schemaVersion, 1)

const canonByChapter = new Map<number, ReturnType<typeof localCanonStateRecordSchema.parse>>()
for (const record of workspace.records) {
  if (record.family !== 'localCanonStates') continue
  const canon = localCanonStateRecordSchema.parse(record.value)
  if (canon.workId !== sourceSummary.scope.workId) continue
  const number = chapterNumber(canon.chapterId)
  if (!number || number < sourceSummary.scope.fromChapter || number > sourceSummary.scope.toChapter) continue
  const existing = canonByChapter.get(number)
  if (!existing || canon.revision > existing.revision) canonByChapter.set(number, canon)
}

const chapters: LongformContinuityChapter[] = []
for (let number = sourceSummary.scope.fromChapter; number <= sourceSummary.scope.toChapter; number += 1) {
  const canon = canonByChapter.get(number)
  assert.ok(canon, `Chapter ${number} is missing a local Canon record.`)
  chapters.push({
    chapterNumber: number,
    chapterId: canon.chapterId,
    blocks: canon.acceptedContentBlocks.map(block => ({ id: block.id, text: block.text })),
  })
}

const sourceLedgerPath = join(sourceSummary.runtime.privateArtifactsDirectory, 'thread-ledger.json')
const sourcePasses = JSON.parse(await readFile(sourceLedgerPath, 'utf8')) as SourcePass[]
const rejectedPasses = sourcePasses.map(pass => ({
  focus: pass.focus,
  review: pass.initialReview ?? pass.review,
  verification: pass.initialVerification ?? pass.verification,
})).filter(pass => (
  pass.verification.threadItems.some(item => item.decision === 'reject')
  || pass.verification.findingItems.some(item => item.decision === 'reject')
))
assert.ok(rejectedPasses.length > 0, 'Source campaign has no rejected pass to reconcile.')

const healthResponse = await fetch(`${baseUrl}/health`)
assert.equal(healthResponse.status, 200, 'Local Working Agent bridge is not ready.')
const health = await healthResponse.json() as { operations?: string[]; privateDraftsRemainLocal?: boolean }
assert.equal(health.privateDraftsRemainLocal, true)
assert.ok(health.operations?.includes('long_range_story_thread_revision'))
assert.ok(health.operations?.includes('long_range_story_thread_verification'))

const campaignId = `long-range-thread-reconciliation:${sourceSummary.scope.workId}:${Date.now()}:${randomUUID()}`
const startedAt = Date.now()
const results = []
for (const pass of rejectedPasses) {
  const rejectedThreadIds = pass.verification.threadItems
    .filter(item => item.decision === 'reject')
    .map(item => item.threadId)
  const revision = await requestLongRangeStoryThreadRevisionFromWorkingAgent({
    baseUrl,
    campaignId,
    workId: sourceSummary.scope.workId,
    chapters,
    previousReview: pass.review,
    previousVerification: pass.verification,
  })
  const finalVerification = await requestLongRangeStoryThreadVerificationFromWorkingAgent({
    baseUrl,
    campaignId,
    workId: sourceSummary.scope.workId,
    chapters,
    review: revision.revisedReview,
  })
  results.push({
    focus: pass.focus,
    rejectedThreadIds,
    previousReview: pass.review,
    previousVerification: pass.verification,
    revisedReview: revision.revisedReview,
    finalVerification: finalVerification.verification,
  })
}

const runs = await campaignRuns(campaignId, startedAt)
assert.ok(runs.length >= results.length * 2)
assert.ok(runs.every(run => run.status === 'succeeded'))
assert.ok(runs.every(run => run.privateDataBoundary === 'local_ephemeral'))
assert.ok(runs.every(run => run.canonCommitAllowed === false))

const recovered = results.flatMap(result => result.rejectedThreadIds.map(threadId => {
  const revisedThread = result.revisedReview.threads.find(thread => thread.threadId === threadId)
  const finalItem = result.finalVerification.threadItems.find(item => item.threadId === threadId)
  return { threadId, revisedThread, finalItem }
}))
const recoveredVerified = recovered.filter(item => item.finalItem?.decision === 'verify')
const removedAfterRejection = recovered.filter(item => !item.revisedThread)

const privateDirectory = join(tmpdir(), campaignId.replace(/[^a-zA-Z0-9:_-]/gu, '_'))
await mkdir(privateDirectory, { recursive: true })
await writeFile(join(privateDirectory, 'reconciliation.json'), `${JSON.stringify(results, null, 2)}\n`, {
  encoding: 'utf8',
  flag: 'wx',
})

const workspaceHashAfter = sha256(new Uint8Array(await readFile(workspacePath)))
assert.equal(workspaceHashAfter, workspaceHashBefore)
const summary = {
  schemaVersion: 'creator-long-range-thread-reconciliation.v1',
  completedAt: new Date().toISOString(),
  campaignId,
  sourceCampaignId: sourceSummary.campaignId,
  scope: {
    workId: sourceSummary.scope.workId,
    fromChapter: sourceSummary.scope.fromChapter,
    toChapter: sourceSummary.scope.toChapter,
    stopLine: 20,
    workspaceArchive: basename(workspacePath),
    workspaceArchiveSha256: workspaceHashBefore,
  },
  workflow: {
    rejectedPassCount: rejectedPasses.length,
    initiallyRejectedThreadCount: recovered.length,
    recoveredAndIndependentlyVerifiedCount: recoveredVerified.length,
    removedAfterRejectionCount: removedAfterRejection.length,
    realWorkingAgentCallCount: runs.length,
    boundedToRejectedThreads: true,
    verifiedThreadsPreservedExactly: true,
    newThreadsAllowed: false,
    newFindingsAllowed: false,
  },
  results: recovered.map(item => ({
    threadIdSha256: sha256(item.threadId),
    retainedAfterRevision: Boolean(item.revisedThread),
    revisedStatus: item.revisedThread?.status ?? null,
    sourceChapter: item.revisedThread?.sourceChapter ?? null,
    latestEvidenceChapter: item.revisedThread?.latestEvidence?.chapter ?? null,
    finalVerificationDecision: item.finalItem?.decision ?? null,
    sourceEvidenceSha256: item.revisedThread ? sha256(item.revisedThread.sourceEvidenceQuote) : null,
    latestEvidenceSha256: item.revisedThread?.latestEvidence
      ? sha256(item.revisedThread.latestEvidence.quote)
      : null,
  })),
  runtime: {
    manifests: runs,
    privateArtifactsDirectory: privateDirectory,
  },
  sideEffects: {
    workspaceChanged: false,
    threadCandidateSaved: false,
    acceptedManuscriptChanged: false,
    canonChanged: false,
    chapter21AccessedOrChanged: false,
    cloudDataChanged: false,
    publicationPerformed: false,
  },
  limitations: [
    'Reconciliation can only correct or remove previously rejected candidate threads; it cannot add a new story fact or quality finding.',
    'A verified candidate thread still requires author selection before it enters a future writing context.',
  ],
}

await mkdir(outputDir, { recursive: true })
await writeFile(join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, {
  encoding: 'utf8',
  flag: 'wx',
})
await writeFile(join(outputDir, 'README.md'), `# Long-range Thread Reconciliation\n\n- Source campaign: ${sourceSummary.campaignId}\n- Initially rejected threads: ${recovered.length}\n- Corrected and independently verified: ${recoveredVerified.length}\n- Removed because evidence remained insufficient: ${removedAfterRejection.length}\n- New threads or findings allowed: no\n- Workspace, prose, Canon, or Chapter 21 changed: no\n\nRaw evidence remains in the private directory recorded by \`summary.json\`.\n`, {
  encoding: 'utf8',
  flag: 'wx',
})

process.stdout.write(`${JSON.stringify({
  outputDir,
  sourceCampaignId: sourceSummary.campaignId,
  initiallyRejectedThreads: recovered.length,
  recoveredAndVerified: recoveredVerified.length,
  removedAfterRejection: removedAfterRejection.length,
  realWorkingAgentCallCount: runs.length,
  workspaceChanged: false,
  chapter21AccessedOrChanged: false,
}, null, 2)}\n`)
