import { latestDateLabel } from '../creatorViewHelpers'
import type {
  CreatorChapterDirectionOption,
  CreatorChapterGoalBrief,
} from '@/components/creator/workspace/CreatorPlanningPanels'
import type {
  CreatorSettingAssetKind,
  CreatorSettingAssetSummary,
  CreatorSocraticPlanStage,
} from '@/components/creator/workspace/CreatorSocraticPanels'
import type {
  PmfLocalSettingAsset,
  PmfLocalSettingAssetKind,
  PmfReaderRequest,
} from '@/features/pmf/types'
import type { WritingGuideStep } from './creatorEditorViewModels'

type SocraticQuestionChoice = {
  id: string
  label: string
  impact: string
}

export type SocraticQuestion = {
  question: string
  why: string
  choices: SocraticQuestionChoice[]
  customPlaceholder: string
  nextLabel: string
  skipLabel: string
}

export function buildSocraticQuestion(step: WritingGuideStep, linkedRequest: PmfReaderRequest | null): SocraticQuestion {
  if (step === 'scene') {
    return {
      question: '这一场戏的压力应该先落在哪里？',
      why: '压力落点会决定场景节奏：是快推进、强悬疑，还是让支线代价变得清楚。',
      customPlaceholder: '例如：让主角必须在救人和隐瞒真相之间选一个。',
      nextLabel: '形成第一场戏',
      skipLabel: '稍后再定',
      choices: [
        { id: 'time', label: '时间限制', impact: '节奏会更快，适合让人物立刻行动。' },
        { id: 'loss', label: '失去某人', impact: '情绪代价更强，适合支线和关系变化。' },
        { id: 'lie', label: '谎言露馅', impact: '悬疑会更重，适合揭示推进。' },
        { id: 'side', label: '必须选边', impact: '人物立场会更清楚，适合进入分线。' },
      ],
    }
  }
  if (step === 'draft') {
    return {
      question: '下一段最该补什么，才能让正文继续往前走？',
      why: '正文推进不是多写几句，而是补上动作、阻碍、代价或段尾钩子中的一个。',
      customPlaceholder: '例如：补一个让人物误判的动作。',
      nextLabel: '按这个方向补写',
      skipLabel: '继续手写',
      choices: [
        { id: 'action', label: '人物动作', impact: '段落会更可读，避免停在解释。' },
        { id: 'obstacle', label: '新的阻碍', impact: '冲突会更明确，下一段更容易接。' },
        { id: 'cost', label: '具体代价', impact: '选择会有重量，不像随意分支。' },
        { id: 'hook', label: '段尾钩子', impact: '读者更容易想看下一段。' },
      ],
    }
  }
  if (step === 'memory') {
    return {
      question: '这段写完以后，最值得沉淀成哪类作品设定？',
      why: '把关键变化沉淀下来，后续章节才能保持人物、场景和规则一致。',
      customPlaceholder: '例如：潮汐档案室只承认活人留下的名字。',
      nextLabel: '收成设定候选',
      skipLabel: '暂不沉淀',
      choices: [
        { id: 'motive', label: '人物动机', impact: '后续选择会更稳定。' },
        { id: 'scene', label: '场景状态', impact: '回到同一地点时不会前后矛盾。' },
        { id: 'rule', label: '世界规则', impact: '奇异事件会有边界，不会随意发生。' },
        { id: 'branch', label: '支线承诺', impact: '外界回声能被追踪到后续章节。' },
      ],
    }
  }
  if (step === 'publish') {
    return {
      question: '发布前最需要作者亲自确认哪一项？',
      why: '发布包确认的重点不是通过更多表单，而是确认读者看到的承诺和正文是否一致。',
      customPlaceholder: '例如：标题承诺了灯码，但正文要真正回应灯码。',
      nextLabel: '纳入发布包',
      skipLabel: '稍后检查',
      choices: [
        { id: 'title', label: '标题兑现', impact: '读者点进来后不会觉得标题空泛。' },
        { id: 'body', label: '正文完整', impact: '章节不会像草稿片段。' },
        { id: 'destination', label: '去向清晰', impact: '主线和 IF 支线不会混在一起。' },
        { id: 'request', label: '请求回应', impact: '读者能看出自己的请求被处理了。' },
      ],
    }
  }

  return {
    question: linkedRequest
      ? '这条请求里，读者真正想看到的是什么？'
      : '如果没有外界回声，这一章最先要让读者想追什么？',
    why: linkedRequest
      ? '这会决定本章先回应信息揭示、人物选择，还是支线代价。'
      : '开头欲望会决定节奏、冲突类型和第一段正文的钩子。',
    customPlaceholder: '例如：我想让读者先怀疑这次选择会害死一个人。',
    nextLabel: '确认这个判断',
    skipLabel: '稍后再定',
    choices: [
      { id: 'truth', label: '想知道真相', impact: '正文会优先安排线索和反常信息。' },
      { id: 'choice', label: '想看人物选择', impact: '正文会把压力落到人物立场。' },
      { id: 'cost', label: '想看支线代价', impact: '正文会更强调另一条线会失去什么。' },
      { id: 'relation', label: '想看关系拉扯', impact: '正文会让对话和信任变化更靠前。' },
      { id: 'explore', label: '想探索未知', impact: '正文会先打开场景和规则边界。' },
    ],
  }
}

