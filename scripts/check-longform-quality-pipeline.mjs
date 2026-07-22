import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  applyEvidencePatches,
  assertArcChapters,
  assertBlueprint,
  commitAcceptedChapter,
  countHanCharacters,
  deterministicChapterReview,
  initialRollingState,
  normalizeRollingState,
  reviewDecision,
  validateModelReview,
  validateStateProposalEvidence,
} from './longform-quality-lib.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const validationRoot = path.join(root, 'validation', 'longform')
const seeds = JSON.parse(await readFile(path.join(validationRoot, 'project-seeds.json'), 'utf8'))
const runnerSource = await readFile(path.join(root, 'scripts', 'run-longform-quality.mjs'), 'utf8')
const campaignSource = await readFile(path.join(root, 'scripts', 'run-longform-quality-campaign.mjs'), 'utf8')

assert.equal(seeds.schemaVersion, 'longform-seed-set.v1')
assert.equal(seeds.projects.length, 6, 'the frozen validation matrix must cover six distinct genres')
assert.equal(new Set(seeds.projects.map(project => project.category)).size, 6)
assert.equal(new Set(seeds.projects.map(project => project.protagonistName)).size, 6)
assert.equal(seeds.generationPolicy.chapterCountPerProject, 100)
assert.equal(seeds.generationPolicy.targetHanCharacters, 3000)
assert.equal(seeds.generationPolicy.candidateFirst, true)
assert.equal(seeds.generationPolicy.authorConfirmationRequired, true)
assert.equal(seeds.generationPolicy.maxCandidateAttemptsPerRun, 3)
assert.equal(seeds.generationPolicy.publicWriteAllowed, false)
for (const project of seeds.projects) {
  assert.ok(project.protagonistName)
  assert.ok(project.initialIdea.length >= 40, `${project.id} needs a concrete original seed`)
  assert.ok(project.questionOne.question && project.questionOne.answer)
  assert.ok(project.questionTwo.question && project.questionTwo.answer)
  assert.ok(project.intent.forbiddenShortcuts.length >= 4)
}

for (const schemaFile of [
  'story-blueprint.schema.json',
  'arc-chapters.schema.json',
  'chapter-draft.schema.json',
  'chapter-review.schema.json',
  'chapter-repair.schema.json',
  'chapter-title-repair.schema.json',
]) {
  const schema = JSON.parse(await readFile(path.join(validationRoot, 'schemas', schemaFile), 'utf8'))
  assert.equal(schema.type, 'object', `${schemaFile} must expose an object root`)
  assert.equal(schema.additionalProperties, false, `${schemaFile} must fail closed on unknown root fields`)
}

for (const forbidden of ['pmfSupabase', '@supabase', 'publishChapter(', 'billing', 'payment', 'entitlement']) {
  assert.equal(runnerSource.includes(forbidden), false, `long-form validation must not touch team-owned cloud/payment surface: ${forbidden}`)
}
assert.ok(runnerSource.includes("'artifacts', 'longform-quality'"), 'generated prose must stay in ignored artifacts by default')
assert.ok(runnerSource.includes("candidateStatus: 'accepted_to_local_validation_canon'"))
assert.ok(runnerSource.includes("authorType: 'simulated_validation_author'"))
assert.ok(runnerSource.includes('publicWriteAllowed: false'))
assert.ok(runnerSource.includes("schemaVersion: 'longform-human-workflow-simulation.v1'"))
assert.ok(runnerSource.includes("'two_author_questions'"))
assert.ok(runnerSource.includes("'one_hundred_chapter_cards'"))
assert.ok(runnerSource.includes('draft.title.trim() !== card.title.trim()'))
assert.ok(runnerSource.includes('metadata.title === plannedChapter?.title'))
assert.ok(campaignSource.includes("schemaVersion: 'longform-quality-campaign.v1'"))
assert.ok(campaignSource.includes("'--to', '100'"))
assert.ok(campaignSource.includes('campaign_report_failed'))
assert.ok(campaignSource.includes("claimBoundary: 'Only locally accepted validation chapters count. No public publication is performed.'"))

assert.equal(countHanCharacters('abc中文，测试。'), 4)

const project = seeds.projects[0]
const blueprint = {
  projectId: project.id,
  characters: Array.from({ length: 5 }, (_, index) => ({
    id: `character-${index}`,
    name: index === 0 ? project.protagonistName : `测试人物${index}`,
  })),
  locations: Array.from({ length: 6 }, (_, index) => ({ id: `location-${index}` })),
  arcs: Array.from({ length: 10 }, (_, index) => ({
    number: index + 1,
    chapterStart: index * 10 + 1,
    chapterEnd: (index + 1) * 10,
  })),
}
assert.doesNotThrow(() => assertBlueprint(project, blueprint))
assert.throws(
  () => assertBlueprint(project, {
    ...blueprint,
    characters: blueprint.characters.map((character, index) => index === 1
      ? { ...character, name: seeds.projects[1].protagonistName }
      : character),
  }, { reservedCharacterNames: seeds.projects.slice(1).map(item => item.protagonistName) }),
  /reserved_character_name/,
)

