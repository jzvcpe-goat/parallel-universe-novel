import { randomUUID } from 'node:crypto'
import { agentContracts } from './agents.js'
import {
  evaluateConstraintViolations,
  resolveConstraints,
  resolveKernels,
} from './constraints.js'
import { ledgerEntry } from './ledger.js'
import { socraticTurnTool } from './toolBridge.js'
import type {
  ConstraintProfile,
  GenreKernel,
  SocraticCreateInput,
  SocraticCreateOutput,
} from './types.js'

function safeTitle(input: SocraticCreateInput, profiles: ConstraintProfile[]): string {
  if (profiles.some(profile => profile.id === 'western-fantasy-transmigration-non-game')) return '边境深井'
  if (profiles.some(profile => profile.id === 'urban-mystery')) return '雨夜证据'
  if (profiles.some(profile => profile.id === 'xuanhuan-suspense')) return '灯影旧誓'
  return '第一幕'
}

function beatPlan(kernels: GenreKernel[]): string[] {
  const primary = kernels[0]
  if (!primary) return ['异常出现', '人物被迫选择', '代价显形']
  return primary.eventStructure.slice(0, 5)
}

function candidateBody(input: SocraticCreateInput, profiles: ConstraintProfile[], kernels: GenreKernel[]): string {
  const seed = input.seed.trim()
  const beats = beatPlan(kernels)
  if (profiles.some(profile => profile.id === 'western-fantasy-transmigration-non-game')) {
    return [
      `他醒在边境矿城的钟声里，背下是潮冷的石粉，耳边有人用陌生的口音喊他欠了三枚银契。`,
      `深井口的蓝火一明一灭，圣堂书记把一张破损的通行契塞到他掌心，像是早就知道他会从另一个世界跌进来。`,
      `他没有看见任何界面，也没有获得凭空降下的奖赏；能救命的只有前世残留的判断、眼前人的贪婪，以及那座地下城正在向城墙下方呼吸的事实。`,
      `如果承认自己不是这里的人，他会被当作灾厄的信标；如果假装熟悉这座城，他必须立刻替一个失踪矿工偿还债务。`,
      `他把自己的来处压在舌根底下。第一件事不是拔剑，而是先听懂谁在撒谎。`,
      `本轮节拍：${beats.join(' -> ')}。`,
    ].join('\n\n')
  }
  if (profiles.some(profile => profile.id === 'urban-mystery')) {
    return [
      `雨停在凌晨两点十七分，监控里的那个人却还撑着伞。`,
      `主角把证据袋压在掌心，塑封边缘有一道旧裂痕，像是有人在多年以前就替今晚开过封。`,
      `他以为自己收到的是一份普通旧案材料，直到看见照片背面那行字：${seed}`,
      `如果公开，证人会立刻暴露；如果隐瞒，旧案里真正活下来的人会再次消失。`,
      `本轮节拍：${beats.join(' -> ')}。`,
    ].join('\n\n')
  }
  return [
    `第一盏灯亮起时，所有人都说那只是风。`,
    `主角站在门槛外，手里握着不该出现的线索，意识到自己被推到一个必须选择的位置。`,
    `故事种子落下：${seed}`,
    `他还不知道这句话会改变谁的命运，但已经明白，沉默和开口都会付出代价。`,
    `本轮节拍：${beats.join(' -> ')}。`,
  ].join('\n\n')
}

function questionsFor(profiles: ConstraintProfile[]): string[] {
  if (profiles.some(profile => profile.id === 'western-fantasy-transmigration-non-game')) {
    return [
      '主角最想隐瞒的“外来者破绽”是什么？',
      '第一场地下城危机里，他要先救人、保密，还是还债？',
    ]
  }
  if (profiles.some(profile => profile.id === 'urban-mystery')) {
    return [
      '这份证据会伤害谁，所以主角不能立刻公开？',
      '主角和旧案之间有什么私人关系？',
    ]
  }
  return [
    '主角现在最不能失去的东西是什么？',
    '第一章末尾要把选择推给他，还是推给他身边的人？',
  ]
}

function settingCards(input: SocraticCreateInput, profiles: ConstraintProfile[], kernels: GenreKernel[]) {
  return {
    seed: input.seed,
    doctrine: '先写出人物被迫承担的代价，再让世界规则变得可验证。',
    protagonist_gap: '主角先缺身份、信任或安全感，再获得行动空间。',
    first_conflict: '公开真相与保住当下生存条件之间的冲突。',
    genre_constraints: profiles.map(profile => ({
      id: profile.id,
      display_name: profile.displayName,
      prohibited_terms: profile.rules.flatMap(rule => rule.prohibitedTerms || []),
      rule_ids: profile.rules.map(rule => rule.id),
    })),
    kernel: kernels[0]?.id || 'kernel-general-socratic-opening',
    source_labels: {
      seed: 'human',
      doctrine: 'memo',
      protagonist_gap: 'memo',
      first_conflict: 'rule_engine',
      genre_constraints: 'rule_engine',
      kernel: 'rule_engine',
    },
  }
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
  const title = safeTitle(input, profiles)
  const body = candidateBody(input, profiles, kernels)
  const violations = evaluateConstraintViolations(body, profiles)
  const cards = settingCards(input, profiles, kernels)

  const localOutput: SocraticCreateOutput = {
    runId,
    projectId,
    sessionId: input.sessionId || `creator_dialogue_${randomUUID().slice(0, 12)}`,
    candidateDraft: {
      status: 'candidate',
      title,
      body,
    },
    questions: questionsFor(profiles).slice(0, 2),
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

export const workflowRegistry = {
  socraticCreateWorkflow,
  draftSceneWorkflow: socraticCreateWorkflow,
  extractChangesWorkflow: socraticCreateWorkflow,
  qualityBrakeWorkflow: socraticCreateWorkflow,
}

export const agentRuntimeMeta = {
  framework: 'mastra',
  package: '@mastra/core',
  mode: 'mock-local-first-round',
  contracts: agentContracts,
  workflows: Object.keys(workflowRegistry),
}
