import assert from 'node:assert/strict'
import {
  buildCreatorDecisionContextSource,
} from '../src/apps/creator/routes/creatorEditorDecisionContextAdapter'
import { buildCreatorEditorIntentSeed } from '../src/apps/creator/routes/creatorEditorIntentSeedController'
import {
  runConversationSettingCapture,
  type ConversationSettingPersistencePort,
} from '../src/apps/creator/routes/creatorEditorConversationSettingService'
import { recognizeCreatorConversationReviewCommand } from '../src/apps/creator/routes/creatorEditorConversationReviewService'
import { runConversationTextEdit } from '../src/apps/creator/routes/creatorEditorConversationTextEditService'
import { parseConversationChapterSeed } from '../src/apps/creator/routes/creatorEditorConversationTitleService'
import { buildEditorLocalDraft } from '../src/apps/creator/routes/creatorEditorDraftController'
import {
  buildCreatorLocalChapterMemories,
  type CreatorLocalChapterMemory,
} from '../src/apps/creator/routes/creatorEditorLocalChapterMemoryService'
import {
  readCreatorEditorRouteQuery,
  resolveEditorRouteBootstrap,
} from '../src/apps/creator/routes/creatorEditorRouteController'
import { creatorEditorCreationSessionId } from '../src/apps/creator/routes/creatorEditorDecisionSessionController'
import { resolveVisibleRepairProposal } from '../src/apps/creator/routes/creatorEditorRepairSelectionController'
import {
  buildCreatorRecallCandidates,
  recommendedCreatorRecallIds,
  resolveManualRecallItems,
} from '../src/apps/creator/routes/creatorEditorRecallViewModels'
import {
  buildEditorRecallSelectionScope,
  readEditorRecallSelections,
  writeEditorRecallSelection,
  type CreatorEditorRecallSelectionPort,
} from '../src/apps/creator/routes/creatorEditorRecallSelectionService'
import {
  compileContextSnapshot,
  contextMatchesCurrentSource,
  contextSnapshotIntegrityIsCurrent,
  contextSnapshotFingerprint,
  contextSourceFingerprint,
} from '../src/features/creator-decision/contextCompiler'
import { buildLocalRepairGuidance } from '../src/features/creator-decision/creationDecisionWorkflow'
import {
  matchAuthorIntentSignals,
  referenceWritingAgent,
} from '../src/features/creator-decision/referenceWritingAgent'
import { contextSnapshotSchema } from '../src/features/creator-decision/schemas'
import {
  createCreationSession,
  createEmptyIntent,
  reopenAuthorIntent,
} from '../src/features/creator-decision/stateMachine'
import { draftBlocksFromText } from '../src/features/creator-decision/sceneDrafting'
import type {
  AuthorIntentContract,
  CanonStatePatch,
  HistoricalStateBackfillProposal,
  LocalCanonStateRecord,
  ManualRecallItem,
  DraftBlock,
  LiteraryFinding,
  NarrativeCandidate,
  RepairProposal,
} from '../src/features/creator-decision/types'
import type {
  PmfChapter,
  PmfLocalDraft,
  PmfLocalSettingAsset,
  PmfReaderRequest,
} from '../src/features/pmf/types'
import type { CreatorDecisionRecordEnvelope } from '../src/local-db/creatorLocalDecisionRepository'
import type { PmfLocalSettingAssetInput } from '../src/local-db/creatorLocalSettingAssetRepository'

const workId = 'work:conversation-recall'
const branchId = 'branch:main'
const now = '2026-07-14T12:00:00.000Z'

const chapters: PmfChapter[] = [
  {
    id: 'chapter:1',
    work_id: workId,
    branch_id: branchId,
    chapter_no: 1,
    title: '雨夜来信',
    content: '林澈在旧车站收到一封没有署名的信，信里准确写出了她明天才会作出的选择。',
    status: 'published',
    published_at: '2026-07-12T12:00:00.000Z',
  },
  {
    id: 'chapter:2',
    work_id: workId,
    branch_id: branchId,
    chapter_no: 2,
    title: '失约的人',
    content: '她没有赴约，却发现寄信人因此提前带走了唯一知道真相的守夜人。',
    status: 'published',
    published_at: '2026-07-13T12:00:00.000Z',
  },
  {
    id: 'chapter:3',
    work_id: workId,
    branch_id: branchId,
    chapter_no: 3,
    title: '未完成的清晨',
    content: '',
    status: 'draft',
    published_at: null,
  },
]

const settingAssets: PmfLocalSettingAsset[] = [
  {
    localAssetRef: 'asset:character:lin-che',
    workId,
    branchId,
    kind: 'character',
    stage: 'memory',
    title: '林澈',
    summary: '她想找回守夜人，却不能承认自己读过那封信。',
    detail: '林澈知道信件会预告选择，但误信寄信人只能观察未来。',
    tags: ['已知:信件会预告选择', '误信:寄信人只能观察未来', '情绪:克制的恐惧'],
    updatedAt: now,
  },
  {
    localAssetRef: 'asset:timeline:station',
    workId,
    branchId,
    kind: 'timeline',
    stage: 'memory',
    title: '第三日清晨',
    summary: '第三日 05:40，旧车站封站前二十分钟。',
    detail: '林澈仍在站内，守夜人已经被带离。',
    tags: ['时间线'],
    updatedAt: now,
  },
  {
    localAssetRef: 'asset:promise:unsigned-letter',
    workId,
    branchId,
    kind: 'rule',
    stage: 'memory',
    title: '无署名信件的代价',
    summary: '每次违背信中预告，都要由另一个人承担后果。',
    detail: '本章只能增加证据，不能揭晓寄信人的身份。',
    tags: ['伏笔', '待回收'],
    updatedAt: now,
  },
]

const secondaryCharacterAsset: PmfLocalSettingAsset = {
  localAssetRef: 'asset:character:night-watchman',
  workId,
  branchId,
  kind: 'character',
  stage: 'memory',
  title: '守夜人',
  summary: '他试图留下足以让林澈追踪自己的证据。',
  detail: '他知道货道门锁的顺序，但不知道寄信人的身份。',
  tags: ['已知:货道门锁顺序', '误信:林澈不会赴约', '情绪:受伤后的警惕'],
  updatedAt: now,
}

const linkedRequest: PmfReaderRequest = {
  id: 'request:night-watchman',
  work_id: workId,
  branch_id: branchId,
  chapter_id: 'chapter:2',
  request_type: 'next_chapter',
  request_text: '想知道守夜人被带走前，到底看见了谁。',
  status: 'in_progress',
  vote_count: 18,
  published_chapter_id: null,
  published_branch_id: null,
  publish_event_id: null,
  created_at: now,
  updated_at: now,
}

const recallCandidates = buildCreatorRecallCandidates({
  chapters,
  settingAssets,
  linkedRequest,
  workId,
  branchId,
  chapterId: 'chapter:3',
})

assert.deepEqual(
  new Set(recallCandidates.map(candidate => candidate.group)),
  new Set(['causal', 'character_knowledge', 'timeline', 'promise']),
  'the recall directory must cover causality, knowledge, timeline, and promises',
)
assert.ok(
  recallCandidates.every(candidate => candidate.sourceId && candidate.locator.targetId),
  'every recall item must preserve a real source locator',
)
assert.ok(
  recommendedCreatorRecallIds(recallCandidates).includes('manual-recall:causal:chapter:2'),
  'the immediately preceding chapter should be recommended',
)
assert.deepEqual(
  recommendedCreatorRecallIds(recallCandidates),
  ['manual-recall:causal:chapter:2', 'manual-recall:echo:request:night-watchman'],
  'default recall must stay conservative: one immediate causal chapter plus an explicitly linked echo',
)
assert.ok(
  recommendedCreatorRecallIds(recallCandidates).every(id => (
    !id.includes(':character:')
    && !id.includes(':timeline:')
    && !id.includes(':promise:')
  )),
  'character, timeline, and promise cards must require author selection instead of automatic context injection',
)

const futureChapter: PmfChapter = {
  id: 'chapter:4-future',
  work_id: workId,
  branch_id: branchId,
  chapter_no: 4,
  title: '尚未发生的回声',
  content: '这是当前第 3 章之后的内容，不能进入本章召回。',
  status: 'draft',
  published_at: null,
}
const foreignWorkChapter: PmfChapter = {
  ...futureChapter,
  id: 'chapter:foreign-work',
  work_id: 'work:foreign',
  chapter_no: 2,
}
const foreignBranchChapter: PmfChapter = {
  ...futureChapter,
  id: 'chapter:foreign-branch',
  branch_id: 'branch:foreign',
  chapter_no: 2,
}
const scopedRecallCandidates = buildCreatorRecallCandidates({
  chapters: [...chapters, futureChapter, foreignWorkChapter, foreignBranchChapter],
  settingAssets,
  linkedRequest,
  workId,
  branchId,
  chapterId: 'chapter:3',
  chapterNumber: 3,
})
assert.ok(
  scopedRecallCandidates.some(candidate => candidate.sourceId === 'chapter:2'),
  'the immediately preceding same-work same-branch chapter must remain available',
)
assert.ok(
  !scopedRecallCandidates.some(candidate => [
    futureChapter.id,
    foreignWorkChapter.id,
    foreignBranchChapter.id,
  ].includes(candidate.sourceId)),
  'future, wrong-work, and wrong-branch chapters must not enter the recall directory',
)

const publishedRecallEnding = '最后，守夜人的旧钥匙从货道门缝里滑了出来。'
const publishedRecallCandidates = buildCreatorRecallCandidates({
  chapters: chapters.map(chapter => chapter.id === 'chapter:2'
    ? {
        ...chapter,
        content: [
          '林澈从检票口追进月台，先辨认积水里留下的旧皮鞋印。',
          '她沿着站台逐段核对门锁和灯号。'.repeat(80),
          publishedRecallEnding,
        ].join('\n\n'),
      }
    : chapter),
  settingAssets,
  linkedRequest,
  workId,
  branchId,
  chapterId: 'chapter:3',
})
const publishedRecall = publishedRecallCandidates.find(candidate => (
  candidate.id === 'manual-recall:causal:chapter:2'
))
assert.ok(publishedRecall?.statement.startsWith('历史快照：只表示当章结束状态，当前有效状态以最新正史为准。'))
assert.match(publishedRecall?.statement || '', /当章开篇证据：林澈从检票口追进月台/u)
assert.equal(
  publishedRecall?.statement.endsWith(publishedRecallEnding),
  true,
  'a published-chapter recall card must retain the actual accepted ending instead of only its opening',
)

const singleParagraphRecallEnding = '最终，月台尽头只剩锁舌弹回的回声。'
const singleParagraphRecallCandidates = buildCreatorRecallCandidates({
  chapters: chapters.map(chapter => chapter.id === 'chapter:2'
    ? {
        ...chapter,
        content: `${'林澈贴着封锁线反复核对铁门上的锈痕。'.repeat(60)}${singleParagraphRecallEnding}`,
      }
    : chapter),
  settingAssets,
  linkedRequest,
  workId,
  branchId,
  chapterId: 'chapter:3',
})
const singleParagraphRecall = singleParagraphRecallCandidates.find(candidate => (
  candidate.id === 'manual-recall:causal:chapter:2'
))
assert.match(singleParagraphRecall?.statement || '', /当章开篇证据：/u)
assert.match(singleParagraphRecall?.statement || '', /当章收尾证据：…/u)
assert.equal(
  singleParagraphRecall?.statement.endsWith(singleParagraphRecallEnding),
  true,
  'one oversized paragraph must expose a tail-preserving ending in the authoritative manual recall card',
)

