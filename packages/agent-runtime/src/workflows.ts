import { randomUUID } from 'node:crypto'
import { agentContracts } from './agents.js'
import {
  evaluateConstraintViolations,
  resolveConstraints,
  resolveKernels,
} from './constraints.js'
import { ledgerEntry } from './ledger.js'
import { socraticTurnTool, statePreviewTool } from './toolBridge.js'
import type {
  ConstraintProfile,
  GenreKernel,
  SocraticCreateInput,
  SocraticCreateOutput,
} from './types.js'

function safeTitle(input: SocraticCreateInput, profiles: ConstraintProfile[]): string {
  if (profiles.some(profile => profile.id === 'xuanhuan-xianxia')) return '问灵台'
  if (profiles.some(profile => profile.id === 'modern-other')) return '雨夜证据'
  if (profiles.some(profile => profile.id === 'game-litrpg')) return '登录前夜'
  if (profiles.some(profile => profile.id === 'system-litrpg')) return '回声任务'
  if (profiles.some(profile => profile.id === 'comedy-misfit')) return '掉马现场'
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
  if (profiles.some(profile => profile.id === 'xuanhuan-xianxia')) {
    return [
      `问灵台的铜铃响到第三声时，主角才发现掌心那枚玉简裂开了一道血线。`,
      `师门说这是传承，可传承里第一句话不是功法，而是一笔欠了三代人的旧债。`,
      `他能借这道灵息跨过第一重关，也必须承受经脉逆行的痛，以及被债主循着因果找上门的风险。`,
      `如果立刻闭关，他会错过山门外那场伏杀；如果先救人，玉简里的灵气会在天亮前散尽。`,
      `长老没有催他，只把一盏快要熄灭的魂灯推到面前。灯芯里映着的不是敌人，而是他未来必须亲手偿还的人。`,
      `本轮节拍：${beats.join(' -> ')}。`,
    ].join('\n\n')
  }
  if (profiles.some(profile => profile.id === 'modern-other')) {
    return [
      `雨停在凌晨两点十七分，监控里的那个人却还撑着伞。`,
      `主角把证据袋压在掌心，塑封边缘有一道旧裂痕，像是有人在多年以前就替今晚开过封。`,
      `他以为自己收到的是一份普通旧案材料，直到看见照片背面那行字：${seed}`,
      `如果公开，证人会立刻暴露；如果隐瞒，旧案里真正活下来的人会再次消失。`,
      `本轮节拍：${beats.join(' -> ')}。`,
    ].join('\n\n')
  }
  if (profiles.some(profile => profile.id === 'game-litrpg')) {
    return [
      `登录舱合上时，主角看见任务日志只刷新了一行：本次死亡会清空当前身份。`,
      `队伍频道里没有人说话，坦克的盾牌耐久正在下坠，治疗职业却迟迟没有进本。`,
      `他知道这不是单人逞强能解决的局面。技能树上唯一亮着的节点，需要队友先完成一次打断。`,
      `如果强开首领，他能抢到第一波掉落；如果等待公会支援，排行榜上的名字会被别人顶替。`,
      `本轮节拍：${beats.join(' -> ')}。`,
    ].join('\n\n')
  }
  if (profiles.some(profile => profile.id === 'system-litrpg')) {
    return [
      `任务提示第一次响起时，主角正在旧商业街的雨棚下躲债。`,
      `那行字没有给他金币，也没有许诺奇迹，只要求他在十分钟内救下一个即将穿过马路的陌生人。`,
      `他照做了。奖励不是钱，而是一段记忆：七岁那年，他坐在一间完全陌生的厨房里，听见有人喊他另一个名字。`,
      `从那一刻起，任务不再像机会，更像一张慢慢收紧的账单。每完成一次，他能拿回一小块被夺走的过去，也会丢掉一点现在赖以证明自己的证据。`,
      `如果继续执行，他可能查清债务和身份的来源；如果拒绝，下一次惩罚会先落到他最想保护的人身上。`,
      `本轮节拍：${beats.join(' -> ')}。`,
    ].join('\n\n')
  }
  if (profiles.some(profile => profile.id === 'comedy-misfit')) {
    return [
      `主角穿过门帘时，满堂人都以为他要说出惊天秘密。`,
      `他也确实说了，只不过第一句是：“你们谁把我的锅拿去炼丹了？”`,
      `本该剑拔弩张的审问现场被这句话拧偏，最紧张的人反而是藏在人群里的真正内鬼。`,
      `如果继续装傻，他能看清谁先露出破绽；如果当场摊牌，所有误会都会变成另一场更大的误会。`,
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
  if (profiles.some(profile => profile.id === 'xuanhuan-xianxia')) {
    return [
      '这次突破要付出的第一笔代价是什么？',
      '主角更怕失去修行机会，还是更怕欠下新的人情债？',
    ]
  }
  if (profiles.some(profile => profile.id === 'modern-other')) {
    return [
      '这份证据会伤害谁，所以主角不能立刻公开？',
      '主角和旧案之间有什么私人关系？',
    ]
  }
  if (profiles.some(profile => profile.id === 'game-litrpg')) {
    return [
      '这次任务失败后，主角最不能承受的惩罚是什么？',
      '队伍里谁的职业短板会在第一场战斗中暴露？',
    ]
  }
  if (profiles.some(profile => profile.id === 'system-litrpg')) {
    return [
      '第一条任务真正想迫使主角承认什么身份漏洞？',
      '任务惩罚会先伤到主角自己，还是先伤到他想保护的人？',
    ]
  }
  if (profiles.some(profile => profile.id === 'comedy-misfit')) {
    return [
      '这个误会最先伤到谁的面子？',
      '主角要继续装傻套话，还是当场制造更大的反差？',
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

export const workflowRegistry = {
  socraticCreateWorkflow,
  draftSceneWorkflow: socraticCreateWorkflow,
  extractChangesWorkflow: socraticCreateWorkflow,
  qualityBrakeWorkflow: socraticCreateWorkflow,
  statePreviewWorkflow,
}

export const agentRuntimeMeta = {
  framework: 'mastra',
  package: '@mastra/core',
  mode: 'mock-local-first-round',
  contracts: agentContracts,
  workflows: Object.keys(workflowRegistry),
}
