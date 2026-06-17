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