assert.deepEqual(
  parseConversationChapterSeed('标题：风起艾尔文防线\n故事：陆沉舟在格兰之森边缘醒来，必须在夜幕前救下被哥布林围困的商队。'),
  {
    title: '风起艾尔文防线',
    storySeed: '陆沉舟在格兰之森边缘醒来，必须在夜幕前救下被哥布林围困的商队。',
  },
  'a single conversational turn may set the chapter title without adding another form',
)
assert.equal(readCreatorEditorRouteQuery('?work=work:arad&chapter=12').routeChapterNumber, 12)
assert.equal(readCreatorEditorRouteQuery('?work=work:arad&chapter=0').routeChapterNumber, null)

const explicitChapterDraft = buildEditorLocalDraft({
  localDraftRef: 'draft:arad:chapter:12',
  linkedRequest: null,
  workId: 'work:arad',
  branchId: 'work:arad:main',
  chapterNumber: 12,
  title: '裂隙之后',
  content: '陆沉舟带着上一章留下的伤抵达防线。',
  nowIso: now,
})
const explicitChapterBootstrap = resolveEditorRouteBootstrap({
  requestId: null,
  routeDraftRef: null,
  routeWorkId: 'work:arad',
  routeBranchId: 'work:arad:main',
  routeChapterNumber: 12,
  requests: [],
  works: [],
  branches: [],
  chapters: [],
  drafts: [explicitChapterDraft],
  creativeReminders: [],
})
assert.equal(explicitChapterBootstrap.draftRestore?.title, '裂隙之后')
assert.equal(explicitChapterBootstrap.defaultDraft?.chapterNumber, 12)
assert.equal(
  creatorEditorCreationSessionId({
    activeDraft: explicitChapterDraft,
    workId: 'work:arad',
    branchId: 'work:arad:main',
    chapterId: 'local-chapter:work:arad:work:arad:main:chapter:12',
  }),
  'creation-session:editor:work:arad:work:arad:main:local-chapter:work:arad:work:arad:main:chapter:12',
  'an explicit chapter route must keep its stable chapter session after a local save',
)

const repairA: RepairProposal = {
  schemaVersion: 'repair-proposal.v1',
  id: 'repair:a',
  reviewId: 'review:1',
  findingId: 'finding:a',
  baseDraftRevision: 1,
  operation: 'offer_variants',
  targetBlockIds: ['block:1'],
  preservedFacts: [],
  preservedBlockIds: [],
  proposedContent: '第一项建议',
  status: 'proposed',
}
const repairB: RepairProposal = {
  ...repairA,
  id: 'repair:b',
  findingId: 'finding:b',
  proposedContent: '刚刚点击的建议',
}
assert.equal(
  resolveVisibleRepairProposal([repairB, repairA], repairB.id, 'review:1')?.id,
  repairB.id,
  'the repair panel must show the suggestion the author just requested',
)
const olderPersistedRepair: RepairProposal = {
  ...repairA,
  id: 'repair:older-persisted',
  proposedContent: '刷新前的旧建议',
  createdAt: '2026-07-15T10:00:00.000Z',
}
const newestPersistedRepair: RepairProposal = {
  ...repairA,
  id: 'repair:newest-persisted',
  proposedContent: '刷新后必须恢复的新建议',
  createdAt: '2026-07-15T10:01:00.000Z',
}
assert.equal(
  resolveVisibleRepairProposal([newestPersistedRepair, olderPersistedRepair], null, 'review:1')?.id,
  newestPersistedRepair.id,
  'a reload must restore the newest visible repair by persisted creation time, not IndexedDB iteration order',
)
const unverifiedReplacement: RepairProposal = {
  ...repairA,
  id: 'repair:unverified',
  operation: 'replace_range',
  verification: null,
}
assert.equal(
  resolveVisibleRepairProposal([unverifiedReplacement], unverifiedReplacement.id, 'review:1'),
  null,
  'an unverified replacement must stay outside the author adoption surface',
)
const verifiedReplacement: RepairProposal = {
  ...unverifiedReplacement,
  id: 'repair:verified',
  preservedFacts: ['目标块事实保持不变'],
  verification: {
    schemaVersion: 'creator-local-repair-review.v1',
    findingId: unverifiedReplacement.findingId,
    targetBlockId: unverifiedReplacement.targetBlockIds[0],
    decision: 'pass',
    verifiedPreservedFactIndexes: [0],
    issues: [],
    rationale: '独立审阅确认候选没有扩大范围或破坏连续性。',
  },
}
assert.equal(
  resolveVisibleRepairProposal([verifiedReplacement], verifiedReplacement.id, 'review:1')?.id,
  verifiedReplacement.id,
)
assert.equal(
  resolveVisibleRepairProposal([verifiedReplacement], verifiedReplacement.id, 'review:2'),
  null,
  'a candidate from an older review must disappear instead of exposing an adoption action that will fail',
)
const incompleteVerifiedReplacement: RepairProposal = {
  ...verifiedReplacement,
  id: 'repair:incomplete-verification',
  verification: {
    ...verifiedReplacement.verification!,
    verifiedPreservedFactIndexes: [],
  },
}
assert.equal(
  resolveVisibleRepairProposal([incompleteVerifiedReplacement], incompleteVerifiedReplacement.id, 'review:1'),
  null,
  'a legacy pass without per-fact verification must stay outside the author adoption surface',
)
const duplicateVerifiedReplacement: RepairProposal = {
  ...verifiedReplacement,
  id: 'repair:duplicate-verification',
  verification: {
    ...verifiedReplacement.verification!,
    verifiedPreservedFactIndexes: [0, 0],
  },
}
assert.equal(
  resolveVisibleRepairProposal([duplicateVerifiedReplacement], duplicateVerifiedReplacement.id, 'review:1'),
  null,
  'a pass with duplicate preserved-fact indexes must stay outside the author adoption surface',
)

const selectedRecallIds = [
  'manual-recall:causal:chapter:2',
  'manual-recall:character:asset:character:lin-che',
  'manual-recall:promise:asset:promise:unsigned-letter',
]
const manualRecallItems = resolveManualRecallItems(recallCandidates, selectedRecallIds)
assert.equal(manualRecallItems.length, 3)
assert.equal('recommended' in manualRecallItems[0], false, 'UI recommendation state must not enter the domain payload')

const session = createCreationSession({
  id: 'session:conversation-recall',
  workId,
  branchId,
  chapterId: 'chapter:3',
  sceneId: 'scene:chapter:3',
  baseCanonRevision: 2,
  now,
})
const emptyIntent = createEmptyIntent({
  sessionId: session.id,
  primaryActorId: 'asset:character:lin-che',
  now,
})
const intent: AuthorIntentContract = {
  ...emptyIntent,
  status: 'locked',
  lockedAt: now,
  readerExperience: {
    startEmotion: '不安',
    targetEmotion: '确认选择正在转嫁代价',
    emotionalMovement: '从怀疑走向承担',
    intensity: 'restrained',
  },
  narrativeDelta: {
    startingCondition: '林澈只知道守夜人失踪',
    endingCondition: '林澈确认自己的失约触发了绑架',
    mustChange: '她决定主动追踪寄信人',
    mustNotResolve: ['不得揭晓寄信人的身份'],
    irreversibleChange: '她承担下一次选择的风险',
  },
  characterAgency: {
    primaryActorId: 'asset:character:lin-che',
    currentGoal: '找到守夜人',
    requiredChoice: '在封站前留下追踪寄信人的证据',
    opposingForce: '信件规则正在转嫁代价',
    expectedCost: '她必须暴露自己读过信',
  },
  boundaries: {
    requiredElements: ['旧车站', '无署名信件'],
    forbiddenEffects: ['寄信人身份被直接揭晓'],
    protectedCharacterTraits: ['林澈不会用长篇独白解释恐惧'],
  },
}

const source = buildCreatorDecisionContextSource({
  intent,
  canon: null,
  chapters,
  settingAssets,
  linkedRequest,
  workId,
  branchId,
  chapterId: 'chapter:3',
  sceneId: 'scene:chapter:3',
  manuscript: '她把第二封信压在检票钳下，直到纸边渗出一条锈色。',
  manualRecallItems,
  runtimeProjection: {
    kernelRevision: 4,
    constraintRevision: 7,
    kernelRules: ['人物选择必须产生可见后果'],
    hardConstraints: ['不得改写作者已写正文'],
    currentTimeline: { day: 3, period: 'dawn', location: 'old_station' },
  },
})

assert.deepEqual(source.manualRecallItems, manualRecallItems)
assert.ok(
  source.manifest.some(entry => (
    entry.sourceId === 'chapter:2'
    && entry.includedReason === 'manual_recall:causal'
  )),
  'a manually selected memory must be promoted into the context manifest',
)
assert.ok(
  !source.manifest.some(entry => entry.sourceId === 'asset:timeline:station'),
  'an unselected local timeline asset must not leak into the Agent context manifest',
)

const secondaryCharacterCandidates = buildCreatorRecallCandidates({
  chapters,
  settingAssets: [...settingAssets, secondaryCharacterAsset],
  linkedRequest,
  workId,
  branchId,
  chapterId: 'chapter:3',
  chapterNumber: 3,
})
const secondaryCharacterRecall = resolveManualRecallItems(
  secondaryCharacterCandidates,
  ['manual-recall:character:asset:character:night-watchman'],
)
const secondaryCharacterSource = buildCreatorDecisionContextSource({
  intent,
  canon: null,
  chapters,
  settingAssets: [...settingAssets, secondaryCharacterAsset],
  linkedRequest,
  workId,
  branchId,
  chapterId: 'chapter:3',
  chapterNumber: 3,
  sceneId: 'scene:chapter:3',
  manuscript: '',
  manualRecallItems: secondaryCharacterRecall,
})
assert.deepEqual(
  secondaryCharacterSource.activeCharacters.map(character => character.id),
  ['asset:character:lin-che', 'asset:character:night-watchman'],
  'selecting a secondary character must not remove the locked primary actor from Context Source',
)
const secondaryCharacterContext = compileContextSnapshot({
  session,
  intent,
  source: secondaryCharacterSource,
  now,
})
assert.deepEqual(
  secondaryCharacterContext.activeCharacters.map(character => character.id),
  ['asset:character:lin-che', 'asset:character:night-watchman'],
  'a manually selected secondary character must survive Context Snapshot character filtering',
)

