import { randomUUID } from 'node:crypto'
import { agentContracts } from './agents.js'
import {
  constraintProfiles,
  evaluatePublicProseHygiene,
  repairPublicProseScaffolds,
  resolveConstraints,
  resolveKernels,
  runtimeRulesMeta,
} from './constraints.js'
import { ledgerEntry } from './ledger.js'
import { qualityCheckTool, socraticTurnTool, statePreviewTool } from './toolBridge.js'
import type {
  ConstraintProfile,
  GenreKernel,
  PublicSocraticCreateOutput,
  RuntimeArtifact,
  SocraticCreateInput,
  SocraticCreateOutput,
} from './types.js'

function cleanPublicText(value: string | undefined, fallback: string): string {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text || fallback
}

function publicKernelName(kernel: GenreKernel | undefined, profile: ConstraintProfile | undefined): string {
  const raw = cleanPublicText(kernel?.name || profile?.displayName, '故事')
  return raw.replace(/内核$/u, '').replace(/规则$/u, '')
}

function safeTitle(input: SocraticCreateInput, profiles: ConstraintProfile[], kernels: GenreKernel[]): string {
  const templateTitle = typeof input.selectedTemplate?.title === 'string' ? input.selectedTemplate.title : ''
  const contextTemplate = typeof input.context?.main_universe_template === 'object' && input.context.main_universe_template !== null
    ? input.context.main_universe_template as Record<string, unknown>
    : {}
  const contextTitle = typeof contextTemplate.title === 'string' ? contextTemplate.title : ''
  const productTitle = cleanPublicText(templateTitle || contextTitle, '')
  if (productTitle) return productTitle.slice(0, 16)

  const name = publicKernelName(kernels[0], profiles[0])
  return `${name}开场`.slice(0, 16)
}

function beatPlan(kernels: GenreKernel[]): string[] {
  const primary = kernels[0]
  if (!primary) return ['异常出现', '人物被迫选择', '代价显形']
  return primary.eventStructure.slice(0, 5)
}

function firstItem(items: string[] | undefined, fallback: string): string {
  return cleanPublicText(items?.[0], fallback)
}

function secondItem(items: string[] | undefined, fallback: string): string {
  return cleanPublicText(items?.[1] || items?.[0], fallback)
}

function subjectFromSeed(seed: string, profiles: ConstraintProfile[]): string {
  if (/[她女少女姑娘母妻姐妹]/u.test(seed) || profiles.some(profile => /女|甜宠|耽美|追妻/u.test(profile.displayName))) {
    return '她'
  }
  if (/[他男少年男人父兄弟]/u.test(seed)) return '他'
  return '那个人'
}

function seedAsOpeningEvent(input: SocraticCreateInput, profiles: ConstraintProfile[], subject: string): string {
  let text = cleanPublicText(input.seed, '有人发现了一个不该出现的异常')
  text = text.replace(/^我想写(?:一个|一部)?[^，。；;,.]*故事[，,:：]?\s*/u, '')
  for (const label of [input.genre, ...profiles.map(profile => profile.displayName)]) {
    const cleanLabel = cleanPublicText(label, '')
    if (!cleanLabel) continue
    text = text.replace(new RegExp(`^${cleanLabel}[，,:：\\s]+`, 'u'), '')
  }
  text = text
    .replace(/主角/g, subject)
    .replace(/一个(少女|女孩|女人|男人|少年)/g, '$1')
    .replace(/[。；;,.，]+$/u, '')
  return `${text}。`
}

function asProseClause(value: string, subject: string): string {
  return cleanPublicText(value, '选择的代价开始显形')
    .replace(/主角/g, subject)
    .replace(/人物/g, '人')
    .replace(/高潮/g, '最危险的时候')
    .replace(/避免/g, '不能')
    .replace(/不要/g, '不能')
    .replace(/不得/g, '不能')
    .replace(/[。；;,.，]+$/u, '')
}