export function writingGuideStepLabel(step: WritingGuideStep) {
  const labels: Record<WritingGuideStep, string> = {
    intent: '故事开场',
    scene: '场景控制',
    draft: '正文推进',
    memory: '设定沉淀',
    publish: '发布判断',
  }
  return labels[step]
}

export function settingAssetKindLabel(kind: PmfLocalSettingAssetKind) {
  const labels: Record<PmfLocalSettingAssetKind, string> = {
    character: '人物',
    skill: '能力',
    location: '地点',
    map: '地图',
    faction: '势力',
    item: '物品',
    rule: '规则',
    timeline: '时间线',
  }
  return labels[kind]
}

export function planStageAssetKinds(stage: WritingGuideStep): CreatorSettingAssetKind[] {
  const kindMap: Record<WritingGuideStep, CreatorSettingAssetKind[]> = {
    intent: ['rule', 'faction'],
    scene: ['character', 'location', 'map'],
    draft: ['character', 'skill', 'item'],
    memory: ['character', 'location', 'rule', 'timeline'],
    publish: ['timeline', 'rule'],
  }
  return kindMap[stage]
}

export function defaultSettingKindForStage(stage: WritingGuideStep): PmfLocalSettingAssetKind {
  const kindMap: Record<WritingGuideStep, PmfLocalSettingAssetKind> = {
    intent: 'rule',
    scene: 'location',
    draft: 'character',
    memory: 'rule',
    publish: 'timeline',
  }
  return kindMap[stage]
}

export function settingAssetSummary(asset: PmfLocalSettingAsset): CreatorSettingAssetSummary {
  return {
    id: asset.localAssetRef,
    kind: asset.kind,
    title: asset.title,
    summary: asset.summary,
    stageLabel: writingGuideStepLabel(asset.stage),
    updatedLabel: latestDateLabel(asset.updatedAt),
  }
}

export function buildSocraticPlanStages({
  activeStep,
  assets,
  linkedRequest,
  titleReady,
  contentReady,
  destinationReady,
}: {
  activeStep: WritingGuideStep
  assets: PmfLocalSettingAsset[]
  linkedRequest: PmfReaderRequest | null
  titleReady: boolean
  contentReady: boolean
  destinationReady: boolean
}): CreatorSocraticPlanStage[] {
  const stages: Array<{
    id: WritingGuideStep
    label: string
    question: string
    control: string
    ready: boolean
  }> = [
    {
      id: 'intent',
      label: '故事开场',
      question: linkedRequest ? '读者真正想追什么？' : '这一章最先承诺什么？',
      control: '先锁定题材气质、核心异常和读者期待，避免正文写散。',
      ready: Boolean(linkedRequest),
    },
    {
      id: 'scene',
      label: '人物与场景',
      question: '这一场戏里，谁在承受压力？压力落在哪个地点？',
      control: '把人物、地点和势力关系问清楚，再把回答变成可复用设定。',
      ready: Boolean(linkedRequest) || activeStep !== 'intent',
    },
    {
      id: 'draft',
      label: '正文推进',
      question: '下一段要补动作、阻碍、代价，还是段尾钩子？',
      control: '只生成候选句和候选段，采用前不改正文。',
      ready: contentReady,
    },
    {
      id: 'memory',
      label: '设定沉淀',
      question: '这段写完后，哪些人物、能力、地图或规则要记住？',
      control: '把正文里的稳定信息收进本机设定库，后续问答会优先参考。',
      ready: assets.length > 0,
    },
    {
      id: 'publish',
      label: '发布判断',
      question: '标题、正文、去向和读者承诺是否一致？',
      control: '发布前只判断读者会看到什么；不把草稿自动公开。',
      ready: titleReady && contentReady && destinationReady,
    },
  ]

  return stages.map(stage => {
    const assetCount = assets.filter(asset => asset.stage === stage.id).length
    return {
      ...stage,
      assetKinds: planStageAssetKinds(stage.id),
      assetCount,
      active: activeStep === stage.id,
      stateLabel: activeStep === stage.id
        ? '正在控制'
        : stage.ready || assetCount > 0
          ? '已可用'
          : '待补齐',
    }
  })
}