const foreignAsset: PmfLocalSettingAsset = {
  ...settingAssets[0],
  localAssetRef: 'asset:foreign-character',
  workId: 'work:foreign',
  title: '错误作品人物',
}
const forgedRecallItems: ManualRecallItem[] = [
  {
    id: 'manual-recall:future-chapter',
    sourceId: futureChapter.id,
    sourceRevision: futureChapter.chapter_no,
    authority: 'canon',
    group: 'causal',
    statement: futureChapter.content,
    sourceLabel: futureChapter.title,
    whyNow: '伪造未来章节召回。',
    locator: { kind: 'chapter', targetId: futureChapter.id, label: '未来章节' },
  },
  {
    id: 'manual-recall:foreign-asset',
    sourceId: foreignAsset.localAssetRef,
    sourceRevision: 1,
    authority: 'author',
    group: 'character_knowledge',
    statement: foreignAsset.summary,
    sourceLabel: foreignAsset.title,
    whyNow: '伪造其他作品设定召回。',
    locator: { kind: 'asset', targetId: foreignAsset.localAssetRef, label: '其他作品设定' },
  },
  {
    id: 'manual-recall:foreign-echo',
    sourceId: 'request:foreign',
    sourceRevision: 1,
    authority: 'derived',
    group: 'promise',
    statement: '其他作品的读者回声。',
    sourceLabel: '错误回声',
    whyNow: '伪造其他作品回声召回。',
    locator: { kind: 'echo', targetId: 'request:foreign', label: '其他作品回声' },
  },
]
const leakageGuardedSource = buildCreatorDecisionContextSource({
  intent,
  canon: null,
  chapters: [...chapters, futureChapter],
  settingAssets: [...settingAssets, foreignAsset],
  linkedRequest,
  workId,
  branchId,
  chapterId: 'chapter:3',
  chapterNumber: 3,
  sceneId: 'scene:chapter:3',
  manuscript: '',
  manualRecallItems: [...manualRecallItems, ...forgedRecallItems],
})
assert.deepEqual(
  leakageGuardedSource.manualRecallItems.map(item => item.id),
  manualRecallItems.map(item => item.id),
  'Context Source must fail closed on forged future, wrong-work, and wrong-source recall items',
)
assert.ok(
  !leakageGuardedSource.manifest.some(entry => forgedRecallItems.some(item => item.sourceId === entry.sourceId)),
  'rejected recall items must not survive indirectly through the context manifest',
)
assert.deepEqual(
  source.activeCharacters.map(character => character.id),
  ['asset:character:lin-che'],
  'the selected character card remains available to the Agent',
)

const distributedStyleParagraphs = [
  '她在进站闸机前停了两秒，先听见铁轨深处的摩擦声，才看见地上那封没有署名的信。',
  '她没有动。',
  '林澈没有立刻俯身，她先用鞋尖将信封推离阴影，纸角在灯下露出一道干涸的锈色。',
  '远处的广播忽然中断，她借那一瞬的安静拆开信封，只读了第一行就把纸折了回去。',
  '脚步声从楼梯口逼近，林澈把信压进检票钳后，故意留下半枚没有完全咬合的银色印记。',
  '当封站铃第二次响起，她才明白对方要的不是回信，而是逼她当着所有人承认自己读过它。',
  '钟响了。',
].join('\n\n')
const distributedStyleSource = buildCreatorDecisionContextSource({
  intent,
  canon: null,
  chapters,
  settingAssets,
  linkedRequest,
  workId,
  branchId,
  chapterId: 'chapter:3',
  sceneId: 'scene:chapter:3',
  manuscript: distributedStyleParagraphs,
  manualRecallItems,
})
assert.deepEqual(
  distributedStyleSource.styleSamples.map(sample => sample.sourceBlockId),
  [
    'manuscript-style:paragraph:1:head',
    'manuscript-style:paragraph:4:head',
    'manuscript-style:paragraph:7:tail',
  ],
  'current-manuscript style recall must cover the opening, progression, and ending instead of only the first two paragraphs',
)
assert.deepEqual(
  distributedStyleSource.styleSamples.map(sample => sample.reason),
  [
    '当前章节开篇的作者表达证据',
    '当前章节推进段的作者表达证据',
    '当前章节收束的作者表达证据',
  ],
  'distributed style evidence must keep its chapter-position provenance visible to the Writer',
)
assert.equal(
  distributedStyleSource.styleSamples[2]?.text,
  distributedStyleParagraphs.split('\n\n')[6],
  'the actual accepted ending paragraph must reach the style context without being replaced by another opening sample',
)

const historicalStyleEnding = '灯灭了。'
const historicalStyleChapters = chapters.map(chapter => chapter.id === 'chapter:2'
  ? {
      ...chapter,
      content: [
        '她从站台北端开始往回走，将每一道没有上锁的门都记在票根背面。',
        '守夜人的工位上只剩一杯冷茶，杯沿沾着与无署名信件相同的锈色粉尘。',
        historicalStyleEnding,
      ].join('\n\n'),
    }
  : chapter)
const historicalStyleSource = buildCreatorDecisionContextSource({
  intent,
  canon: null,
  chapters: historicalStyleChapters,
  settingAssets,
  linkedRequest,
  workId,
  branchId,
  chapterId: 'chapter:3',
  sceneId: 'scene:chapter:3',
  manuscript: '',
  manualRecallItems,
})
assert.deepEqual(
  historicalStyleSource.styleSamples.map(sample => sample.sourceBlockId),
  [
    'chapter-style:chapter:2:paragraph:1:head',
    'chapter-style:chapter:2:paragraph:3:tail',
  ],
  'a blank new chapter must recall both the opening and actual ending of the latest manually selected prose chapter',
)
assert.equal(
  historicalStyleSource.styleSamples[1]?.text,
  historicalStyleEnding,
  'a short accepted chapter ending must survive historical style recall for the next blank chapter',
)
assert.equal(
  historicalStyleSource.styleSamples.some(sample => sample.sourceBlockId.includes('chapter:1')),
  false,
  'historical style sampling must not bypass the manual chapter allowlist',
)

const longSingleParagraphEnding = '最后，检票钳在黑暗里发出一声脆响。'
const longSingleParagraph = `${'她沿着站台边缘反复核对地砖上的水痕和脚印，始终没有越过锁住的柵栏。'.repeat(28)}${longSingleParagraphEnding}`
const longSingleParagraphStyleSource = buildCreatorDecisionContextSource({
  intent,
  canon: null,
  chapters: chapters.map(chapter => chapter.id === 'chapter:2'
    ? { ...chapter, content: longSingleParagraph }
    : chapter),
  settingAssets,
  linkedRequest,
  workId,
  branchId,
  chapterId: 'chapter:3',
  sceneId: 'scene:chapter:3',
  manuscript: '',
  manualRecallItems,
})
assert.deepEqual(
  longSingleParagraphStyleSource.styleSamples.map(sample => sample.sourceBlockId),
  [
    'chapter-style:chapter:2:paragraph:1:head',
    'chapter-style:chapter:2:paragraph:1:tail',
  ],
  'one long historical paragraph must expose distinct head and tail voice evidence instead of losing its ending',
)
assert.equal(
  longSingleParagraphStyleSource.styleSamples[0]?.text.includes(longSingleParagraphEnding),
  false,
  'the bounded head excerpt must not pretend to contain the distant ending',
)
assert.equal(longSingleParagraphStyleSource.styleSamples[1]?.text.startsWith('…'), true)
assert.equal(longSingleParagraphStyleSource.styleSamples[1]?.text.endsWith(longSingleParagraphEnding), true)

const previousHistoricalStyleEnding = '门关了。'
const twoChapterHistoricalStyleSource = buildCreatorDecisionContextSource({
  intent,
  canon: null,
  chapters: historicalStyleChapters.map(chapter => chapter.id === 'chapter:1'
    ? {
        ...chapter,
        content: [
          '第一封信被放在候车室最靠里的长椅上，信封边缘还带着没有干透的雨水。',
          previousHistoricalStyleEnding,
        ].join('\n\n'),
      }
    : chapter),
  settingAssets,
  linkedRequest,
  workId,
  branchId,
  chapterId: 'chapter:3',
  sceneId: 'scene:chapter:3',
  manuscript: '',
})
assert.deepEqual(
  twoChapterHistoricalStyleSource.styleSamples.map(sample => sample.sourceBlockId),
  [
    'chapter-style:chapter:2:paragraph:1:head',
    'chapter-style:chapter:2:paragraph:3:tail',
    'chapter-style:chapter:1:paragraph:2:tail',
  ],
  'unbounded historical style fallback must use latest opening, latest ending, then previous ending with a three-sample cap',
)
assert.equal(
  twoChapterHistoricalStyleSource.styleSamples[2]?.text,
  previousHistoricalStyleEnding,
  'the previous admitted chapter ending must remain available as the third bounded voice sample',
)

const selectionBoundedSource = buildCreatorDecisionContextSource({
  intent,
  canon: null,
  chapters,
  settingAssets,
  linkedRequest,
  workId,
  branchId,
  chapterId: 'chapter:3',
  sceneId: 'scene:chapter:3',
  manuscript: '',
  manualRecallItems,
})
assert.deepEqual(
  selectionBoundedSource.currentTimeline,
  [],
  'an unselected historical timeline must not enter the Agent context when no runtime timeline is available',
)
assert.deepEqual(
  selectionBoundedSource.styleSamples.map(sample => sample.sourceBlockId),
  ['chapter-style:chapter:2:paragraph:1:head'],
  'historical style samples must come only from a manually selected chapter',
)
assert.ok(
  !selectionBoundedSource.recentSceneSummaries.some(scene => scene.sceneId === 'chapter:1'),
  'an unselected historical chapter must not enter recent scene summaries',
)
assert.ok(
  selectionBoundedSource.recentSceneSummaries.some(scene => scene.sceneId === 'chapter:2'),
  'a manually selected causal chapter must enter the dedicated recent-scene context',
)
assert.ok(
  selectionBoundedSource.unresolvedForeshadowing.some(promise => promise.id === 'asset:promise:unsigned-letter'),
  'a selected unresolved foreshadowing card remains available to the Agent',
)

const longRecentSceneEnding = '最后，守夜人被拖进封闭货道，林澈只能听见第三道铁门落锁。'
const longRecentSceneSource = buildCreatorDecisionContextSource({
  intent,
  canon: null,
  chapters: chapters.map(chapter => chapter.id === 'chapter:2'
    ? {
        ...chapter,
        content: [
          '林澈从检票口追进月台，先在积水里辨出守夜人的旧皮鞋印。',
          '她沿着站台逐段核对门锁和灯号。'.repeat(80),
          longRecentSceneEnding,
        ].join('\n\n'),
      }
    : chapter),
  settingAssets,
  linkedRequest,
  workId,
  branchId,
  chapterId: 'chapter:3',
  sceneId: 'scene:chapter:3',
  manuscript: '',
  manualRecallItems,
})
const longRecentSceneSummary = longRecentSceneSource.recentSceneSummaries.find(scene => (
  scene.sceneId === 'chapter:2'
))
assert.ok(longRecentSceneSummary, 'the selected historical chapter must produce one bounded recent-scene summary')
assert.equal(longRecentSceneSummary?.summary.startsWith('开篇：林澈从检票口追进月台'), true)
assert.equal(
  longRecentSceneSummary?.summary.endsWith(longRecentSceneEnding),
  true,
  'a long recent-scene summary must preserve the actual accepted ending instead of only its opening',
)
assert.ok((longRecentSceneSummary?.summary.length || 0) <= 350)

const currentManuscriptOpening = '贺岚先把南门转运场的学徒撤出牵索回摆范围，自己仍留在公开路线板旁。'
const currentManuscriptProgression = '陆沉舟只报出右侧滑轮的可见偏载，没有替现场负责人下令。'
const currentManuscriptEnding = '贺岚最终封住路线板，木条的辨认窗口却在雨水里彻底消失。'
const currentManuscriptRecentSceneSource = buildCreatorDecisionContextSource({
  intent,
  canon: null,
  chapters: [],
  settingAssets,
  linkedRequest,
  workId,
  branchId,
  chapterId: 'local-chapter:chapter:20',
  chapterNumber: 20,
  sceneId: 'local-scene:chapter:20',
  manuscript: [
    currentManuscriptOpening,
    currentManuscriptProgression,
    currentManuscriptEnding,
  ].join('\n\n'),
  manualRecallItems: [],
})
assert.equal(
  currentManuscriptRecentSceneSource.recentSceneSummaries[0]?.sceneId,
  'current-manuscript:local-chapter:chapter:20',
  'current author prose must become the first bounded recent-scene input for continuation',
)
assert.match(
  currentManuscriptRecentSceneSource.recentSceneSummaries[0]?.summary || '',
  new RegExp(currentManuscriptProgression),
  'current-manuscript context must retain direct progression evidence instead of only its opening',
)
assert.equal(
  currentManuscriptRecentSceneSource.recentSceneSummaries.some(scene => scene.sceneId === 'chapter:1'),
  false,
  'current manuscript projection must not re-admit unselected historical chapters',
)

