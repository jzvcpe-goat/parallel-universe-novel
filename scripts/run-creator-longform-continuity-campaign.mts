import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseArgs } from 'node:util'
import { strFromU8, unzipSync } from 'fflate'
import {
  requestLongformContinuityReviewFromWorkingAgent,
  requestLongformContinuityVerificationFromWorkingAgent,
} from '../app/src/features/creator-decision/localWorkingAgent'
import {
  localCanonStateRecordSchema,
} from '../app/src/features/creator-decision/schemas'
import type {
  LongformContinuityChapter,
  LongformContinuityReview,
  LongformContinuityVerification,
} from '../app/src/features/creator-decision/longformContinuity'

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

function windowsForRange(fromChapter: number, toChapter: number) {
  const windows: Array<{ start: number; end: number }> = []
  let start = fromChapter
  while (start < toChapter) {
    const end = Math.min(start + 5, toChapter)
    windows.push({ start, end })
    start = end
  }
  return windows
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
      if (
        prompt.includes(campaignId)
        && Date.parse(manifest.startedAt) >= startedAfter - 1_000
      ) {
        runs.push({ manifest, directory })
      }
    } catch {
      // Ignore unrelated incomplete local runs.
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
assert.ok(Number.isInteger(toChapter) && toChapter >= fromChapter, '--to must be at least --from.')
assert.ok(toChapter <= 20, 'The continuity campaign must not cross the Chapter 20 stop line.')
assert.ok(toChapter > fromChapter, 'The continuity campaign needs at least two chapters.')

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
assert.ok(health.operations?.includes('longform_continuity_review'))
assert.ok(health.operations?.includes('longform_continuity_verification'))
assert.equal(health.roleRuntime?.find(role => role.role === 'Auditor')?.status, 'wired')

const campaignId = `longform-continuity:${workId}:${fromChapter}-${toChapter}:${Date.now()}:${randomUUID()}`
const startedAt = Date.now()
const windowResults: Array<{
  start: number
  end: number
  review: LongformContinuityReview
  locatedFindings: Array<{ findingIndex: number; sourceBlockId: string; targetBlockId: string }>
  verification: LongformContinuityVerification
  locatedItems: Array<{ findingIndex: number; sourceBlockId: string; targetBlockId: string }>
}> = []
for (const window of windowsForRange(fromChapter, toChapter)) {
  const windowChapters = chapters.filter(chapter => (
    chapter.chapterNumber >= window.start && chapter.chapterNumber <= window.end
  ))
  const result = await requestLongformContinuityReviewFromWorkingAgent({
    baseUrl,
    campaignId,
    workId,
    chapters: windowChapters,
  })
  const verificationResult = await requestLongformContinuityVerificationFromWorkingAgent({
    baseUrl,
    campaignId,
    workId,
    chapters: windowChapters,
    review: result.review,
  })
  windowResults.push({ ...window, ...result, ...verificationResult })
}

const runs = await campaignRuns(campaignId, startedAt)
assert.ok(runs.length >= windowResults.length, 'Every continuity window must have a local role manifest.')
assert.ok(runs.some(run => run.manifest.role === 'Auditor'))
for (const run of runs) {
  assert.equal(run.manifest.schemaVersion, 'creator-working-agent-run.v1')
  assert.equal(run.manifest.status, 'succeeded')
  assert.equal(run.manifest.privateDataBoundary, 'local_ephemeral')
  assert.equal(run.manifest.canonCommitAllowed, false)
  assert.ok(
    run.manifest.operation === 'longform_continuity_review'
      || run.manifest.operation === 'longform_continuity_review:schema_repair'
      || run.manifest.operation === 'longform_continuity_verification'
      || run.manifest.operation === 'longform_continuity_verification:schema_repair',
  )
}

const transitionKeys = windowResults.flatMap(result => (
  result.review.inspectedTransitions.map(transition => `${transition.fromChapter}-${transition.toChapter}`)
))
const expectedTransitionKeys = Array.from(
  { length: toChapter - fromChapter },
  (_, index) => `${fromChapter + index}-${fromChapter + index + 1}`,
)
assert.deepEqual(transitionKeys, expectedTransitionKeys)

const allFindings = windowResults.flatMap(result => result.review.findings)
const allLocatedFindings = windowResults.flatMap(result => result.locatedFindings)
assert.equal(allLocatedFindings.length, allFindings.length)
const findingVerifications = windowResults.flatMap(result => result.review.findings.map((finding, findingIndex) => ({
  finding,
  verification: result.verification.items.find(item => item.findingIndex === findingIndex),
})))
assert.ok(findingVerifications.every(item => item.verification), 'Every continuity finding needs independent verification.')
const verifiedFindings = findingVerifications.filter(item => item.verification?.decision === 'verify')
const rejectedFindings = findingVerifications.filter(item => item.verification?.decision === 'reject')
const repairEligibleFindings = verifiedFindings.filter(item => (
  item.verification?.confirmedSeverity === 'hard_block'
  || item.verification?.confirmedSeverity === 'revision_candidate'
))
const severityCounts = Object.fromEntries(
  ['hard_block', 'revision_candidate', 'watch'].map(severity => [
    severity,
    allFindings.filter(finding => finding.severity === severity).length,
  ]),
)
const dimensionCounts = Object.fromEntries(
  Array.from(new Set(allFindings.map(finding => finding.dimension)))
    .sort()
    .map(dimension => [dimension, allFindings.filter(finding => finding.dimension === dimension).length]),
)
const statusCounts = Object.fromEntries(
  ['pass', 'needs_revision', 'blocked'].map(status => [
    status,
    windowResults.flatMap(result => result.review.inspectedTransitions)
      .filter(transition => transition.status === status).length,
  ]),
)

const privateDirectory = join(tmpdir(), campaignId.replace(/[^a-zA-Z0-9:_-]/gu, '_'))
await mkdir(privateDirectory, { recursive: true })
await writeFile(join(privateDirectory, 'reviews.json'), `${JSON.stringify(windowResults.map(result => ({
  windowStart: result.start,
  windowEnd: result.end,
  review: result.review,
  locatedFindings: result.locatedFindings,
  verification: result.verification,
  locatedVerificationItems: result.locatedItems,
})), null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })

const workspaceHashAfter = sha256(new Uint8Array(await readFile(workspacePath)))
assert.equal(workspaceHashAfter, workspaceHashBefore, 'The read-only campaign changed its workspace input.')
const completedAt = new Date().toISOString()
const summary = {
  schemaVersion: 'creator-longform-continuity-campaign.v1',
  campaignId,
  completedAt,
  scope: {
    workId,
    fromChapter,
    toChapter,
    stopLine: 20,
    chapterCount: chapters.length,
    transitionCount: expectedTransitionKeys.length,
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
    role: 'Auditor',
    operation: 'longform_continuity_review -> longform_continuity_verification',
    windowCount: windowResults.length,
    realWorkingAgentCallCount: runs.length,
    independentVerificationCallCount: runs.filter(run => (
      run.manifest.operation === 'longform_continuity_verification'
    )).length,
    schemaRepairCount: runs.filter(run => run.manifest.role === 'Normalizer').length,
    inspectedEveryAdjacentTransition: true,
    everyFindingHasTwoLocatedChapterEvidenceQuotes: allLocatedFindings.length === allFindings.length,
    everyFindingIndependentlyAccountedFor: findingVerifications.every(item => Boolean(item.verification)),
    compositeLiteraryScoreUsed: false,
  },
  results: {
    initialFindingCount: allFindings.length,
    verifiedFindingCount: verifiedFindings.length,
    rejectedFindingCount: rejectedFindings.length,
    repairEligibleFindingCount: repairEligibleFindings.length,
    severityCounts,
    dimensionCounts,
    transitionStatusCounts: statusCounts,
    findings: findingVerifications.map(({ finding, verification }, index) => ({
      index,
      dimension: finding.dimension,
      severity: finding.severity,
      fromChapter: finding.fromChapter,
      toChapter: finding.toChapter,
      repairTargetChapter: finding.repairTargetChapter,
      confidence: finding.confidence,
      verificationDecision: verification!.decision,
      confirmedSeverity: verification!.confirmedSeverity,
      sourceEvidenceSha256: sha256(finding.sourceEvidenceQuote),
      targetEvidenceSha256: sha256(finding.targetEvidenceQuote),
    })),
  },
  runtime: {
    manifests: runs.map(run => run.manifest),
    privateArtifactsDirectory: privateDirectory,
  },
  sideEffects: {
    workspaceChanged: false,
    acceptedManuscriptChanged: false,
    repairCandidateAdopted: false,
    canonChanged: false,
    chapter21AccessedOrChanged: false,
    cloudDataChanged: false,
    publicationPerformed: false,
  },
  privacy: {
    manuscriptTextCopiedIntoRepositoryEvidence: false,
    evidenceQuotesCopiedIntoRepositoryEvidence: false,
    repositoryEvidenceUsesHashesOnly: true,
  },
  limitations: [
    'This campaign reviews adjacent Chapter 1-20 handoffs in bounded windows; it is not reader retention or expert-panel evidence.',
    'A located finding is a candidate for author review, not permission to rewrite accepted prose or Canon.',
    'Non-adjacent arc closure still depends on committed promise, foreshadowing, timeline, causal, and character-state records.',
  ],
}

await mkdir(outputDir, { recursive: true })
await writeFile(join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
await writeFile(join(outputDir, 'README.md'), `# Chapter 1-20 Continuity Campaign\n\n- Completed: ${completedAt}\n- Scope: accepted local Chapters ${fromChapter}-${toChapter}\n- Adjacent transitions inspected: ${expectedTransitionKeys.length}\n- Initial located findings: ${allFindings.length}\n- Independently verified findings: ${verifiedFindings.length}\n- Independently rejected findings: ${rejectedFindings.length}\n- Repair-eligible verified findings: ${repairEligibleFindings.length}\n- Every finding has exact evidence in both adjacent chapters: yes\n- Every finding received an independent second review: yes\n- Composite literary score: not used\n- Accepted prose or Canon changed: no\n- Chapter 21 accessed or changed: no\n\nThe repository summary stores hashes and counts only. Raw manuscripts, quotes, and model reviews remain in the private temporary directory recorded by \`summary.json\`.\n`, { encoding: 'utf8', flag: 'wx' })

process.stdout.write(`${JSON.stringify({
  outputDir,
  campaignId,
  chapters: chapters.length,
  transitions: expectedTransitionKeys.length,
  windows: windowResults.length,
  findings: allFindings.length,
  verifiedFindings: verifiedFindings.length,
  rejectedFindings: rejectedFindings.length,
  repairEligibleFindings: repairEligibleFindings.length,
  severityCounts,
  statusCounts,
  realWorkingAgentCallCount: runs.length,
  workspaceChanged: false,
  chapter21AccessedOrChanged: false,
}, null, 2)}\n`)
