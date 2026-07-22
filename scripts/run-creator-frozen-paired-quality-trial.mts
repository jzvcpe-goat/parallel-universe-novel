import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { request as httpRequest } from 'node:http'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import {
  createLocalWorkingAgent,
  requestDirectSceneDraftFromWorkingAgent,
  requestPairedLiteraryComparisonFromWorkingAgent,
  requestPairedLiteraryComparisonVerificationFromWorkingAgent,
  requestSceneAuthorDirectionDraftReviewFromWorkingAgent,
  sceneDraftDirectionReceiptFromReview,
} from '../app/src/features/creator-decision/localWorkingAgent'
import {
  applyRepairProposal,
  createRepairProposal,
} from '../app/src/features/creator-decision/literaryReview'
import {
  countVisibleCharacters,
  draftTextFromBlocks,
  hasCompleteSceneEnding,
  withoutSceneDraftDirectionReceipt,
} from '../app/src/features/creator-decision/sceneDrafting'
import type { PairedLiteraryEvidenceBlock } from '../app/src/features/creator-decision/pairedLiteraryComparison'
import type {
  AuthorIntentContract,
  ContextSnapshot,
  CreationSession,
  LiteraryDimension,
  LiteraryFinding,
  LiteraryReview,
  NarrativeCandidate,
  SceneDraftRequest,
  SceneDraftResult,
} from '../app/src/features/creator-decision/types'
import { literaryDimensions } from '../app/src/features/creator-decision/types'
import {
  frozenPairedQualityFixtureById,
  frozenPairedQualityFixtureIds,
} from './fixtures/creator-frozen-paired-quality-fixture.mts'
import {
  assessOptionalLocalRepairEfficacy,
  compareOptionalLocalRepairPriority,
  executeBoundedOptionalLocalRepair,
  executeSingleEfficacyGuidedRepair,
  optionalLocalRepairNextAction,
  selectEfficacyGuidedRetryTarget,
} from './frozen-paired-quality-local-repair.mts'

type GenerationPath = 'direct_writer' | 'architect_writer_workflow'
type BlindLabel = 'candidate_a' | 'candidate_b'

interface LocalRepairCycleReceipt {
  dimension: LiteraryFinding['dimension']
  severity: LiteraryFinding['severity']
  confidence: LiteraryFinding['confidence']
  reviserAttempts: 1 | 2 | 3
  independentReviewDecision: 'pass' | 'reject' | 'not_run'
  preservedFactCount: number
  applied: boolean
  disposition:
    | 'applied'
    | 'initial_repair_failed_closed'
    | 'independent_review_failed_closed'
    | 'auditor_guided_revision_failed_closed'
    | 'rejected_by_auditor'
    | 'discarded_outside_length_or_ending_contract'
    | 'reverted_target_dimension_persisted'
    | 'reverted_author_direction_not_retained'
    | 'post_repair_direction_review_failed_closed'
  postRepairLiteraryReviewPerformed: boolean
  postRepairTargetDimensionFindingCount: number
  efficacyGuidedRetryPerformed: boolean
  efficacyGuidedRetryDecision:
    | 'not_run'
    | 'failed_closed'
    | 'rejected_by_auditor'
    | 'discarded_outside_length_or_ending_contract'
    | 'target_dimension_persisted'
    | 'passed_to_direction_review'
  postRepairDirectionReviewPerformed: boolean
  postRepairDirectionReviewDecision: 'pass' | 'reject' | 'not_run'
}

interface WorkflowRefinementReceipt {
  literaryReviewCompleted: boolean
  literaryReviewCount: number
  literaryFindingVerificationCount: number
  verifiedModelFindingCount: number
  rejectedModelFindingCount: number
  postRepairEfficacyReviewCount: number
  postRepairDirectionReviewCount: number
  actionableFindingCount: number
  reviewFocusSource: 'human_specified' | 'none'
  requestedFocusDimensions: LiteraryDimension[]
  focusFindingCounts: Array<{
    dimension: LiteraryDimension
    findingCountAcrossReviewPasses: number
  }>
  automaticFocusSelectionPerformed: false
  localRepairCycleLimit: 2
  efficacyGuidedRetryLimitPerCycle: 1
  efficacyGuidedRetryCount: number
  localRepairCycles: LocalRepairCycleReceipt[]
  appliedRepairCount: number
  wholeTextRewritePerformed: false
  authorTextOverwritten: false
}

interface FrozenCompactIntent {
  id: string
  sessionId: string
  revision: number
  status: 'locked'
  premise: string
  desiredReaderExperience: string
  coreChoice: string
  hardConstraints: string[]
  mustInclude: string[]
  mustNotResolve: string[]
  informationPolicy: { charactersMustNotKnow: string[] }
  sceneMechanismDirection?: AuthorIntentContract['sceneMechanismDirection']
}

interface RunManifest {
  pipelineId: string
  sequence: number
  role: string
  operation: string
  status: string
  privateDataBoundary: string
  canonCommitAllowed: boolean
}

const root = process.cwd()
const { values } = parseArgs({
  options: {
    output: {
      type: 'string',
      default: 'validation/creator-ui/frozen-paired-quality-real-trial-2026-07-16/summary.json',
    },
    model: { type: 'string' },
    'review-focus': { type: 'string' },
    'inject-verification-evidence-failure': { type: 'boolean', default: false },
    fixture: {
      type: 'string',
      default: frozenPairedQualityFixtureIds[0],
    },
  },
  strict: true,
})