const localCausalEnding = '当章收尾证据：塞文先解后角，再解前角，主索没有回拍。'
const localCausalRecall: ManualRecallItem = {
  id: 'manual-recall:local-causal:chapter:19',
  sourceId: 'local-canon:chapter:19',
  sourceRevision: 4,
  authority: 'canon',
  group: 'causal',
  statement: `历史快照：只表示当章结束状态，当前有效状态以最新正史为准。${'当章过程证据仍需定位。'.repeat(90)}${localCausalEnding}`,
  sourceLabel: '第 19 章 · 本机已确认',
  whyNow: '这是上一章已经确认的因果债。',
  locator: {
    kind: 'canon',
    targetId: 'local-chapter:chapter:19',
    label: '定位到本机第 19 章正史',
  },
}
const localCausalRecentSceneSource = buildCreatorDecisionContextSource({
  intent,
  canon: null,
  chapters: [],
  settingAssets,
  linkedRequest,
  workId,
  branchId,
  chapterId: 'local-chapter:chapter:20',
  sceneId: 'local-scene:chapter:20',
  manuscript: '',
  manualRecallItems: [localCausalRecall],
})
assert.deepEqual(
  localCausalRecentSceneSource.recentSceneSummaries.map(scene => scene.sceneId),
  ['local-canon:chapter:19'],
  'a selected local Canon chapter memory must populate recent-scene context even when no public chapter row exists',
)
assert.equal(
  localCausalRecentSceneSource.recentSceneSummaries[0]?.summary.endsWith(localCausalEnding),
  true,
  'the selected local causal summary must retain its accepted ending after bounded transport',
)
assert.match(
  localCausalRecentSceneSource.recentSceneSummaries[0]?.relevanceReason || '',
  /仅明确正史与收尾证据/u,
  'the recent-scene projection must preserve historical-snapshot authority instead of treating plans as current facts',
)

const context = compileContextSnapshot({ session, intent, source, now })
assert.deepEqual(context.manualRecallItems, manualRecallItems)
assert.equal(context.sourceFingerprint, contextSourceFingerprint(source))
assert.match(contextSnapshotFingerprint(context), /^context-snapshot-content:/)
assert.equal(context.contentFingerprint, contextSnapshotFingerprint(context))
assert.equal(contextSnapshotIntegrityIsCurrent(context), true)
assert.equal(contextMatchesCurrentSource({ context, source, intentRevision: intent.revision }), true)
const exportedContext = contextSnapshotSchema.parse(JSON.parse(JSON.stringify(context)))
assert.equal(
  exportedContext.contentFingerprint,
  contextSnapshotFingerprint(exportedContext),
  'a Context fingerprint must remain valid after workspace JSON export and import',
)
assert.equal(
  contextSnapshotIntegrityIsCurrent(exportedContext),
  true,
  'a current Context must remain current after workspace JSON export and import',
)
const changedRecallSource = {
  ...source,
  manualRecallItems: manualRecallItems.slice(0, 2),
}
const changedRecallContext = compileContextSnapshot({ session, intent, source: changedRecallSource, now })
assert.notEqual(
  changedRecallContext.sourceFingerprint,
  context.sourceFingerprint,
  'changing the manual recall selection must change the context source fingerprint',
)
assert.notEqual(
  changedRecallContext.id,
  context.id,
  'changing the manual recall selection must create a different context snapshot identity',
)
assert.notEqual(
  contextSnapshotFingerprint(changedRecallContext),
  contextSnapshotFingerprint(context),
  'changing the manual recall selection must change the complete context snapshot fingerprint',
)
assert.notEqual(
  changedRecallContext.contentFingerprint,
  context.contentFingerprint,
  'changing the manual recall selection must persist a different context content fingerprint',
)
assert.equal(
  contextMatchesCurrentSource({ context, source: changedRecallSource, intentRevision: intent.revision }),
  false,
  'an existing context must not be reused after the author changes manual recall selection',
)
assert.ok(
  context.hardConstraints.includes('不得改写作者已写正文'),
  'manual recall must augment rather than replace runtime constraints',
)

const committedChapterId = `local-chapter:${workId}:${branchId}:chapter:1`
const committedSession = {
  ...session,
  id: 'session:conversation-recall:committed',
  chapterId: committedChapterId,
  phase: 'canon_committed' as const,
  selectedCandidateId: 'candidate:conversation-recall:committed',
}
const committedIntent: AuthorIntentContract = {
  ...intent,
  id: 'intent:conversation-recall:committed',
  sessionId: committedSession.id,
}
const acceptedChapterText = '林澈最终把信压在检票钳下，让锈色指向守夜人被带走的方向。她暴露了自己读过信，却仍不知道寄信人的身份。'
const committedCanon: LocalCanonStateRecord = {
  schemaVersion: 'local-canon-state.v1',
  id: `local-canon:${workId}:${committedChapterId}`,
  workId,
  chapterId: committedChapterId,
  branchId,
  revision: 1,
  acceptedDraftId: 'draft:conversation-recall:committed',
  acceptedDraftRevision: 1,
  acceptedContentBlocks: [{
    id: 'block:conversation-recall:committed',
    text: acceptedChapterText,
    startOffset: 0,
    endOffset: acceptedChapterText.length,
    protected: false,
  }],
  state: {
    characters: {
      'asset:character:lin-che': {
        knowledge: '同行者已经知道林澈读过信件',
        recentChoice: '林澈最终选择承认自己读过信，以换取继续追踪的机会。',
        paidCost: '林澈失去继续向同行者隐瞒信件的空间。',
      },
    },
    timeline: {
      'chapter:1': {
        outcome: { status: 'advanced', statement: '第三日清晨，林澈仍在旧车站。' },
      },
    },
    causal: {
      'chapter:1': {
        outcome: { status: 'created', statement: '同行者开始追问信件内容。' },
      },
    },
    promises: {
      'letter-trace': {
        status: { status: 'created', statement: '追踪寄信人的线索必须继续。' },
      },
      fulfilled: {
        status: { status: 'fulfilled', statement: '已经兑现的旧承诺。' },
      },
    },
    foreshadowing: {
      'rust-source': {
        status: { status: 'advanced', statement: '检票钳锈色的来源仍未揭晓。' },
      },
    },
  },
  committedPatchId: 'patch:conversation-recall:committed',
  committedAt: now,
}
const committedPatch: CanonStatePatch = {
  schemaVersion: 'canon-state-patch.v1',
  id: committedCanon.committedPatchId!,
  sessionId: committedSession.id,
  workId,
  chapterId: committedChapterId,
  baseCanonRevision: 0,
  sourceDraftRevision: 1,
  status: 'committed',
  operations: [{
    op: 'add',
    path: '/characters/asset:character:lin-che/knowledge',
    value: '同行者已经知道林澈读过信件',
    evidenceBlockIds: ['block:conversation-recall:committed'],
    reason: '林澈主动承认自己读过信。',
    irreversible: true,
  }, {
    op: 'add',
    path: '/characters/asset:character:lin-che/recentChoice',
    value: '林澈最终选择承认自己读过信，以换取继续追踪的机会。',
    evidenceBlockIds: ['block:conversation-recall:committed'],
    reason: '正文明确写出林澈暴露秘密后的行动结果。',
    irreversible: true,
  }, {
    op: 'add',
    path: '/characters/asset:character:lin-che/paidCost',
    value: '林澈失去继续向同行者隐瞒信件的空间。',
    evidenceBlockIds: ['block:conversation-recall:committed'],
    reason: '同行者已经得知她读过信。',
    irreversible: true,
  }, {
    op: 'add',
    path: '/timeline/chapter:1/outcome',
    value: { status: 'advanced', statement: '第三日清晨，林澈仍在旧车站。' },
    evidenceBlockIds: ['block:conversation-recall:committed'],
    reason: '本章结束时仍未离开旧车站。',
    irreversible: false,
  }, {
    op: 'add',
    path: '/causal/chapter:1/outcome',
    value: { status: 'created', statement: '同行者开始追问信件内容。' },
    evidenceBlockIds: ['block:conversation-recall:committed'],
    reason: '暴露秘密带来了新的关系压力。',
    irreversible: false,
  }, {
    op: 'add',
    path: '/promises/letter-trace/status',
    value: { status: 'created', statement: '追踪寄信人的线索必须继续。' },
    evidenceBlockIds: ['block:conversation-recall:committed'],
    reason: '本章建立了后续追踪承诺。',
    irreversible: false,
  }, {
    op: 'add',
    path: '/foreshadowing/rust-source/status',
    value: { status: 'advanced', statement: '检票钳锈色的来源仍未揭晓。' },
    evidenceBlockIds: ['block:conversation-recall:committed'],
    reason: '锈色证据再次出现但尚未解释。',
    irreversible: false,
  }],
  createdAt: now,
}
const committedCandidate: NarrativeCandidate = {
  schemaVersion: 'narrative-candidate.v1',
  id: committedSession.selectedCandidateId,
  sessionId: committedSession.id,
  intentRevision: committedIntent.revision,
  contextSnapshotId: 'context:conversation-recall:committed',
  revision: 1,
  status: 'selected',
  title: '以暴露换取追踪机会',
  oneSentenceMechanism: '林澈主动承认读过信件，以失去隐瞒空间换取追踪守夜人的机会。',
  mechanismSignature: {
    pressureSource: 'relationship',
    conflictEngine: 'negotiation',
    agencyPattern: 'sacrifice',
    costPattern: 'exposure',
    endingPattern: 'relationship_shift',
  },
  strategyAxes: {
    conflictMode: 'sacrifice',
    informationMode: 'partial_reveal',
    agencyOwnerId: 'asset:character:lin-che',
    costType: 'identity_exposure',
    pacing: 'balanced',
    viewpointId: 'asset:character:lin-che',
  },
  beats: [{
    id: 'beat:committed:1',
    order: 1,
    purpose: '暴露秘密以换取行动机会',
    actingCharacterId: 'asset:character:lin-che',
    action: '承认自己读过信件',
    resistance: '同行者因此怀疑她',
    consequence: '取得追踪守夜人的机会',
    informationChange: '同行者知道林澈读过信件',
    statePreconditions: [],
    stateEffects: [],
  }],
  projectedEffects: {
    stateChanges: [],
    irreversibleChanges: ['林澈无法再隐瞒自己读过信件'],
    promisesCreated: ['追踪寄信人的线索必须继续'],
    promisesConsumed: [],
    futureDebts: ['同行者会追问信件内容'],
    characterCosts: ['失去隐瞒空间'],
  },
  tradeoffs: {
    strengths: ['选择与代价直接相连'],
    risks: ['同行者信任下降'],
    clicheRisks: [],
    uncertainties: [],
  },
  validation: { hardConstraintPassed: true, violations: [] },
}
const committedDraft: PmfLocalDraft = {
  localDraftRef: 'draft-ref:conversation-recall:committed',
  requestId: null,
  workId,
  branchId,
  title: '锈色指向',
  content: acceptedChapterText,
  updatedAt: now,
}
const localChapterRecords: CreatorDecisionRecordEnvelope[] = [
  { family: 'creationSessions', id: committedSession.id, value: committedSession },
  { family: 'authorIntents', id: committedIntent.id, value: committedIntent },
  { family: 'narrativeCandidates', id: committedCandidate.id, value: committedCandidate },
  { family: 'canonPatches', id: committedPatch.id, value: committedPatch },
  { family: 'localCanonStates', id: committedCanon.id, value: committedCanon },
]
const localChapterMemories = buildCreatorLocalChapterMemories({
  records: localChapterRecords,
  drafts: [committedDraft],
  workId,
  branchId,
})
assert.equal(localChapterMemories[0]?.chapterNumber, 1)
assert.equal(localChapterMemories[0]?.title, '锈色指向')
assert.ok(localChapterMemories[0]?.statement.startsWith('历史快照：只表示当章结束状态，当前有效状态以最新正史为准'))
assert.ok(localChapterMemories[0]?.statement.includes('当章锁定变化（创作约束）：'))
assert.ok(localChapterMemories[0]?.statement.includes('当章未解决约束（创作约束）：不得揭晓寄信人的身份'))
assert.equal(localChapterMemories[0]?.statement.includes('仍不可解决：'), false)
assert.equal(
  localChapterMemories[0]?.statement.includes('当章候选叙事路径：'),
  false,
  'historical recall must not include an uncommitted candidate path',
)
assert.equal(
  localChapterMemories[0]?.statement.includes(committedCandidate.title),
  false,
  'historical recall must not leak the selected candidate title into future context',
)
assert.ok(localChapterMemories[0]?.statement.includes('当章正史人物选择：林澈最终选择承认自己读过信'))
assert.ok(localChapterMemories[0]?.statement.includes('当章正史代价：林澈失去继续向同行者隐瞒信件的空间'))
assert.equal(
  localChapterMemories[0]?.statement.includes('当章锁定人物选择（创作约束）：'),
  false,
  'a committed recentChoice must replace the intent plan in historical recall',
)
assert.equal(
  localChapterMemories[0]?.statement.includes('当章预期代价（创作约束）：'),
  false,
  'a committed paidCost must replace the expected intent cost in historical recall',
)
assert.ok(localChapterMemories[0]?.statement.includes('当章正史后果：同行者开始追问信件内容'))
assert.ok(localChapterMemories[0]?.statement.includes('当章正史承诺：追踪寄信人的线索必须继续'))
assert.ok(localChapterMemories[0]?.statement.includes(`当章收尾证据：${acceptedChapterText}`))
assert.deepEqual(
  localChapterMemories[0]?.sceneMechanismSignature,
  committedCandidate.mechanismSignature,
  'the selected candidate mechanism signature must stay attached to the locally confirmed chapter memory',
)
assert.equal(localChapterMemories[0]?.stateRecallItems.length, 8)
const canonicalFulfilledTombstone = localChapterMemories[0]?.stateRecallItems.find(item => (
  item.sourceId === committedCanon.id
  && item.statePath === '/promises/fulfilled/status'
))
assert.equal(
  canonicalFulfilledTombstone?.recallStatus,
  'terminal',
  'the cumulative Canon state must suppress a fulfilled legacy promise even when its Patch is unavailable',
)

