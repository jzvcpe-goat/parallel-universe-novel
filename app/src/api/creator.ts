import { api } from './client'
import {
  buildNovelStarterQuestions,
  buildNovelStarterStory,
  inferNovelStarterCards,
  novelStarterPrompt,
  type NovelStarterPhase,
} from '@/features/creator/novelStarterPrompt'

export interface CommercialBlueprintRequest {
  creator_id?: string
  pen_name?: string
  genre?: string
  audience?: string
  commercial_goal?: string
  platform?: string
  tone?: string
  seed?: string
}

export interface CreatorDialogueSessionRequest {
  creator_id?: string
  seed?: string
  genre?: string
  tone?: string
  target_length?: string
  language?: string
  context?: Record<string, unknown>
}

export interface CreatorDialogueTurnRequest {
  message: string
  context?: Record<string, unknown>
  previous_session?: unknown
}

export interface CreatorDialogueAssistant {
  message: string
  story_text: string
  questions: string[]
  setting_cards_delta: string[]
  next_actions: string[]
  quality_notes: string[]
  model_status: {
    mode: 'local_cowriter' | 'llm_assisted'
    provider?: string | null
    model?: string | null
    generated_at: string
    latency_ms?: number | null
    fallback_reason?: string
    secret_exposure: 'server_env_only'
  }
  harness_trace?: Array<{ step: string; status: string; detail: string }>
  created_at?: string
}

export interface AgentSocraticCreateResponse {
  runId: string
  projectId: string
  sessionId: string
  candidateDraft: {
    status: 'candidate'
    title: string
    body: string
  }
  questions: string[]
  settingCards: Record<string, unknown>
  activeConstraints: Array<{
    profileId: string
    ruleIds: string[]
    prohibitedTerms: string[]
  }>
  activeKernels: Array<{
    kernelId: string
    beatPlan: string[]
  }>
  sourceLabels: Record<string, string>
  qualityPreview: {
    result: 'pass' | 'warn' | 'rewrite' | 'block'
    violations: Array<{ ruleId: string; severity: string; message: string }>
    repairSuggestions: string[]
  }
  runTrace: Array<{ step: string; status: string; detail: string }>
  cost: {
    mode: string
    estimatedTokens: number
    estimatedCostUsd: number
  }
}

export interface CreatorMemoryPreviewResponse {
  status: 'preview_only' | string
  projectId?: string
  sessionId?: string
  stateDeltaCandidate?: Array<Record<string, unknown>>
  writeback?: {
    status?: string
    canon_written?: boolean
    branch_written?: boolean
    idempotency_key?: string
  }
  runTrace?: Array<{ step: string; status: string; detail: string }>
}

export interface CreatorQualityCheckResponse {
  status: 'checked' | 'repair_suggested' | string
  runId?: string
  projectId?: string
  sessionId?: string
  candidateDraft?: {
    status: 'candidate' | string
    title: string
    body: string
  }
  revisedCandidate?: {
    status: 'candidate' | string
    title: string
    body: string
  }
  qualityPreview?: {
    result?: 'pass' | 'warn' | 'rewrite' | 'block' | string
    violations?: Array<{ ruleId?: string; severity?: string; message?: string }>
    repairSuggestions?: string[]
  }
  repairPlan?: string[]
  writeback?: {
    status?: string
    canon_written?: boolean
    branch_written?: boolean
    idempotency_key?: string
  }
  runTrace?: Array<{ step: string; status: string; detail: string }>
}


