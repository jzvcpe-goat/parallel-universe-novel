import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { candidateDistance } from '../src/features/creator-decision/candidateSearch'
import { CreationDecisionWorkflow } from '../src/features/creator-decision/creationDecisionWorkflow'
import { referenceWritingAgent } from '../src/features/creator-decision/referenceWritingAgent'
import { createCreationSession } from '../src/features/creator-decision/stateMachine'
import { CreationDecisionError } from '../src/features/creator-decision/types'
import type {
  AuthorIntentContract,
  CreationContextSource,
  SceneDraftRequest,
} from '../src/features/creator-decision/types'
import { MemoryCreationDecisionRepository } from '../src/local-db/creatorLocalDecisionRepository'

type ValidationSeed = {
  id: string
  title: string
  genre: string
  inputProfile: 'complete' | 'ambiguous' | 'partial' | 'constraint_conflict' | 'long_input'
  userInput: string
  primaryActorId: string
  counterpartId: string
  currentGoal: string
  opposingForce: string
  requiredChoice: string
  expectedCost: string
  requiredElement: string
  hardConstraint: string
  protectedTrait: string
  targetEmotion: string
}

type SeedFile = {
  schemaVersion: 'creator-decision-validation-seeds.v1'
  seeds: ValidationSeed[]
}

function buildIntentSeed(seed: ValidationSeed): Partial<AuthorIntentContract> {
  const complete = seed.inputProfile === 'complete'
  return {
    readerExperience: {
      startEmotion: complete ? '尚未确认人物是否会行动' : '',
      targetEmotion: complete ? seed.targetEmotion : '',
      emotionalMovement: complete ? '从怀疑走向确认' : '',
      intensity: 'restrained',
    },
    narrativeDelta: {
      startingCondition: complete ? '人物仍处于旧秩序中' : '',
      endingCondition: complete ? '人物已经用行动改变旧秩序' : '',
      mustChange: complete ? seed.requiredElement : '',
      mustNotResolve: [seed.hardConstraint],
      irreversibleChange: complete ? seed.requiredElement : null,
    },
    characterAgency: {
      primaryActorId: seed.primaryActorId,
      currentGoal: seed.currentGoal,
      requiredChoice: complete ? seed.requiredChoice : '',
      opposingForce: seed.opposingForce,
      expectedCost: complete ? seed.expectedCost : '',
    },
    informationPolicy: {
      readerShouldKnow: complete ? [seed.targetEmotion] : [],
      readerShouldSuspect: [],
      charactersMustNotKnow: complete
        ? [{ characterId: seed.counterpartId, information: seed.hardConstraint }]
        : [],
      delayedReveals: [seed.hardConstraint],
    },
    boundaries: {
      requiredElements: [seed.requiredElement],
      forbiddenEffects: [seed.hardConstraint],
      protectedCharacterTraits: [seed.protectedTrait],
    },
  }
}

function buildContextSource(seed: ValidationSeed): CreationContextSource {
  return {
    canonRevision: 1,
    kernelRevision: 1,
    constraintRevision: 1,
    activeCharacters: [
      {
        id: seed.primaryActorId,
        goal: seed.currentGoal,
        state: { sceneRole: 'agency_owner' },
        belief: [seed.protectedTrait],
        knowledge: [seed.requiredElement],
        falseBeliefs: [],
        emotionalState: '克制但正在作出选择',
        resources: ['当前场景可见资源'],
      },
      {
        id: seed.counterpartId,
        goal: seed.opposingForce,
        state: { sceneRole: 'opposing_force' },
        belief: ['现有秩序仍可维持'],
        knowledge: [],
        falseBeliefs: [seed.hardConstraint],
        emotionalState: '尚未理解人物选择',
        resources: ['旧秩序提供的优势'],
      },
    ],
    relevantRelationships: [{ left: seed.primaryActorId, right: seed.counterpartId, pressure: seed.opposingForce }],
    activePromises: [`后续必须兑现：${seed.expectedCost || seed.requiredElement}`],
    unresolvedForeshadowing: [seed.hardConstraint],
    currentTimeline: { day: 1, period: 'scene', elapsedMinutes: 0 },
    relevantWorldRules: [seed.genre],
    kernelRules: ['人物选择必须通过行动产生可见后果'],
    hardConstraints: [seed.hardConstraint],
    relevantRegressionExamples: ['不得用解释替代行动', '不得越过场景范围'],
    recentSceneSummaries: [{ sceneId: `${seed.id}:prior`, summary: seed.userInput, relevanceReason: '固定验证任务的直接前情' }],
    styleSamples: [{ sourceBlockId: `${seed.id}:style`, text: '他停了一下，把真正要说的话留在动作之后。', reason: '克制叙述参考' }],
    manifest: [{ sourceId: seed.id, sourceRevision: 1, authority: 'author', includedReason: 'fixed_validation_seed' }],
  }
}

const seedPath = resolve(process.cwd(), '../validation/story_seeds.json')
const seedFile = JSON.parse(await readFile(seedPath, 'utf8')) as SeedFile
assert.equal(seedFile.schemaVersion, 'creator-decision-validation-seeds.v1')
assert.ok(seedFile.seeds.length >= 10, 'offline validation requires at least ten fixed scenes')
assert.equal(new Set(seedFile.seeds.map(seed => seed.id)).size, seedFile.seeds.length)