const oversizedCandidateProjection = {
  ...committedCandidate,
  oneSentenceMechanism: '候选阶段的冗长路径说明并不等于正史事实。'.repeat(80),
  projectedEffects: {
    ...committedCandidate.projectedEffects,
    promisesCreated: ['候选阶段设想、但正文和正史都没有建立的塔楼承诺'],
    futureDebts: ['候选阶段设想、但作者改稿后已经删除的同行债务'],
  },
}
const oversizedProjectionMemories = buildCreatorLocalChapterMemories({
  records: localChapterRecords.map(record => (
    record.family === 'narrativeCandidates'
      ? { ...record, value: oversizedCandidateProjection }
      : record
  )),
  drafts: [committedDraft],
  workId,
  branchId,
})
assert.ok(
  oversizedProjectionMemories[0]?.statement.includes(`当章收尾证据：${acceptedChapterText}`),
  'long candidate planning copy must not truncate the accepted chapter ending evidence',
)
const longEndingLead = '这段较早的动作仍在最后三百六十字窗口里，但不能冒充章节真正结尾。'.repeat(18)
const exactFinalParagraph = '真正收尾证据：林澈把最后一枚锈钉交给同行者，随后亲手关上站门。'
const longEndingText = `${longEndingLead}\n\n${exactFinalParagraph}`
const longEndingCanon: LocalCanonStateRecord = {
  ...committedCanon,
  acceptedContentBlocks: draftBlocksFromText(longEndingText),
}
const longEndingMemories = buildCreatorLocalChapterMemories({
  records: localChapterRecords.map(record => (
    record.family === 'localCanonStates'
      ? { ...record, value: longEndingCanon }
      : record
  )),
  drafts: [{ ...committedDraft, content: longEndingText }],
  workId,
  branchId,
})
assert.ok(
  longEndingMemories[0]?.statement.includes(exactFinalParagraph),
  'cross-chapter handoff must retain the actual final paragraph instead of the front of the trailing character window',
)
assert.ok(
  longEndingMemories[0]?.statement.includes('当章收尾证据：…'),
  'a truncated ending handoff must show that earlier tail context was omitted',
)
assert.ok(
  !oversizedProjectionMemories[0]?.statement.includes('正文和正史都没有建立的塔楼承诺'),
  'candidate-only projected promises must not be recalled as committed facts',
)
assert.ok(
  !oversizedProjectionMemories[0]?.statement.includes('作者改稿后已经删除的同行债务'),
  'candidate-only future debts must not be recalled after the accepted manuscript diverges',
)
assert.ok(
  oversizedProjectionMemories[0]?.statement.includes('当章正史承诺：追踪寄信人的线索必须继续'),
  'the evidence-backed committed promise must survive an oversized candidate projection',
)
const currentLocalMemory = localChapterMemories[0]
assert.ok(currentLocalMemory)
const staleForeignWorkMemory: CreatorLocalChapterMemory = {
  ...currentLocalMemory,
  id: 'local-chapter-memory:foreign-work',
  sourceId: 'local-canon:foreign-work',
  workId: 'work:foreign',
  stateRecallItems: currentLocalMemory.stateRecallItems.map((item, index) => ({
    ...item,
    id: `manual-recall:foreign-work-state:${index}`,
    sourceId: 'local-canon:foreign-work',
    statePath: `/characters/foreign-work/${index}`,
  })),
}
const staleForeignBranchMemory: CreatorLocalChapterMemory = {
  ...currentLocalMemory,
  id: 'local-chapter-memory:foreign-branch',
  sourceId: 'local-canon:foreign-branch',
  branchId: 'branch:foreign',
  stateRecallItems: currentLocalMemory.stateRecallItems.map((item, index) => ({
    ...item,
    id: `manual-recall:foreign-branch-state:${index}`,
    sourceId: 'local-canon:foreign-branch',
    statePath: `/characters/foreign-branch/${index}`,
  })),
}
const locallyScopedRecall = buildCreatorRecallCandidates({
  chapters: [],
  localChapterMemories: [staleForeignWorkMemory, staleForeignBranchMemory, ...localChapterMemories],
  settingAssets,
  linkedRequest: null,
  workId,
  branchId,
  chapterId: null,
  chapterNumber: 2,
})
assert.ok(
  locallyScopedRecall.some(candidate => candidate.sourceId === committedCanon.id),
  'the previous local Canon memory for the current work and branch must remain available',
)
assert.ok(
  !locallyScopedRecall.some(candidate => (
    candidate.sourceId === staleForeignWorkMemory.sourceId
    || candidate.sourceId === staleForeignBranchMemory.sourceId
  )),
  'stale local memories from another work or branch must not enter the recall directory during a route switch',
)
const nextChapterRecall = buildCreatorRecallCandidates({
  chapters: [],
  localChapterMemories,
  settingAssets,
  linkedRequest: null,
  workId,
  branchId,
  chapterId: null,
  chapterNumber: 2,
})
assert.ok(
  recommendedCreatorRecallIds(nextChapterRecall).includes(`manual-recall:local-causal:${committedChapterId}`),
  'the previous locally confirmed chapter must be recommended in the next chapter recall rail',
)
const selectedNextChapterRecall = resolveManualRecallItems(
  nextChapterRecall,
  recommendedCreatorRecallIds(nextChapterRecall),
)
const nextChapterSource = buildCreatorDecisionContextSource({
  intent,
  canon: null,
  chapters: [],
  settingAssets,
  linkedRequest: null,
  workId,
  branchId,
  chapterId: 'local-chapter:chapter:2',
  sceneId: 'local-scene:chapter:2',
  manuscript: '',
  manualRecallItems: selectedNextChapterRecall,
})
assert.deepEqual(
  nextChapterSource.recentSceneSummaries[0]?.mechanismSignature,
  committedCandidate.mechanismSignature,
  'the confirmed prior-scene signature must reach the next chapter Context Snapshot source without becoming Canon fact',
)
assert.ok(
  nextChapterRecall.some(item => (
    item.sourceId === committedPatch.id
    && item.group === 'character_knowledge'
    && item.statement.includes('同行者已经知道林澈读过信件')
  )),
  'committed character state must become an optional, locatable recall item',
)
assert.ok(
  nextChapterRecall.some(item => item.sourceId === committedPatch.id && item.group === 'timeline'),
  'committed timeline evidence must become an optional recall item',
)
assert.ok(
  nextChapterRecall.some(item => item.sourceId === committedPatch.id && item.group === 'promise'),
  'committed promises and foreshadowing must remain available for manual recall',
)
assert.equal(
  nextChapterRecall.some(item => item.statement.includes('已经兑现的旧承诺')),
  false,
  'a terminal value inferred from current Canon must never render as an unresolved manual recall card',
)
const legacyActivePromiseMemory: CreatorLocalChapterMemory = {
  ...localChapterMemories[0]!,
  id: 'local-chapter-memory:legacy-active-fulfilled-path',
  sourceId: 'local-canon:legacy-active-fulfilled-path',
  sourceRevision: 1,
  chapterId: `local-chapter:${workId}:${branchId}:chapter:1`,
  chapterNumber: 1,
  stateRecallItems: [{
    ...canonicalFulfilledTombstone!,
    id: 'manual-recall:legacy-active-fulfilled-path',
    sourceId: 'patch:legacy-active-fulfilled-path',
    statement: '这条旧承诺仍待兑现。',
    sourceLabel: '第 1 章 · 承诺与伏笔',
    recallStatus: 'active',
  }],
}
const canonicalTombstoneMemory: CreatorLocalChapterMemory = {
  ...localChapterMemories[0]!,
  id: 'local-chapter-memory:canonical-fulfilled-later',
  sourceId: committedCanon.id,
  sourceRevision: 2,
  chapterId: `local-chapter:${workId}:${branchId}:chapter:2`,
  chapterNumber: 2,
  stateRecallItems: [canonicalFulfilledTombstone!],
}
assert.equal(
  buildCreatorRecallCandidates({
    chapters: [],
    localChapterMemories: [legacyActivePromiseMemory, canonicalTombstoneMemory],
    settingAssets: [],
    linkedRequest: null,
    workId,
    branchId,
    chapterId: null,
    chapterNumber: 3,
  }).some(item => item.statement.includes('这条旧承诺仍待兑现')),
  false,
  'a cumulative Canon tombstone must suppress an older active card across chapter memories without recreating a visible fact',
)
const committedHistoricalBackfill: HistoricalStateBackfillProposal = {
  schemaVersion: 'historical-state-backfill.v1',
  id: 'historical-backfill:conversation-recall:committed',
  sessionId: committedSession.id,
  workId,
  chapterId: committedChapterId,
  branchId,
  canonId: committedCanon.id,
  baseCanonRevision: committedCanon.revision,
  sourceDraftId: committedCanon.acceptedDraftId!,
  sourceDraftRevision: committedCanon.acceptedDraftRevision,
  status: 'committed',
  operations: [{
    op: 'replace',
    path: '/characters/asset:character:lin-che/knowledge',
    value: '林澈后来确认同行者已经完整读过信件。',
    expectedPreviousValue: '同行者已经知道林澈读过信件',
    evidenceBlockIds: ['block:conversation-recall:committed'],
    reason: '历史正文补足了更晚的直接知识边界。',
    irreversible: true,
  }, {
    op: 'add',
    path: '/characters/asset:character:lin-che/physicalCondition',
    value: '林澈的右手仍被检票钳划伤。',
    evidenceBlockIds: ['block:conversation-recall:committed'],
    reason: '历史正文直接记录了伤势。',
    irreversible: false,
  }],
  createdAt: now,
  confirmedAt: now,
  committedAt: now,
}
const rejectedHistoricalBackfill: HistoricalStateBackfillProposal = {
  ...committedHistoricalBackfill,
  id: 'historical-backfill:conversation-recall:rejected',
  baseCanonRevision: committedCanon.revision + 1,
  status: 'rejected',
  operations: [{
    op: 'add',
    path: '/characters/asset:character:lin-che/secrets',
    value: '这条被拒绝的秘密不得进入召回。',
    evidenceBlockIds: ['block:conversation-recall:committed'],
    reason: '测试拒绝候选隔离。',
    irreversible: false,
  }],
  confirmedAt: null,
  committedAt: null,
}
const fulfilledPromiseBackfill: HistoricalStateBackfillProposal = {
  ...committedHistoricalBackfill,
  id: 'historical-backfill:conversation-recall:promise-fulfilled',
  baseCanonRevision: committedCanon.revision + 1,
  operations: [{
    op: 'replace',
    path: '/promises/letter-trace/status',
    value: { status: 'fulfilled', statement: '守夜人的去向已经解释了寄信线索。' },
    expectedPreviousValue: { status: 'created', statement: '追踪寄信人的线索必须继续。' },
    evidenceBlockIds: ['block:conversation-recall:committed'],
    reason: '后续正史已经兑现这条追踪承诺。',
    irreversible: true,
  }],
  createdAt: '2026-07-14T12:01:00.000Z',
  confirmedAt: '2026-07-14T12:01:00.000Z',
  committedAt: '2026-07-14T12:01:00.000Z',
}
const historicalRecallMemories = buildCreatorLocalChapterMemories({
  records: [
    ...localChapterRecords.map(record => record.family === 'localCanonStates'
      ? { ...record, value: { ...committedCanon, revision: committedCanon.revision + 1 } }
      : record),
    {
      family: 'canonPatches',
      id: committedHistoricalBackfill.id,
      value: committedHistoricalBackfill,
    },
    {
      family: 'canonPatches',
      id: rejectedHistoricalBackfill.id,
      value: rejectedHistoricalBackfill,
    },
    {
      family: 'canonPatches',
      id: fulfilledPromiseBackfill.id,
      value: fulfilledPromiseBackfill,
    },
  ],
  drafts: [committedDraft],
  workId,
  branchId,
})
assert.equal(
  historicalRecallMemories[0]?.stateRecallItems.length,
  9,
  'a committed historical backfill must add new paths while replacing older recall for the same path',
)
assert.ok(
  historicalRecallMemories[0]?.stateRecallItems.some(item => (
    item.sourceId === committedHistoricalBackfill.id
    && item.statePath.endsWith('/knowledge')
    && item.statement.includes('后来确认')
  )),
  'the latest committed historical value must become the locatable recall item',
)
assert.ok(
  historicalRecallMemories[0]?.stateRecallItems.some(item => (
    item.sourceId === committedHistoricalBackfill.id
    && item.statePath.endsWith('/physicalCondition')
  )),
  'a new committed historical state path must become optional recall',
)
assert.equal(
  historicalRecallMemories[0]?.stateRecallItems.some(item => item.sourceId === rejectedHistoricalBackfill.id),
  false,
  'rejected historical state must remain outside the recall directory',
)
const fulfilledPromiseTombstone = historicalRecallMemories[0]?.stateRecallItems.find(item => (
  item.sourceId === fulfilledPromiseBackfill.id
  && item.statePath === '/promises/letter-trace/status'
))
assert.equal(
  fulfilledPromiseTombstone?.recallStatus,
  'terminal',
  'a fulfilled promise must remain as a latest-state tombstone instead of an unresolved recall card',
)
const fulfilledLaterChapterMemory: CreatorLocalChapterMemory = {
  ...historicalRecallMemories[0]!,
  id: 'local-chapter-memory:promise-fulfilled-later',
  sourceId: 'local-canon:promise-fulfilled-later',
  sourceRevision: 2,
  chapterId: `local-chapter:${workId}:${branchId}:chapter:2`,
  chapterNumber: 2,
  title: '第二章',
  statement: '守夜人的去向已经解释了寄信线索。',
  stateRecallItems: [fulfilledPromiseTombstone!],
  committedAt: '2026-07-14T12:01:00.000Z',
}
const fulfilledPromiseRecall = buildCreatorRecallCandidates({
  chapters: [],
  localChapterMemories: [localChapterMemories[0]!, fulfilledLaterChapterMemory],
  settingAssets: [],
  linkedRequest: null,
  workId,
  branchId,
  chapterId: null,
  chapterNumber: 3,
}).filter(item => item.group === 'promise')
assert.equal(
  fulfilledPromiseRecall.some(item => item.statement.includes('追踪寄信人的线索必须继续')),
  false,
  'a later fulfilled tombstone must suppress the older unresolved promise across chapters',
)

