import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseArgs } from 'node:util'
import { strFromU8, unzipSync } from 'fflate'
import {
  requestLongRangeStoryThreadReviewFromWorkingAgent,
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

const focusDimensions = {
  causal_state: ['causal_debt', 'character_knowledge', 'timeline_anchor'],
  promise_arc: ['promise', 'foreshadowing', 'character_arc'],
} as const

type Focus = keyof typeof focusDimensions

const { values } = parseArgs({
  options: {
    workspace: { type: 'string' },
    outputDir: { type: 'string' },
    work: { type: 'string' },
    from: { type: 'string', default: '1' },
    to: { type: 'string', default: '20' },
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

function visibleLength(blocks: Array<{ text: string }>) {
  return Array.from(blocks.map(block => block.text).join('\n'))
    .filter(character => !/\s/u.test(character))
    .length
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
  const logRoot = join(tmpdir(), 'parallel-universe-creator-working-agent')
  const manifestPaths = await namedFiles(logRoot, 'run-manifest.json')
  const runs: Array<{ manifest: RunManifest; directory: string }> = []
  for (const manifestPath of manifestPaths) {
    try {
      const directory = dirname(manifestPath)
      const [manifestText, prompt] = await Promise.all([
        readFile(manifestPath, 'utf8'),
        readFile(join(directory, 'prompt.txt'), 'utf8'),
      ])
      const manifest = JSON.parse(manifestText) as RunManifest
      if (prompt.includes(campaignId) && Date.parse(manifest.startedAt) >= startedAfter - 1_000) {
        runs.push({ manifest, directory })
      }
    } catch {
      // Ignore unrelated or interrupted local runs.
    }
  }
  runs.sort((left, right) => Date.parse(left.manifest.startedAt) - Date.parse(right.manifest.startedAt))
  return runs
}

const workspacePath = required('workspace')
const outputDir = required('outputDir')
const workId = required('work')
const fromChapter = Number(values.from)
const toChapter = Number(values.to)
const baseUrl = required('baseUrl').replace(/\/$/, '')
assert.ok(Number.isInteger(fromChapter) && fromChapter >= 1, '--from must be a positive integer.')
assert.ok(Number.isInteger(toChapter) && toChapter >= fromChapter + 2, '--to must leave room for a non-adjacent thread.')
assert.ok(toChapter <= 20, 'The long-range thread campaign must not cross the Chapter 20 stop line.')

const workspaceBytes = new Uint8Array(await readFile(workspacePath))
const workspaceHashBefore = sha256(workspaceBytes)
const archive = unzipSync(workspaceBytes)
const recordsBytes = archive['records.json']
assert.ok(recordsBytes, 'Workspace archive must contain records.json.')
const workspace = JSON.parse(strFromU8(recordsBytes)) as WorkspaceExport
assert.equal(workspace.schemaVersion, 1)
assert.ok(Array.isArray(workspace.records))

const canonByChapter = new Map<number, ReturnType<typeof localCanonStateRecordSchema.parse>>()
for (const record of workspace.records) {
  if (record.family !== 'localCanonStates') continue
  const canon = localCanonStateRecordSchema.parse(record.value)
  if (canon.workId !== workId) continue
  const number = chapterNumber(canon.chapterId)
  if (!number || number < fromChapter || number > toChapter) continue
  const existing = canonByChapter.get(number)
  if (!existing || canon.revision > existing.revision) canonByChapter.set(number, canon)
}

const chapters: LongformContinuityChapter[] = []
for (let number = fromChapter; number <= toChapter; number += 1) {
  const canon = canonByChapter.get(number)
  assert.ok(canon, `Chapter ${number} is missing a local Canon record.`)
  assert.ok(canon.acceptedDraftRevision > 0, `Chapter ${number} has no accepted draft revision.`)
  assert.ok(canon.acceptedContentBlocks.length > 0, `Chapter ${number} has no accepted manuscript.`)
  chapters.push({
    chapterNumber: number,
    chapterId: canon.chapterId,
    blocks: canon.acceptedContentBlocks.map(block => ({ id: block.id, text: block.text })),
  })
}

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
assert.ok(health.operations?.includes('long_range_story_thread_review'))
assert.ok(health.operations?.includes('long_range_story_thread_revision'))
assert.ok(health.operations?.includes('long_range_story_thread_verification'))
assert.equal(health.roleRuntime?.find(role => role.role === 'Observer')?.status, 'wired')
assert.equal(health.roleRuntime?.find(role => role.role === 'Auditor')?.status, 'wired')

const campaignId = `long-range-story-thread:${workId}:${fromChapter}-${toChapter}:${Date.now()}:${randomUUID()}`
const startedAt = Date.now()
const passResults: Array<{
  focus: Focus
  initialReview: LongRangeStoryThreadReview
  initialVerification: LongRangeStoryThreadVerification
  review: LongRangeStoryThreadReview
  verification: LongRangeStoryThreadVerification
  revisionApplied: boolean
  locatedThreads: Array<{ threadId: string; sourceBlockId: string; latestEvidenceBlockId: string | null }>
  locatedFindings: Array<{ findingIndex: number; sourceBlockId: string; targetBlockId: string }>
  verifiedLocatedThreads: Array<{ threadId: string; sourceBlockId: string; latestEvidenceBlockId: string | null }>
  verifiedLocatedFindings: Array<{ findingIndex: number; sourceBlockId: string; targetBlockId: string }>
}> = []

for (const focus of Object.keys(focusDimensions) as Focus[]) {
  let reviewResult = await requestLongRangeStoryThreadReviewFromWorkingAgent({
    baseUrl,
    campaignId,
    workId,
    focus,
    chapters,
  })
  let verificationResult = await requestLongRangeStoryThreadVerificationFromWorkingAgent({
    baseUrl,
    campaignId,
    workId,
    chapters,
    review: reviewResult.review,
  })
  const initialReview = reviewResult.review
  const initialVerification = verificationResult.verification
  const needsRevision = (
    initialVerification.threadItems.some(item => item.decision === 'reject')
    || initialVerification.findingItems.some(item => item.decision === 'reject')
  )
  if (needsRevision) {
    const revisionResult = await requestLongRangeStoryThreadRevisionFromWorkingAgent({
      baseUrl,
      campaignId,
      workId,
      chapters,
      previousReview: initialReview,
      previousVerification: initialVerification,
    })
    reviewResult = {
      review: revisionResult.revisedReview,
      locatedThreads: revisionResult.locatedThreads,
      locatedFindings: revisionResult.locatedFindings,
    }
    verificationResult = await requestLongRangeStoryThreadVerificationFromWorkingAgent({
      baseUrl,
      campaignId,
      workId,
      chapters,
      review: revisionResult.revisedReview,
    })
  }
  passResults.push({
    focus,
    initialReview,
    initialVerification,
    review: reviewResult.review,
    verification: verificationResult.verification,
    revisionApplied: needsRevision,
    locatedThreads: reviewResult.locatedThreads,
    locatedFindings: reviewResult.locatedFindings,
    verifiedLocatedThreads: verificationResult.locatedThreads,
    verifiedLocatedFindings: verificationResult.locatedFindings,
  })
}

const runs = await campaignRuns(campaignId, startedAt)
assert.ok(runs.length >= passResults.length * 2, 'Each thread pass needs Observer and independent Auditor manifests.')
for (const run of runs) {
  assert.equal(run.manifest.schemaVersion, 'creator-working-agent-run.v1')
  assert.equal(run.manifest.status, 'succeeded')
  assert.equal(run.manifest.privateDataBoundary, 'local_ephemeral')
  assert.equal(run.manifest.canonCommitAllowed, false)
  assert.ok(
    run.manifest.operation === 'long_range_story_thread_review'
      || run.manifest.operation === 'long_range_story_thread_review:schema_repair'
      || run.manifest.operation === 'long_range_story_thread_revision'
      || run.manifest.operation === 'long_range_story_thread_revision:schema_repair'
      || run.manifest.operation === 'long_range_story_thread_verification'
      || run.manifest.operation === 'long_range_story_thread_verification:schema_repair',
  )
}

const expectedChapterNumbers = Array.from(
  { length: toChapter - fromChapter + 1 },
  (_, index) => fromChapter + index,
)
for (const result of passResults) {
  assert.deepEqual(result.review.inspectedChapterNumbers, expectedChapterNumbers)
  assert.deepEqual(result.review.inspectedDimensions, [...focusDimensions[result.focus]])
  assert.equal(result.locatedThreads.length, result.review.threads.length)
  assert.equal(result.locatedFindings.length, result.review.findings.length)
  assert.equal(result.verifiedLocatedThreads.length, result.verification.threadItems.length)
  assert.equal(result.verifiedLocatedFindings.length, result.verification.findingItems.length)
}

const threadResults = passResults.flatMap(result => result.review.threads.map(thread => ({
  focus: result.focus,
  thread,
  verification: result.verification.threadItems.find(item => item.threadId === thread.threadId),
})))
assert.ok(threadResults.every(item => item.verification), 'Every long-range thread needs independent verification.')
const findingResults = passResults.flatMap(result => result.review.findings.map((finding, findingIndex) => ({
  focus: result.focus,
  finding,
  verification: result.verification.findingItems.find(item => item.findingIndex === findingIndex),
})))
assert.ok(findingResults.every(item => item.verification), 'Every long-range finding needs independent verification.')

const initiallyRejectedThreadCount = passResults.reduce((count, result) => (
  count + result.initialVerification.threadItems.filter(item => item.decision === 'reject').length
), 0)
const initiallyRejectedFindingCount = passResults.reduce((count, result) => (
  count + result.initialVerification.findingItems.filter(item => item.decision === 'reject').length
), 0)
const initialObservedThreadCount = passResults.reduce((count, result) => (
  count + result.initialReview.threads.length
), 0)
const initialObservedFindingCount = passResults.reduce((count, result) => (
  count + result.initialReview.findings.length
), 0)

const verifiedThreads = threadResults.filter(item => item.verification?.decision === 'verify')
const rejectedThreads = threadResults.filter(item => item.verification?.decision === 'reject')
const verifiedFindings = findingResults.filter(item => item.verification?.decision === 'verify')
const rejectedFindings = findingResults.filter(item => item.verification?.decision === 'reject')
const repairEligibleFindings = verifiedFindings.filter(item => (
  item.verification?.confirmedSeverity === 'hard_block'
  || item.verification?.confirmedSeverity === 'revision_candidate'
))
const statusCounts = Object.fromEntries(
  ['active', 'progressed', 'fulfilled', 'broken'].map(status => [
    status,
    threadResults.filter(item => item.thread.status === status).length,
  ]),
)
const dimensionCounts = Object.fromEntries(
  Object.values(focusDimensions).flat().map(dimension => [
    dimension,
    threadResults.filter(item => item.thread.dimension === dimension).length,
  ]),
)

const privateDirectory = join(tmpdir(), campaignId.replace(/[^a-zA-Z0-9:_-]/gu, '_'))
await mkdir(privateDirectory, { recursive: true })
await writeFile(join(privateDirectory, 'thread-ledger.json'), `${JSON.stringify(passResults, null, 2)}\n`, {
  encoding: 'utf8',
  flag: 'wx',
})

const workspaceHashAfter = sha256(new Uint8Array(await readFile(workspacePath)))
assert.equal(workspaceHashAfter, workspaceHashBefore, 'The read-only thread campaign changed its workspace input.')
const completedAt = new Date().toISOString()
const summary = {
  schemaVersion: 'creator-long-range-story-thread-campaign.v1',
  campaignId,
  completedAt,
  scope: {
    workId,
    fromChapter,
    toChapter,
    stopLine: 20,
    chapterCount: chapters.length,
    workspaceArchive: basename(workspacePath),
    workspaceArchiveSha256: workspaceHashBefore,
  },
  manuscriptInventory: chapters.map(chapter => ({
    chapter: chapter.chapterNumber,
    acceptedBlockCount: chapter.blocks.length,
    visibleLength: visibleLength(chapter.blocks),
    manuscriptSha256: sha256(chapter.blocks.map(block => block.text).join('\n')),
  })),
  workflow: {
    passes: (Object.keys(focusDimensions) as Focus[]).map(focus => ({
      focus,
      dimensions: focusDimensions[focus],
      inspectedChapterNumbers: expectedChapterNumbers,
    })),
    operation: 'Observer review -> Auditor verification -> bounded Observer revision when rejected -> Auditor re-verification',
    realWorkingAgentCallCount: runs.length,
    observerCallCount: runs.filter(run => run.manifest.role === 'Observer').length,
    independentAuditorCallCount: runs.filter(run => run.manifest.role === 'Auditor').length,
    boundedRevisionPassCount: passResults.filter(result => result.revisionApplied).length,
    schemaRepairCount: runs.filter(run => run.manifest.role === 'Normalizer').length,
    everyPassInspectedEveryChapter: passResults.every(result => (
      JSON.stringify(result.review.inspectedChapterNumbers) === JSON.stringify(expectedChapterNumbers)
    )),
    everyThreadHasLocatedSourceEvidence: passResults.every(result => (
      result.locatedThreads.length === result.review.threads.length
    )),
    everyNonActiveThreadHasLocatedLaterEvidence: passResults.every(result => result.review.threads.every(thread => (
      thread.status === 'active' || thread.latestEvidence !== null
    ))),
    everyThreadIndependentlyAccountedFor: threadResults.every(item => Boolean(item.verification)),
    everyFindingHasLocatedDualEvidence: passResults.every(result => (
      result.locatedFindings.length === result.review.findings.length
    )),
    everyFindingIndependentlyAccountedFor: findingResults.every(item => Boolean(item.verification)),
    compositeLiteraryScoreUsed: false,
    customRagUsed: false,
  },
  results: {
    initiallyRejectedThreadCount,
    initiallyRejectedFindingCount,
    initialThreadCount: initialObservedThreadCount,
    finalThreadCount: threadResults.length,
    verifiedThreadCount: verifiedThreads.length,
    rejectedThreadCount: rejectedThreads.length,
    activeRecallCandidateCount: verifiedThreads.filter(item => item.thread.status === 'active').length,
    initialFindingCount: initialObservedFindingCount,
    finalFindingCount: findingResults.length,
    verifiedFindingCount: verifiedFindings.length,
    rejectedFindingCount: rejectedFindings.length,
    repairEligibleFindingCount: repairEligibleFindings.length,
    statusCounts,
    dimensionCounts,
    threads: threadResults.map(item => ({
      threadIdSha256: sha256(item.thread.threadId),
      focus: item.focus,
      dimension: item.thread.dimension,
      status: item.thread.status,
      sourceChapter: item.thread.sourceChapter,
      latestEvidenceChapter: item.thread.latestEvidence?.chapter ?? null,
      confidence: item.thread.confidence,
      verificationDecision: item.verification!.decision,
      confirmedStatus: item.verification!.confirmedStatus,
      sourceEvidenceSha256: sha256(item.thread.sourceEvidenceQuote),
      latestEvidenceSha256: item.thread.latestEvidence ? sha256(item.thread.latestEvidence.quote) : null,
    })),
    findings: findingResults.map((item, index) => ({
      index,
      threadIdSha256: sha256(item.finding.threadId),
      focus: item.focus,
      dimension: item.finding.dimension,
      severity: item.finding.severity,
      sourceChapter: item.finding.sourceChapter,
      targetChapter: item.finding.targetChapter,
      repairTargetChapter: item.finding.repairTargetChapter,
      confidence: item.finding.confidence,
      verificationDecision: item.verification!.decision,
      confirmedSeverity: item.verification!.confirmedSeverity,
      sourceEvidenceSha256: sha256(item.finding.sourceEvidenceQuote),
      targetEvidenceSha256: sha256(item.finding.targetEvidenceQuote),
    })),
  },
  runtime: {
    manifests: runs.map(run => run.manifest),
    privateArtifactsDirectory: privateDirectory,
  },
  sideEffects: {
    workspaceChanged: false,
    acceptedManuscriptChanged: false,
    threadCandidateSaved: false,
    repairCandidateAdopted: false,
    canonChanged: false,
    chapter21AccessedOrChanged: false,
    cloudDataChanged: false,
    publicationPerformed: false,
  },
  privacy: {
    manuscriptTextCopiedIntoRepositoryEvidence: false,
    evidenceQuotesCopiedIntoRepositoryEvidence: false,
    threadLabelsCopiedIntoRepositoryEvidence: false,
    repositoryEvidenceUsesHashesOnly: true,
  },
  limitations: [
    'An active thread is a medium/low-confidence recall candidate, not proof that the author forgot it.',
    'This campaign covers six long-range dimensions across accepted Chapters 1-20, but it is not expert-panel or reader-retention evidence.',
    'Only independently verified hard-block or revision-candidate findings may enter a later local repair trial; no repair is adopted here.',
  ],
}

await mkdir(outputDir, { recursive: true })
await writeFile(join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, {
  encoding: 'utf8',
  flag: 'wx',
})
await writeFile(join(outputDir, 'README.md'), `# Chapter 1-20 Long-range Story Thread Campaign\n\n- Completed: ${completedAt}\n- Scope: accepted local Chapters ${fromChapter}-${toChapter}\n- Full-corpus passes: 2\n- Dimensions: causal debt, character knowledge, timeline, promise, foreshadowing, character arc\n- Initially observed threads: ${initialObservedThreadCount}\n- Initially rejected threads: ${initiallyRejectedThreadCount}\n- Bounded revision passes: ${passResults.filter(result => result.revisionApplied).length}\n- Final independently verified threads: ${verifiedThreads.length}\n- Active author-recall candidates: ${verifiedThreads.filter(item => item.thread.status === 'active').length}\n- Initially located findings: ${initialObservedFindingCount}\n- Final independently verified findings: ${verifiedFindings.length}\n- Repair-eligible verified findings: ${repairEligibleFindings.length}\n- Composite literary score: not used\n- Custom RAG: not used\n- Accepted prose, local memory, or Canon changed: no\n- Chapter 21 accessed or changed: no\n\nRaw manuscripts, quotes, labels, reviews, and candidate thread cards remain in the private temporary directory recorded by \`summary.json\`.\n`, {
  encoding: 'utf8',
  flag: 'wx',
})

process.stdout.write(`${JSON.stringify({
  outputDir,
  campaignId,
  chapters: chapters.length,
  passes: passResults.length,
  dimensions: Object.values(focusDimensions).flat(),
  initialThreads: initialObservedThreadCount,
  finalThreads: threadResults.length,
  initiallyRejectedThreads: initiallyRejectedThreadCount,
  verifiedThreads: verifiedThreads.length,
  rejectedThreads: rejectedThreads.length,
  activeRecallCandidates: verifiedThreads.filter(item => item.thread.status === 'active').length,
  initialFindings: initialObservedFindingCount,
  finalFindings: findingResults.length,
  verifiedFindings: verifiedFindings.length,
  rejectedFindings: rejectedFindings.length,
  repairEligibleFindings: repairEligibleFindings.length,
  realWorkingAgentCallCount: runs.length,
  boundedRevisionPassCount: passResults.filter(result => result.revisionApplied).length,
  workspaceChanged: false,
  chapter21AccessedOrChanged: false,
}, null, 2)}\n`)
