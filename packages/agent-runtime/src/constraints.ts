import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ConstraintProfile, GenreKernel, SocraticCreateInput } from './types.js'

interface RuntimeRules {
  version: number
  privacy?: {
    representativeWorks?: string
    publicReferenceField?: string
  }
  documentCore?: {
    policy?: string
    runtimeContract?: Record<string, unknown>
  }
  constraintProfiles: ConstraintProfile[]
  genreKernels: GenreKernel[]
}

const runtimeRulesRelativePath = 'docs/product/rules/genre-runtime-rules.v1.json'

function findRulesPath(): string {
  const candidates = [join(process.cwd(), runtimeRulesRelativePath)]
  let current = dirname(fileURLToPath(import.meta.url))
  for (let i = 0; i < 8; i += 1) {
    candidates.push(join(current, runtimeRulesRelativePath))
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  const found = candidates.find(candidate => existsSync(candidate))
  if (!found) {
    throw new Error(`genre runtime rules not found: ${runtimeRulesRelativePath}`)
  }
  return found
}

function loadRuntimeRules(): RuntimeRules {
  return JSON.parse(readFileSync(findRulesPath(), 'utf8')) as RuntimeRules
}

const runtimeRules = loadRuntimeRules()

export const constraintProfiles: ConstraintProfile[] = runtimeRules.constraintProfiles
export const genreKernels: GenreKernel[] = runtimeRules.genreKernels
export const runtimeRulesMeta = {
  version: runtimeRules.version,
  source: runtimeRulesRelativePath,
  profileCount: constraintProfiles.length,
  kernelCount: genreKernels.length,
  privacy: {
    representativeWorks: runtimeRules.privacy?.representativeWorks || 'unknown',
    publicReferenceField: runtimeRules.privacy?.publicReferenceField || 'sourceRefs',
  },
  documentCore: {
    policy: runtimeRules.documentCore?.policy || 'unknown',
    runtimeContract: runtimeRules.documentCore?.runtimeContract || {},
  },
}

export const publicProseScaffoldTerms = [
  '本轮节拍',
  'BeatPlan',
  '故事种子',
  ' -> ',
  '这不是一句设定',
  '故事里',
  '应该停在',
]

function selectedTextFromInput(input: SocraticCreateInput): string {
  const context = input.context || {}
  const storyDirection = typeof context.story_direction === 'object' && context.story_direction !== null
    ? context.story_direction as Record<string, unknown>
    : {}
  const contextTemplate = typeof context.main_universe_template === 'object' && context.main_universe_template !== null
    ? context.main_universe_template as Record<string, unknown>
    : {}
  return [
    input.genre,
    input.selectedTemplate?.genre,
    contextTemplate.genre,
    storyDirection.label,
  ].filter(Boolean).join(' ')
}

function contextSignalTextFromInput(input: SocraticCreateInput): string {
  const context = input.context || {}
  const storyDirection = typeof context.story_direction === 'object' && context.story_direction !== null
    ? context.story_direction as Record<string, unknown>
    : {}
  const contextTemplate = typeof context.main_universe_template === 'object' && context.main_universe_template !== null
    ? context.main_universe_template as Record<string, unknown>
    : {}
  return [
    selectedTextFromInput(input),
    input.selectedTemplate?.title,
    contextTemplate.title,
    storyDirection.tone,
    storyDirection.keywords,
  ].filter(Boolean).join(' ')
}

function textFromInput(input: SocraticCreateInput): string {
  return [
    input.seed,
    contextSignalTextFromInput(input),
  ].filter(Boolean).join(' ')
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some(term => text.toLowerCase().includes(term.toLowerCase()))
}

function selectedProfileBoost(selectedText: string, profile: ConstraintProfile): number {
  const text = selectedText.toLowerCase()
  const directTerms = [profile.id, profile.displayName].filter(Boolean)
  const directMatch = directTerms
    .filter(term => text.includes(term.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0]
  if (directMatch) return 2000 + directMatch.length
  const signalMatch = profile.signalTerms
    .filter(term => text.includes(term.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0]
  return signalMatch ? 1000 + signalMatch.length : 0
}

export function resolveConstraints(input: SocraticCreateInput): ConstraintProfile[] {
  const text = textFromInput(input)
  const selectedText = selectedTextFromInput(input)
  return constraintProfiles
    .filter(profile => includesAny(text, profile.signalTerms) || includesAny(text, profile.entryModeSignals) || includesAny(text, profile.toneSignals))
    .sort((a, b) => (selectedProfileBoost(selectedText, b) + b.priority) - (selectedProfileBoost(selectedText, a) + a.priority))
}

export function resolveKernels(profiles: ConstraintProfile[]): GenreKernel[] {
  const profileOrder = new Map(profiles.map((profile, index) => [profile.id, index]))
  return genreKernels
    .filter(kernel => kernel.compatibleProfiles.some(id => profileOrder.has(id)))
    .sort((a, b) => {
      const aOrder = Math.min(...a.compatibleProfiles.map(id => profileOrder.get(id) ?? Number.MAX_SAFE_INTEGER))
      const bOrder = Math.min(...b.compatibleProfiles.map(id => profileOrder.get(id) ?? Number.MAX_SAFE_INTEGER))
      return aOrder - bOrder
    })
}

export function evaluateConstraintViolations(text: string, profiles: ConstraintProfile[]) {
  return profiles.flatMap(profile =>
    profile.rules.flatMap(rule => {
      const prohibited = rule.prohibitedTerms || []
      const hits = prohibited.filter(term => text.includes(term))
      if (hits.length === 0) return []
      return [{
        ruleId: rule.id,
        severity: rule.severity,
        message: `候选文本触发「${profile.displayName}」约束：${hits.join('、')}`,
      }]
    }),
  )
}

export function evaluatePublicProseHygiene(text: string, profiles: ConstraintProfile[]) {
  const constraintViolations = evaluateConstraintViolations(text, profiles)
  const scaffoldViolations = publicProseScaffoldTerms
    .filter(term => text.includes(term))
    .map(term => ({
      ruleId: 'public-prose-no-scaffold',
      severity: 'hard' as const,
      message: `候选正文包含创作流程痕迹：${term}`,
    }))
  return [...constraintViolations, ...scaffoldViolations]
}

export function repairPublicProseScaffolds(text: string): string {
  return publicProseScaffoldTerms.reduce((current, term) => {
    if (term === ' -> ') return current.split(term).join('，')
    return current.split(term).join('')
  }, text)
}