const reopenedPromiseBackfill: HistoricalStateBackfillProposal = {
  ...fulfilledPromiseBackfill,
  id: 'historical-backfill:conversation-recall:promise-reopened',
  baseCanonRevision: committedCanon.revision + 2,
  operations: [{
    op: 'replace',
    path: '/promises/letter-trace/status',
    value: { status: 'advanced', statement: '新出现的第二封信让寄信线索重新成为待查承诺。' },
    expectedPreviousValue: { status: 'fulfilled', statement: '守夜人的去向已经解释了寄信线索。' },
    evidenceBlockIds: ['block:conversation-recall:committed'],
    reason: '后续正史用新证据明确重新开启了同一条线索。',
    irreversible: false,
  }],
  createdAt: '2026-07-14T12:02:00.000Z',
  confirmedAt: '2026-07-14T12:02:00.000Z',
  committedAt: '2026-07-14T12:02:00.000Z',
}
const reopenedRecallMemories = buildCreatorLocalChapterMemories({
  records: [
    ...localChapterRecords.map(record => record.family === 'localCanonStates'
      ? { ...record, value: { ...committedCanon, revision: committedCanon.revision + 2 } }
      : record),
    { family: 'canonPatches', id: fulfilledPromiseBackfill.id, value: fulfilledPromiseBackfill },
    { family: 'canonPatches', id: reopenedPromiseBackfill.id, value: reopenedPromiseBackfill },
  ],
  drafts: [committedDraft],
  workId,
  branchId,
})
const reopenedPromiseItem = reopenedRecallMemories[0]?.stateRecallItems.find(item => (
  item.sourceId === reopenedPromiseBackfill.id
  && item.statePath === '/promises/letter-trace/status'
))
assert.equal(
  reopenedPromiseItem?.recallStatus,
  'active',
  'an explicit later Canon operation may reopen a previously fulfilled promise',
)
const reopenedLaterChapterMemory: CreatorLocalChapterMemory = {
  ...reopenedRecallMemories[0]!,
  id: 'local-chapter-memory:promise-reopened-later',
  sourceId: 'local-canon:promise-reopened-later',
  sourceRevision: 3,
  chapterId: `local-chapter:${workId}:${branchId}:chapter:3`,
  chapterNumber: 3,
  title: '第三章',
  statement: '第二封信重新开启寄信线索。',
  stateRecallItems: [reopenedPromiseItem!],
  committedAt: '2026-07-14T12:02:00.000Z',
}
const reopenedPromiseRecall = buildCreatorRecallCandidates({
  chapters: [],
  localChapterMemories: [
    localChapterMemories[0]!,
    fulfilledLaterChapterMemory,
    reopenedLaterChapterMemory,
  ],
  settingAssets: [],
  linkedRequest: null,
  workId,
  branchId,
  chapterId: null,
  chapterNumber: 4,
}).filter(item => item.group === 'promise')
assert.ok(
  reopenedPromiseRecall.some(item => (
    item.sourceId === reopenedPromiseBackfill.id
    && item.statement.includes('重新成为待查承诺')
  )),
  'the newest explicit reopen must become selectable after the fulfilled tombstone',
)
const newerCharacterStateMemory = {
  ...localChapterMemories[0]!,
  id: 'local-chapter-memory:newer-character-state',
  sourceId: 'local-canon:newer-character-state',
  sourceRevision: 2,
  chapterId: `local-chapter:${workId}:${branchId}:chapter:2`,
  chapterNumber: 2,
  title: '第二章',
  stateRecallItems: localChapterMemories[0]!.stateRecallItems
    .filter(item => item.group === 'character_knowledge')
    .map(item => ({
      ...item,
      id: 'manual-recall:canon-state:patch:newer-character-state',
      sourceId: 'patch:newer-character-state',
      sourceRevision: 2,
      statement: '林澈已经把信件内容告诉同行者。',
      sourceLabel: '第 2 章 · 人物状态',
    })),
}
const deduplicatedStateRecall = buildCreatorRecallCandidates({
  chapters: [],
  localChapterMemories: [localChapterMemories[0]!, newerCharacterStateMemory],
  settingAssets: [],
  linkedRequest: null,
  workId,
  branchId,
  chapterId: null,
  chapterNumber: 3,
}).filter(item => item.group === 'character_knowledge' && item.statePath.endsWith('/knowledge'))
assert.equal(deduplicatedStateRecall.length, 1, 'the recall directory must keep only the newest value for one canon state path')
assert.equal(deduplicatedStateRecall[0]?.sourceId, 'patch:newer-character-state')

