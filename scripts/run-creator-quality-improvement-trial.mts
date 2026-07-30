import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import {
  createLocalWorkingAgent,
  requestAuditedStoryStateEvidenceFromWorkingAgent,
} from '../app/src/features/creator-decision/localWorkingAgent'
import {
  applyRepairProposal,
  createRepairProposal,
} from '../app/src/features/creator-decision/literaryReview'
import {
  countVisibleCharacters,
  draftTextFromBlocks,
} from '../app/src/features/creator-decision/sceneDrafting'
import { sceneDraftResultSchema } from '../app/src/features/creator-decision/schemas'
import {
  buildStoryStateEvidenceOperations,
} from '../app/src/features/creator-decision/storyStateEvidence'
import type {
  AuthorIntentContract,
  CandidateAssessment,
  ContextSnapshot,
  CreationSession,
  LiteraryFinding,
  LiteraryReview,
  NarrativeCandidate,
  SceneDraftRequest,
  SceneDraftResult,
} from '../app/src/features/creator-decision/types'

interface SourcePayload {
  session: CreationSession
  intent: AuthorIntentContract
  candidate: NarrativeCandidate
  context: ContextSnapshot
  draft: unknown
}

interface BridgeHealth {
  status: string
  operations: string[]
  roleRuntime: Array<{ role: string; status: string; note: string | null }>
  privateDraftsRemainLocal: boolean
  characterSimulation?: {
    provider: string
    configured: boolean
    invocationMode: string
    authorConfirmationRequired: boolean
    canonCommitAllowed: boolean
  }
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

function severityCounts(review: LiteraryReview) {
  return review.findings.reduce<Record<string, number>>((counts, finding) => {
    counts[finding.severity] = (counts[finding.severity] || 0) + 1
    return counts
  }, {})
}

function dimensionCounts(review: LiteraryReview) {
  return review.findings.reduce<Record<string, number>>((counts, finding) => {
    counts[finding.dimension] = (counts[finding.dimension] || 0) + 1
    return counts
  }, {})
}

function assessmentFor(candidate: NarrativeCandidate, assessments: CandidateAssessment[]) {
  const assessment = assessments.find(item => item.candidateId === candidate.id)
  assert.ok(assessment, `Candidate ${candidate.id} must retain its independent assessment.`)
  return assessment
}

function selectOwnerProxyCandidate(candidates: NarrativeCandidate[], assessments: CandidateAssessment[]) {
  assert.ok(candidates.length > 0, 'Planner must return at least one hard-constraint-safe candidate.')
  const ordered = [...candidates].sort((left, right) => {
    const leftAssessment = assessmentFor(left, assessments)
    const rightAssessment = assessmentFor(right, assessments)
    return rightAssessment.characterAgency - leftAssessment.characterAgency
      || rightAssessment.continuitySafety - leftAssessment.continuitySafety
      || rightAssessment.tensionPotential - leftAssessment.tensionPotential
      || rightAssessment.freshness - leftAssessment.freshness
      || left.title.localeCompare(right.title, 'zh-CN')
  })
  return ordered[0]!
}

function repairPriority(finding: LiteraryFinding) {
  if (finding.severity === 'hard_block') return 0
  if (finding.severity === 'revision_candidate') return 1
  if (finding.severity === 'taste_note') return 2
  return 3
}

function selectRepairTarget(review: LiteraryReview, draft: SceneDraftResult) {
  const blocksById = new Map(draft.contentBlocks.map(block => [block.id, block]))
  const candidates = review.findings
    .filter(finding => finding.status === 'active' && finding.severity !== 'preserve')
    .flatMap(finding => {
      const blockIds = Array.from(new Set(finding.evidence.map(item => item.blockId)))
      if (blockIds.length !== 1) return []
      const targetBlock = blocksById.get(blockIds[0]!)
      if (!targetBlock || targetBlock.protected || finding.protectedBlockIds.includes(targetBlock.id)) return []
      return [{ finding, targetBlock }]
    })
    .sort((left, right) => repairPriority(left.finding) - repairPriority(right.finding))
  return candidates[0] || null
}

async function writePrivateJson(directory: string, name: string, value: unknown) {
  await writeFile(join(directory, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

async function collectRunManifests(root: string, startedAfterMs: number) {
  const manifests: RunManifest[] = []
  async function visit(directory: string) {
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const target = join(directory, entry.name)
      if (entry.isDirectory()) {
        await visit(target)
        continue
      }
      if (entry.name !== 'run-manifest.json') continue
      const manifest = JSON.parse(await readFile(target, 'utf8')) as RunManifest
      if (Date.parse(manifest.startedAt) >= startedAfterMs) manifests.push(manifest)
    }
  }
  await visit(root)
  return manifests.sort((left, right) => (
    Date.parse(left.startedAt) - Date.parse(right.startedAt)
      || left.sequence - right.sequence
  ))
}

const sourcePromptPath = resolve(required('source-prompt'))
const outputPath = resolve(required('output'))
const baseUrl = values['base-url']!.replace(/\/$/, '')
const trialId = `chapter-20-quality-trial-${Date.now()}-${randomUUID()}`
const privateDirectory = resolve(values['private-dir'] || join(tmpdir(), trialId))
const bridgeLogRoot = join(tmpdir(), 'parallel-universe-creator-working-agent')
const startedAtMs = Date.now() - 2_000
await mkdir(privateDirectory, { recursive: true })

const healthResponse = await fetch(`${baseUrl}/health`)
assert.equal(healthResponse.ok, true, `Working Agent health failed with ${healthResponse.status}.`)
const health = await healthResponse.json() as BridgeHealth
assert.equal(health.status, 'ready')
assert.equal(health.privateDraftsRemainLocal, true)
for (const operation of [
  'candidate_search',
  'scene_draft',
  'literary_review',
  'local_repair',
  'local_repair_review',
  'state_evidence',
  'state_evidence_review',
]) assert.ok(health.operations.includes(operation), `Missing quality operation: ${operation}`)

const sourcePrompt = await readFile(sourcePromptPath, 'utf8')
const payload = extractPayload(sourcePrompt)
const chapter = chapterNumber(payload.session.chapterId)
assert.equal(chapter, 20, 'The quality trial is pinned to Chapter 20.')
assert.ok(chapter <= 20, 'The quality trial must not cross the Chapter 20 stop line.')
assert.equal(payload.intent.status, 'locked')
assert.ok(payload.context.manualRecallItems.length > 0, 'The real chapter context must include author-selected recall.')
const acceptedDraft = sceneDraftResultSchema.parse(payload.draft)
const acceptedManuscriptHash = sha256(draftTextFromBlocks(acceptedDraft.contentBlocks))

const agent = createLocalWorkingAgent(baseUrl)
const candidateSearch = await agent.generateCandidates({
  session: payload.session,
  intent: payload.intent,
  context: payload.context,
})
await writePrivateJson(privateDirectory, '01-planner-candidates.json', candidateSearch)
const selectedCandidate = selectOwnerProxyCandidate(candidateSearch.candidates, candidateSearch.assessments)
const selectedAssessment = assessmentFor(selectedCandidate, candidateSearch.assessments)

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
  targetLength: { minimum: 2700, maximum: 3400 },
  writingMode: 'agent_first_draft',
}
const initialDraft = await agent.draftScene({
  session: payload.session,
  intent: payload.intent,
  candidate: selectedCandidate,
  context: payload.context,
  request: draftRequest,
  currentBlocks: [],
})
await writePrivateJson(privateDirectory, '02-architect-writer-draft.json', initialDraft)
const initialReview = await agent.reviewDraft({
  session: payload.session,
  intent: payload.intent,
  context: payload.context,
  candidate: selectedCandidate,
  draft: initialDraft,
})
await writePrivateJson(privateDirectory, '03-auditor-review-before.json', initialReview)

const repairTarget = selectRepairTarget(initialReview, initialDraft)
let finalRepair = null
let finalRepairReview = null
let repairAttempts = 0
let improvedDraft = initialDraft
if (repairTarget && agent.proposeRepair && agent.reviewRepair) {
  repairAttempts += 1
  finalRepair = await agent.proposeRepair({
    session: payload.session,
    intent: payload.intent,
    context: payload.context,
    candidate: selectedCandidate,
    draft: initialDraft,
    review: initialReview,
    finding: repairTarget.finding,
    targetBlock: repairTarget.targetBlock,
    attempt: 'initial',
  })
  finalRepairReview = await agent.reviewRepair({
    session: payload.session,
    intent: payload.intent,
    context: payload.context,
    candidate: selectedCandidate,
    draft: initialDraft,
    review: initialReview,
    finding: repairTarget.finding,
    targetBlock: repairTarget.targetBlock,
    repair: finalRepair,
  })
  await writePrivateJson(privateDirectory, '04-reviser-candidate-1.json', finalRepair)
  await writePrivateJson(privateDirectory, '05-repair-auditor-1.json', finalRepairReview)
  if (finalRepairReview.decision === 'reject') {
    repairAttempts += 1
    finalRepair = await agent.proposeRepair({
      session: payload.session,
      intent: payload.intent,
      context: payload.context,
      candidate: selectedCandidate,
      draft: initialDraft,
      review: initialReview,
      finding: repairTarget.finding,
      targetBlock: repairTarget.targetBlock,
      attempt: 'auditor_revision',
      previousRepair: finalRepair,
      repairReview: finalRepairReview,
    })
    finalRepairReview = await agent.reviewRepair({
      session: payload.session,
      intent: payload.intent,
      context: payload.context,
      candidate: selectedCandidate,
      draft: initialDraft,
      review: initialReview,
      finding: repairTarget.finding,
      targetBlock: repairTarget.targetBlock,
      repair: finalRepair,
    })
    await writePrivateJson(privateDirectory, '06-reviser-candidate-2.json', finalRepair)
    await writePrivateJson(privateDirectory, '07-repair-auditor-2.json', finalRepairReview)
  }
  if (finalRepairReview.decision === 'pass') {
    const proposal = createRepairProposal({
      id: `${trialId}:repair-proposal`,
      review: initialReview,
      findingId: repairTarget.finding.id,
      operation: finalRepair.operation,
      proposedContent: finalRepair.proposedContent,
      preservedFacts: finalRepair.preservedFacts.map(item => item.fact),
      targetBlockIds: [finalRepair.targetBlockId],
      verification: finalRepairReview,
    })
    const contentBlocks = applyRepairProposal({
      proposal,
      blocks: initialDraft.contentBlocks,
      currentDraftRevision: initialDraft.revision,
    })
    improvedDraft = {
      ...initialDraft,
      draftId: `${trialId}:improved-draft`,
      baseDraftRevision: initialDraft.revision,
      revision: initialDraft.revision + 1,
      contentBlocks,
      createdAt: new Date().toISOString(),
    }
    await writePrivateJson(privateDirectory, '08-isolated-author-adopted-draft.json', improvedDraft)
  }
}

const finalReview = await agent.reviewDraft({
  session: payload.session,
  intent: payload.intent,
  context: payload.context,
  candidate: selectedCandidate,
  draft: improvedDraft,
})
await writePrivateJson(privateDirectory, '09-auditor-review-after.json', finalReview)

const auditedStateEvidence = await requestAuditedStoryStateEvidenceFromWorkingAgent({
  baseUrl,
  mode: 'quality_trial',
  payload: {
    session: payload.session,
    intent: payload.intent,
    candidate: selectedCandidate,
    context: payload.context,
    draft: improvedDraft,
    review: finalReview,
  },
})
const stateEvidence = auditedStateEvidence.evidence
await writePrivateJson(privateDirectory, '10-observer-state-evidence.json', stateEvidence)
await writePrivateJson(privateDirectory, '11-state-evidence-initial.json', auditedStateEvidence.initialEvidence)
if (auditedStateEvidence.initialReview) {
  await writePrivateJson(privateDirectory, '12-state-evidence-auditor-initial.json', auditedStateEvidence.initialReview)
}
if (auditedStateEvidence.finalReview) {
  await writePrivateJson(privateDirectory, '13-state-evidence-auditor-final.json', auditedStateEvidence.finalReview)
}
const stateEvidenceReview = auditedStateEvidence.finalReview
const stateEvidencePassed = auditedStateEvidence.passed
const stateOperations = stateEvidencePassed
  ? buildStoryStateEvidenceOperations({
      result: stateEvidence,
      session: payload.session,
      blocks: improvedDraft.contentBlocks,
      context: payload.context,
    })
  : []

const initialText = draftTextFromBlocks(initialDraft.contentBlocks)
const improvedText = draftTextFromBlocks(improvedDraft.contentBlocks)
const initialSeverityCounts = severityCounts(initialReview)
const finalSeverityCounts = severityCounts(finalReview)
const targetEvidence = repairTarget?.finding.evidence[0]
const targetEvidenceQuote = targetEvidence
  ? repairTarget!.targetBlock.text.slice(targetEvidence.startOffset, targetEvidence.endOffset)
  : ''
const targetEvidenceChanged = Boolean(targetEvidenceQuote) && !improvedText.includes(targetEvidenceQuote)
const noNewHardBlock = (finalSeverityCounts.hard_block || 0) <= (initialSeverityCounts.hard_block || 0)
const noNewDeterministicViolation = finalReview.deterministicViolations.every(item => (
  initialReview.deterministicViolations.includes(item)
))
const finalVisibleLength = countVisibleCharacters(improvedText)
const lengthPassed = finalVisibleLength >= 2700 && finalVisibleLength <= 3400
const repairGatePassed = finalRepairReview?.decision === 'pass'
const qualityImproved = Boolean(
  repairTarget
  && repairGatePassed
  && targetEvidenceChanged
  && noNewHardBlock
  && noNewDeterministicViolation
  && lengthPassed,
)

const runManifests = await collectRunManifests(bridgeLogRoot, startedAtMs)
assert.ok(runManifests.length > 0, 'The trial must produce real Working Agent run manifests.')
assert.ok(runManifests.every(item => item.canonCommitAllowed === false))

const summary = {
  schemaVersion: 'creator-quality-improvement-trial.v1',
  trialId,
  completedAt: new Date().toISOString(),
  scope: {
    workId: payload.session.workId,
    chapter,
    stopLine: 20,
    source: 'captured_real_creator_chapter_20',
    sourcePromptSha256: sha256(sourcePrompt),
    acceptedManuscriptSha256: acceptedManuscriptHash,
    manualRecallCount: payload.context.manualRecallItems.length,
    manualRecallGroups: payload.context.manualRecallItems.map(item => item.group),
    contextSourceFingerprint: payload.context.sourceFingerprint,
  },
  planner: {
    rawCandidateCount: candidateSearch.rawCandidateCount,
    validCandidateCount: candidateSearch.validCandidateCount,
    returnedCandidateCount: candidateSearch.candidates.length,
    candidates: candidateSearch.candidates.map(candidate => ({
      id: candidate.id,
      title: candidate.title,
      conflictMode: candidate.strategyAxes.conflictMode,
      informationMode: candidate.strategyAxes.informationMode,
      pacing: candidate.strategyAxes.pacing,
      costType: candidate.strategyAxes.costType,
      beatCount: candidate.beats.length,
      assessment: assessmentFor(candidate, candidateSearch.assessments),
      strengthCount: candidate.tradeoffs.strengths.length,
      riskCount: candidate.tradeoffs.risks.length,
    })),
    selectedCandidateId: selectedCandidate.id,
    selectedCandidateTitle: selectedCandidate.title,
    selectionPolicy: 'lexicographic_character_agency_then_continuity_then_tension_then_freshness',
    selectedAssessment,
    compositeLiteraryScoreUsed: false,
  },
  architectWriter: {
    writingMode: draftRequest.writingMode,
    scope: draftRequest.scope.type,
    targetLength: draftRequest.targetLength,
    initialVisibleLength: countVisibleCharacters(initialText),
    initialBlockCount: initialDraft.contentBlocks.length,
    initialDraftSha256: sha256(initialText),
    unplannedFactProposalCount: initialDraft.unplannedFactProposals.length,
    observedStateChangeCount: initialDraft.observedStateChanges.length,
  },
  independentLiteraryReview: {
    before: {
      findingCount: initialReview.findings.length,
      severityCounts: initialSeverityCounts,
      dimensionCounts: dimensionCounts(initialReview),
      deterministicViolations: initialReview.deterministicViolations,
    },
    after: {
      findingCount: finalReview.findings.length,
      severityCounts: finalSeverityCounts,
      dimensionCounts: dimensionCounts(finalReview),
      deterministicViolations: finalReview.deterministicViolations,
    },
    compositeLiteraryScoreUsed: false,
    everyFindingHasLocatedEvidence: [...initialReview.findings, ...finalReview.findings]
      .every(finding => finding.evidence.length > 0),
  },
  localRepair: repairTarget ? {
    targetFindingId: repairTarget.finding.id,
    targetDimension: repairTarget.finding.dimension,
    targetSeverity: repairTarget.finding.severity,
    targetEvidenceSha256: sha256(targetEvidenceQuote),
    targetEvidencePreview: targetEvidenceQuote.slice(0, 100),
    repairAttempts,
    finalDecision: finalRepairReview?.decision || 'not_run',
    preservedFactCount: finalRepair?.preservedFacts.length || 0,
    verifiedPreservedFactIndexes: finalRepairReview?.verifiedPreservedFactIndexes || [],
    replacementSha256: finalRepair ? sha256(finalRepair.proposedContent) : null,
    sourceBlockSha256: sha256(repairTarget.targetBlock.text),
    targetEvidenceChanged,
    appliedOnlyToIsolatedTrialCopy: finalRepairReview?.decision === 'pass',
  } : {
    status: 'no_repairable_located_finding',
    repairAttempts: 0,
  },
  qualityDelta: {
    verdict: qualityImproved ? 'improved' : 'not_proven',
    repairGatePassed,
    noNewHardBlock,
    noNewDeterministicViolation,
    targetEvidenceChanged,
    finalVisibleLength,
    lengthPassed,
    initialDraftSha256: sha256(initialText),
    improvedDraftSha256: sha256(improvedText),
    manuscriptChangedInTrialCopy: sha256(initialText) !== sha256(improvedText),
  },
  observerAuditor: {
    attempts: auditedStateEvidence.attempts,
    initialReviewDecision: auditedStateEvidence.initialReview?.decision || 'empty_evidence_valid',
    characterStateProposalCount: stateEvidence.characterStateProposals.length,
    continuityProposalCount: stateEvidence.continuityProposals.length,
    proposedDimensions: stateEvidence.characterStateProposals.map(item => item.path.split('/').at(-1)),
    reviewDecision: stateEvidenceReview?.decision || 'empty_evidence_valid',
    reviewPassed: stateEvidencePassed,
    locatableOperationCount: stateOperations.length,
    canonCommitPerformed: false,
  },
  characterRehearsal: {
    provider: health.characterSimulation?.provider || 'unknown',
    configured: health.characterSimulation?.configured || false,
    authorConfirmationRequired: health.characterSimulation?.authorConfirmationRequired ?? true,
    canonCommitAllowed: health.characterSimulation?.canonCommitAllowed ?? false,
    runInThisTrial: false,
    status: health.characterSimulation?.configured ? 'available_for_separate_confirmed_run' : 'blocked_not_configured',
  },
  runtime: {
    realWorkingAgentCalls: runManifests.length,
    manifests: runManifests.map(item => ({
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
    canonChanged: false,
    authorCardSaved: false,
    chapter21AccessedOrChanged: false,
    cloudDataChanged: false,
    publicationPerformed: false,
  },
  limitations: [
    'The repair is applied only to an isolated trial copy; the accepted Chapter 20 manuscript is unchanged.',
    'The owner-proxy candidate selection is deterministic and documented, but it is not a reader study or expert panel.',
    'MiroFish requires a separately configured and explicitly confirmed external run.',
    'One successful chapter trial does not establish model-wide literary quality statistics.',
  ],
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8')
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