export interface CreatorDialogueSession {
  session_id: string
  creator_id?: string
  status: 'active' | string
  phase: 'seed' | 'break_soil' | 'growth' | string
  turn_index: number
  assistant: CreatorDialogueAssistant
  setting_cards: {
    seed?: string
    tone?: string
    genre_signal?: string
    protagonist_hint?: string
    character_web_hint?: string
    opening_scene_hint?: string
    pov_hint?: string
    world_rule_hint?: string
    central_tension?: string
    conflict_engine_hint?: string
    outline_hint?: string
    genre_constraints?: Array<Record<string, unknown>>
    active_kernels?: Array<Record<string, unknown>>
    source_labels?: Record<string, string>
    quality_preview?: Record<string, unknown>
    candidate_draft?: {
      status: string
      title: string
      body: string
    }
    memory_preview?: {
      status: string
      summary: string
      item_count: number
      updated_at: string
    }
    quality_check?: {
      status: string
      summary: string
      item_count: number
      updated_at: string
    }
    run_id?: string
    project_id?: string
    input_sources?: {
      manual?: string[]
      memo_frozen?: string[]
      auto_derived?: string[]
    }
    confirmed?: string[]
    open_questions?: string[]
  }
  turns: Array<Record<string, unknown>>
  source: {
    agent?: string
    version?: string
    title?: string
    prompt_id?: string
    prompt_version?: string
    principles?: string[]
    request_context?: Record<string, unknown>
    prompt_contract?: Record<string, unknown>
  }
  updated_at?: string
}

export interface CommercialBlueprintResponse {
  work: {
    title: string
    logline: string
    genre?: string
    target_readers?: string
    core_hook?: string
    commercial_format?: string
  }
  world: Record<string, unknown>
  characters: Array<Record<string, string> | string>
  season_plan: Array<string | Record<string, string>>
  chapter_one: {
    title: string
    body: string
    first_choice?: string
  }
  quality_gate: {
    score?: number
    pass?: boolean
    checks?: Array<{ label: string; score: number; note: string }>
    release_decision?: string
  }
  launch_plan: Record<string, unknown>
  next_actions: Array<string | Record<string, string>>
  model_status: {
    mode: 'deepseek_assisted' | 'llm_assisted' | 'local_blueprint'
    provider?: string | null
    generated_at: string
    latency_ms?: number | null
    fallback_reason?: string
    secret_exposure: 'server_env_only'
  }
  input_summary: Record<string, unknown>
}

export const creatorApi = {
  createCommercialBlueprint: (payload: CommercialBlueprintRequest) =>
    api.post<CommercialBlueprintResponse>('/creator/commercial-blueprint', payload),
  createDialogueSession: (payload: CreatorDialogueSessionRequest) =>
    api.post<CreatorDialogueSession>('/creator/dialogue/sessions', payload),
  getDialogueSession: (sessionId: string) =>
    api.get<CreatorDialogueSession>(`/creator/dialogue/sessions/${sessionId}`),
  addDialogueTurn: (sessionId: string, payload: CreatorDialogueTurnRequest) =>
    api.post<CreatorDialogueSession>(`/creator/dialogue/sessions/${sessionId}/turns`, payload),
}

const AGENT_RUNTIME_BASE = String(
  import.meta.env.VITE_AGENT_RUNTIME_BASE_URL || 'http://127.0.0.1:4111',
).replace(/\/+$/, '')

async function postAgentWorkflow(payload: Record<string, unknown>): Promise<AgentSocraticCreateResponse> {
  const response = await fetch(`${AGENT_RUNTIME_BASE}/v1/workflows/socratic-create`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`agent_runtime_${response.status}`)
  }
  return response.json() as Promise<AgentSocraticCreateResponse>
}

async function postAgentMemoryPreview(payload: Record<string, unknown>): Promise<CreatorMemoryPreviewResponse> {
  const response = await fetch(`${AGENT_RUNTIME_BASE}/v1/workflows/state-preview`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`agent_runtime_${response.status}`)
  }
  return response.json() as Promise<CreatorMemoryPreviewResponse>
}

async function postAgentQualityBrake(payload: Record<string, unknown>): Promise<CreatorQualityCheckResponse> {
  const response = await fetch(`${AGENT_RUNTIME_BASE}/v1/workflows/quality-brake`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(`agent_runtime_${response.status}`)
  }
  return response.json() as Promise<CreatorQualityCheckResponse>
}