const requestedReviewFocusDimensions = (() => {
  const raw = values['review-focus']
  if (!raw) return [] as LiteraryDimension[]
  const requested = [...new Set(raw.split(',').map(value => value.trim()).filter(Boolean))]
  const invalid = requested.filter(value => !literaryDimensions.includes(value as LiteraryDimension))
  if (invalid.length > 0) {
    throw new Error(`--review-focus contains unsupported literary dimensions: ${invalid.join(', ')}`)
  }
  return requested as LiteraryDimension[]
})()

function sha256(value: string | Uint8Array) {
  return createHash('sha256').update(value).digest('hex')
}

const localhostLongTaskFetch: typeof fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url)
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('Frozen quality trials only allow the long-task transport to call localhost over HTTP.')
  }
  if (init.signal?.aborted) throw new DOMException('The request was aborted.', 'AbortError')
  return new Promise<Response>((resolve, reject) => {
    const request = httpRequest(url, {
      method: init.method || 'GET',
      headers: init.headers as Record<string, string> | undefined,
    }, response => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(Buffer.from(chunk)))
      response.on('end', () => {
        init.signal?.removeEventListener('abort', onAbort)
        resolve(new Response(Buffer.concat(chunks), {
          status: response.statusCode || 500,
          statusText: response.statusMessage || '',
          headers: response.headers as Record<string, string>,
        }))
      })
    })
    const onAbort = () => request.destroy(new DOMException('The request was aborted.', 'AbortError'))
    init.signal?.addEventListener('abort', onAbort, { once: true })
    request.setTimeout(15 * 60 * 1000, () => {
      request.destroy(new Error('local_working_agent_request_timeout'))
    })
    request.on('error', error => {
      init.signal?.removeEventListener('abort', onAbort)
      reject(error)
    })
    if (init.body !== undefined && init.body !== null) {
      if (typeof init.body !== 'string' && !(init.body instanceof Uint8Array)) {
        request.destroy(new Error('Frozen quality trial transport only accepts string or byte request bodies.'))
        return
      }
      request.write(init.body)
    }
    request.end()
  })
}

globalThis.fetch = localhostLongTaskFetch

function freePort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : null
      server.close(error => error ? reject(error) : port ? resolve(port) : reject(new Error('No local port.')))
    })
  })
}

async function waitForHealth(url: string, output: { stderr: string; exited: boolean }) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (output.exited) throw new Error(`Working Agent bridge exited early: ${output.stderr}`)
    try {
      const response = await fetch(url)
      if (response.ok) return response.json() as Promise<{ status: string; operations: string[]; privateDraftsRemainLocal: boolean }>
    } catch {
      // The bridge may still be binding its port.
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`Working Agent bridge did not become ready: ${output.stderr}`)
}

async function findNamedFiles(directory: string, targetName: string): Promise<string[]> {
  const found: string[] = []
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch {
    return found
  }
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) found.push(...await findNamedFiles(absolute, targetName))
    if (entry.isFile() && entry.name === targetName) found.push(absolute)
  }
  return found
}

async function runManifests(logRoot: string) {
  const paths = await findNamedFiles(logRoot, 'run-manifest.json')
  const manifests = await Promise.all(paths.map(async manifestPath => (
    JSON.parse(await readFile(manifestPath, 'utf8')) as RunManifest
  )))
  return manifests.sort((left, right) => (
    left.pipelineId.localeCompare(right.pipelineId) || left.sequence - right.sequence
  ))
}

function evidenceBlocks(text: string, label: BlindLabel): PairedLiteraryEvidenceBlock[] {
  const chunks: string[] = []
  for (const paragraph of text.replaceAll('\r\n', '\n').split(/\n\s*\n|\n/u).map(item => item.trim()).filter(Boolean)) {
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
    }
    if (current) chunks.push(current)
  }
  assert.ok(chunks.length > 0)
  return chunks.map((text, index) => ({
    id: `${label}:block:${String(index + 1).padStart(3, '0')}`,
    text,
  }))
}

function domainReviewIntent(input: {
  compact: FrozenCompactIntent
  candidate: NarrativeCandidate
}) : AuthorIntentContract {
  const expectedCost = input.compact.sceneMechanismDirection?.tradeoff
    || '当前选择必须在本场形成可见代价'
  return {
    schemaVersion: 'author-intent.v1',
    id: input.compact.id,
    sessionId: input.compact.sessionId,
    revision: input.compact.revision,
    status: input.compact.status,
    readerExperience: {
      startEmotion: '压力已经到达现场',
      targetEmotion: input.compact.desiredReaderExperience,
      emotionalMovement: input.compact.desiredReaderExperience,
      intensity: 'moderate',
    },
    narrativeDelta: {
      startingCondition: input.compact.premise,
      endingCondition: input.compact.mustInclude.join('；'),
      mustChange: input.compact.coreChoice,
      mustNotResolve: [...input.compact.mustNotResolve],
      irreversibleChange: expectedCost,
    },
    characterAgency: {
      primaryActorId: input.candidate.strategyAxes.agencyOwnerId,
      currentGoal: input.candidate.oneSentenceMechanism || input.compact.premise,
      requiredChoice: input.compact.coreChoice,
      opposingForce: input.compact.hardConstraints.join('；'),
      expectedCost,
    },
    informationPolicy: {
      readerShouldKnow: [],
      readerShouldSuspect: [],
      charactersMustNotKnow: input.compact.informationPolicy.charactersMustNotKnow.map((information, index) => ({
        characterId: `restricted-character:${index + 1}`,
        information,
      })),
      delayedReveals: [...input.compact.mustNotResolve],
    },
    boundaries: {
      requiredElements: [...input.compact.mustInclude],
      forbiddenEffects: [...input.compact.hardConstraints, ...input.compact.mustNotResolve],
      protectedCharacterTraits: [],
    },
    sceneMechanismDirection: input.compact.sceneMechanismDirection,
    fieldSources: {
      'readerExperience.targetEmotion': 'author_explicit',
      'narrativeDelta.mustChange': 'author_explicit',
      'characterAgency.requiredChoice': 'author_explicit',
      'boundaries.requiredElements': 'author_explicit',
    },
    lockedFields: [
      'readerExperience.targetEmotion',
      'narrativeDelta.mustChange',
      'characterAgency.requiredChoice',
      'boundaries.requiredElements',
    ],
    agentAssumptions: [],
    unresolvedQuestions: [],
    createdAt: input.compact.sceneMechanismDirection?.selectedAt || '2026-07-16T00:00:00.000Z',
    lockedAt: input.compact.sceneMechanismDirection?.selectedAt || '2026-07-16T00:00:00.000Z',
  }
}

