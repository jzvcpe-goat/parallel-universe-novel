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

function candidateBody(input: SocraticCreateInput, profiles: ConstraintProfile[], kernels: GenreKernel[]): string {
  const seed = cleanPublicText(input.seed, '一个必须被写出来的异常')
  const profile = profiles[0]
  const kernel = kernels[0]
  if (!kernel) {
    return [
      `第一盏灯亮起时，所有人都说那只是风。`,
      `那个人站在门槛外，手里握着不该出现的线索，意识到自己被推到一个必须选择的位置。`,
      `那句话在心里落下：${seed}`,
      `他还不知道这句话会改变谁的命运，但已经明白，沉默和开口都会付出代价。`,
    ].join('\n\n')
  }

  const genreName = publicKernelName(kernel, profile)
  const openingBeat = firstItem(kernel.eventStructure, '异常出现')
  const pressureBeat = secondItem(kernel.eventStructure, '选择压力')
  const motive = firstItem(kernel.motiveRules, '人物必须保护一个无法轻易放下的东西')
  const conflict = firstItem(kernel.conflictRules, '每个选择都必须改变关系或处境')
  const climax = firstItem(kernel.climaxRules, '高潮要让人物承担选择后果')
  const thesis = cleanPublicText(kernel.thesis, '真正的张力来自愿望和代价同时出现。')
  const antiThesis = cleanPublicText(kernel.antiThesis, '不能让巧合替人物完成行动。')

  return [
    `一开始，${seed}。这不是一句设定，而是${genreName}故事里第一个被迫显形的异常。`,
    `${openingBeat}来得很早，早到那个人还没想好该相信谁。周围的一切都在要求他给出解释，可他更先意识到：${motive}。`,
    `真正压下来的不是答案，而是${pressureBeat}。${thesis} 所以他不能靠一句巧合越过麻烦，也不能把所有后果推给命运。`,
    `当${conflict}开始发生，他终于明白第一步不是证明自己正确，而是决定先保住什么、放弃什么。${antiThesis} 这条边界像一道暗线，把每个人都推向不同的代价。`,
    `这一章的末尾应该停在一个必须回答的问题上：如果继续往前，${climax}；如果停下，前面已经出现的异常会先吞掉他最想保护的东西。`,
  ].join('\n\n')
}

function questionsFor(profiles: ConstraintProfile[], kernels: GenreKernel[]): string[] {
  const kernel = kernels[0]
  const profile = profiles[0]
  if (!kernel) {
    return [
      '主角现在最不能失去的东西是什么？',
      '第一章末尾要把选择推给他，还是推给他身边的人？',
    ]
  }
  const genreName = publicKernelName(kernel, profile)
  const motive = firstItem(kernel.motiveRules, '主角最想保护的东西')
  const conflict = firstItem(kernel.conflictRules, '第一场冲突')
  return [
    `这个${genreName}开场里，${motive}具体落在哪个人或哪件物上？`,
    `${conflict}出现时，你希望主角先保护关系、真相，还是自己的生存位置？`,
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
  return {
    seed: input.seed,
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
  const body = candidateBody(input, profiles, kernels)
  const violations = evaluatePublicProseHygiene(body, profiles)
  const cards = runtimeSettingCards(input, profiles, kernels)

  const localOutput: SocraticCreateOutput = {
    runId,
    projectId,
    sessionId: input.sessionId || `creator_dialogue_${randomUUID().slice(0, 12)}`,
    candidateDraft: {
      status: 'candidate',
      title,
      body,
    },
    questions: questionsFor(profiles, kernels).slice(0, 2),
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
      qualityPreview: 'quality_gate',
    },
    qualityPreview: {
      result: violations.some(item => item.severity === 'hard') ? 'block' : violations.length ? 'warn' : 'pass',
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
      stateDeltaCandidate: [],
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