export interface ChapterPlannerGoalBriefInput {
  linkedRequest: PmfReaderRequest | null
  settingAssets: PmfLocalSettingAsset[]
}

function compactPlannerText(value: string, limit = 34) {
  const compact = value.replace(/\s+/g, ' ').trim()
  return compact.length > limit ? `${compact.slice(0, limit)}…` : compact
}

function plannerAssetTitles(
  assets: PmfLocalSettingAsset[],
  matches: (asset: PmfLocalSettingAsset) => boolean,
) {
  return [...new Set(assets.filter(matches).map(asset => asset.title.trim()).filter(Boolean))]
    .slice(0, 3)
    .join('、')
}

function assetHasTag(asset: PmfLocalSettingAsset, markers: string[]) {
  return asset.tags.some(tag => markers.some(marker => tag.includes(marker)))
}

export function chapterPlannerGoalBriefs({
  linkedRequest,
  settingAssets,
}: ChapterPlannerGoalBriefInput): CreatorChapterGoalBrief[] {
  const readerWish = linkedRequest ? compactPlannerText(linkedRequest.request_text) : ''
  const chapterGoal = readerWish
    ? `回应“${readerWish}”，并让人物承担结果。`
    : '确立这一章的核心问题，并留下下一章还想看的变化。'
  const characterTitles = plannerAssetTitles(settingAssets, asset => asset.kind === 'character')
  const foreshadowingTitles = plannerAssetTitles(
    settingAssets,
    asset => assetHasTag(asset, ['伏笔', '线索', '承诺']),
  )
  const heldBackTitles = plannerAssetTitles(
    settingAssets,
    asset => assetHasTag(asset, ['暂不揭示', '秘密', '谜底', '真相']),
  )
  return [
    {
      label: '本章目标',
      value: chapterGoal,
      detail: linkedRequest ? '先回应这条读者愿望，再让人物承担后果。' : '先给本章一个清楚承诺。',
    },
    {
      label: '参与人物',
      value: characterTitles || '尚未保存本章人物',
      detail: characterTitles ? '来自当前作品的本机人物设定。' : '在设定沉淀中保存人物后，这里会自动带入。',
    },
    {
      label: '必须推进的伏笔',
      value: foreshadowingTitles || '尚未标记本章伏笔',
      detail: foreshadowingTitles ? '来自当前作品中带有伏笔、线索或承诺标签的设定。' : '给设定添加伏笔、线索或承诺标签后，这里会自动带入。',
    },
    {
      label: '暂不揭示',
      value: heldBackTitles || '尚未标记保留信息',
      detail: heldBackTitles ? '这些内容继续留在作者的本机判断中。' : '可在设定中标记秘密、谜底或暂不揭示的内容。',
    },
  ]
}

export function chapterPlannerDirections(): CreatorChapterDirectionOption[] {
  return [
    {
      id: 'pressure',
      label: '方向 A',
      title: '压迫推进',
      summary: '让危险或限时逼近，人物先行动，再让后果追上来。',
      strength: '节奏起得快，适合承接催更请求。',
      risk: '容易牺牲细节，需要留一处安静反应。',
      bestFor: '拉起节奏',
      promise: '下一段先兑现紧张感',
    },
    {
      id: 'reveal',
      label: '方向 B',
      title: '线索推进',
      summary: '让新证据推翻旧判断，关系随之变紧。',
      strength: '悬疑和人物关系会同时收紧。',
      risk: '信息量会变多，需要少解释多动作。',
      bestFor: '悬疑反转',
      promise: '下一段先兑现新发现',
    },
    {
      id: 'branch',
      label: '方向 C',
      title: '分线推进',
      summary: '沿读者提出的另一种选择展开，不改动主线。',
      strength: '支线成立感强，能承接外界回声。',
      risk: '主线动力会短暂停下，需要给支线独立钩子。',
      bestFor: 'IF 支线',
      promise: '下一段先兑现另一种可能',
    },
  ]
}