function agentWorkflowToDialogueSession(
  result: AgentSocraticCreateResponse,
  message: string,
  previous?: CreatorDialogueSession | null,
): CreatorDialogueSession {
  const now = nowIso()
  const cards = result.settingCards || {}
  const confirmed = [
    String(cards.protagonist_gap || ''),
    String(cards.first_conflict || ''),
    String(cards.doctrine || ''),
  ].filter(Boolean)
  const assistant: CreatorDialogueAssistant = {
    message: '我先写出一版候选开场。回答下面任意一个问题，我再继续扩写。',
    story_text: result.candidateDraft.body,
    questions: result.questions.slice(0, 2),
    setting_cards_delta: confirmed,
    next_actions: ['回答一个问题继续下一段。', '也可以直接改写候选开场。'],
    quality_notes: result.qualityPreview.violations.length
      ? result.qualityPreview.violations.map(item => item.message)
      : ['候选开场通过本轮预检，仍需作者确认后才可进入正史。'],
    model_status: {
      mode: 'local_cowriter',
      generated_at: now,
      secret_exposure: 'server_env_only',
    },
    harness_trace: result.runTrace,
    created_at: now,
  }

  const userTurn = { role: 'user', content: message, created_at: now }
  const assistantTurn = { role: 'assistant', ...assistant, created_at: now }

  return {
    session_id: result.sessionId,
    creator_id: previous?.creator_id || 'web_creator',
    status: 'active',
    phase: 'growth',
    turn_index: previous ? previous.turn_index + 2 : 2,
    assistant,
    setting_cards: {
      ...(previous?.setting_cards || {}),
      seed: previous?.setting_cards?.seed || message,
      confirmed,
      open_questions: result.questions.slice(0, 2),
      genre_constraints: result.activeConstraints,
      active_kernels: result.activeKernels,
      source_labels: result.sourceLabels,
      quality_preview: result.qualityPreview,
      candidate_draft: result.candidateDraft,
      run_id: result.runId,
      project_id: result.projectId,
    },
    turns: previous ? [...previous.turns, userTurn, assistantTurn] : [userTurn, assistantTurn],
    source: {
      agent: 'mastra_socratic_workflow',
      version: 'first_round_mock_local',
      title: '创作助手',
      principles: ['先写正文，后问问题', '每轮最多两个问题', '候选内容需作者确认'],
    },
    updated_at: now,
  }
}

export async function createAgentDialogueSession(
  payload: CreatorDialogueSessionRequest,
): Promise<CreatorDialogueSession> {
  const result = await postAgentWorkflow({
    seed: payload.seed || '',
    creatorId: payload.creator_id,
    genre: payload.genre,
    context: payload.context || {},
    selectedTemplate: (payload.context as Record<string, unknown> | undefined)?.main_universe_template,
  })
  return agentWorkflowToDialogueSession(result, payload.seed || '', null)
}

export async function addAgentDialogueTurn(
  session: CreatorDialogueSession,
  payload: CreatorDialogueTurnRequest,
): Promise<CreatorDialogueSession> {
  const result = await postAgentWorkflow({
    seed: payload.message,
    sessionId: session.session_id,
    projectId: session.setting_cards.project_id,
    creatorId: session.creator_id,
    context: payload.context || {},
    previousSession: payload.previous_session || session,
    selectedTemplate: (payload.context as Record<string, unknown> | undefined)?.main_universe_template,
  })
  return agentWorkflowToDialogueSession(result, payload.message, session)
}

function sessionToLocalOutput(session: CreatorDialogueSession): Record<string, unknown> {
  const candidate = session.setting_cards.candidate_draft || {
    status: 'candidate',
    title: '第一幕',
    body: session.assistant.story_text || '',
  }
  return {
    runId: session.setting_cards.run_id || `preview_${session.session_id}`,
    projectId: session.setting_cards.project_id || 'project_preview',
    sessionId: session.session_id,
    candidateDraft: candidate,
    questions: session.assistant.questions || session.setting_cards.open_questions || [],
    settingCards: session.setting_cards,
    activeConstraints: session.setting_cards.genre_constraints || [],
    activeKernels: session.setting_cards.active_kernels || [],
    qualityPreview: session.setting_cards.quality_preview || { result: 'pass', violations: [], repairSuggestions: [] },
    runTrace: session.assistant.harness_trace || [],
    cost: { mode: 'mock_local', estimatedTokens: 0, estimatedCostUsd: 0 },
  }
}

