export type CreativeStepId = 'scene' | 'conflict' | 'develop' | 'resolve'

export interface CreativeStep {
  id: CreativeStepId
  label: string
  prompt: string
  helper: string
  draft: string
}

export type NexusStatus = 'selected' | 'suggested' | 'observing'

export interface NexusCandidate {
  id: string
  title: string
  sourceBeat: string
  butterflyIndex: number
  status: NexusStatus
  branchIds: string[]
  downstreamEffects: string[]
}

export type WorldlineStatus = 'main' | 'active' | 'unstable' | 'locked'

export interface WorldlineBranch {
  id: string
  name: string
  status: WorldlineStatus
  divergence: number
  stability: number
  readingProgress: number
  tone: string
  summary: string
  diffHighlights: string[]
}

export type ForeshadowStatus = 'dormant' | 'planted' | 'triggered'

export interface ForeshadowHook {
  id: string
  label: string
  description: string
  status: ForeshadowStatus
  linkedBranchId: string
}

export interface PrototypeChapter {
  id: string
  title: string
  subtitle: string
  body: string
}

export interface PrototypeHero {
  name: string
  title: string
  level: number
  focus: number
  intuition: number
  courage: number
  inventory: string[]
}

export interface PrototypeScript {
  id: string
  title: string
  subtitle: string
  genre: string
  style: string
  world: string
  currentBranchId: string
  authorGoal: string
  relationshipMatrix: string
  coreConflict: string
  chapters: PrototypeChapter[]
  creativeSteps: CreativeStep[]
  nexusCandidates: NexusCandidate[]
  branches: WorldlineBranch[]
  foreshadowHooks: ForeshadowHook[]
  hero: PrototypeHero
  updatedAt: string
}

export interface PrototypeScriptInput {
  title: string
  genre: string
  relationshipMatrix: string
  coreConflict: string
  world: string
  style: string
}