function antiThesisBoundary(value: string, subject: string): string {
  const clause = asProseClause(value, subject)
  const substitute = clause.match(/^不能用(.+?)替代(.+)$/u)
  if (substitute) {
    return `任何看似省力的捷径，都绕不开${substitute[2]}`
  }
  const letSubstitute = clause.match(/^不能让(.+?)替代(.+)$/u)
  if (letSubstitute) {
    return `真正要紧的事，不能交给${letSubstitute[1]}代为完成`
  }
  return clause
}

function candidateBody(input: SocraticCreateInput, profiles: ConstraintProfile[], kernels: GenreKernel[]): string {
  const subject = subjectFromSeed(input.seed, profiles)
  const seed = seedAsOpeningEvent(input, profiles, subject)
  const kernel = kernels[0]
  if (!kernel) {
    return [
      `第一盏灯亮起时，所有人都说那只是风。`,
      `${subject}站在门槛外，手里握着不该出现的线索，意识到自己被推到一个必须选择的位置。`,
      `真正让空气安静下来的，是${subject}刚刚听见的那句话：${seed}`,
      `${subject}还不知道这句话会改变谁的命运，但已经明白，沉默和开口都会付出代价。`,
    ].join('\n\n')
  }

  const openingBeat = asProseClause(firstItem(kernel.eventStructure, '异常出现'), subject)
  const pressureBeat = asProseClause(secondItem(kernel.eventStructure, '选择压力'), subject)
  const motive = asProseClause(firstItem(kernel.motiveRules, '人必须保护一个无法轻易放下的东西'), subject)
  const conflict = asProseClause(firstItem(kernel.conflictRules, '每个选择都必须改变关系或处境'), subject)
  const climax = asProseClause(firstItem(kernel.climaxRules, '人要承担选择后果'), subject)
  const antiThesis = antiThesisBoundary(kernel.antiThesis, subject)

  return [
    `那天，${seed}`,
    `门外的声响停了一瞬，像是整座城都在等${subject}先抬头。最先露出裂口的是${openingBeat}，它没有给出答案，只把一件必须立刻处理的事推到${subject}面前。`,
    `${subject}本可以装作没有听见。可${motive}，这念头像一根细线缠住指节，让${pressureBeat}忽然变得沉重。`,
    `第一次真正的逼迫来自${conflict}。交出去，能换来短暂的清白；藏起来，就要让更多人误会${subject}已经站到了危险那一边。`,
    `天色慢慢压低，${subject}终于明白，${climax}并不是很远以后的事。${antiThesis}。在作出选择以前，${subject}先把那件东西贴近胸口，听见自己的心跳比远处的钟声更急。`,
  ].join('\n\n')
}

function questionsFor(profiles: ConstraintProfile[], kernels: GenreKernel[]): string[] {
  const kernel = kernels[0]
  if (!kernel) {
    return [
      '这个人现在最不能失去的东西是什么？',
      '第一章末尾要把选择推给这个人，还是推给身边的人？',
    ]
  }
  const subject = subjectFromSeed('', profiles)
  const motive = asProseClause(firstItem(kernel.motiveRules, '主角最想保护的东西'), subject)
  const conflict = asProseClause(firstItem(kernel.conflictRules, '第一场冲突'), subject)
  return [
    `这段开场里，${motive}具体落在哪个人或哪件物上？`,
    `${conflict}出现时，你希望${subject}先保护关系、真相，还是自己的生存位置？`,
  ]
}

function sourceLabelsFor(profiles: ConstraintProfile[], kernels: GenreKernel[]) {
  return {
    seed: 'human',
    doctrine: kernels[0] ? 'rule_engine' : 'memo',
    protagonist_gap: 'memo',
    first_conflict: kernels[0] ? 'rule_engine' : 'memo',
    genre_constraints: profiles.length ? 'rule_engine' : 'memo',
    kernel: kernels[0] ? 'rule_engine' : 'memo',
  } as const
}