export async function previewAgentStoryMemory(session: CreatorDialogueSession): Promise<CreatorMemoryPreviewResponse> {
  return postAgentMemoryPreview({
    seed: session.setting_cards.seed || session.assistant.story_text || '',
    sessionId: session.session_id,
    projectId: session.setting_cards.project_id,
    creatorId: session.creator_id,
    context: {
      mastra_local_output: sessionToLocalOutput(session),
    },
    previousSession: session,
  })
}

export async function checkAgentDraftQuality(session: CreatorDialogueSession): Promise<CreatorQualityCheckResponse> {
  return postAgentQualityBrake({
    seed: session.setting_cards.seed || session.assistant.story_text || '',
    sessionId: session.session_id,
    projectId: session.setting_cards.project_id,
    creatorId: session.creator_id,
    genre: session.setting_cards.genre_signal,
    context: {
      mastra_local_output: sessionToLocalOutput(session),
    },
    previousSession: session,
  })
}

export function applyMemoryPreview(
  session: CreatorDialogueSession,
  preview: CreatorMemoryPreviewResponse,
): CreatorDialogueSession {
  const count = Array.isArray(preview.stateDeltaCandidate) ? preview.stateDeltaCandidate.length : 0
  return {
    ...session,
    setting_cards: {
      ...session.setting_cards,
      memory_preview: {
        status: preview.status || 'preview_only',
        summary: count
          ? `已整理 ${count} 组写作记忆，等你确认后再固定到作品。`
          : '已整理这一段的写作记忆，等你确认后再固定到作品。',
        item_count: count,
        updated_at: nowIso(),
      },
    },
    updated_at: nowIso(),
  }
}

export function applyQualityCheck(
  session: CreatorDialogueSession,
  result: CreatorQualityCheckResponse,
): CreatorDialogueSession {
  const violations = result.qualityPreview?.violations || []
  const revised = result.revisedCandidate || result.candidateDraft || session.setting_cards.candidate_draft
  const revisedBody = String(revised?.body || '')
  const summary = violations.length
    ? `已生成修订候选：${violations.length} 处需要照顾。`
    : '这一段通过检查，可以继续写下一段。'
  const assistant = revisedBody
    ? {
        ...session.assistant,
        story_text: revisedBody,
        quality_notes: result.repairPlan?.length
          ? result.repairPlan
          : session.assistant.quality_notes,
        harness_trace: result.runTrace || session.assistant.harness_trace,
      }
    : session.assistant
  const turns = revisedBody
    ? session.turns.map((turn, index) => {
        if (index !== session.turns.length - 1 || turn.role !== 'assistant') return turn
        return {
          ...turn,
          story_text: revisedBody,
          quality_notes: assistant.quality_notes,
          harness_trace: assistant.harness_trace,
        }
      })
    : session.turns

  return {
    ...session,
    assistant,
    setting_cards: {
      ...session.setting_cards,
      quality_preview: result.qualityPreview || session.setting_cards.quality_preview,
      candidate_draft: revised || session.setting_cards.candidate_draft,
      quality_check: {
        status: result.status || 'checked',
        summary,
        item_count: violations.length,
        updated_at: nowIso(),
      },
    },
    turns,
    updated_at: nowIso(),
  }
}

function nowIso() {
  return new Date().toISOString()
}