function selectLocalRepairFinding(input: {
  findings: LiteraryFinding[]
  draft: SceneDraftResult
  attemptedFindingSignatures: Set<string>
  focusDimensions: LiteraryDimension[]
}) {
  const candidates = input.findings.flatMap(finding => {
    if (
      finding.status !== 'active'
      || !['hard_block', 'revision_candidate'].includes(finding.severity)
      || finding.confidence === 'low'
    ) return []
    const evidenceBlockIds = Array.from(new Set(finding.evidence.map(item => item.blockId)))
    if (evidenceBlockIds.length !== 1) return []
    const targetBlock = input.draft.contentBlocks.find(block => block.id === evidenceBlockIds[0])
    if (!targetBlock || targetBlock.protected || finding.protectedBlockIds.includes(targetBlock.id)) return []
    const signature = `${finding.dimension}:${targetBlock.id}`
    if (input.attemptedFindingSignatures.has(signature)) return []
    return [{ finding, targetBlock, signature }]
  })
  candidates.sort((left, right) => compareOptionalLocalRepairPriority(
    left.finding,
    right.finding,
    input.focusDimensions,
  ))
  return candidates[0] || null
}

async function refineWorkflowCandidate(input: {
  baseUrl: string
  agent: ReturnType<typeof createLocalWorkingAgent>
  session: CreationSession
  intent: AuthorIntentContract
  candidate: NarrativeCandidate
  context: ContextSnapshot
  draft: SceneDraftResult
  targetLength: { minimum: number; maximum: number }
  focusDimensions: LiteraryDimension[]
}) {
  let currentDraft = input.draft
  const localRepairCycles: LocalRepairCycleReceipt[] = []
  const attemptedFindingSignatures = new Set<string>()
  let literaryReviewCount = 0
  let literaryFindingVerificationCount = 0
  let verifiedModelFindingCount = 0
  let rejectedModelFindingCount = 0
  let postRepairEfficacyReviewCount = 0
  let efficacyGuidedRetryCount = 0
  let postRepairDirectionReviewCount = 0
  let actionableFindingCount = 0
  let carriedReview: LiteraryReview | null = null
  const focusFindingCountByDimension = new Map<LiteraryDimension, number>(
    input.focusDimensions.map(dimension => [dimension, 0]),
  )

  const recordReview = (review: LiteraryReview) => {
    literaryReviewCount += 1
    if (review.modelFindingVerification) {
      literaryFindingVerificationCount += 1
      verifiedModelFindingCount += review.modelFindingVerification.verifiedFindingIds.length
      rejectedModelFindingCount += review.modelFindingVerification.rejectedFindingIds.length
    }
    for (const finding of review.findings) {
      if (!focusFindingCountByDimension.has(finding.dimension)) continue
      focusFindingCountByDimension.set(
        finding.dimension,
        (focusFindingCountByDimension.get(finding.dimension) || 0) + 1,
      )
    }
    actionableFindingCount += review.findings.filter(finding => (
      finding.status === 'active'
      && ['hard_block', 'revision_candidate'].includes(finding.severity)
    )).length
  }

  const reviewDraft = async (draft: SceneDraftResult) => {
    const review = await input.agent.reviewDraft({
      session: input.session,
      intent: input.intent,
      context: input.context,
      candidate: input.candidate,
      draft,
      focusDimensions: input.focusDimensions,
    })
    recordReview(review)
    return review
  }

  for (let cycle = 0; cycle < 2; cycle += 1) {
    const review = carriedReview || await reviewDraft(currentDraft)
    carriedReview = null
    const selected = selectLocalRepairFinding({
      findings: review.findings,
      draft: currentDraft,
      attemptedFindingSignatures,
      focusDimensions: input.focusDimensions,
    })
    if (!selected || !input.agent.proposeRepair || !input.agent.reviewRepair) break
    attemptedFindingSignatures.add(selected.signature)

    const repairInput = {
      session: input.session,
      intent: input.intent,
      context: input.context,
      candidate: input.candidate,
      draft: currentDraft,
      review,
      finding: selected.finding,
      targetBlock: selected.targetBlock,
    }
    const repairAttempt = await executeBoundedOptionalLocalRepair({
      proposeInitial: () => input.agent.proposeRepair!({ ...repairInput, attempt: 'initial' }),
      review: repair => input.agent.reviewRepair!({ ...repairInput, repair }),
      proposeAuditorRevision: (previousRepair, repairReview) => (
        input.agent.proposeRepair!({
          ...repairInput,
          attempt: 'auditor_revision',
          previousRepair,
          repairReview,
        })
      ),
    })
    if (repairAttempt.status === 'failed_closed') {
      localRepairCycles.push({
        dimension: selected.finding.dimension,
        severity: selected.finding.severity,
        confidence: selected.finding.confidence,
        reviserAttempts: repairAttempt.reviserAttempts,
        independentReviewDecision: repairAttempt.independentReviewDecision,
        preservedFactCount: repairAttempt.preservedFactCount,
        applied: false,
        disposition: repairAttempt.disposition,
        postRepairLiteraryReviewPerformed: false,
        postRepairTargetDimensionFindingCount: 0,
        efficacyGuidedRetryPerformed: false,
        efficacyGuidedRetryDecision: 'not_run',
        postRepairDirectionReviewPerformed: false,
        postRepairDirectionReviewDecision: 'not_run',
      })
      optionalLocalRepairNextAction(repairAttempt.disposition)
      continue
    }
    const { repair, independentReview, reviserAttempts } = repairAttempt

    const receiptBase = {
      dimension: selected.finding.dimension,
      severity: selected.finding.severity,
      confidence: selected.finding.confidence,
      reviserAttempts,
      independentReviewDecision: independentReview.decision,
      preservedFactCount: repair.preservedFacts.length,
    }
    if (independentReview.decision === 'reject') {
      localRepairCycles.push({
        ...receiptBase,
        applied: false,
        disposition: 'rejected_by_auditor',
        postRepairLiteraryReviewPerformed: false,
        postRepairTargetDimensionFindingCount: 0,
        efficacyGuidedRetryPerformed: false,
        efficacyGuidedRetryDecision: 'not_run',
        postRepairDirectionReviewPerformed: false,
        postRepairDirectionReviewDecision: 'not_run',
      })
      optionalLocalRepairNextAction('rejected_by_auditor')
      continue
    }

    const proposal = createRepairProposal({
      id: `quality-trial-repair:${randomUUID()}`,
      review,
      findingId: selected.finding.id,
      operation: repair.operation,
      proposedContent: repair.proposedContent,
      preservedFacts: repair.preservedFacts.map(item => item.fact),
      targetBlockIds: [selected.targetBlock.id],
      verification: independentReview,
    })
    const nextBlocks = applyRepairProposal({
      proposal,
      blocks: currentDraft.contentBlocks,
      currentDraftRevision: currentDraft.revision,
    })
    const nextText = draftTextFromBlocks(nextBlocks)
    const nextLength = countVisibleCharacters(nextText)
    if (
      nextLength < input.targetLength.minimum
      || nextLength > input.targetLength.maximum
      || !hasCompleteSceneEnding(nextText)
    ) {
      localRepairCycles.push({
        ...receiptBase,
        applied: false,
        disposition: 'discarded_outside_length_or_ending_contract',
        postRepairLiteraryReviewPerformed: false,
        postRepairTargetDimensionFindingCount: 0,
        efficacyGuidedRetryPerformed: false,
        efficacyGuidedRetryDecision: 'not_run',
        postRepairDirectionReviewPerformed: false,
        postRepairDirectionReviewDecision: 'not_run',
      })
      optionalLocalRepairNextAction('discarded_outside_length_or_ending_contract')
      continue
    }

    const proposedDraft: SceneDraftResult = {
      ...withoutSceneDraftDirectionReceipt(currentDraft),
      draftId: `quality-trial-draft:${randomUUID()}`,
      baseDraftRevision: currentDraft.revision,
      revision: currentDraft.revision + 1,
      contentBlocks: nextBlocks,
      status: 'current',
      createdAt: new Date().toISOString(),
    }
    const efficacyReview = await reviewDraft(proposedDraft)
    postRepairEfficacyReviewCount += 1
    const efficacy = assessOptionalLocalRepairEfficacy({
      targetDimension: selected.finding.dimension,
      findings: efficacyReview.findings,
    })
    let candidateForDirection = proposedDraft
    let reviewForCarry = efficacyReview
    let receiptForFinal: Omit<typeof receiptBase, 'reviserAttempts'> & {
      reviserAttempts: 1 | 2 | 3
    } = receiptBase
    let efficacyGuidedRetryPerformed = false
    let efficacyGuidedRetryDecision: LocalRepairCycleReceipt['efficacyGuidedRetryDecision'] = 'not_run'
    if (efficacy.decision === 'revert_original_candidate') {
      const retryTarget = selectEfficacyGuidedRetryTarget({
        targetDimension: selected.finding.dimension,
        findings: efficacyReview.findings,
        blocks: proposedDraft.contentBlocks,
      })
      const retryFinding = retryTarget
        ? efficacyReview.findings.find(finding => finding.id === retryTarget.findingId)
        : null
      const retryBlock = retryTarget
        ? proposedDraft.contentBlocks.find(block => block.id === retryTarget.targetBlockId)
        : null
      if (!retryFinding || !retryBlock) {
        localRepairCycles.push({
          ...receiptBase,
          applied: false,
          disposition: 'reverted_target_dimension_persisted',
          postRepairLiteraryReviewPerformed: true,
          postRepairTargetDimensionFindingCount: efficacy.activeTargetDimensionFindingCount,
          efficacyGuidedRetryPerformed: false,
          efficacyGuidedRetryDecision: 'not_run',
          postRepairDirectionReviewPerformed: false,
          postRepairDirectionReviewDecision: 'not_run',
        })
        optionalLocalRepairNextAction('reverted_target_dimension_persisted')
        continue
      }

      efficacyGuidedRetryPerformed = true
      efficacyGuidedRetryCount += 1
      const retryInput = {
        session: input.session,
        intent: input.intent,
        context: input.context,
        candidate: input.candidate,
        draft: proposedDraft,
        review: efficacyReview,
        finding: retryFinding,
        targetBlock: retryBlock,
      }
      const retryAttempt = await executeSingleEfficacyGuidedRepair({
        propose: () => input.agent.proposeRepair!({ ...retryInput, attempt: 'efficacy_retry' }),
        review: retryRepair => input.agent.reviewRepair!({
          ...retryInput,
          attempt: 'efficacy_retry',
          repair: retryRepair,
        }),
      })
      const combinedReviserAttempts = (reviserAttempts + 1) as 2 | 3
      receiptForFinal = { ...receiptBase, reviserAttempts: combinedReviserAttempts }
      if (retryAttempt.status !== 'completed') {
        efficacyGuidedRetryDecision = retryAttempt.status === 'rejected'
          ? 'rejected_by_auditor'
          : 'failed_closed'
        localRepairCycles.push({
          ...receiptForFinal,
          applied: false,
          disposition: 'reverted_target_dimension_persisted',
          postRepairLiteraryReviewPerformed: true,
          postRepairTargetDimensionFindingCount: efficacy.activeTargetDimensionFindingCount,
          efficacyGuidedRetryPerformed,
          efficacyGuidedRetryDecision,
          postRepairDirectionReviewPerformed: false,
          postRepairDirectionReviewDecision: 'not_run',
        })
        optionalLocalRepairNextAction('reverted_target_dimension_persisted')
        continue
      }

      const retryProposal = createRepairProposal({
        id: `quality-trial-efficacy-retry:${randomUUID()}`,
        review: efficacyReview,
        findingId: retryFinding.id,
        operation: retryAttempt.repair.operation,
        proposedContent: retryAttempt.repair.proposedContent,
        preservedFacts: retryAttempt.repair.preservedFacts.map(item => item.fact),
        targetBlockIds: [retryBlock.id],
        verification: retryAttempt.independentReview,
      })
      const retryBlocks = applyRepairProposal({
        proposal: retryProposal,
        blocks: proposedDraft.contentBlocks,
        currentDraftRevision: proposedDraft.revision,
      })
      const retryText = draftTextFromBlocks(retryBlocks)
      const retryLength = countVisibleCharacters(retryText)
      if (
        retryLength < input.targetLength.minimum
        || retryLength > input.targetLength.maximum
        || !hasCompleteSceneEnding(retryText)
      ) {
        efficacyGuidedRetryDecision = 'discarded_outside_length_or_ending_contract'
        localRepairCycles.push({
          ...receiptForFinal,
          applied: false,
          disposition: 'reverted_target_dimension_persisted',
          postRepairLiteraryReviewPerformed: true,
          postRepairTargetDimensionFindingCount: efficacy.activeTargetDimensionFindingCount,
          efficacyGuidedRetryPerformed,
          efficacyGuidedRetryDecision,
          postRepairDirectionReviewPerformed: false,
          postRepairDirectionReviewDecision: 'not_run',
        })
        optionalLocalRepairNextAction('reverted_target_dimension_persisted')
        continue
      }

      const retryDraft: SceneDraftResult = {
        ...withoutSceneDraftDirectionReceipt(proposedDraft),
        draftId: `quality-trial-efficacy-retry-draft:${randomUUID()}`,
        baseDraftRevision: proposedDraft.revision,
        revision: proposedDraft.revision + 1,
        contentBlocks: retryBlocks,
        status: 'current',
        createdAt: new Date().toISOString(),
      }
      const retryEfficacyReview = await reviewDraft(retryDraft)
      postRepairEfficacyReviewCount += 1
      const retryEfficacy = assessOptionalLocalRepairEfficacy({
        targetDimension: selected.finding.dimension,
        findings: retryEfficacyReview.findings,
      })
      if (retryEfficacy.decision === 'revert_original_candidate') {
        efficacyGuidedRetryDecision = 'target_dimension_persisted'
        localRepairCycles.push({
          ...receiptForFinal,
          applied: false,
          disposition: 'reverted_target_dimension_persisted',
          postRepairLiteraryReviewPerformed: true,
          postRepairTargetDimensionFindingCount: retryEfficacy.activeTargetDimensionFindingCount,
          efficacyGuidedRetryPerformed,
          efficacyGuidedRetryDecision,
          postRepairDirectionReviewPerformed: false,
          postRepairDirectionReviewDecision: 'not_run',
        })
        optionalLocalRepairNextAction('reverted_target_dimension_persisted')
        continue
      }
      efficacyGuidedRetryDecision = 'passed_to_direction_review'
      candidateForDirection = retryDraft
      reviewForCarry = retryEfficacyReview
    }

    const directionReviewAttempt = await requestSceneAuthorDirectionDraftReviewFromWorkingAgent({
      baseUrl: input.baseUrl,
      intent: input.intent,
      draft: candidateForDirection,
    }).then(review => ({ ok: true as const, review })).catch(() => ({ ok: false as const }))
    if (!directionReviewAttempt.ok) {
      localRepairCycles.push({
        ...receiptForFinal,
        applied: false,
        disposition: 'post_repair_direction_review_failed_closed',
        postRepairLiteraryReviewPerformed: true,
        postRepairTargetDimensionFindingCount: 0,
        efficacyGuidedRetryPerformed,
        efficacyGuidedRetryDecision,
        postRepairDirectionReviewPerformed: false,
        postRepairDirectionReviewDecision: 'not_run',
      })
      optionalLocalRepairNextAction('post_repair_direction_review_failed_closed')
      continue
    }
    postRepairDirectionReviewCount += 1
    if (directionReviewAttempt.review.decision === 'reject') {
      localRepairCycles.push({
        ...receiptForFinal,
        applied: false,
        disposition: 'reverted_author_direction_not_retained',
        postRepairLiteraryReviewPerformed: true,
        postRepairTargetDimensionFindingCount: 0,
        efficacyGuidedRetryPerformed,
        efficacyGuidedRetryDecision,
        postRepairDirectionReviewPerformed: true,
        postRepairDirectionReviewDecision: 'reject',
      })
      optionalLocalRepairNextAction('reverted_author_direction_not_retained')
      continue
    }

    currentDraft = {
      ...candidateForDirection,
      directionReceipt: sceneDraftDirectionReceiptFromReview({
        review: directionReviewAttempt.review,
        draftBlocks: candidateForDirection.contentBlocks,
      }),
    }
    carriedReview = reviewForCarry
    localRepairCycles.push({
      ...receiptForFinal,
      applied: true,
      disposition: 'applied',
      postRepairLiteraryReviewPerformed: true,
      postRepairTargetDimensionFindingCount: 0,
      efficacyGuidedRetryPerformed,
      efficacyGuidedRetryDecision,
      postRepairDirectionReviewPerformed: true,
      postRepairDirectionReviewDecision: 'pass',
    })
    optionalLocalRepairNextAction('applied')
  }

  const receipt: WorkflowRefinementReceipt = {
    literaryReviewCompleted: literaryReviewCount > 0,
    literaryReviewCount,
    literaryFindingVerificationCount,
    verifiedModelFindingCount,
    rejectedModelFindingCount,
    postRepairEfficacyReviewCount,
    postRepairDirectionReviewCount,
    actionableFindingCount,
    reviewFocusSource: input.focusDimensions.length > 0 ? 'human_specified' : 'none',
    requestedFocusDimensions: input.focusDimensions,
    focusFindingCounts: input.focusDimensions.map(dimension => ({
      dimension,
      findingCountAcrossReviewPasses: focusFindingCountByDimension.get(dimension) || 0,
    })),
    automaticFocusSelectionPerformed: false,
    localRepairCycleLimit: 2,
    efficacyGuidedRetryLimitPerCycle: 1,
    efficacyGuidedRetryCount,
    localRepairCycles,
    appliedRepairCount: localRepairCycles.filter(item => item.applied).length,
    wholeTextRewritePerformed: false,
    authorTextOverwritten: false,
  }
  return { draft: currentDraft, receipt }
}

