import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseArgs } from 'node:util'
import { strFromU8, unzipSync } from 'fflate'
import {
  createLocalWorkingAgent,
  requestLongformContinuityReviewFromWorkingAgent,
  requestLongformContinuityVerificationFromWorkingAgent,
} from '../app/src/features/creator-decision/localWorkingAgent'
import { evidenceForText } from '../app/src/features/creator-decision/literaryReview'
import { rebaseDraftBlockOffsets } from '../app/src/features/creator-decision/sceneDrafting'
import { localCanonStateRecordSchema } from '../app/src/features/creator-decision/schemas'
import type {
  AuthorIntentContract,
  ContextSnapshot,
  CreationSession,
  LiteraryFinding,
  LiteraryReview,
  NarrativeCandidate,
  SceneDraftResult,
} from '../app/src/features/creator-decision/types'
import type {
  LongformContinuityChapter,
  LongformContinuityReview,
  LongformContinuityVerification,
} from '../app/src/features/creator-decision/longformContinuity'

interface WorkspaceRecord {
  family: string
  value: unknown
}

interface WorkspaceExport {
  schemaVersion: number
  records: WorkspaceRecord[]
}

interface ContinuityCampaignSummary {
  campaignId: string
  scope: {
    workId: string
    fromChapter: number
    toChapter: number
    workspaceArchiveSha256: string
  }
  runtime: { privateArtifactsDirectory: string }
}

interface PrivateWindowReview {
  windowStart: number
  windowEnd: number
  review: LongformContinuityReview
  locatedFindings: Array<{ findingIndex: number; sourceBlockId: string; targetBlockId: string }>
  verification: LongformContinuityVerification
}

interface RunManifest {
  schemaVersion: string
  role: string
  operation: string
  status: string
  startedAt: string
  privateDataBoundary: string
  canonCommitAllowed: boolean
}

