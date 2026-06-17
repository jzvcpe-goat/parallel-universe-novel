export type AgentType =
  | 'Radar'
  | 'Planner'
  | 'Orchestrator'
  | 'Architect'
  | 'Writer'
  | 'Observer'
  | 'Reflector'
  | 'Normalizer'
  | 'Auditor'
  | 'Reviser'

export interface AgentContract {
  agentId: string
  role: AgentType
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  preferredModelProfile: string
  fallbackModelProfile: string
}

export interface RunLedgerEntry {
  runId: string
  projectId: string
  agentType: AgentType | 'Workflow'
  modelProfile: string
  inputHash: string
  outputHash: string
  cost: number
  latency: number
  status: 'ok' | 'error'
  qualityResult?: Record<string, unknown>
  stateDeltaCandidate?: Record<string, unknown>[]
}

export interface ConstraintRule {
  id: string
  severity: 'hard' | 'soft'
  appliesWhen: string[]
  rule: string
  prohibitedTerms?: string[]
  replacementGuidance?: string[]
  failBehavior: 'allow' | 'warn' | 'repair' | 'regenerate' | 'block'
}

export interface ConstraintProfile {
  id: string
  displayName: string
  layer: 'world' | 'thematic' | 'character' | 'narrative' | 'safety'
  priority: number
  sourceRefs?: string[]
  signalTerms: string[]
  entryModeSignals: string[]
  toneSignals: string[]
  rules: ConstraintRule[]
}

export interface GenreKernel {
  id: string
  name: string
  category: string
  compatibleProfiles: string[]
  sourceRefs?: string[]
  thesis: string
  antiThesis: string
  pacingModel: string
  eventStructure: string[]
  motiveRules: string[]
  conflictRules: string[]
  climaxRules: string[]
  timeControls: {
    baseRate: number
    burst: number
    decay: number
    foreshadowPressure: number
    recoveryFloor?: number
    maxOpenLoops?: number
  }
}

export interface RuntimeArtifact {
  version: 1
  narrativeRun: {
    id: string
    projectId: string
    sessionId: string
    authoringMode: 'co_write'
    decision: 'candidate' | 'rewrite' | 'block'
  }
  constraintSet: Array<{
    profileId: string
    ruleIds: string[]
    severity: 'hard' | 'soft'
  }>
  kernelSelection: Array<{
    kernelId: string
    compatibleProfiles: string[]
    beatPlan: string[]
    timeControls: GenreKernel['timeControls']
  }>
  scenePlan: {
    id: string
    runId: string
    objective: string
    beats: string[]
    requiredStateRefs: string[]
    candidateEvents: Array<{
      id: string
      label: string
      source: 'kernel' | 'seed'
      intensity: number
    }>
    choiceSlots: Array<{
      id: string
      prompt: string
      status: 'candidate'
    }>
  }
  stateWritebackPreview: Array<Record<string, unknown>>
  timeConsistencyReport: {
    id: string
    runId: string
    status: 'pass' | 'warn' | 'block'
    acceptedTimeEvents: Array<{ id: string; label: string; order: number }>
    timelineConflicts: string[]
    requiredRepair: string[]
  }
  qualityBrakeReport: {
    id: string
    runId: string
    result: 'pass' | 'warn' | 'rewrite' | 'block'
    scores: {
      doctrine: number
      constraint: number
      kernel: number
      time: number
      state: number
      prose: number
      safety: number
    }
    reasons: string[]
    repairPrompt: string
    decision: 'candidate' | 'rewrite' | 'block'
  }
  branchGenerationResult: {
    id: string
    runId: string
    status: 'not_generated' | 'candidate'
    reason: string
    visibility: 'private'
    sourceType: 'ai_candidate'
  }
}

export interface SocraticCreateInput {
  projectId?: string
  creatorId?: string
  seed: string
  genre?: string
  selectedTemplate?: Record<string, unknown>
  context?: Record<string, unknown>
  sessionId?: string
  previousSession?: Record<string, unknown>
}

export interface SocraticCreateOutput {
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
  sourceLabels: Record<string, 'human' | 'memo' | 'llm_candidate' | 'rule_engine' | 'time_engine' | 'quality_gate'>
  runtimeArtifact: RuntimeArtifact
  qualityPreview: {
    result: 'pass' | 'warn' | 'rewrite' | 'block'
    violations: Array<{ ruleId: string; severity: string; message: string }>
    repairSuggestions: string[]
  }
  runTrace: Array<{ step: string; status: string; detail: string }>
  cost: {
    mode: 'mock_local'
    estimatedTokens: number
    estimatedCostUsd: number
  }
  ledger: RunLedgerEntry[]
}

export interface PublicSocraticCreateOutput {
  responseMode: 'public'
  runId: string
  projectId: string
  sessionId: string
  candidateDraft: SocraticCreateOutput['candidateDraft']
  questions: string[]
  settingCards: {
    seed?: unknown
    genre_promise?: unknown
    doctrine?: unknown
    protagonist_gap?: unknown
    first_conflict?: unknown
    story_notes?: unknown
  }
  qualityPreview: {
    result: SocraticCreateOutput['qualityPreview']['result']
    violations: Array<{ severity: string; message: string }>
    repairSuggestions: string[]
  }
}