function settingCards(input: SocraticCreateInput, profiles: ConstraintProfile[], kernels: GenreKernel[]) {
  const primaryKernel = kernels[0]
  const primaryProfile = profiles[0]
  const conflict = firstItem(primaryKernel?.conflictRules, '第一场冲突必须改变人物处境')
  const motive = firstItem(primaryKernel?.motiveRules, '主角要先暴露一个不能失去的东西')
  const thesis = cleanPublicText(primaryKernel?.thesis, '先写出人物被迫承担的代价，再让世界规则变得可验证。')
  const publicName = publicKernelName(primaryKernel, primaryProfile)
  return [
    {
      type: 'seed',
      title: '故事起点',
      value: input.seed,
      source: 'human',
    },
    {
      type: 'genre_promise',
      title: '题材承诺',
      value: publicName,
      source: primaryKernel ? 'rule_engine' : 'memo',
    },
    {
      type: 'world_rule',
      title: '世界压力',
      value: thesis,
      source: primaryKernel ? 'rule_engine' : 'memo',
    },
    {
      type: 'character_gap',
      title: '人物缺口',
      value: motive,
      source: 'memo',
    },
    {
      type: 'first_conflict',
      title: '第一冲突',
      value: conflict,
      source: primaryKernel ? 'rule_engine' : 'memo',
    },
  ]
}

function runtimeSettingCards(input: SocraticCreateInput, profiles: ConstraintProfile[], kernels: GenreKernel[]) {
  const publicName = publicKernelName(kernels[0], profiles[0])
  return {
    seed: input.seed,
    genre_promise: publicName,
    doctrine: cleanPublicText(kernels[0]?.thesis, '先写出人物被迫承担的代价，再让世界规则变得可验证。'),
    protagonist_gap: firstItem(kernels[0]?.motiveRules, '主角先缺身份、信任或安全感，再获得行动空间。'),
    first_conflict: firstItem(kernels[0]?.conflictRules, '第一场冲突必须改变人物处境。'),
    story_notes: settingCards(input, profiles, kernels),
    genre_constraints: profiles.map(profile => ({
      id: profile.id,
      display_name: profile.displayName,
      prohibited_terms: profile.rules.flatMap(rule => rule.prohibitedTerms || []),
      rule_ids: profile.rules.map(rule => rule.id),
    })),
    kernel: kernels[0]?.id || 'kernel-general-socratic-opening',
    source_labels: sourceLabelsFor(profiles, kernels),
  }
}

function runtimeStatePatch(args: {
  runId: string
  projectId: string
  sessionId: string
  title: string
  body: string
  questions: string[]
  profiles: ConstraintProfile[]
  kernels: GenreKernel[]
  qualityResult: SocraticCreateOutput['qualityPreview']['result']
}): Record<string, unknown>[] {
  return [
    {
      targetId: args.sessionId,
      targetType: 'world',
      operations: [
        {
          op: 'set',
          path: 'candidate.current',
          value: {
            status: 'candidate',
            title: args.title,
            bodyPreview: args.body.slice(0, 240),
            charCount: args.body.length,
          },
        },
        {
          op: 'merge',
          path: 'setting_cards',
          value: {
            open_questions: args.questions.slice(0, 2),
            active_constraints: args.profiles.map(profile => ({
              profileId: profile.id,
              ruleIds: profile.rules.map(rule => rule.id),
            })),
            active_kernels: args.kernels.map(kernel => ({
              kernelId: kernel.id,
              beatPlan: beatPlan([kernel]),
            })),
          },
        },
        {
          op: 'set',
          path: 'quality.preview',
          value: {
            result: args.qualityResult,
          },
        },
      ],
      metadata: {
        sourceAgent: 'Orchestrator',
        runId: args.runId,
        projectId: args.projectId,
        confidence: 0.74,
        reason: 'preview_candidate_memory_before_author_confirmation',
      },
    },
  ]
}

