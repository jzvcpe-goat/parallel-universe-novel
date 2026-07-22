import assert from 'node:assert/strict'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { parseArgs } from 'node:util'
import {
  createLocalWorkingAgent,
  requestDirectSceneDraftFromWorkingAgent,
  requestPairedLiteraryComparisonFromWorkingAgent,
  requestPairedLiteraryComparisonVerificationFromWorkingAgent,
} from '../app/src/features/creator-decision/localWorkingAgent'
import {
  countVisibleCharacters,
  draftTextFromBlocks,
} from '../app/src/features/creator-decision/sceneDrafting'
import type { PairedLiteraryEvidenceBlock } from '../app/src/features/creator-decision/pairedLiteraryComparison'
import { sceneDraftResultSchema } from '../app/src/features/creator-decision/schemas'
import type {
  AuthorIntentContract,
  CandidateAssessment,
  ContextSnapshot,
  CreationSession,
  NarrativeCandidate,
  SceneDraftRequest,
} from '../app/src/features/creator-decision/types'

interface SourcePayload {
  session: CreationSession
  intent: AuthorIntentContract
  candidate: NarrativeCandidate
  context: ContextSnapshot
  draft: unknown
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

type GenerationPath = 'direct_writer' | 'planner_architect_writer'
type BlindLabel = 'candidate_a' | 'candidate_b'

const { values } = parseArgs({
  options: {
    'base-url': { type: 'string', default: 'http://127.0.0.1:4318' },
    'source-prompt': { type: 'string' },
    output: { type: 'string' },
    'private-dir': { type: 'string' },
  },
  strict: true,
})

function required(name: 'source-prompt' | 'output') {
  const value = values[name]
  if (!value) throw new Error(`Missing required --${name} argument.`)
  return value
}

function sha256(value: string | Uint8Array) {
  return createHash('sha256').update(value).digest('hex')
}

function evidenceBlocks(text: string, label: BlindLabel): PairedLiteraryEvidenceBlock[] {
  const paragraphs = text
    .replaceAll('\r\n', '\n')
    .split(/\n\s*\n|\n/u)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
  const chunks: string[] = []

  for (const paragraph of paragraphs) {
    const sentences = paragraph.match(/[^。！？!?；;]+[。！？!?；;]?/gu) ?? [paragraph]
    let current = ''
    for (const sentence of sentences) {
      const next = `${current}${sentence}`.trim()
      if (current && countVisibleCharacters(next) > 420) {
        chunks.push(current)
        current = sentence.trim()
      } else {
        current = next
      }
      while (countVisibleCharacters(current) > 520) {
        const characters = Array.from(current)
        chunks.push(characters.slice(0, 420).join(''))
        current = characters.slice(420).join('').trim()
      }
    }
    if (current) chunks.push(current)
  }

  assert.ok(chunks.length > 0, `${label} must expose at least one evidence block.`)
  return chunks.map((block, index) => ({
    id: `${label}:block:${String(index + 1).padStart(3, '0')}`,
    text: block,
  }))
}

function extractPayload(prompt: string): SourcePayload {
  const marker = '当前资料：'
  const markerIndex = prompt.lastIndexOf(marker)
  assert.notEqual(markerIndex, -1, 'The captured Auditor prompt must contain structured current material.')
  return JSON.parse(prompt.slice(markerIndex + marker.length).trim()) as SourcePayload
}

function chapterNumber(chapterId: string) {
  const match = /:chapter:(\d+)$/.exec(chapterId)
  return match ? Number(match[1]) : null
}

function assessmentFor(candidate: NarrativeCandidate, assessments: CandidateAssessment[]) {
  const assessment = assessments.find(item => item.candidateId === candidate.id)
  assert.ok(assessment, `Candidate ${candidate.id} must retain its independent assessment.`)
  return assessment
}

function selectOwnerProxyCandidate(candidates: NarrativeCandidate[], assessments: CandidateAssessment[]) {
  assert.ok(candidates.length > 0, 'Planner must return at least one hard-constraint-safe candidate.')
  return [...candidates].sort((left, right) => {
    const leftAssessment = assessmentFor(left, assessments)
    const rightAssessment = assessmentFor(right, assessments)
    return rightAssessment.characterAgency - leftAssessment.characterAgency
      || rightAssessment.continuitySafety - leftAssessment.continuitySafety
      || rightAssessment.tensionPotential - leftAssessment.tensionPotential
      || rightAssessment.freshness - leftAssessment.freshness
      || left.title.localeCompare(right.title, 'zh-CN')
  })[0]!
}

async function writePrivateJson(directory: string, name: string, value: unknown) {
  await writeFile(join(directory, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8')
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

async function comparisonRuns(comparisonId: string, startedAfter: number) {
  const paths = await namedFiles(join(tmpdir(), 'parallel-universe-creator-working-agent'), 'run-manifest.json')
  const runs: RunManifest[] = []
  const generationOperations = new Set([
    'candidate_search',
    'scene_architecture',
    'scene_draft',
    'direct_scene_draft',
  ])
  for (const manifestPath of paths) {
    try {
      const [manifestText, prompt] = await Promise.all([
        readFile(manifestPath, 'utf8'),
        readFile(join(dirname(manifestPath), 'prompt.txt'), 'utf8'),
      ])
      const manifest = JSON.parse(manifestText) as RunManifest
      const operation = manifest.operation.replace(/:schema_repair$/u, '')
      if (
        Date.parse(manifest.startedAt) >= startedAfter - 1_000
        && (prompt.includes(comparisonId) || generationOperations.has(operation))
      ) runs.push(manifest)
    } catch {
      // Ignore unrelated or interrupted local runs.
    }
  }
  return runs.sort((left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt))
}

const sourcePromptPath = resolve(required('source-prompt'))
const outputPath = resolve(required('output'))
const baseUrl = values['base-url']!.replace(/\/$/, '')
const comparisonId = `paired-literary:chapter-20:${Date.now()}:${randomUUID()}`
const privateDirectory = resolve(values['private-dir'] || join(tmpdir(), comparisonId.replaceAll(':', '-')))
const startedAt = Date.now()
await mkdir(privateDirectory, { recursive: true })

const healthResponse = await fetch(`${baseUrl}/health`)
assert.equal(healthResponse.status, 200, 'Local Working Agent bridge is not ready.')
const health = await healthResponse.json() as {
  status?: string
  operations?: string[]
  privateDraftsRemainLocal?: boolean
}
assert.equal(health.status, 'ready')
assert.equal(health.privateDraftsRemainLocal, true)
for (const operation of [
  'candidate_search',
  'direct_scene_draft',
  'scene_draft',
  'paired_literary_comparison',
  'paired_literary_comparison_revision',
  'paired_literary_comparison_verification',
]) assert.ok(health.operations?.includes(operation), `Missing paired quality operation: ${operation}`)

const sourcePrompt = await readFile(sourcePromptPath, 'utf8')
const payload = extractPayload(sourcePrompt)
const chapter = chapterNumber(payload.session.chapterId)
assert.equal(chapter, 20, 'The paired quality comparison is pinned to Chapter 20.')
assert.ok(chapter <= 20, 'The paired quality comparison must not cross the Chapter 20 stop line.')
assert.equal(payload.intent.status, 'locked')
assert.ok(payload.context.manualRecallItems.length > 0, 'The comparison requires author-selected recall.')
const acceptedDraft = sceneDraftResultSchema.parse(payload.draft)
const acceptedText = draftTextFromBlocks(acceptedDraft.contentBlocks)
const acceptedHashBefore = sha256(acceptedText)

const agent = createLocalWorkingAgent(baseUrl)
const candidateSearch = await agent.generateCandidates({
  session: payload.session,
  intent: payload.intent,
  context: payload.context,
})
const selectedCandidate = selectOwnerProxyCandidate(candidateSearch.candidates, candidateSearch.assessments)
const commonBrief = {
  sceneId: payload.session.sceneId,
  selectedDirection: selectedCandidate.oneSentenceMechanism,
  conflictMode: selectedCandidate.strategyAxes.conflictMode,
  informationMode: selectedCandidate.strategyAxes.informationMode,
  costType: selectedCandidate.strategyAxes.costType,
  pacing: selectedCandidate.strategyAxes.pacing,
  targetLength: { minimum: 2700, maximum: 3400 },
}
await writePrivateJson(privateDirectory, '01-common-brief-and-planner.json', {
  commonBrief,
  candidateSearch,
  selectedCandidate,
})

const draftRequest: SceneDraftRequest = {
  sessionId: payload.session.id,
  intentId: payload.intent.id,
  intentRevision: payload.intent.revision,
  candidateId: selectedCandidate.id,
  candidateRevision: selectedCandidate.revision,
  contextSnapshotId: payload.context.id,
  baseCanonRevision: payload.context.canonRevision,
  baseDraftRevision: acceptedDraft.revision,
  scope: {
    type: 'scene',
    sceneId: payload.session.sceneId,
    beatIds: selectedCandidate.beats.map(beat => beat.id),
    selectedBlockIds: [],
  },
  protectedBlockIds: [],
  targetLength: commonBrief.targetLength,
  writingMode: 'agent_first_draft',
}

const generationOrder: GenerationPath[] = randomBytes(1)[0]! % 2 === 0
  ? ['direct_writer', 'planner_architect_writer']
  : ['planner_architect_writer', 'direct_writer']
let directResult: Awaited<ReturnType<typeof requestDirectSceneDraftFromWorkingAgent>> | null = null
let workflowResult: Awaited<ReturnType<typeof agent.draftScene>> | null = null

for (const path of generationOrder) {
  if (path === 'direct_writer') {
    directResult = await requestDirectSceneDraftFromWorkingAgent({
      baseUrl,
      payload: {
        comparisonId,
        commonBrief,
        session: payload.session,
        intent: payload.intent,
        context: payload.context,
      },
    })
    await writePrivateJson(privateDirectory, '02-direct-writer-draft.json', directResult)
  } else {
    workflowResult = await agent.draftScene({
      session: payload.session,
      intent: payload.intent,
      candidate: selectedCandidate,
      context: payload.context,
      request: draftRequest,
      currentBlocks: [],
    })
    await writePrivateJson(privateDirectory, '03-planner-architect-writer-draft.json', workflowResult)
  }
}

assert.ok(directResult)
assert.ok(workflowResult)
const directText = directResult.body
const workflowText = draftTextFromBlocks(workflowResult.contentBlocks)
const directLength = countVisibleCharacters(directText)
const workflowLength = countVisibleCharacters(workflowText)
assert.ok(directLength >= 2700 && directLength <= 3400)
assert.ok(workflowLength >= 2700 && workflowLength <= 3400)
assert.notEqual(sha256(directText), sha256(workflowText), 'The two generation paths returned identical text.')
assert.equal(
  directResult.stateProposals.every(proposal => directText.includes(proposal.evidenceQuote)),
  true,
  'Direct Writer state proposals must cite its own manuscript exactly.',
)

const mapping: Record<BlindLabel, GenerationPath> = randomBytes(1)[0]! % 2 === 0
  ? { candidate_a: 'direct_writer', candidate_b: 'planner_architect_writer' }
  : { candidate_a: 'planner_architect_writer', candidate_b: 'direct_writer' }
const textByPath: Record<GenerationPath, string> = {
  direct_writer: directText,
  planner_architect_writer: workflowText,
}
const candidateAText = textByPath[mapping.candidate_a]
const candidateBText = textByPath[mapping.candidate_b]
const candidateABlocks = evidenceBlocks(candidateAText, 'candidate_a')
const candidateBBlocks = evidenceBlocks(candidateBText, 'candidate_b')
await writePrivateJson(privateDirectory, '04-private-blind-mapping.json', mapping)
await writePrivateJson(privateDirectory, '04-private-evidence-blocks.json', {
  candidateA: candidateABlocks,
  candidateB: candidateBBlocks,
})

const sharedContext = {
  workId: payload.session.workId,
  chapter,
  commonBrief,
  intent: payload.intent,
  context: payload.context,
}
const comparisonResult = await requestPairedLiteraryComparisonFromWorkingAgent({
  baseUrl,
  comparisonId,
  sharedContext,
  candidateABlocks,
  candidateBBlocks,
})
const comparison = comparisonResult.comparison
await writePrivateJson(privateDirectory, '05-blind-comparison-initial.json', comparisonResult.initialComparison)
await writePrivateJson(privateDirectory, '05-blind-comparison.json', comparison)
const verification = await requestPairedLiteraryComparisonVerificationFromWorkingAgent({
  baseUrl,
  comparisonId,
  sharedContext,
  candidateABlocks,
  candidateBBlocks,
  comparison,
})
await writePrivateJson(privateDirectory, '06-independent-verification.json', verification)

const pathForPreference = (preference: 'candidate_a' | 'candidate_b' | 'tie') => (
  preference === 'tie' ? 'tie' : mapping[preference]
)
const dimensionOutcomes = comparison.dimensions.map(item => {
  const verificationItem = verification.dimensions.find(candidate => candidate.dimension === item.dimension)!
  return {
    dimension: item.dimension,
    firstPassPreference: pathForPreference(item.preference),
    verificationDecision: verificationItem.decision,
    confirmedPreference: verificationItem.confirmedPreference
      ? pathForPreference(verificationItem.confirmedPreference)
      : null,
    confidence: item.confidence,
  }
})
const hardConstraintOutcomes = comparison.hardConstraints.map(item => {
  const path = mapping[item.candidate]
  const verificationItem = verification.hardConstraints.find(candidate => candidate.candidate === item.candidate)!
  return {
    path,
    firstPassStatus: item.status,
    violationType: item.violationType,
    reasonCode: item.reasonCode,
    verificationDecision: verificationItem.decision,
    confirmedStatus: verificationItem.confirmedStatus,
    confirmedViolationType: verificationItem.confirmedViolationType,
    confirmedReasonCode: verificationItem.confirmedReasonCode,
  }
})
const verificationPassed = verification.dimensions.every(item => item.decision === 'verify')
  && verification.hardConstraints.every(item => item.decision === 'verify')

const manifests = await comparisonRuns(comparisonId, startedAt)
assert.ok(manifests.some(item => item.role === 'Planner' && item.operation === 'candidate_search'))
assert.ok(manifests.some(item => item.role === 'Writer' && item.operation === 'direct_scene_draft'))
assert.ok(manifests.some(item => item.role === 'Architect' && item.operation === 'scene_architecture'))
assert.ok(manifests.some(item => item.role === 'Writer' && item.operation === 'scene_draft'))
assert.ok(manifests.some(item => item.role === 'Auditor' && item.operation === 'paired_literary_comparison'))
if (comparisonResult.evidenceRevisionApplied) {
  assert.ok(manifests.some(item => item.role === 'Auditor' && item.operation === 'paired_literary_comparison_revision'))
}
assert.ok(manifests.some(item => item.role === 'Auditor' && item.operation === 'paired_literary_comparison_verification'))
assert.ok(manifests.every(item => item.canonCommitAllowed === false))

const acceptedHashAfter = sha256(draftTextFromBlocks(sceneDraftResultSchema.parse(payload.draft).contentBlocks))
assert.equal(acceptedHashAfter, acceptedHashBefore)

const summary = {
  schemaVersion: 'creator-paired-quality-comparison.v1',
  comparisonId,
  completedAt: new Date().toISOString(),
  scope: {
    workId: payload.session.workId,
    chapter,
    stopLine: 20,
    source: 'captured_real_creator_chapter_20',
    sourcePromptSha256: sha256(sourcePrompt),
    acceptedManuscriptSha256: acceptedHashBefore,
    manualRecallCount: payload.context.manualRecallItems.length,
    contextSourceFingerprint: payload.context.sourceFingerprint,
  },
  fairness: {
    sameLockedIntent: true,
    sameContextSnapshot: true,
    sameManualRecall: true,
    sameTargetLength: true,
    sameWorkingAgentBridge: true,
    generationOrderRandomized: true,
    candidateLabelsRandomized: true,
    evaluatorSawGenerationPath: false,
    verifierSawGenerationPath: false,
    privateMappingSha256: sha256(JSON.stringify(mapping)),
    compositeLiteraryScoreUsed: false,
  },
  candidates: {
    directWriter: {
      visibleLength: directLength,
      manuscriptSha256: sha256(directText),
      evidenceBlockCount: mapping.candidate_a === 'direct_writer'
        ? candidateABlocks.length
        : candidateBBlocks.length,
      unplannedFactProposalCount: directResult.unplannedFactProposals.length,
      stateProposalCount: directResult.stateProposals.length,
    },
    plannerArchitectWriter: {
      visibleLength: workflowLength,
      manuscriptSha256: sha256(workflowText),
      evidenceBlockCount: mapping.candidate_a === 'planner_architect_writer'
        ? candidateABlocks.length
        : candidateBBlocks.length,
      blockCount: workflowResult.contentBlocks.length,
      unplannedFactProposalCount: workflowResult.unplannedFactProposals.length,
      observedStateChangeCount: workflowResult.observedStateChanges.length,
    },
  },
  evaluation: {
    comparisonAttempts: comparisonResult.attempts,
    evidenceRevisionApplied: comparisonResult.evidenceRevisionApplied,
    verificationPassed,
    dimensionOutcomes,
    hardConstraintOutcomes,
    overallWinnerDeclared: false,
    compositeLiteraryScoreUsed: false,
  },
  runtime: {
    realWorkingAgentCallCount: manifests.length,
    generationOrder,
    manifests: manifests.map(item => ({
      pipelineId: item.pipelineId,
      sequence: item.sequence,
      role: item.role,
      operation: item.operation,
      status: item.status,
      privateDataBoundary: item.privateDataBoundary,
      canonCommitAllowed: item.canonCommitAllowed,
    })),
    privateArtifactsDirectory: privateDirectory,
  },
  sideEffects: {
    repositoryWritePerformed: false,
    acceptedChapterChanged: false,
    candidateAdopted: false,
    canonChanged: false,
    chapter21AccessedOrChanged: false,
    cloudDataChanged: false,
    publicationPerformed: false,
  },
  privacy: {
    manuscriptTextCopiedIntoRepositoryEvidence: false,
    evidenceBlockTextCopiedIntoRepositoryEvidence: false,
    blindMappingCopiedIntoRepositoryEvidence: false,
    repositoryEvidenceUsesHashesAndPerDimensionOutcomesOnly: true,
  },
  limitations: [
    'One paired Chapter 20 trial can show located per-dimension differences but cannot establish statistical literary improvement.',
    'Both paths share one Planner-selected direction so the comparison isolates scene architecture and staged execution more than idea selection.',
    'No candidate is adopted; the accepted Chapter 20 manuscript remains unchanged.',
  ],
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