const { values } = parseArgs({
  options: {
    workspace: { type: 'string' },
    campaignSummary: { type: 'string' },
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

async function trialRuns(trialId: string, startedAfter: number) {
  const paths = await namedFiles(join(tmpdir(), 'parallel-universe-creator-working-agent'), 'run-manifest.json')
  const runs: RunManifest[] = []
  for (const manifestPath of paths) {
    try {
      const [manifestText, prompt] = await Promise.all([
        readFile(manifestPath, 'utf8'),
        readFile(join(dirname(manifestPath), 'prompt.txt'), 'utf8'),
      ])
      const manifest = JSON.parse(manifestText) as RunManifest
      if (prompt.includes(trialId) && Date.parse(manifest.startedAt) >= startedAfter - 1_000) runs.push(manifest)
    } catch {
      // Ignore unrelated incomplete local runs.
    }
  }
  return runs.sort((left, right) => Date.parse(left.startedAt) - Date.parse(right.startedAt))
}

const workspacePath = required('workspace')
const campaignSummaryPath = required('campaignSummary')
const outputDir = required('outputDir')
const baseUrl = required('baseUrl').replace(/\/$/, '')
const campaignSummary = JSON.parse(await readFile(campaignSummaryPath, 'utf8')) as ContinuityCampaignSummary
assert.ok(campaignSummary.scope.toChapter <= 20, 'The repair trial must not cross the Chapter 20 stop line.')

const workspaceBytes = new Uint8Array(await readFile(workspacePath))
const workspaceHashBefore = sha256(workspaceBytes)
assert.equal(workspaceHashBefore, campaignSummary.scope.workspaceArchiveSha256, 'Campaign and repair trial use different workspaces.')
const archive = unzipSync(workspaceBytes)
const recordsBytes = archive['records.json']
assert.ok(recordsBytes, 'Workspace archive must contain records.json.')
const workspace = JSON.parse(strFromU8(recordsBytes)) as WorkspaceExport

const canonByChapter = new Map<number, ReturnType<typeof localCanonStateRecordSchema.parse>>()
for (const record of workspace.records) {
  if (record.family !== 'localCanonStates') continue
  const canon = localCanonStateRecordSchema.parse(record.value)
  if (canon.workId !== campaignSummary.scope.workId) continue
  const number = chapterNumber(canon.chapterId)
  if (!number || number < campaignSummary.scope.fromChapter || number > campaignSummary.scope.toChapter) continue
  const existing = canonByChapter.get(number)
  if (!existing || canon.revision > existing.revision) canonByChapter.set(number, canon)
}

const privateReviews = JSON.parse(await readFile(
  join(campaignSummary.runtime.privateArtifactsDirectory, 'reviews.json'),
  'utf8',
)) as PrivateWindowReview[]
const trialId = `continuity-repair:${campaignSummary.scope.workId}:${Date.now()}:${randomUUID()}`
const startedAt = Date.now()
const privateDirectory = join(tmpdir(), trialId.replace(/[^a-zA-Z0-9:_-]/gu, '_'))
await mkdir(privateDirectory, { recursive: true })

const agent = createLocalWorkingAgent(baseUrl)
assert.ok(agent.proposeRepair && agent.reviewRepair, 'Local Working Agent must expose Reviser and repair Auditor operations.')
const modifiedChapters = new Map<number, LongformContinuityChapter>()
for (let number = campaignSummary.scope.fromChapter; number <= campaignSummary.scope.toChapter; number += 1) {
  const canon = canonByChapter.get(number)
  assert.ok(canon, `Chapter ${number} is missing a local Canon record.`)
  modifiedChapters.set(number, {
    chapterNumber: number,
    chapterId: canon.chapterId,
    blocks: canon.acceptedContentBlocks.map(block => ({ id: block.id, text: block.text })),
  })
}

const rawRepairTrials: Array<Record<string, unknown>> = []
const repairResults: Array<{
  windowStart: number
  windowEnd: number
  dimension: string
  chapter: number
  targetBlockId: string
  attemptCount: number
  repairReviewDecision: 'pass' | 'reject'
  candidateSha256: string | null
}> = []

for (const window of privateReviews) {
  for (const verification of window.verification.items) {
    if (
      verification.decision !== 'verify'
      || verification.confirmedSeverity === 'watch'
      || verification.confirmedSeverity === null
    ) continue
    const sourceFinding = window.review.findings[verification.findingIndex]
    const located = window.locatedFindings.find(item => item.findingIndex === verification.findingIndex)
    assert.ok(sourceFinding && located, 'A verified finding lost its located repair target.')
    const sourceCanon = canonByChapter.get(sourceFinding.fromChapter)
    const targetCanon = canonByChapter.get(sourceFinding.toChapter)
    assert.ok(sourceCanon && targetCanon, 'A repair trial references a chapter outside the accepted workspace.')
    const draftBlocks = rebaseDraftBlockOffsets(targetCanon.acceptedContentBlocks.map(block => ({
      ...block,
      protected: false,
    })))
    const targetBlock = draftBlocks.find(block => block.id === located.targetBlockId)
    assert.ok(targetBlock, 'The located target block is absent from the accepted target chapter.')
    const evidence = evidenceForText(targetBlock, sourceFinding.targetEvidenceQuote)
    assert.ok(evidence, 'The repair finding target quote is no longer present in the accepted chapter.')

    const now = new Date().toISOString()
    const sessionId = `${trialId}:chapter:${sourceFinding.toChapter}`
    const intentId = `${sessionId}:intent`
    const contextId = `${sessionId}:context`
    const candidateId = `${sessionId}:candidate`
    const draftId = `${sessionId}:draft`
    const session: CreationSession = {
      schemaVersion: 'creation-session.v1',
      id: sessionId,
      workId: campaignSummary.scope.workId,
      chapterId: targetCanon.chapterId,
      sceneId: null,
      branchId: targetCanon.branchId,
      phase: 'reviewing',
      baseCanonRevision: targetCanon.revision,
      currentIntentRevision: 1,
      currentCandidateRevision: 1,
      currentDraftRevision: targetCanon.acceptedDraftRevision,
      lockedIntentId: intentId,
      selectedCandidateId: candidateId,
      activeDraftId: draftId,
      activeReviewId: `${sessionId}:review`,
      proposedCanonPatchId: null,
      createdAt: now,
      updatedAt: now,
    }
    const intent: AuthorIntentContract = {
      schemaVersion: 'author-intent.v1',
      id: intentId,
      sessionId,
      revision: 1,
      status: 'locked',
      readerExperience: {
        startEmotion: '保持原有阅读节奏',
        targetEmotion: '消除连续性断点',
        emotionalMovement: '仅修复已证实的局部问题',
        intensity: 'restrained',
      },
      narrativeDelta: {
        startingCondition: sourceFinding.observed,
        endingCondition: sourceFinding.expected,
        mustChange: sourceFinding.repairDirection,
        mustNotResolve: ['不得扩写下一章', '不得增加未经正史支持的新事实'],
        irreversibleChange: null,
      },
      characterAgency: {
        primaryActorId: 'character:continuity-repair',
        currentGoal: '保持原正文行动与信息顺序',
        requiredChoice: '只修复已定位的连续性问题',
        opposingForce: '局部修订可能误删原有事实',
        expectedCost: '不得以扩大改写范围换取流畅度',
      },
      informationPolicy: {
        readerShouldKnow: [sourceFinding.expected],
        readerShouldSuspect: [],
        charactersMustNotKnow: [],
        delayedReveals: [],
      },
      boundaries: {
        requiredElements: [sourceFinding.sourceEvidenceQuote],
        forbiddenEffects: ['重写整章', '修改前章', '提交正史'],
        protectedCharacterTraits: [],
      },
      fieldSources: { repairDirection: 'author_selected' },
      lockedFields: ['narrativeDelta.mustChange', 'boundaries.forbiddenEffects'],
      agentAssumptions: [],
      unresolvedQuestions: [],
      createdAt: now,
      lockedAt: now,
    }
    const context: ContextSnapshot = {
      schemaVersion: 'context-snapshot.v1',
      id: contextId,
      compilationPolicyVersion: 1,
      sourceFingerprint: sha256(`${sourceFinding.sourceEvidenceQuote}:${sourceFinding.targetEvidenceQuote}`),
      sessionId,
      intentRevision: 1,
      workId: campaignSummary.scope.workId,
      chapterId: targetCanon.chapterId,
      sceneId: null,
      canonRevision: targetCanon.revision,
      kernelRevision: 0,
      constraintRevision: 0,
      activeCharacters: [],
      relevantRelationships: [],
      activePromises: [],
      unresolvedForeshadowing: [],
      currentTimeline: null,
      relevantWorldRules: [],
      kernelRules: ['只允许单块局部修订候选。'],
      hardConstraints: [
        `前章正史证据：${sourceFinding.sourceEvidenceQuote}`,
        sourceFinding.repairDirection,
        '不得覆盖用户已有修改或改变未定位正文块。',
      ],
      relevantRegressionExamples: [],
      recentSceneSummaries: [{
        sceneId: sourceCanon.chapterId,
        summary: sourceFinding.sourceEvidenceQuote,
        relevanceReason: `第 ${sourceFinding.fromChapter} 章正史对第 ${sourceFinding.toChapter} 章的连续性约束。`,
      }],
      styleSamples: [],
      manualRecallItems: sourceFinding.dimension === 'causal_handoff' ? [{
        id: `${sessionId}:manual-recall`,
        sourceId: sourceCanon.chapterId,
        sourceRevision: sourceCanon.revision,
        authority: 'canon',
        group: 'causal',
        statement: sourceFinding.sourceEvidenceQuote,
        sourceLabel: `第 ${sourceFinding.fromChapter} 章 · 本机已确认`,
        whyNow: '前章仍在生效的追逐后果必须由后章准确承接。',
        locator: {
          kind: 'canon',
          targetId: sourceCanon.chapterId,
          label: `定位到第 ${sourceFinding.fromChapter} 章正史`,
        },
      }] : [],
      manifest: [{
        sourceId: sourceCanon.chapterId,
        sourceRevision: sourceCanon.revision,
        authority: 'canon',
        includedReason: '相邻前章的已确认正文提供局部修订约束。',
      }],
      status: 'active',
      createdAt: now,
    }
    const candidate: NarrativeCandidate = {
      schemaVersion: 'narrative-candidate.v1',
      id: candidateId,
      sessionId,
      intentRevision: 1,
      contextSnapshotId: contextId,
      revision: 1,
      status: 'selected',
      title: '连续性局部修订',
      oneSentenceMechanism: sourceFinding.repairDirection,
      strategyAxes: {
        conflictMode: 'discovery',
        informationMode: 'partial_reveal',
        agencyOwnerId: 'character:continuity-repair',
        costType: '严格保留原事实',
        pacing: 'compressed',
        viewpointId: 'character:continuity-repair',
      },
      beats: [],
      projectedEffects: {
        stateChanges: [],
        irreversibleChanges: [],
        promisesCreated: [],
        promisesConsumed: [],
        futureDebts: [],
        characterCosts: [],
      },
      tradeoffs: {
        strengths: ['只修改一个已定位正文块'],
        risks: ['局部替换可能遗漏原块事实'],
        clicheRisks: [],
        uncertainties: [],
      },
      validation: { hardConstraintPassed: true, violations: [] },
    }
    const draft: SceneDraftResult = {
      schemaVersion: 'scene-draft.v1',
      draftId,
      sessionId,
      baseCanonRevision: targetCanon.revision,
      baseIntentRevision: 1,
      baseCandidateRevision: 1,
      baseDraftRevision: targetCanon.acceptedDraftRevision,
      revision: targetCanon.acceptedDraftRevision,
      contentBlocks: draftBlocks,
      unplannedFactProposals: [],
      observedStateChanges: [],
      status: 'current',
      createdAt: now,
    }
    const literaryFinding: LiteraryFinding = {
      id: `${sessionId}:finding:${verification.findingIndex}`,
      dimension: 'continuity',
      severity: 'revision_candidate',
      evidence: [evidence],
      expected: sourceFinding.expected,
      observed: sourceFinding.observed,
      readerImpact: sourceFinding.readerImpact,
      diagnosis: sourceFinding.diagnosis,
      repairDirection: sourceFinding.repairDirection,
      protectedBlockIds: [],
      confidence: sourceFinding.confidence,
      status: 'active',
    }
    const literaryReview: LiteraryReview = {
      schemaVersion: 'literary-review.v1',
      id: session.activeReviewId!,
      sessionId,
      contextSnapshotId: 'legacy-unbound-context',
      contextCompilationPolicyVersion: 0,
      contextSourceFingerprint: 'legacy-unfingerprinted',
      contextSnapshotFingerprint: 'legacy-unfingerprinted',
      draftId,
      baseCanonRevision: targetCanon.revision,
      baseIntentRevision: 1,
      baseCandidateRevision: 1,
      baseDraftRevision: draft.revision,
      findings: [literaryFinding],
      deterministicViolations: [],
      status: 'active',
      createdAt: now,
    }

    const input = {
      session,
      intent,
      context,
      candidate,
      draft,
      review: literaryReview,
      finding: literaryFinding,
      targetBlock,
    }
    const initialRepair = await agent.proposeRepair!({ ...input, attempt: 'initial' })
    const initialReview = await agent.reviewRepair!({ ...input, repair: initialRepair })
    let finalRepair = initialRepair
    let finalReview = initialReview
    let attemptCount = 1
    if (initialReview.decision === 'reject') {
      finalRepair = await agent.proposeRepair!({
        ...input,
        attempt: 'auditor_revision',
        previousRepair: initialRepair,
        repairReview: initialReview,
      })
      finalReview = await agent.reviewRepair!({ ...input, repair: finalRepair })
      attemptCount = 2
    }

    rawRepairTrials.push({
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
      sourceFinding,
      verification,
      initialRepair,
      initialReview,
      finalRepair,
      finalReview,
    })
    repairResults.push({
      windowStart: window.windowStart,
      windowEnd: window.windowEnd,
      dimension: sourceFinding.dimension,
      chapter: sourceFinding.toChapter,
      targetBlockId: targetBlock.id,
      attemptCount,
      repairReviewDecision: finalReview.decision,
      candidateSha256: finalReview.decision === 'pass' ? sha256(finalRepair.proposedContent) : null,
    })
    if (finalReview.decision === 'pass') {
      const modified = modifiedChapters.get(sourceFinding.toChapter)!
      modified.blocks = modified.blocks.map(block => block.id === targetBlock.id
        ? { ...block, text: finalRepair.proposedContent }
        : block)
    }
  }
}

const affectedWindows = privateReviews.filter(window => repairResults.some(result => (
  result.repairReviewDecision === 'pass'
  && result.windowStart === window.windowStart
  && result.windowEnd === window.windowEnd
)))
const inMemoryReviews: Array<{
  windowStart: number
  windowEnd: number
  review: LongformContinuityReview
  verification: LongformContinuityVerification
}> = []
for (const window of affectedWindows) {
  const chapters = Array.from(modifiedChapters.values()).filter(chapter => (
    chapter.chapterNumber >= window.windowStart && chapter.chapterNumber <= window.windowEnd
  ))
  const result = await requestLongformContinuityReviewFromWorkingAgent({
    baseUrl,
    campaignId: trialId,
    workId: campaignSummary.scope.workId,
    chapters,
  })
  const verification = await requestLongformContinuityVerificationFromWorkingAgent({
    baseUrl,
    campaignId: trialId,
    workId: campaignSummary.scope.workId,
    chapters,
    review: result.review,
  })
  inMemoryReviews.push({
    windowStart: window.windowStart,
    windowEnd: window.windowEnd,
    review: result.review,
    verification: verification.verification,
  })
}

const resolvedResults = repairResults.map(result => {
  if (result.repairReviewDecision !== 'pass') return { ...result, inMemoryRereviewResolved: false }
  const rerun = inMemoryReviews.find(item => (
    item.windowStart === result.windowStart && item.windowEnd === result.windowEnd
  ))
  assert.ok(rerun, 'A passing local repair was not re-reviewed in memory.')
  const stillActive = rerun.verification.items.some(item => {
    const finding = rerun.review.findings[item.findingIndex]
    return item.decision === 'verify'
      && finding?.dimension === result.dimension
      && finding.toChapter === result.chapter
  })
  return { ...result, inMemoryRereviewResolved: !stillActive }
})

await writeFile(join(privateDirectory, 'repair-trials.json'), `${JSON.stringify({
  rawRepairTrials,
  inMemoryReviews,
}, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })

const runs = await trialRuns(trialId, startedAt)
assert.ok(runs.length > 0, 'The repair trial did not record any local Working Agent runs.')
assert.ok(runs.every(run => (
  run.schemaVersion === 'creator-working-agent-run.v1'
  && run.status === 'succeeded'
  && run.privateDataBoundary === 'local_ephemeral'
  && run.canonCommitAllowed === false
)))
const workspaceHashAfter = sha256(new Uint8Array(await readFile(workspacePath)))
assert.equal(workspaceHashAfter, workspaceHashBefore, 'The repair trial changed its accepted workspace input.')

const summary = {
  schemaVersion: 'creator-continuity-repair-trial.v1',
  trialId,
  completedAt: new Date().toISOString(),
  scope: {
    workId: campaignSummary.scope.workId,
    fromChapter: campaignSummary.scope.fromChapter,
    toChapter: campaignSummary.scope.toChapter,
    stopLine: 20,
    sourceCampaignId: campaignSummary.campaignId,
    workspaceArchive: basename(workspacePath),
    workspaceArchiveSha256: workspaceHashBefore,
  },
  workflow: {
    sequence: [
      'Reviser',
      'repair Auditor',
      'in-memory continuity Auditor',
      'independent continuity verification gate (no model call when the re-review returns no findings)',
    ],
    realWorkingAgentCallCount: runs.length,
    independentContinuityVerificationCallCount: runs.filter(run => (
      run.operation === 'longform_continuity_verification'
    )).length,
    operationCounts: Object.fromEntries(Array.from(new Set(runs.map(run => run.operation))).sort().map(operation => [
      operation,
      runs.filter(run => run.operation === operation).length,
    ])),
    compositeLiteraryScoreUsed: false,
    exactEvidenceRequired: true,
    localBlockReplacementOnly: true,
  },
  results: {
    verifiedInputFindingCount: repairResults.length,
    repairAuditorPassedCount: resolvedResults.filter(result => result.repairReviewDecision === 'pass').length,
    repairAuditorRejectedCount: resolvedResults.filter(result => result.repairReviewDecision === 'reject').length,
    requiredSecondRepairAttemptCount: resolvedResults.filter(result => result.attemptCount === 2).length,
    inMemoryRereviewResolvedCount: resolvedResults.filter(result => result.inMemoryRereviewResolved).length,
    inMemoryRereviewFindingCount: inMemoryReviews.reduce((count, item) => count + item.review.findings.length, 0),
    items: resolvedResults.map(result => ({
      dimension: result.dimension,
      chapter: result.chapter,
      targetBlockId: result.targetBlockId,
      attemptCount: result.attemptCount,
      repairReviewDecision: result.repairReviewDecision,
      inMemoryRereviewResolved: result.inMemoryRereviewResolved,
      candidateSha256: result.candidateSha256,
    })),
  },
  runtime: {
    manifests: runs,
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
    candidateTextCopiedIntoRepositoryEvidence: false,
    repositoryEvidenceUsesHashesAndCountsOnly: true,
  },
  limitations: [
    'Passing candidates were applied only to an in-memory copy for re-review; the author has not adopted them.',
    'This trial proves two located adjacent-chapter repairs, not overall reader satisfaction or expert literary quality.',
  ],
}

await mkdir(outputDir, { recursive: true })
await writeFile(join(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
await writeFile(join(outputDir, 'README.md'), `# Chapter 1-20 Continuity Repair Trial\n\n- Verified findings entered: ${summary.results.verifiedInputFindingCount}\n- Repair Auditor passed: ${summary.results.repairAuditorPassedCount}\n- Repair Auditor rejected: ${summary.results.repairAuditorRejectedCount}\n- Needed one Auditor-guided retry: ${summary.results.requiredSecondRepairAttemptCount}\n- Resolved in an in-memory continuity re-review: ${summary.results.inMemoryRereviewResolvedCount}\n- Accepted prose or Canon changed: no\n- Chapter 21 accessed or changed: no\n- Composite literary score: not used\n\nRaw manuscripts, candidate text, and model reviews remain in the private temporary directory recorded by \`summary.json\`.\n`, { encoding: 'utf8', flag: 'wx' })

process.stdout.write(`${JSON.stringify({
  outputDir,
  trialId,
  verifiedInputFindings: summary.results.verifiedInputFindingCount,
  repairAuditorPassed: summary.results.repairAuditorPassedCount,
  repairAuditorRejected: summary.results.repairAuditorRejectedCount,
  inMemoryRereviewResolved: summary.results.inMemoryRereviewResolvedCount,
  realWorkingAgentCallCount: runs.length,
  workspaceChanged: false,
  chapter21AccessedOrChanged: false,
}, null, 2)}\n`)