function runtimeArtifactFor(args: {
  runId: string
  projectId: string
  sessionId: string
  title: string
  body: string
  questions: string[]
  profiles: ConstraintProfile[]
  kernels: GenreKernel[]
  violations: Array<{ ruleId: string; severity: string; message: string }>
  qualityResult: SocraticCreateOutput['qualityPreview']['result']
}): RuntimeArtifact {
  const primaryKernel = args.kernels[0]
  const beats = primaryKernel ? beatPlan([primaryKernel]) : beatPlan([])
  const qualityDecision = args.qualityResult === 'block'
    ? 'block'
    : args.qualityResult === 'rewrite'
      ? 'rewrite'
      : 'candidate'
  const stateWritebackPreview = runtimeStatePatch(args)
  const acceptedTimeEvents = beats.slice(0, 5).map((label, index) => ({
    id: `time_event_${index + 1}`,
    label,
    order: index + 1,
  }))

  return {
    version: 1,
    narrativeRun: {
      id: args.runId,
      projectId: args.projectId,
      sessionId: args.sessionId,
      authoringMode: 'co_write',
      decision: qualityDecision,
    },
    constraintSet: args.profiles.flatMap(profile =>
      profile.rules.map(rule => ({
        profileId: profile.id,
        ruleIds: [rule.id],
        severity: rule.severity,
      })),
    ),
    kernelSelection: args.kernels.map(kernel => ({
      kernelId: kernel.id,
      compatibleProfiles: kernel.compatibleProfiles,
      beatPlan: beatPlan([kernel]),
      timeControls: kernel.timeControls,
    })),
    scenePlan: {
      id: `scene_${args.runId.replace(/^run_/, '').slice(0, 12)}`,
      runId: args.runId,
      objective: cleanPublicText(primaryKernel?.thesis, '把故事种子写成有选择压力的第一幕。'),
      beats,
      requiredStateRefs: [
        'candidate.current',
        'setting_cards.open_questions',
        'quality.preview',
      ],
      candidateEvents: beats.slice(0, 5).map((label, index) => ({
        id: `event_${index + 1}`,
        label,
        source: 'kernel',
        intensity: Number(((primaryKernel?.timeControls.baseRate || 0.35) + index * 0.08).toFixed(2)),
      })),
      choiceSlots: args.questions.slice(0, 2).map((question, index) => ({
        id: `choice_slot_${index + 1}`,
        prompt: question,
        status: 'candidate',
      })),
    },
    stateWritebackPreview,
    timeConsistencyReport: {
      id: `time_${args.runId.replace(/^run_/, '').slice(0, 12)}`,
      runId: args.runId,
      status: args.violations.some(item => item.severity === 'hard') ? 'warn' : 'pass',
      acceptedTimeEvents,
      timelineConflicts: [],
      requiredRepair: [],
    },
    qualityBrakeReport: {
      id: `quality_${args.runId.replace(/^run_/, '').slice(0, 12)}`,
      runId: args.runId,
      result: args.qualityResult,
      scores: {
        doctrine: 0.74,
        constraint: args.violations.length ? 0.42 : 0.88,
        kernel: args.kernels.length ? 0.86 : 0.62,
        time: 0.8,
        state: stateWritebackPreview.length ? 0.78 : 0.48,
        prose: args.body.length >= 200 ? 0.82 : 0.56,
        safety: args.violations.some(item => item.severity === 'hard') ? 0.46 : 0.9,
      },
      reasons: args.violations.map(item => item.message),
      repairPrompt: args.violations.length
        ? '先修复题材、时间或公开正文问题，再让作者确认。'
        : '候选正文可进入作者确认；确认前仍不得写入正史或支线。',
      decision: qualityDecision,
    },
    branchGenerationResult: {
      id: `branch_${args.runId.replace(/^run_/, '').slice(0, 12)}`,
      runId: args.runId,
      status: 'not_generated',
      reason: 'author_confirmation_required',
      visibility: 'private',
      sourceType: 'ai_candidate',
    },
  }
}

function localOutputFromInput(input: SocraticCreateInput, runId: string): Record<string, unknown> {
  const contextOutput = input.context?.mastra_local_output
  if (typeof contextOutput === 'object' && contextOutput !== null) {
    return contextOutput as Record<string, unknown>
  }
  return {
    runId,
    projectId: input.projectId || `project_${randomUUID().slice(0, 8)}`,
    sessionId: input.sessionId || `creator_dialogue_${randomUUID().slice(0, 12)}`,
    candidateDraft: {
      status: 'candidate',
      title: '第一幕',
      body: input.seed,
    },
    questions: [],
    settingCards: {},
    activeConstraints: [],
    activeKernels: [],
    qualityPreview: { result: 'pass', violations: [], repairSuggestions: [] },
    runTrace: [],
    cost: { mode: 'mock_local', estimatedTokens: 0, estimatedCostUsd: 0 },
  }
}