const outputPath = path.resolve(root, values.output)
const sandbox = await mkdtemp(path.join(tmpdir(), 'puf-frozen-paired-quality-'))
const logRoot = path.join(sandbox, 'parallel-universe-creator-working-agent')
const port = await freePort()
const baseUrl = `http://127.0.0.1:${port}`
const fixture = frozenPairedQualityFixtureById(values.fixture)
const childOutput = { stderr: '', exited: false }
const bridge = spawn(process.execPath, ['scripts/creator-working-agent-bridge.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    TMPDIR: sandbox,
      PUF_CREATOR_WORKING_AGENT_PORT: String(port),
      ...(values.model ? { PUF_CREATOR_WORKING_AGENT_MODEL: values.model } : {}),
      ...(values['inject-verification-evidence-failure']
        ? { PUF_CREATOR_TEST_INJECT_PAIRED_VERIFICATION_EVIDENCE_FAILURE: '1' }
        : {}),
  },
  stdio: ['ignore', 'ignore', 'pipe'],
})
bridge.stderr.on('data', chunk => { childOutput.stderr += chunk.toString() })
bridge.on('exit', () => { childOutput.exited = true })

let summary: Record<string, unknown> | null = null
try {
  const health = await waitForHealth(`${baseUrl}/health`, childOutput)
  assert.equal(health.status, 'ready')
  assert.equal(health.privateDraftsRemainLocal, true)
  for (const operation of [
    'direct_scene_draft',
    'scene_draft',
    'literary_review',
    'local_repair',
    'local_repair_review',
    'paired_literary_comparison',
    'paired_literary_comparison_verification',
  ]) assert.ok(health.operations.includes(operation), `Missing operation ${operation}`)

  const session = fixture.session as unknown as CreationSession
  const compactIntent = fixture.intent as unknown as FrozenCompactIntent
  const intent = compactIntent as unknown as AuthorIntentContract
  const candidate = fixture.selectedCandidate as unknown as NarrativeCandidate
  const context = fixture.context as unknown as ContextSnapshot
  const reviewIntent = domainReviewIntent({ compact: compactIntent, candidate })
  const targetLength = { minimum: 2700, maximum: 3400 }
  const commonBrief = {
    sceneId: fixture.session.sceneId,
    selectedDirection: fixture.selectedCandidate.oneSentenceMechanism,
    mechanismSignature: fixture.selectedCandidate.mechanismSignature,
    targetLength,
  }
  const request: SceneDraftRequest = {
    sessionId: session.id,
    intentId: intent.id,
    intentRevision: intent.revision,
    candidateId: candidate.id,
    candidateRevision: candidate.revision,
    contextSnapshotId: context.id,
    baseCanonRevision: context.canonRevision,
    baseDraftRevision: 0,
    scope: {
      type: 'scene',
      sceneId: session.sceneId,
      beatIds: candidate.beats.map(beat => beat.id),
      selectedBlockIds: [],
    },
    protectedBlockIds: [],
    targetLength,
    writingMode: 'agent_first_draft',
  }
  const forcedGenerationPath = process.env.PUF_CREATOR_PAIRED_DEBUG_FIRST_PATH as GenerationPath | undefined
  if (forcedGenerationPath && !['direct_writer', 'architect_writer_workflow'].includes(forcedGenerationPath)) {
    throw new Error('PUF_CREATOR_PAIRED_DEBUG_FIRST_PATH must name a supported generation path.')
  }
  const generationOrder: GenerationPath[] = forcedGenerationPath
    ? [forcedGenerationPath, forcedGenerationPath === 'direct_writer' ? 'architect_writer_workflow' : 'direct_writer']
    : randomBytes(1)[0]! % 2 === 0
      ? ['direct_writer', 'architect_writer_workflow']
      : ['architect_writer_workflow', 'direct_writer']
  const agent = createLocalWorkingAgent(baseUrl)
  let directResult: Awaited<ReturnType<typeof requestDirectSceneDraftFromWorkingAgent>> | null = null
  let workflowResult: Awaited<ReturnType<typeof agent.draftScene>> | null = null
  for (const pathName of generationOrder) {
    if (pathName === 'direct_writer') {
      directResult = await requestDirectSceneDraftFromWorkingAgent({
        baseUrl,
        payload: { comparisonId: fixture.fixtureId, commonBrief, session, intent, context },
      })
    } else {
      workflowResult = await agent.draftScene({ session, intent, candidate, context, request, currentBlocks: [] })
    }
  }
  assert.ok(directResult)
  assert.ok(workflowResult)
  const directText = directResult.body
  const rawWorkflowText = draftTextFromBlocks(workflowResult.contentBlocks)
  const workflowRefinement = await refineWorkflowCandidate({
    baseUrl,
    agent,
    session,
    intent: reviewIntent,
    candidate,
    context,
    draft: workflowResult,
    targetLength,
    focusDimensions: requestedReviewFocusDimensions,
  })
  const workflowText = draftTextFromBlocks(workflowRefinement.draft.contentBlocks)
  const directLength = countVisibleCharacters(directText)
  const rawWorkflowLength = countVisibleCharacters(rawWorkflowText)
  const workflowLength = countVisibleCharacters(workflowText)
  assert.ok(directLength >= targetLength.minimum && directLength <= targetLength.maximum)
  assert.ok(workflowLength >= targetLength.minimum && workflowLength <= targetLength.maximum)
  assert.equal(hasCompleteSceneEnding(directText), true)
  assert.equal(hasCompleteSceneEnding(workflowText), true)
  assert.notEqual(sha256(directText), sha256(workflowText))

  const mapping: Record<BlindLabel, GenerationPath> = randomBytes(1)[0]! % 2 === 0
    ? { candidate_a: 'direct_writer', candidate_b: 'architect_writer_workflow' }
    : { candidate_a: 'architect_writer_workflow', candidate_b: 'direct_writer' }
  const textByPath = { direct_writer: directText, architect_writer_workflow: workflowText }
  const candidateABlocks = evidenceBlocks(textByPath[mapping.candidate_a], 'candidate_a')
  const candidateBBlocks = evidenceBlocks(textByPath[mapping.candidate_b], 'candidate_b')
  const comparisonId = `frozen-paired-quality:${randomUUID()}`
  const sharedContext = {
    fixtureId: fixture.fixtureId,
    commonBrief,
    intent,
    context,
  }
  const firstPass = await requestPairedLiteraryComparisonFromWorkingAgent({
    baseUrl,
    comparisonId,
    sharedContext,
    candidateABlocks,
    candidateBBlocks,
  })
  const verification = await requestPairedLiteraryComparisonVerificationFromWorkingAgent({
    baseUrl,
    comparisonId,
    sharedContext,
    candidateABlocks,
    candidateBBlocks,
    comparison: firstPass.comparison,
  })
  const pathFor = (value: BlindLabel | 'tie') => value === 'tie' ? 'tie' : mapping[value]
  const dimensions = firstPass.comparison.dimensions.map(item => {
    const verified = verification.dimensions.find(candidate => candidate.dimension === item.dimension)!
    return {
      dimension: item.dimension,
      firstPassPreference: pathFor(item.preference),
      reasonCode: item.reasonCode,
      verificationDecision: verified.decision,
      confirmedPreference: verified.confirmedPreference ? pathFor(verified.confirmedPreference) : null,
      confirmedReasonCode: verified.confirmedReasonCode,
      confidence: item.confidence,
    }
  })
  const hardConstraints = firstPass.comparison.hardConstraints.map(item => {
    const verified = verification.hardConstraints.find(candidate => candidate.candidate === item.candidate)!
    return {
      path: mapping[item.candidate],
      firstPassStatus: item.status,
      violationType: item.violationType,
      reasonCode: item.reasonCode,
      verificationDecision: verified.decision,
      confirmedStatus: verified.confirmedStatus,
      confirmedViolationType: verified.confirmedViolationType,
      confirmedReasonCode: verified.confirmedReasonCode,
    }
  })
  const manifests = await runManifests(logRoot)
  for (const required of [
    ['Writer', 'direct_scene_draft'],
    ['Architect', 'scene_architecture'],
    ['Writer', 'scene_draft'],
    ['Auditor', 'literary_review'],
    ['Auditor', 'paired_literary_comparison'],
    ['Auditor', 'paired_literary_comparison_verification'],
  ]) assert.ok(manifests.some(item => item.role === required[0] && item.operation === required[1]))
  assert.ok(manifests.every(item => item.canonCommitAllowed === false))
  const verificationEvidenceRevisionApplied = manifests.some(item => (
    item.operation === 'paired_literary_comparison_verification_revision'
  ))
  const verificationFaultReceipt = values['inject-verification-evidence-failure']
    ? JSON.parse(await readFile(path.join(logRoot, 'paired-verification-evidence-fault-injection.json'), 'utf8'))
    : null
  if (values['inject-verification-evidence-failure']) {
    assert.equal(
      verificationFaultReceipt?.schemaVersion,
      'creator-paired-verification-evidence-fault-injection.v1',
      'Requested verifier evidence fault must leave a non-prose execution receipt.',
    )
    assert.equal(verificationFaultReceipt?.literaryDecisionChanged, false)
    assert.equal(verificationFaultReceipt?.hardConstraintChanged, false)
    assert.ok(
      verificationEvidenceRevisionApplied,
      'Injected verifier evidence failure must trigger one bounded verification evidence revision.',
    )
  }

  summary = {
    schemaVersion: 'creator-frozen-paired-quality-real-trial.v1',
    trialId: comparisonId,
    completedAt: new Date().toISOString(),
    fixture: {
      id: fixture.fixtureId,
      source: 'frozen_original_single_scene',
      inputSha256: sha256(JSON.stringify(fixture)),
      realWorkingAgent: true,
      realChapterMaterialUsed: false,
      authorDirectionPreselected: true,
    },
    fairness: {
      sameLockedIntent: true,
      sameContextSnapshot: true,
      sameManualRecall: true,
      sameSelectedDirection: true,
      sameTargetLength: true,
      sameWorkingAgentBridge: true,
      generationOrderRandomized: true,
      candidateLabelsRandomized: true,
      evaluatorSawGenerationPath: false,
      verifierSawGenerationPath: false,
      privateMappingSha256: sha256(JSON.stringify(mapping)),
      compositeLiteraryScoreUsed: false,
      literaryReviewFocusSource: requestedReviewFocusDimensions.length > 0 ? 'human_specified' : 'none',
      automaticReviewFocusSelectionPerformed: false,
    },
    candidates: {
      directWriter: { visibleLength: directLength, completeEnding: true, manuscriptSha256: sha256(directText) },
      architectWriterWorkflow: {
        rawVisibleLength: rawWorkflowLength,
        visibleLength: workflowLength,
        completeEnding: true,
        manuscriptSha256: sha256(workflowText),
        directionReceiptPresent: Boolean(workflowResult.directionReceipt),
        finalDirectionReceiptRetained: Boolean(workflowRefinement.draft.directionReceipt),
        refinement: workflowRefinement.receipt,
      },
    },
    evaluation: {
      comparisonAttempts: firstPass.attempts,
      evidenceRevisionApplied: firstPass.evidenceRevisionApplied,
      independentVerificationCompleted: true,
      verificationEvidenceFailureRequested: values['inject-verification-evidence-failure'],
      verificationEvidenceFailureInjected: Boolean(verificationFaultReceipt),
      verificationEvidenceFaultTargetDimension: verificationFaultReceipt?.targetDimension || null,
      verificationEvidenceRevisionApplied,
      dimensions,
      hardConstraints,
      overallWinnerDeclared: false,
      compositeLiteraryScoreUsed: false,
    },
    runtime: {
      realWorkingAgentCallCount: manifests.length,
      generationOrder,
      roleOperations: manifests.map(item => ({
        role: item.role,
        operation: item.operation,
        status: item.status,
        privateDataBoundary: item.privateDataBoundary,
        canonCommitAllowed: item.canonCommitAllowed,
      })),
    },
    boundaries: {
      repositoryWritePerformed: false,
      candidateAdopted: false,
      canonChanged: false,
      chapter20AccessedOrChanged: false,
      chapter21AccessedOrChanged: false,
      cloudDataChanged: false,
      publicationPerformed: false,
      rawDraftPersistedInRepository: false,
      rawBlindMappingPersistedInRepository: false,
      temporaryArtifactsDeletedAfterSummary: true,
    },
    limitations: [
      'One frozen original-scene comparison cannot establish statistical literary improvement.',
      'The comparison isolates direct Writer execution from the staged Architect and evidence-gated workflow under one preselected author direction.',
      'No candidate was adopted and no real chapter material was read or changed.',
    ],
  }
  const serialized = JSON.stringify(summary, null, 2)
  for (const privateText of [directText.slice(0, 30), rawWorkflowText.slice(0, 30), workflowText.slice(0, 30)]) {
    assert.equal(serialized.includes(privateText), false, 'Summary must not retain manuscript text.')
  }
  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${serialized}\n`, 'utf8')
  process.stdout.write(`${serialized}\n`)
} finally {
  bridge.kill('SIGTERM')
  await new Promise(resolve => bridge.once('exit', resolve))
  await rm(sandbox, { recursive: true, force: true })
}

assert.ok(summary)