const canonContextSource = buildCreatorDecisionContextSource({
  intent: committedIntent,
  canon: committedCanon,
  chapters: [],
  settingAssets,
  linkedRequest: null,
  workId,
  branchId,
  chapterId: committedChapterId,
  sceneId: 'scene:committed',
  manuscript: acceptedChapterText,
})
assert.ok(
  canonContextSource.activePromises.some(item => (
    typeof item === 'object'
    && item !== null
    && (item as { detail?: string }).detail === '追踪寄信人的线索必须继续。'
  )),
  'unfulfilled canon promises must enter the next context source',
)
assert.equal(
  canonContextSource.activePromises.some(item => (
    typeof item === 'object'
    && item !== null
    && (item as { detail?: string }).detail === '已经兑现的旧承诺。'
  )),
  false,
  'fulfilled canon promises must not remain active',
)
assert.ok(
  canonContextSource.unresolvedForeshadowing.some(item => (
    typeof item === 'object'
    && item !== null
    && (item as { detail?: string }).detail === '检票钳锈色的来源仍未揭晓。'
  )),
)
assert.ok(
  Array.isArray(canonContextSource.currentTimeline)
  && canonContextSource.currentTimeline.some(item => (
    typeof item === 'object'
    && item !== null
    && (item as { detail?: string }).detail === '第三日清晨，林澈仍在旧车站。'
  )),
  'canon timeline outcomes must enter the context source when no runtime projection overrides them',
)
assert.ok(
  canonContextSource.recentSceneSummaries.some(item => item.summary === '同行者开始追问信件内容。'),
  'canon causal outcomes must remain visible to candidate search',
)
const legacyContext = Object.fromEntries(
  Object.entries(context).filter(([key]) => ![
    'manualRecallItems',
    'compilationPolicyVersion',
    'sourceFingerprint',
    'contentFingerprint',
  ].includes(key)),
)
const parsedLegacyContext = contextSnapshotSchema.parse(legacyContext)
assert.deepEqual(
  parsedLegacyContext.manualRecallItems,
  [],
  'existing context snapshots must migrate with an empty manual recall list',
)
assert.equal(parsedLegacyContext.compilationPolicyVersion, 0)
assert.equal(parsedLegacyContext.sourceFingerprint, 'legacy-unfingerprinted')
assert.equal(parsedLegacyContext.contentFingerprint, 'legacy-unfingerprinted')
assert.equal(contextSnapshotIntegrityIsCurrent(parsedLegacyContext), false)
assert.equal(
  contextMatchesCurrentSource({ context: parsedLegacyContext, source, intentRevision: intent.revision }),
  false,
  'a context created before source fingerprinting must fail closed instead of reaching a working Agent',
)

const capturedAssets: PmfLocalSettingAsset[] = []
const persistence: ConversationSettingPersistencePort = {
  readAll: () => capturedAssets,
  save: (input: PmfLocalSettingAssetInput) => {
    const asset: PmfLocalSettingAsset = {
      localAssetRef: `captured:${capturedAssets.length + 1}`,
      workId: input.workId,
      branchId: input.branchId || null,
      kind: input.kind,
      stage: input.stage,
      title: input.title,
      summary: input.summary,
      detail: input.detail || input.summary,
      tags: input.tags || [],
      updatedAt: now,
    }
    capturedAssets.push(asset)
    return asset
  },
}

assert.deepEqual(
  runConversationSettingCapture({
    text: '她推开站长室的门。',
    workId,
    branchId,
    stage: 'draft',
  }, persistence),
  { recognized: false },
  'ordinary prose must stay in the conversation instead of becoming a setting asset',
)
const characterCapture = runConversationSettingCapture({
  text: '人物：林澈知道信件会预告选择，但她不敢告诉同行者。',
  workId,
  branchId,
  stage: 'memory',
}, persistence)
assert.equal(characterCapture.recognized && characterCapture.ok && characterCapture.asset.kind, 'character')

const promiseCapture = runConversationSettingCapture({
  text: '伏笔：检票钳上的锈色来自上一位收信人。',
  workId,
  branchId,
  stage: 'memory',
}, persistence)
assert.ok(promiseCapture.recognized && promiseCapture.ok)
if (promiseCapture.recognized && promiseCapture.ok) {
  assert.deepEqual(promiseCapture.asset.tags.slice(0, 2), ['伏笔', '待回收'])
}
const timelineDotCapture = runConversationSettingCapture({
  text: '设定：时间线 · 第三日清晨，旧车站封站前二十分钟。',
  workId,
  branchId,
  stage: 'memory',
}, persistence)
assert.ok(timelineDotCapture.recognized && timelineDotCapture.ok)
if (timelineDotCapture.recognized && timelineDotCapture.ok) {
  assert.equal(timelineDotCapture.asset.kind, 'timeline')
  assert.equal(timelineDotCapture.asset.title, '时间线 · 第三日清晨，旧车站封站前二十分钟。')
}
assert.equal(capturedAssets.length, 3)
assert.deepEqual(
  runConversationSettingCapture({
    text: '时间线：',
    workId,
    branchId,
    stage: 'memory',
  }, persistence),
  { recognized: true, ok: false, notice: '请在“时间线：”后写下具体内容。' },
)

const capturedRecallCandidates = buildCreatorRecallCandidates({
  chapters,
  settingAssets: [
    ...capturedAssets,
    {
      localAssetRef: 'captured:legacy-timeline',
      workId,
      branchId,
      kind: 'rule',
      stage: 'memory',
      title: '设定 · 时间线 · 第二日黄昏',
      summary: '时间线 · 第二日黄昏，林澈返回旧车站。',
      detail: '时间线 · 第二日黄昏，林澈返回旧车站。',
      tags: ['对话补充', '作者明确'],
      updatedAt: now,
    },
    {
      localAssetRef: 'captured:timeline',
      workId,
      branchId,
      kind: 'timeline',
      stage: 'memory',
      title: '时间线 · 第三日清晨',
      summary: '第三日清晨，旧车站封站前二十分钟。',
      detail: '第三日清晨，旧车站封站前二十分钟。',
      tags: ['时间线'],
      updatedAt: now,
    },
  ],
  linkedRequest,
  workId,
  branchId,
  chapterId: 'chapter:3',
})
assert.ok(
  capturedRecallCandidates.every(candidate => !candidate.sourceLabel.includes('人物 · 人物 ·')),
  'conversation-captured asset labels must not repeat their type prefix',
)
assert.ok(
  capturedRecallCandidates.every(candidate => !candidate.sourceLabel.includes('时间线 · 设定 · 时间线 ·')),
  'legacy conversation captures must not leak nested setting prefixes into recall labels',
)
assert.equal(
  capturedRecallCandidates.find(candidate => candidate.id === 'manual-recall:timeline:captured:timeline')?.statement,
  '第三日清晨，旧车站封站前二十分钟。',
  'matching timeline summary and detail must render once',
)
assert.equal(
  capturedRecallCandidates.find(candidate => candidate.id === 'manual-recall:timeline:captured:legacy-timeline')?.group,
  'timeline',
  'explicit legacy timeline captures must stay available in the time-and-place recall group',
)

const recallMeta = new Map<string, unknown>()
const recallPersistence: CreatorEditorRecallSelectionPort = {
  read: (key, defaultValue) => recallMeta.has(key) ? recallMeta.get(key) as never : defaultValue,
  write: (key, value) => {
    recallMeta.set(key, value)
    return value
  },
}
const persistedRecallScope = `${workId}:${branchId}:chapter:3`
assert.equal(
  buildEditorRecallSelectionScope({
    workId,
    branchId,
    routeChapterNumber: 3,
    activeDraftRef: 'draft:created-after-first-save',
    selectedRequestId: 'request:seed',
  }),
  persistedRecallScope,
  'a chapter route must keep the same recall scope after the draft gains a local reference',
)
assert.equal(
  buildEditorRecallSelectionScope({
    workId,
    branchId,
    activeDraftRef: 'draft:resume',
    selectedRequestId: 'request:seed',
  }),
  `${workId}:${branchId}:draft:resume`,
  'a draft-only route must remain scoped to the resumed local draft',
)
writeEditorRecallSelection(persistedRecallScope, [
  selectedRecallIds[0],
  selectedRecallIds[0],
  selectedRecallIds[2],
], recallPersistence, now)
assert.deepEqual(
  readEditorRecallSelections(recallPersistence)[persistedRecallScope],
  [selectedRecallIds[0], selectedRecallIds[2]],
  'manual recall selection must survive a repository reload without duplicate ids',
)
writeEditorRecallSelection(persistedRecallScope, [], recallPersistence, now)
assert.deepEqual(
  readEditorRecallSelections(recallPersistence)[persistedRecallScope],
  [],
  'an explicit empty selection must persist instead of restoring recommendations',
)

const debtCharacter: PmfLocalSettingAsset = {
  ...settingAssets[0],
  localAssetRef: 'asset:character:shen-yanqiu',
  title: '沈砚秋',
  summary: '替无名百姓记寿债的账吏。',
  detail: '沈砚秋知道母账会追索揭账者的寿命。',
  tags: ['克制', '账吏'],
}
const explicitStorySeed = '在以寿命抵押山河权柄的王朝，替人记债的沈砚秋发现皇族正在把一场百年天灾转嫁给无名百姓；这一场他要在谢无咎封库前拓印母账并带走债印，代价是左手出现第一道老化纹，但不能揭晓最初签署者。'
const parsedSeed = buildCreatorEditorIntentSeed({
  settingAssets: [debtCharacter],
  linkedRequest: null,
  storySeed: explicitStorySeed,
})
assert.equal(
  parsedSeed.characterAgency?.requiredChoice,
  '沈砚秋必须在谢无咎封库前拓印母账并带走债印',
  'a complete story seed must become a specific author action instead of a generic question answer',
)
assert.equal(parsedSeed.characterAgency?.expectedCost, '左手出现第一道老化纹')
assert.deepEqual(parsedSeed.narrativeDelta?.mustNotResolve, ['揭晓最初签署者'])
assert.deepEqual(parsedSeed.informationPolicy?.delayedReveals, ['最初签署者'])

const dnfSeed = buildCreatorEditorIntentSeed({
  settingAssets: [{
    ...debtCharacter,
    localAssetRef: 'asset:character:lu-chenzhou',
    title: '人物 · 陆沉舟，二十七岁，原世界的机械维修师',
    summary: '陆沉舟只记得零散的阿拉德知识。',
  }],
  linkedRequest: null,
  storySeed: '陆沉舟在格兰之森边缘醒来，必须在夜幕前救下被哥布林围困的商队并抵达艾尔文防线；他只能用机械维修经验修好马车，代价是暴露自己不属于阿拉德，但本章不能解释紫色裂纹，也不能让他获得超自然力量。',
})
assert.equal(
  dnfSeed.characterAgency?.requiredChoice,
  '陆沉舟必须在夜幕前救下被哥布林围困的商队并抵达艾尔文防线',
  'a prohibition later in the seed must not replace the protagonist action',
)
assert.ok(
  !dnfSeed.characterAgency?.requiredChoice.includes('不能解释'),
  'a must-not-resolve clause must stay outside character agency',
)

const conditionFirstChoiceSeed = buildCreatorEditorIntentSeed({
  settingAssets: [{
    ...debtCharacter,
    localAssetRef: 'asset:character:lu-chenzhou',
    title: '人物 · 陆沉舟，二十七岁，原世界的机械维修师',
    summary: '陆沉舟只记得零散的阿拉德知识。',
  }],
  linkedRequest: null,
  storySeed: '必须当沟外配重突然滑脱时，陆沉舟拒绝越过红线，改为让塞文检查符纹；代价是失去辨认最后一块木牌的机会。',
})
assert.equal(
  conditionFirstChoiceSeed.characterAgency?.requiredChoice,
  '陆沉舟拒绝越过红线，改为让塞文检查符纹',
  'a decisive refusal must retain its semantic verb instead of reversing the character action',
)