function publicSettingCards(cards: Record<string, unknown>): PublicSocraticCreateOutput['settingCards'] {
  return {
    seed: cards.seed,
    genre_promise: cards.genre_promise,
    doctrine: cards.doctrine,
    protagonist_gap: cards.protagonist_gap,
    first_conflict: cards.first_conflict,
    story_notes: cards.story_notes,
  }
}

function publicQualityPreview(
  qualityPreview: SocraticCreateOutput['qualityPreview'] | Record<string, unknown> | undefined,
): PublicSocraticCreateOutput['qualityPreview'] {
  const result = qualityPreview?.result
  const safeResult = result === 'warn' || result === 'rewrite' || result === 'block' ? result : 'pass'
  const rawViolations = Array.isArray(qualityPreview?.violations) ? qualityPreview.violations : []
  const violations = rawViolations.map(item => {
    const value = typeof item === 'object' && item !== null ? item as Record<string, unknown> : {}
    return {
      severity: String(value.severity || 'warn'),
      message: String(value.message || '候选内容需要继续确认。'),
    }
  })
  const repairSuggestions = Array.isArray(qualityPreview?.repairSuggestions)
    ? qualityPreview.repairSuggestions.map(item => String(item))
    : []
  return {
    result: safeResult,
    violations,
    repairSuggestions,
  }
}

export function projectPublicSocraticCreateOutput(output: SocraticCreateOutput): PublicSocraticCreateOutput {
  return {
    responseMode: 'public',
    runId: output.runId,
    projectId: output.projectId,
    sessionId: output.sessionId,
    candidateDraft: output.candidateDraft,
    questions: output.questions.slice(0, 2),
    settingCards: publicSettingCards(output.settingCards),
    qualityPreview: publicQualityPreview(output.qualityPreview),
  }
}

export function projectPublicStatePreviewOutput(output: Record<string, unknown>): Record<string, unknown> {
  const deltas = Array.isArray(output.stateDeltaCandidate) ? output.stateDeltaCandidate : []
  return {
    responseMode: 'public',
    status: output.status || 'preview_only',
    projectId: output.projectId,
    sessionId: output.sessionId,
    memoryPreview: {
      status: 'preview_only',
      summary: deltas.length
        ? `已整理 ${deltas.length} 组写作记忆，等你确认后再固定到作品。`
        : '已整理这一段的写作记忆，等你确认后再固定到作品。',
      itemCount: deltas.length,
    },
    candidateState: 'candidate_only',
  }
}

export function projectPublicQualityBrakeOutput(output: Record<string, unknown>): Record<string, unknown> {
  return {
    responseMode: 'public',
    status: output.status || 'checked',
    runId: output.runId,
    projectId: output.projectId,
    sessionId: output.sessionId,
    candidateDraft: output.candidateDraft,
    revisedCandidate: output.revisedCandidate,
    qualityPreview: publicQualityPreview(
      typeof output.qualityPreview === 'object' && output.qualityPreview !== null
        ? output.qualityPreview as Record<string, unknown>
        : undefined,
    ),
    repairPlan: Array.isArray(output.repairPlan) ? output.repairPlan.map(item => String(item)) : [],
    candidateState: 'candidate_only',
  }
}

function candidateFromLocalOutput(
  localOutput: Record<string, unknown>,
  input: SocraticCreateInput,
): SocraticCreateOutput['candidateDraft'] {
  const candidate = typeof localOutput.candidateDraft === 'object' && localOutput.candidateDraft !== null
    ? localOutput.candidateDraft as Record<string, unknown>
    : {}
  return {
    status: 'candidate',
    title: String(candidate.title || '第一幕'),
    body: String(candidate.body || input.seed || ''),
  }
}

function profileIdsFromLocalOutput(localOutput: Record<string, unknown>): string[] {
  const active = Array.isArray(localOutput.activeConstraints) ? localOutput.activeConstraints : []
  return active
    .map(item => {
      if (typeof item !== 'object' || item === null) return ''
      return String((item as Record<string, unknown>).profileId || '')
    })
    .filter(Boolean)
}