function localAssistant(seed: string, phase: CreatorDialogueSession['phase']): CreatorDialogueAssistant {
  const subject = seed.trim() || '一个还没有说出口的故事画面'
  const starterPhase = (phase === 'growth' ? 'growth' : phase === 'seed' ? 'seed' : 'break_soil') satisfies NovelStarterPhase
  const storyText = starterPhase === 'seed' ? '' : buildNovelStarterStory(subject, starterPhase)
  return {
    message: starterPhase === 'seed'
      ? '我们先抓一个故事种子。不用完整，一个画面、一句话、一种情绪都可以。'
      : '我先把你的想法写成正文，再问下一段必须确认的问题。',
    story_text: storyText,
    questions: buildNovelStarterQuestions(starterPhase),
    setting_cards_delta: starterPhase === 'seed' ? [] : inferNovelStarterCards(subject).confirmed,
    next_actions: ['回答任意一个问题，我会立刻写进下一段。', '也可以只说“继续”，我先推进剧情。'],
    quality_notes: ['遵循小说启动引导：先写正文，后问问题。', '本轮问题数量控制在两条以内。'],
    model_status: {
      mode: 'local_cowriter',
      provider: null,
      generated_at: nowIso(),
      fallback_reason: 'frontend_local_fallback',
      secret_exposure: 'server_env_only',
    },
  }
}

export function localDialogueSession(seed = '', sessionId = 'local_creator_dialogue'): CreatorDialogueSession {
  const phase: CreatorDialogueSession['phase'] = seed.trim() ? 'break_soil' : 'seed'
  const cards = inferNovelStarterCards(seed)
  return {
    session_id: sessionId,
    creator_id: 'local_author',
    status: 'active',
    phase,
    turn_index: seed.trim() ? 2 : 1,
    assistant: localAssistant(seed, phase),
    setting_cards: {
      ...cards,
    },
    turns: seed.trim()
      ? [
          { role: 'user', content: seed, created_at: nowIso() },
          { role: 'assistant', ...localAssistant(seed, phase), created_at: nowIso() },
        ]
      : [{ role: 'assistant', ...localAssistant('', 'seed'), created_at: nowIso() }],
    source: {
      agent: novelStarterPrompt.source,
      version: novelStarterPrompt.version,
      title: novelStarterPrompt.title,
      prompt_id: novelStarterPrompt.requestContext.prompt_id,
      prompt_version: novelStarterPrompt.requestContext.prompt_version,
      principles: [...novelStarterPrompt.principles],
      request_context: { ...novelStarterPrompt.requestContext },
      prompt_contract: {
        ...novelStarterPrompt.requestContext,
        first_question: novelStarterPrompt.firstQuestion,
        creative_dimensions: novelStarterPrompt.requestContext.creative_dimensions,
        input_source_matrix: novelStarterPrompt.inputSourceMatrix,
      },
    },
    updated_at: nowIso(),
  }
}

export function localDialogueTurn(previous: CreatorDialogueSession, message: string): CreatorDialogueSession {
  const seed = previous.setting_cards.seed || message
  const assistant = localAssistant(message || seed || '继续', 'growth')
  const cards = inferNovelStarterCards(seed, message)
  return {
    ...previous,
    phase: 'growth',
    turn_index: previous.turn_index + 2,
    assistant,
    setting_cards: {
      ...previous.setting_cards,
      ...cards,
      seed,
      confirmed: [
        ...(cards.confirmed || previous.setting_cards.confirmed || []),
        `本轮补充：${message}`,
      ].slice(-5),
    },
    turns: [
      ...previous.turns,
      { role: 'user', content: message, created_at: nowIso() },
      { role: 'assistant', ...assistant, created_at: nowIso() },
    ],
    updated_at: nowIso(),
  }
}

