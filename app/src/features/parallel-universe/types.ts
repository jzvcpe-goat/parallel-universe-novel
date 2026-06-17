export type BranchStatus = 'canon' | 'active' | 'candidate' | 'locked'
export type HarnessStepStatus = 'done' | 'active' | 'waiting' | 'blocked'
export type QualityDecision = 'pass' | 'rewrite' | 'hold'
export type AdapterStatus = 'ready' | 'license_gate' | 'planned' | 'blocked'
export type CapabilityMode = 'interactive_prototype' | 'service_contract' | 'studio_contract' | 'planned'
export type PrdReflectionStatus = 'done' | 'partial' | 'missing'

export interface GenreKernel {
  id: string
  name: string
  category: string
  thesis: string
  pacingModel: string
  eventStructure: string
  motiveRules: string[]
  conflictRules: string[]
  climaxRules: string[]
  timeControls: {
    baseRate: number
    burst: number
    decay: number
    foreshadowPressure: number
  }
  metrics: Array<{
    label: string
    value: number
    tone: 'gold' | 'cyan' | 'teal' | 'rose'
  }>
}

export interface WorldChoice {
  id: string
  label: string
  description: string
  branchId: string
  tensionDelta: number
  memoryWrite: string
  qualityGate: string
}

export interface WorldChapter {
  id: string
  index: number
  title: string
  kicker: string
  body: string
  choices: WorldChoice[]
}

export interface WorldTemplate {
  id: string
  title: string
  subtitle: string
  tagline: string
  genre: string
  kernelId: string
  mode: 'flagship' | 'trial' | 'template'
  coverGradient: string
  coverImage: string
  coverPosition: string
  openingPremise: string
  protagonistGap: string
  initialLocation: string
  initialEvent: string
  firstChoicePoint: string
  chapterCount: string
  choiceCount: number
  audiencePromise: string
}

export interface WorldBranch {
  id: string
  templateId: string
  name: string
  status: BranchStatus
  tone: string
  summary: string
  divergence: number
  stability: number
  readingProgress: number
  unlockedByChoiceId?: string
  diffHighlights: string[]
}

export interface WorldInstance {
  id: string
  templateId: string
  readerName: string
  currentBranchId: string
  canonStatus: 'candidate' | 'canon' | 'branch'
  memory: string[]
  relationships: Array<{
    name: string
    state: string
    pressure: number
  }>
}

export interface TimelineEvent {
  id: string
  t: number
  label: string
  description: string
  type: 'setup' | 'choice' | 'burst' | 'aftershock' | 'canon'
  intensity: number
  weight: number
  tags: string[]
}

export interface QualityBrakeReport {
  id: string
  title: string
  decision: QualityDecision
  score: number
  candidateStatus: 'candidate' | 'canon_ready' | 'branch_only'
  metrics: Array<{
    label: string
    value: number
    detail: string
  }>
  issues: string[]
  nextAction: string
}

export interface CandidateScene {
  id: string
  title: string
  status: 'candidate' | 'canon_ready' | 'branch'
  branchId: string
  sourceChoiceId: string
  body: string
  qualityReportId: string
}

export interface HarnessStep {
  id: string
  label: string
  detail: string
  status: HarnessStepStatus
}

export interface OpenSourceAdapter {
  id: string
  name: string
  license: string
  role: string
  status: AdapterStatus
  risk: string
  nextAction: string
}

export interface CapabilityAlignment {
  id: string
  title: string
  frontendEntry: string
  productSurface: string[]
  mode: CapabilityMode
  readerPromise: string
  implementationBoundary: string
}

export interface PrdReflectionItem {
  id: string
  requirement: string
  status: PrdReflectionStatus
  surface: string
  current: string
  gap: string
  next: string
}