function profilesForQuality(input: SocraticCreateInput, localOutput: Record<string, unknown>): ConstraintProfile[] {
  const selectedIds = profileIdsFromLocalOutput(localOutput)
  const fromLocal = constraintProfiles.filter(profile => selectedIds.includes(profile.id))
  const fromInput = resolveConstraints(input)
  const merged = new Map<string, ConstraintProfile>()
  for (const profile of [...fromLocal, ...fromInput]) merged.set(profile.id, profile)
  return [...merged.values()].sort((a, b) => b.priority - a.priority)
}

function repairBody(body: string, profiles: ConstraintProfile[]): string {
  let repaired = body
  for (const profile of profiles) {
    for (const rule of profile.rules) {
      const replacement = rule.replacementGuidance?.[0] || '符合当前题材的表达'
      for (const term of rule.prohibitedTerms || []) {
        repaired = repaired.split(term).join(replacement)
      }
    }
  }
  return repaired
}

function repairPlanFor(violations: Array<{ ruleId: string; severity: string; message: string }>): string[] {
  if (!violations.length) {
    return ['当前段落可以继续写；下一轮重点看人物选择是否会推动新的代价。']
  }
  return violations.slice(0, 4).map(item => (
    `${item.message}；先改成该题材内部可解释、可验证的表达，再继续扩写。`
  ))
}

export async function socraticCreateWorkflow(
  input: SocraticCreateInput,
  options: { signal?: AbortSignal; preferToolBridge?: boolean } = {},
): Promise<SocraticCreateOutput> {
  const runId = `run_${randomUUID()}`
  const projectId = input.projectId || `project_${randomUUID().slice(0, 8)}`
  const startedAt = Date.now()
  const profiles = resolveConstraints(input)
  const kernels = resolveKernels(profiles)
  const title = safeTitle(input, profiles, kernels)
  const body = repairBody(repairPublicProseScaffolds(candidateBody(input, profiles, kernels)), profiles)
  const violations = evaluatePublicProseHygiene(body, profiles)
  const qualityResult = violations.some(item => item.severity === 'hard') ? 'block' : violations.length ? 'warn' : 'pass'
  const sessionId = input.sessionId || `creator_dialogue_${randomUUID().slice(0, 12)}`
  const questions = questionsFor(profiles, kernels).slice(0, 2)
  const cards = runtimeSettingCards(input, profiles, kernels)
  const runtimeArtifact = runtimeArtifactFor({
    runId,
    projectId,
    sessionId,
    title,
    body,
    questions,
    profiles,
    kernels,
    violations,
    qualityResult,
  })

  const localOutput: SocraticCreateOutput = {
    runId,
    projectId,
    sessionId,
    candidateDraft: {
      status: 'candidate',
      title,
      body,
    },
    questions,
    settingCards: cards,
    activeConstraints: profiles.map(profile => ({
      profileId: profile.id,
      ruleIds: profile.rules.map(rule => rule.id),
      prohibitedTerms: profile.rules.flatMap(rule => rule.prohibitedTerms || []),
    })),
    activeKernels: kernels.map(kernel => ({
      kernelId: kernel.id,
      beatPlan: beatPlan([kernel]),
    })),
    sourceLabels: {
      seed: 'human',
      candidateDraft: 'llm_candidate',
      questions: 'rule_engine',
      settingCards: 'rule_engine',
      activeConstraints: 'rule_engine',
      activeKernels: 'rule_engine',
      runtimeArtifact: 'rule_engine',
      qualityPreview: 'quality_gate',
    },
    runtimeArtifact,
    qualityPreview: {
      result: qualityResult,
      violations,
      repairSuggestions: violations.map(item => `修复 ${item.ruleId} 后再进入作者确认。`),
    },
    runTrace: [
      { step: 'intent.resolve', status: 'ok', detail: '故事种子已进入自然语言创作流程。' },
      { step: 'constraint.resolve', status: 'ok', detail: profiles.map(profile => profile.displayName).join('、') || '未激活特殊题材约束。' },
      { step: 'kernel.plan', status: 'ok', detail: kernels.map(kernel => kernel.name).join('、') || '使用通用开场节拍。' },
      { step: 'draft.candidate', status: 'ok', detail: '已生成候选正文，等待作者确认。' },
      { step: 'quality.preview', status: violations.length ? 'warn' : 'ok', detail: violations.length ? '候选存在需要修复的约束问题。' : '候选通过本轮预检。' },
    ],
    cost: {
      mode: 'mock_local',
      estimatedTokens: Math.ceil(body.length / 1.8),
      estimatedCostUsd: 0,
    },
    ledger: [],
  }

  localOutput.ledger = [
    ledgerEntry({
      runId,
      projectId,
      agentType: 'Workflow',
      input,
      output: localOutput,
      startedAt,
      qualityResult: localOutput.qualityPreview,
      stateDeltaCandidate: localOutput.runtimeArtifact.stateWritebackPreview,
    }),
  ]

  if (options.preferToolBridge === false) return localOutput

  try {
    const bridged = await socraticTurnTool(
      {
        ...input,
        projectId,
        sessionId: localOutput.sessionId,
        context: {
          ...(input.context || {}),
          mastra_local_output: localOutput,
        },
      },
      runId,
      options.signal,
    )
    return {
      ...localOutput,
      ...(bridged as Partial<SocraticCreateOutput>),
      runId,
      projectId,
      runTrace: [
        ...localOutput.runTrace,
        { step: 'tool_bridge.socratic_turn', status: 'ok', detail: 'FastAPI Runtime Facade 已返回。' },
      ],
      ledger: localOutput.ledger,
    }
  } catch {
    return {
      ...localOutput,
      runTrace: [
        ...localOutput.runTrace,
        { step: 'tool_bridge.socratic_turn', status: 'warn', detail: 'FastAPI Tool Bridge 暂不可用，保留本地候选结果。' },
      ],
    }
  }
}

