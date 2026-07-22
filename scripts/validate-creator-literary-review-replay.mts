import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { modelFindings } from '../app/src/features/creator-decision/localWorkingAgent'
import { sceneDraftResultSchema } from '../app/src/features/creator-decision/schemas'
import { CreationDecisionError } from '../app/src/features/creator-decision/types'

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

interface ReplayPayload {
  session?: {
    id?: unknown
    workId?: unknown
    branchId?: unknown
    chapterId?: unknown
  }
  context?: {
    compilationPolicyVersion?: unknown
    sourceFingerprint?: unknown
    manualRecallItems?: unknown
  }
  draft?: unknown
}

const { values } = parseArgs({
  options: {
    'run-directory': { type: 'string' },
    chapter: { type: 'string' },
    output: { type: 'string' },
  },
  strict: true,
})

function required(name: 'run-directory' | 'chapter') {
  const value = values[name]
  if (!value) throw new Error(`Missing required --${name} argument.`)
  return value
}

function sha256(value: Uint8Array | string) {
  return createHash('sha256').update(value).digest('hex')
}

function chapterNumber(chapterId: unknown) {
  const match = /:chapter:(\d+)$/.exec(String(chapterId || ''))
  return match ? Number(match[1]) : null
}

const runDirectory = resolve(required('run-directory'))
const expectedChapter = Number(required('chapter'))
assert.ok(Number.isInteger(expectedChapter) && expectedChapter > 0, '--chapter must be a positive integer.')
assert.ok(expectedChapter <= 20, 'This replay must not cross the Chapter 20 stop line.')

const manifestBytes = await readFile(join(runDirectory, 'run-manifest.json'))
const promptBytes = await readFile(join(runDirectory, 'prompt.txt'))
const responseBytes = await readFile(join(runDirectory, 'response.json'))
const manifest = JSON.parse(manifestBytes.toString('utf8')) as RunManifest

assert.equal(manifest.schemaVersion, 'creator-working-agent-run.v1')
assert.equal(manifest.role, 'Auditor')
assert.equal(manifest.operation, 'literary_review')
assert.equal(manifest.status, 'succeeded')
assert.equal(manifest.privateDataBoundary, 'local_ephemeral')
assert.equal(manifest.canonCommitAllowed, false)

const prompt = promptBytes.toString('utf8')
const payloadMarker = '当前资料：'
const payloadStart = prompt.lastIndexOf(payloadMarker)
assert.notEqual(payloadStart, -1, 'Auditor prompt must contain its structured current-material payload.')
const payload = JSON.parse(prompt.slice(payloadStart + payloadMarker.length).trim()) as ReplayPayload
const draft = sceneDraftResultSchema.parse(payload.draft)
const actualChapter = chapterNumber(payload.session?.chapterId)
assert.equal(actualChapter, expectedChapter)
assert.equal(typeof payload.context?.compilationPolicyVersion, 'number')
assert.equal(typeof payload.context?.sourceFingerprint, 'string')
assert.ok(Array.isArray(payload.context?.manualRecallItems))

type RawLiteraryReview = Parameters<typeof modelFindings>[0]['result']
const response = JSON.parse(responseBytes.toString('utf8')) as RawLiteraryReview
assert.equal(response.schemaVersion, 'creator-literary-review.v1')
assert.ok(Array.isArray(response.findings) && response.findings.length > 0)

const mapped = modelFindings({ draft, result: response })
assert.equal(mapped.length, response.findings.length, 'Every returned finding must survive exact evidence mapping.')
assert.ok(mapped.every(finding => finding.evidence.length > 0), 'Every mapped finding must retain at least one locator.')

const tamperedResponse = structuredClone(response)
tamperedResponse.findings[0]!.evidenceQuote = `__missing-evidence:${sha256(response.findings[0]!.evidenceQuote)}`
let tamperErrorCode: string | null = null
try {
  modelFindings({ draft, result: tamperedResponse })
} catch (error) {
  if (error instanceof CreationDecisionError) tamperErrorCode = error.code
  else throw error
}
assert.equal(tamperErrorCode, 'evidence_missing', 'One unlocatable finding must reject the complete replay.')

const findingSummaries = mapped.map((finding, index) => ({
  dimension: finding.dimension,
  severity: finding.severity,
  evidenceLocatorCount: finding.evidence.length,
  protectedBlockCount: finding.protectedBlockIds.length,
  evidenceQuoteSha256: sha256(response.findings[index]!.evidenceQuote),
}))
const summary = {
  schemaVersion: 'creator-literary-review-replay.v1',
  capturedAt: new Date().toISOString(),
  pipelineId: manifest.pipelineId,
  chapter: actualChapter,
  draftId: draft.draftId,
  draftRevision: draft.revision,
  blockCount: draft.contentBlocks.length,
  manuscriptSha256: sha256(draft.contentBlocks.map(block => block.text).join('\n\n')),
  promptSha256: sha256(promptBytes),
  responseSha256: sha256(responseBytes),
  compilationPolicyVersion: payload.context!.compilationPolicyVersion,
  sourceFingerprint: payload.context!.sourceFingerprint,
  manualRecallCount: payload.context!.manualRecallItems.length,
  rawFindingCount: response.findings.length,
  mappedFindingCount: mapped.length,
  allFindingsMapped: mapped.length === response.findings.length,
  tamperedEvidenceRejected: true,
  tamperErrorCode,
  crossBlockFindingCount: mapped.filter(finding => finding.evidence.length > 1).length,
  findingSummaries,
  mappedFindingSha256: sha256(JSON.stringify(mapped.map(finding => ({
    dimension: finding.dimension,
    severity: finding.severity,
    evidence: finding.evidence,
    protectedBlockIds: finding.protectedBlockIds,
  })))),
  privateDataBoundary: manifest.privateDataBoundary,
  canonCommitAllowed: manifest.canonCommitAllowed,
  containsManuscriptText: false,
  containsEvidenceQuoteText: false,
  repositoryWritePerformed: false,
  authorAdoptionPerformed: false,
  publicationPerformed: false,
  chapter21Accessed: false,
}

if (values.output) {
  const outputPath = resolve(values.output)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
}

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