const chapterTwentyStorySeed = '这一章写南门转运场的牵索偏载开始威胁学徒和公开路线板。陆沉舟不能越线、不能越权，只能凭可见机械受力说服贺岚放弃继续辨认木条，先救人再保全合法证据。'
const chapterTwentyLu = {
  ...debtCharacter,
  localAssetRef: 'asset:character:lu-chenzhou',
  title: '人物 · 陆沉舟，二十七岁，原世界的机械维修师',
  summary: '陆沉舟只记得零散的阿拉德知识。',
}
const chapterTwentyHe = {
  ...debtCharacter,
  localAssetRef: 'asset:character:he-lan',
  title: '人物 · 贺岚',
  summary: '贺岚掌握南门转运场的现场调度权。',
}
const chapterTwentySeed = buildCreatorEditorIntentSeed({
  settingAssets: [chapterTwentyHe, chapterTwentyLu],
  linkedRequest: null,
  storySeed: chapterTwentyStorySeed,
})
assert.equal(
  chapterTwentySeed.characterAgency?.primaryActorId,
  'asset:character:lu-chenzhou',
  'the author sentence must select its acting character instead of inheriting recall-card order',
)
assert.equal(
  chapterTwentySeed.characterAgency?.requiredChoice,
  '陆沉舟只能凭可见机械受力说服贺岚放弃继续辨认木条，先救人再保全合法证据',
  'a constrained “只能” action must outrank the generic chapter premise',
)
assert.equal(
  chapterTwentySeed.narrativeDelta?.mustChange,
  '贺岚放弃继续辨认木条，先救人再保全合法证据',
  'the required change must describe the counterpart state change instead of duplicating the action',
)

const chapterNineStorySeed = '第9章暂定《轮辋里的灰泥》。紧接第8章同一日上午，前往赫顿玛尔的粮车被拦在艾尔文防线内。灰色油泥主要黏在左前轮轮辋内侧，踏面反而很少，陆沉舟因此怀疑它不是路上溅上的，而是最近一次修轮时被带进轮毂。罗恩仍保留最终命令权，固定守卫全程陪同陆沉舟；他的左膝发炎，只能在防线内原地检查，不能去旧矿、不能追车外的人。伊蕾负责问车夫和核对路线，巴特必须亲手复验机械判断，受罚的柯林只记录步骤、不碰证物。关键选择是：粮车必须尽快把口粮送往赫顿玛尔，但要查清灰泥来源就得拆下唯一完好的左前轮并破坏新封的轴销。陆沉舟选择要求拆轮，以自己承担延误口粮和车夫索赔为代价，证明灰泥被压在旧油层之下，是有人在装粮之后的一次临时修轮中主动塞入，并从轮毂里找到一枚由旧矿车止退片改成的薄垫。巴特只能认可“这只轮在离开装粮点后被懂矿车结构的人修过”，不能推断对方身份。结尾不要战斗、不要揭晓幕后者、不要使用地铁卡；让伊蕾在重新封好的粮袋内侧发现一枚灰色油指印，说明接触旧矿油泥的人不仅碰过车轮，也碰过货物。'
const chapterNineSeed = buildCreatorEditorIntentSeed({
  settingAssets: [{
    ...debtCharacter,
    localAssetRef: 'asset:character:lu-chenzhou',
    title: '人物 · 陆沉舟，二十七岁，原世界的机械维修师',
    summary: '陆沉舟只记得零散的阿拉德知识。',
  }],
  linkedRequest: null,
  storySeed: chapterNineStorySeed,
})
assert.equal(
  chapterNineSeed.characterAgency?.requiredChoice,
  '陆沉舟必须拆下唯一完好的左前轮并破坏新封的轴销',
  'the explicit key choice must outrank incidental supporting-character constraints',
)
assert.ok(
  chapterNineSeed.narrativeDelta?.mustChange.includes('旧矿车止退片改成的薄垫'),
  'the required change must retain the physical evidence produced by the choice',
)
assert.equal(
  chapterNineSeed.characterAgency?.expectedCost,
  '承担延误口粮和车夫索赔',
  'an “以…为代价” clause must populate the visible author cost',
)
assert.ok(
  !chapterNineSeed.characterAgency?.requiredChoice.includes('巴特'),
  'a supporting-character verification constraint must not become protagonist agency',
)

const chapterNineIntent = await referenceWritingAgent.proposeIntentContract({
  session,
  seed: chapterNineSeed,
})
const correctedChapterNineSeed = buildCreatorEditorIntentSeed({
  settingAssets: [{
    ...debtCharacter,
    localAssetRef: 'asset:character:lu-chenzhou',
    title: '人物 · 陆沉舟，二十七岁，原世界的机械维修师',
    summary: '陆沉舟只记得零散的阿拉德知识。',
  }],
  linkedRequest: null,
  currentIntent: chapterNineIntent,
  storySeed: '人物选择：陆沉舟要求拆下粮车唯一完好的左前轮并破坏新封轴销，以验证灰泥是否来自装粮后的临时修轮。必须变化：从轮毂发现一枚由旧矿车止退片改成的薄垫，只能证明懂矿车结构的人在装粮后修过车轮。可见代价：陆沉舟承担延误赫顿玛尔口粮、车夫索赔与进一步收紧行动限制的责任。',
})
assert.equal(
  correctedChapterNineSeed.characterAgency?.requiredChoice,
  '陆沉舟要求拆下粮车唯一完好的左前轮并破坏新封轴销，以验证灰泥是否来自装粮后的临时修轮',
  'an explicit author correction must override the earlier derived choice after reopen',
)
assert.equal(
  correctedChapterNineSeed.narrativeDelta?.mustChange,
  '从轮毂发现一枚由旧矿车止退片改成的薄垫，只能证明懂矿车结构的人在装粮后修过车轮',
  'an explicit required-change label must override the prior proposal',
)
assert.equal(
  correctedChapterNineSeed.characterAgency?.expectedCost,
  '陆沉舟承担延误赫顿玛尔口粮、车夫索赔与进一步收紧行动限制的责任',
  'an explicit visible-cost label must override the prior proposal',
)

const chapterTenSeed = buildCreatorEditorIntentSeed({
  settingAssets: [{
    ...debtCharacter,
    localAssetRef: 'asset:character:lu-chenzhou',
    title: '人物 · 陆沉舟，二十七岁，原世界的机械维修师',
    summary: '陆沉舟只记得零散的阿拉德知识。',
  }],
  linkedRequest: null,
  storySeed: '人物选择：陆沉舟要求割开可疑粮袋并随车前往赫顿玛尔交接证物。必须变化：袋口夹层里找到一段带滑结的蜡线短绳。可见代价：陆沉舟接受写死全部路线、停留点和时限；途中不得下车改道。结尾不要战斗，不要提及地铁卡。',
})
assert.equal(
  chapterTenSeed.characterAgency?.expectedCost,
  '陆沉舟接受写死全部路线、停留点和时限；途中不得下车改道',
  'an unlabelled ending constraint must not leak into the explicit visible cost',
)
assert.ok(
  correctedChapterNineSeed.boundaries?.requiredElements.some(element => (
    element.includes('前往赫顿玛尔的粮车被拦在艾尔文防线内')
    && element.includes('结尾不要战斗、不要揭晓幕后者、不要使用地铁卡')
  )),
  'a correction must preserve the original chapter seed and its continuity constraints',
)

const parsedIntent = await referenceWritingAgent.proposeIntentContract({
  session,
  seed: parsedSeed,
})
assert.equal(
  parsedIntent.unresolvedQuestions.length,
  0,
  'a seed that already states action, cost, and delayed reveal must not receive redundant setup questions',
)
const matchingSignals = matchAuthorIntentSignals(
  parsedIntent,
  '沈砚秋在皇城税契库拓印母账，谢无咎封库前，他把债印藏进袖中。',
)
assert.ok(
  matchingSignals.matchedSignals.length > 0,
  'Chinese character, object, and action signals must count as intent continuity',
)
assert.equal(
  matchAuthorIntentSignals(parsedIntent, '雾港灯塔下，沈星澜听见潮钟重新响起。').matchedSignals.length,
  0,
  'an unrelated story must not pass the author-intent signal guard',
)

const reopenedIntent = reopenAuthorIntent({
  ...parsedIntent,
  status: 'locked',
  lockedAt: now,
  unresolvedQuestions: [{
    id: 'question:reopen',
    fieldPath: 'characterAgency.requiredChoice',
    importance: 'blocking',
    question: '人物必须作出什么选择？',
    reason: '让作者能够修改上一轮答案。',
    options: [],
    answeredBy: 'author',
  }],
})
assert.equal(
  reopenedIntent.unresolvedQuestions[0]?.answeredBy,
  null,
  'reopening author intent must make prior questions answerable again',
)

const repairBlock: DraftBlock = {
  id: 'draft-block:timeline',
  text: '漏壶落下第三滴水时，库门还剩四十分钟关闭。',
  startOffset: 0,
  endOffset: 23,
  protected: false,
}
const repairFinding: LiteraryFinding = {
  id: 'finding:timeline',
  dimension: 'continuity',
  severity: 'hard_block',
  evidence: [{
    blockId: repairBlock.id,
    startOffset: 0,
    endOffset: 9,
    excerptHash: 'fixture',
  }],
  expected: '报时与二十三时二十分保持一致。',
  observed: '报时出现逆行。',
  readerImpact: '封库倒计时失去可信度。',
  diagnosis: '时间线事实冲突。',
  repairDirection: '只校正报时句，保留后续动作和倒计时压力。',
  protectedBlockIds: [],
  confidence: 'high',
  status: 'active',
}
const repairGuidance = buildLocalRepairGuidance(repairFinding, repairBlock)
assert.ok(repairGuidance?.includes('原文证据：漏壶落下第三滴水'))
assert.ok(repairGuidance?.includes('只校正报时句'))
assert.equal(repairGuidance?.includes('她停了一下'), false, 'local repair guidance must not invent generic prose')

const editableDraft = '守库人扬声报时：“距子时三刻！”沈砚秋没有抬头。'
assert.deepEqual(
  runConversationTextEdit({
    message: '把“距子时三刻！”改成“距子时两刻半！”',
    content: editableDraft,
  }),
  {
    recognized: true,
    ok: true,
    content: '守库人扬声报时：“距子时两刻半！”沈砚秋没有抬头。',
    notice: '已按你的原文定位完成一处修改；旧审阅将失效，需要重新检查。',
  },
  'the single composer may apply one exact author-directed replacement',
)
assert.deepEqual(
  runConversationTextEdit({
    message: '把“沈砚秋”改成“他”',
    content: '沈砚秋抬头，沈砚秋又低头。',
  }),
  {
    recognized: true,
    ok: false,
    notice: '这段原文出现了多次，请补充更长的上下文后再修改。',
  },
  'an ambiguous replacement must never overwrite multiple author passages',
)

assert.deepEqual(
  recognizeCreatorConversationReviewCommand(
    '只审阅第20章现有正文，不生成新正文、不改正史。请指出一处最可能造成长文因果误读的地方，并引用可以定位的原文。',
  ),
  {
    recognized: true,
    kind: 'review_current_manuscript',
    focusDimensions: ['continuity'],
  },
  'a bounded natural-language review request must route to the existing independent review workflow',
)
assert.deepEqual(
  recognizeCreatorConversationReviewCommand('把“旧钥匙”改成“铜钥匙”'),
  { recognized: false },
  'an exact manuscript edit must remain owned by the text-edit workflow',
)
assert.deepEqual(
  recognizeCreatorConversationReviewCommand('设定：陆沉舟仍然不信任旧队伍。'),
  { recognized: false },
  'a setting detour must not be mistaken for an independent review request',
)
assert.deepEqual(
  recognizeCreatorConversationReviewCommand('检查本章节奏和重复解释，不改正文。'),
  {
    recognized: true,
    kind: 'review_current_manuscript',
    focusDimensions: ['repetition', 'pacing'],
  },
  'author-specified literary dimensions must reach the independent review request',
)

console.log('[creator-conversation-recall] PASS')