export async function statePreviewWorkflow(
  input: SocraticCreateInput,
  options: { signal?: AbortSignal } = {},
): Promise<Record<string, unknown>> {
  const runId = `preview_${randomUUID()}`
  const startedAt = Date.now()
  const localOutput = typeof input.context?.mastra_local_output === 'object' && input.context.mastra_local_output !== null
    ? input.context.mastra_local_output as Record<string, unknown>
    : {
        runId,
        projectId: input.projectId || `project_${randomUUID().slice(0, 8)}`,
        sessionId: input.sessionId || `creator_dialogue_${randomUUID().slice(0, 12)}`,
        candidateDraft: {
          status: 'candidate',
          title: '第一幕',
          body: input.seed,
        },
        questions: [],
        settingCards: {},
        activeConstraints: [],
        activeKernels: [],
        qualityPreview: { result: 'pass', violations: [], repairSuggestions: [] },
        runTrace: [
          { step: 'state.preview.prepare', status: 'ok', detail: '候选写作记忆已准备预览。' },
        ],
        cost: { mode: 'mock_local', estimatedTokens: 0, estimatedCostUsd: 0 },
      }

  try {
    const bridged = await statePreviewTool(
      {
        ...input,
        context: {
          ...(input.context || {}),
          mastra_local_output: localOutput,
        },
      },
      String(localOutput.runId || runId),
      options.signal,
    )
    return {
      ...bridged,
      ledger: [
        ledgerEntry({
          runId,
          projectId: String(localOutput.projectId || input.projectId || 'project_preview'),
          agentType: 'Workflow',
          input,
          output: bridged,
          startedAt,
          stateDeltaCandidate: Array.isArray((bridged as Record<string, unknown>).stateDeltaCandidate)
            ? (bridged as { stateDeltaCandidate: Record<string, unknown>[] }).stateDeltaCandidate
            : [],
        }),
      ],
    }
  } catch {
    return {
      status: 'preview_only',
      projectId: localOutput.projectId || input.projectId || 'project_preview',
      sessionId: localOutput.sessionId || input.sessionId || `preview_${runId.slice(0, 12)}`,
      stateDeltaCandidate: [],
      writeback: {
        status: 'preview_only',
        canon_written: false,
        branch_written: false,
        idempotency_key: runId,
      },
      runTrace: [
        { step: 'tool_bridge.state_preview', status: 'warn', detail: '候选写作记忆暂时只保留在本地。' },
      ],
    }
  }
}