export function localCommercialBlueprint(input: CommercialBlueprintRequest): CommercialBlueprintResponse {
  const genre = input.genre || '都市悬疑'
  const seed = input.seed || '一个普通人能看见别人选择后消失的平行人生。'
  return {
    work: {
      title: '消失选择档案',
      logline: '一名失业策划师发现城市会记录每个人没走过的选择，他必须把这道裂缝写成作品，也必须承担作品改变现实的代价。',
      genre,
      target_readers: input.audience || '18-35 岁，喜欢强钩子、快节奏、人物关系反转的付费读者',
      core_hook: '选择可视化、现实案件、作者自救三线合一。',
      commercial_format: '前 3 章免费试读，后续会员解锁互动分支和作者手记。',
    },
    world: {
      rule: '每个重大选择都会留下“选择档案”。档案不能直接改命，只能暴露代价。',
      opening_location: '凌晨两点的共享办公室、停运地铁站、旧楼广告屏。',
      first_choice_point: '公开客户死亡前的选择档案，还是先把它写成连载开场换取第一批付费读者？',
    },
    characters: [
      { name: '林岑', role: '主角 / 失业商业策划师', desire: '证明自己能写出有人愿意付费的故事。', flaw: '容易先把痛苦当成素材。' },
      { name: '许照夜', role: '调查记者', desire: '找到第一名被选择档案吞掉的人。', flaw: '不相信创作者会尊重真相。' },
      { name: '周临川', role: '平台增长负责人', desire: '把选择档案包装成爆款互动连载。', flaw: '愿意为了增长压低真相成本。' },
    ],
    season_plan: [
      '第 1-5 章：发现选择档案，建立作品钩子和第一名失踪者。',
      '第 6-12 章：读者选择开始改变线索公开顺序。',
      '第 13-22 章：平台增长与现实伦理冲突升级。',
      '第 23-30 章：主角必须在爆款和真相之间做出公开选择。',
    ],
    chapter_one: {
      title: '第 1 章 你本来会死在今晚',
      body: `林岑第一次看见选择档案，是在凌晨两点十七分。\n\n共享办公室只剩他一个人。投影幕上还停着被客户退回来的方案，标题写着《互动悬疑商业化增长路径》，下面的批注只有四个字：没有灵魂。\n\n他盯着那四个字看了很久，直到手机震动。客户周临川发来一条语音，背景里有风声和地铁报站声。\n\n“林岑，如果你真想做出能让人付费的故事，就别再写那些安全的东西。”\n\n语音到这里断掉。三秒后，办公室外那块旧广告屏忽然亮了。屏幕没有播放广告，只显示一行细白的字：周临川，本应死于今晚 02:21。\n\n林岑以为自己困出幻觉。可广告屏继续刷新，像一份被城市吐出来的档案。\n\n选择一：走进停运地铁站，代价是失去最后一个证人。\n选择二：拨通林岑电话，代价是把故事交给一个失败者。\n\n他后背一寸寸凉下去。手机里的语音不是求助，而是周临川在死亡前做出的第二个选择。\n\n四分钟后，平台热搜弹出新闻：某内容公司高管坠入停运地铁施工井，生死不明。\n\n林岑站在空荡荡的办公室里，突然明白自己得到的不是灵感，而是一条可以卖钱、也可以害死人的裂缝。\n\n他把退回来的方案关掉，在空白文档里敲下第一行字：你本来会死在今晚。\n\n这一次，他没有先报警。`,
      first_choice: '立刻报警公开档案，还是先写下第一章锁住证据？',
    },
    quality_gate: {
      score: 86,
      pass: true,
      checks: [
        { label: '开场钩子', score: 92, note: '死亡预告和商业失败同时成立。' },
        { label: '商业卖点', score: 88, note: '选择档案能持续生成互动章节。' },
        { label: '人物缺口', score: 84, note: '主角素材伦理问题能推动长期成长。' },
        { label: '连载节奏', score: 82, note: '第一章末尾有明确选择点。' },
      ],
      release_decision: '可进入首批读者测试，但需要补第 2-5 章标题和付费断点。',
    },
    launch_plan: {
      pricing: '前 3 章免费，会员每月 29 元解锁互动分支和作者手记。',
      first_week_goal: '邀请 30 名种子读者，收集首章完读率和第一次选择点击率。',
      metric: '首章完读率、第一次选择点击率、收藏率、付费前置页点击率。',
    },
    next_actions: ['确认作品标题和一句话卖点。', '生成第 2-5 章标题与每章选择点。', '用 10 名种子读者测试首章钩子。'],
    model_status: {
      mode: 'local_blueprint',
      provider: null,
      generated_at: new Date().toISOString(),
      fallback_reason: '浏览器本地降级蓝图',
      secret_exposure: 'server_env_only',
    },
    input_summary: {
      creator_id: input.creator_id || 'first_author',
      genre,
      seed,
      commercial_goal: input.commercial_goal || '做成可连载、可订阅、可改编的商业长篇',
    },
  }
}