const results = []
for (const [index, seed] of seedFile.seeds.entries()) {
  const startedAt = performance.now()
  const repository = new MemoryCreationDecisionRepository()
  const workflow = new CreationDecisionWorkflow(repository, referenceWritingAgent)
  const session = createCreationSession({
    id: `validation-session:${seed.id}`,
    workId: `validation-work:${seed.id}`,
    chapterId: `validation-chapter:${seed.id}`,
    sceneId: `validation-scene:${seed.id}`,
    branchId: 'validation-branch:main',
    baseCanonRevision: 0,
    now: `2026-07-13T12:${String(index).padStart(2, '0')}:00.000Z`,
  })
  await repository.saveSession(session)
  let snapshot = await workflow.reload(session.id)
  const command = await workflow.proposeIntent({ snapshot, seed: buildIntentSeed(seed) })
  snapshot = command.snapshot
  const questionCount = command.value.unresolvedQuestions.length
  assert.ok(questionCount <= 2, `${seed.id} exceeded the two-question ceiling`)

  if (questionCount > 0) {
    await assert.rejects(
      () => workflow.lockIntent(snapshot),
      error => error instanceof CreationDecisionError && error.code === 'intent_incomplete',
      `${seed.id} must not lock intent when the author declines blocking questions`,
    )
  }

  for (const question of command.value.unresolvedQuestions) {
    const answer = await workflow.answerIntent({
      snapshot,
      questionId: question.id,
      optionId: question.options[0]?.id,
    })
    snapshot = answer.snapshot
  }

  const locked = await workflow.lockIntent(snapshot)
  snapshot = locked.snapshot
  const searched = await workflow.searchCandidates({ snapshot, source: buildContextSource(seed) })
  snapshot = searched.snapshot
  assert.ok(searched.value.candidates.length >= 2 && searched.value.candidates.length <= 3)
  assert.ok(searched.value.candidates.every(candidate => candidate.validation.hardConstraintPassed))
  for (let left = 0; left < searched.value.candidates.length; left += 1) {
    for (let right = left + 1; right < searched.value.candidates.length; right += 1) {
      assert.ok(candidateDistance(searched.value.candidates[left], searched.value.candidates[right]) >= 2)
    }
  }

  const selected = await workflow.selectCandidate({ snapshot, candidateId: searched.value.candidates[0].id })
  snapshot = selected.snapshot
  const contextSnapshotId = snapshot.contexts.find(context => context.status === 'active')?.id
  assert.ok(contextSnapshotId)
  const request: SceneDraftRequest = {
    sessionId: snapshot.session.id,
    intentId: locked.value.id,
    intentRevision: locked.value.revision,
    candidateId: selected.value.id,
    candidateRevision: selected.value.revision,
    contextSnapshotId,
    baseCanonRevision: snapshot.session.baseCanonRevision,
    baseDraftRevision: snapshot.session.currentDraftRevision,
    scope: { type: 'scene', sceneId: snapshot.session.sceneId, beatIds: [], selectedBlockIds: [] },
    protectedBlockIds: [],
    targetLength: { minimum: 120, maximum: 900 },
    writingMode: 'agent_first_draft',
  }
  const generated = await workflow.generateSceneDraft({ snapshot, request, currentBlocks: [] })
  snapshot = generated.snapshot
  assert.equal(generated.value.status, 'current')
  assert.equal(snapshot.session.activeDraftId, null, 'generation must not silently adopt a candidate')
  assert.equal(await repository.loadCanonState(session.workId, session.chapterId), null, 'generation must not write canon')

  const adopted = await workflow.adoptSceneDraft({ snapshot, draftId: generated.value.draftId })
  snapshot = adopted.snapshot
  const reviewed = await workflow.reviewDraft({ snapshot })
  assert.ok(reviewed.value.findings.every(finding => finding.evidence.length > 0))
  assert.equal(await repository.loadCanonState(session.workId, session.chapterId), null, 'review must not write canon')

  results.push({
    seedId: seed.id,
    inputProfile: seed.inputProfile,
    questionCount,
    candidateCount: searched.value.candidates.length,
    candidateTitles: searched.value.candidates.map(candidate => candidate.title),
    generatedFreshnessStatus: generated.value.status,
    adoptedBeforeAuthorAction: false,
    reviewFindingCount: reviewed.value.findings.length,
    canonWritten: false,
    elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
  })
}

const report = {
  schemaVersion: 'creator-decision-offline-validation.v1',
  status: 'pass',
  adapter: 'referenceWritingAgent',
  purpose: 'workflow_and_constraint_validation_only',
  realModelQualityCompared: false,
  directPromptBaselineCompared: false,
  seedCount: results.length,
  twoQuestionCeilingPassed: results.every(result => result.questionCount <= 2),
  candidateFirstPassed: results.every(result => !result.adoptedBeforeAuthorAction),
  canonIsolationPassed: results.every(result => !result.canonWritten),
  results,
}

if (process.env.CREATOR_VALIDATION_OUTPUT) {
  const outputPath = resolve(process.cwd(), process.env.CREATOR_VALIDATION_OUTPUT)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

console.log(`[creator-decision-offline-validation] PASS (${results.length} fixed scenes)`)