export async function qualityBrakeWorkflow(
  input: SocraticCreateInput,
  options: { signal?: AbortSignal } = {},
): Promise<Record<string, unknown>> {
  const runId = `quality_${randomUUID()}`
  const startedAt = Date.now()
  const localOutput = localOutputFromInput(input, runId)
  const candidate = candidateFromLocalOutput(localOutput, input)
  const profiles = profilesForQuality(input, localOutput)
  const violations = evaluatePublicProseHygiene(candidate.body, profiles)
  const revisedBody = violations.length
    ? repairPublicProseScaffolds(repairBody(candidate.body, profiles))
    : candidate.body
  const revisedCandidate = {
    ...candidate,
    body: revisedBody,
  }
  const qualityPreview = {
    result: violations.some(item => item.severity === 'hard') ? 'block' as const : violations.length ? 'warn' as const : 'pass' as const,
    violations,
    repairSuggestions: repairPlanFor(violations),
  }
  const status = violations.length ? 'repair_suggested' : 'checked'
  const runTrace = [
    ...(Array.isArray(localOutput.runTrace) ? localOutput.runTrace as Array<{ step: string; status: string; detail: string }> : []),
    {
      step: 'quality.inspect',
      status: violations.length ? 'warn' : 'ok',
      detail: violations.length ? '当前候选段落需要修订后再确认。' : '当前候选段落通过本轮检查。',
    },
    {
      step: 'quality.revise_candidate',
      status: 'ok',
      detail: violations.length ? '已生成一版可替换的修订候选。' : '无需生成替换文本。',
    },
  ]
  const bridgeOutput = {
    ...localOutput,
    runId,
    candidateDraft: revisedCandidate,
    qualityPreview,
    runTrace,
  }
  const writeback = {
    status: 'preview_only',
    canon_written: false,
    branch_written: false,
    idempotency_key: runId,
  }
  const localResult = {
    status,
    runId,
    projectId: String(localOutput.projectId || input.projectId || 'project_preview'),
    sessionId: String(localOutput.sessionId || input.sessionId || `preview_${runId.slice(0, 12)}`),
    candidateDraft: revisedCandidate,
    revisedCandidate,
    qualityPreview,
    repairPlan: qualityPreview.repairSuggestions,
    writeback,
    runTrace,
    ledger: [
      ledgerEntry({
        runId,
        projectId: String(localOutput.projectId || input.projectId || 'project_preview'),
        agentType: 'Workflow',
        input,
        output: bridgeOutput,
        startedAt,
        qualityResult: qualityPreview,
        stateDeltaCandidate: [],
      }),
    ],
  }

  try {
    const bridged = await qualityCheckTool(
      {
        ...input,
        context: {
          ...(input.context || {}),
          mastra_local_output: bridgeOutput,
        },
      },
      runId,
      options.signal,
    )
    const bridgedTrace = Array.isArray(bridged.runTrace) ? bridged.runTrace : runTrace
    return {
      ...localResult,
      qualityPreview: (bridged.qualityPreview as typeof qualityPreview | undefined) || qualityPreview,
      runTrace: bridgedTrace,
    }
  } catch {
    return {
      ...localResult,
      runTrace: [
        ...runTrace,
        {
          step: 'quality.runtime_sync',
          status: 'warn',
          detail: '本轮检查结果先保留在当前页面，等待后续同步。',
        },
      ],
    }
  }
}

export const workflowRegistry = {
  socraticCreateWorkflow,
  draftSceneWorkflow: socraticCreateWorkflow,
  extractChangesWorkflow: socraticCreateWorkflow,
  qualityBrakeWorkflow,
  statePreviewWorkflow,
}

export const agentRuntimeMeta = {
  framework: 'mastra',
  package: '@mastra/core',
  mode: 'mock-local-first-round',
  runtimeRules: runtimeRulesMeta,
  contracts: agentContracts,
  workflows: Object.keys(workflowRegistry),
}