const arcPlan = {
  projectId: project.id,
  arcNumber: 1,
  chapters: Array.from({ length: 10 }, (_, index) => ({
    number: index + 1,
    title: `测试章节${index + 1}`,
    povCharacterId: 'character-0',
    locationId: `location-${index % 2}`,
    conflict: `测试冲突${index + 1}要求人物承担不同后果`,
    requiredChoice: `测试选择${index + 1}必须由人物亲自作出`,
    endingHook: `测试结尾${index + 1}留下下一项具体压力`,
  })),
}
assert.doesNotThrow(() => assertArcChapters(project.id, 1, arcPlan, blueprint))

const body = `${'门外的雨打在铜铃上，她把账册往灯下推了半寸。'.repeat(145)}\n\n“这笔账不能这样结。”她说。`
const card = { sensoryAnchors: ['铜铃', '账册', '灯'] }
const deterministic = deterministicChapterReview({ body, card, policy: seeds.generationPolicy })
assert.ok(deterministic.hanCharacters > 2700)
assert.ok(deterministic.hanCharacters < 3400)
assert.equal(deterministic.findings.some(item => item.code === 'Q01'), false)
assert.equal(deterministic.sensoryAnchorHits.length, 3)

const validModelReview = validateModelReview(body, {
  schemaVersion: 'chapter-review.v1',
  decision: 'revise',
  findings: [
    {
      dimension: 'voice',
      severity: 'revision_candidate',
      evidenceQuote: '这笔账不能这样结。',
      expected: '人物声线具体',
      observed: '表达略显通用',
      readerImpact: '人物辨识度降低',
      diagnosis: '台词缺少职业习惯',
      repairDirection: '加入账房用语',
    },
    {
      dimension: 'voice',
      severity: 'revision_candidate',
      evidenceQuote: '正文中不存在的句子',
      expected: '可定位',
      observed: '不可定位',
      readerImpact: '无法验证',
      diagnosis: '证据缺失',
      repairDirection: '不应进入结果',
    },
  ],
  preserveExcerpts: ['门外的雨打在铜铃上'],
  handoffAssessment: '下一章需要承接账册争议。',
})
assert.equal(validModelReview.findings.length, 1)
assert.equal(validModelReview.rejectedFindings.length, 1)
assert.equal(reviewDecision({ findings: [] }, validModelReview), 'revise')

const patched = applyEvidencePatches(body, [{
  evidenceQuote: '这笔账不能这样结。',
  replacement: '这笔账借贷不平，不能落印。',
  reason: '增加职业声线',
}], validModelReview.preserveExcerpts)
assert.equal(patched.applied.length, 1)
assert.ok(patched.body.includes('借贷不平'))
const protectedPatch = applyEvidencePatches(body, [{
  evidenceQuote: '这笔账不能这样结。',
  replacement: '她收起账册',
  reason: '测试保护状态证据',
}], ['这笔账不能这样结。'])
assert.equal(protectedPatch.applied.length, 0)
assert.equal(protectedPatch.rejected[0].rejectionReason, 'protected_excerpt_overlap')

const proposal = {
  timelineAdvance: '第一夜',
  entityChanges: [{ entityId: 'character-0', field: 'position', before: 'hesitating', after: 'committed', evidenceQuote: '她把账册往灯下推了半寸' }],
  knowledgeChanges: [{ characterId: 'character-0', learned: '账目被改过', evidenceQuote: '这笔账不能这样结' }],
  promisesCreated: ['找出改账的人'],
  promisesAdvanced: [],
  promisesResolved: [],
  foreshadowingCreated: ['铜铃只在雨夜响'],
  foreshadowingAdvanced: [],
  foreshadowingResolved: [],
  unplannedFacts: [],
}
assert.deepEqual(validateStateProposalEvidence(body, proposal), [])
const initial = initialRollingState(project, {
  characters: [{ id: 'character-0', name: '测试人物', desire: '查清账目', fear: '失去家人' }],
})
const committed = commitAcceptedChapter(initial, {
  chapterNumber: 1,
  title: '雨夜账册',
  body,
  sceneSummary: '主角在雨夜拒绝为一笔不平的账落印。',
  focalChoice: '拒绝落印',
  irreversibleCost: '暴露自己的怀疑',
  stateProposal: proposal,
})
assert.equal(committed.acceptedChapterCount, 1)
assert.equal(committed.characters['character-0'].stateFacts.position, 'committed')
assert.deepEqual(committed.knowledgeByCharacter['character-0'], ['账目被改过'])
assert.equal(committed.recentOpenings.length, 1)
assert.equal(committed.recentEndings.length, 1)
assert.deepEqual(committed.unresolvedPromises, ['找出改账的人'])
assert.deepEqual(committed.foreshadowing, ['铜铃只在雨夜响'])
const repeatedChapterShape = deterministicChapterReview({
  body,
  card,
  policy: seeds.generationPolicy,
  state: committed,
})
assert.ok(repeatedChapterShape.findings.some(item => item.diagnosis.includes('章节开头与近期已接受章节')))
const legacyNormalized = normalizeRollingState({
  ...initial,
  entityHistory: proposal.entityChanges,
  knowledgeHistory: proposal.knowledgeChanges,
})
assert.equal(legacyNormalized.characters['character-0'].stateFacts.position, 'committed')
assert.deepEqual(legacyNormalized.knowledgeByCharacter['character-0'], ['账目被改过'])

console.log('Long-form writing quality pipeline contract passed.')
