import { z } from 'zod'
import {
  characterStateDimensionSchema,
  type CharacterStateSnapshot,
} from './characterState'
import { CreationDecisionError } from './types'

const id = z.string().min(1)

export const characterSimulationRequestSchema = z.object({
  schemaVersion: z.literal('character-simulation-request.v1'),
  requestId: id,
  sessionId: id,
  workId: id,
  chapterId: id,
  contextSnapshotId: id,
  scenario: z.string().min(12).max(2_000),
  rounds: z.number().int().min(1).max(5),
  authorConfirmedExport: z.literal(true),
  characters: z.array(z.object({
    id,
    name: id,
    summary: z.string().min(1).max(2_000),
    state: z.partialRecord(characterStateDimensionSchema, z.union([
      z.string(),
      z.array(z.string()),
    ])),
  }).strict()).min(2).max(8),
  settingFacts: z.array(z.string().min(1).max(500)).max(40),
  hardConstraints: z.array(z.string().min(1).max(500)).max(30),
}).strict()

export const characterSimulationEvidenceSchema = z.object({
  id,
  sourceArtifact: z.enum(['interviews', 'actions', 'timeline', 'report']),
  round: z.number().int().nonnegative().nullable(),
  actorIds: z.array(id).min(1),
  quote: z.string().min(2).max(500),
  summary: z.string().min(2).max(500),
}).strict()

export const characterCardProposalSchema = z.object({
  id,
  characterId: id,
  title: z.string().min(2).max(80),
  summary: z.string().min(8).max(800),
  narrativeFunction: z.string().min(4).max(300),
  arc: z.object({
    desire: z.string().max(300),
    fear: z.string().max(300),
    wound: z.string().max(300),
    defense: z.string().max(300),
    relationshipPressure: z.string().max(300),
    growthOpportunity: z.string().max(300),
    falseBelief: z.string().max(300),
    costOfChoice: z.string().max(300),
  }).strict(),
  stateChanges: z.array(z.object({
    dimension: characterStateDimensionSchema,
    before: z.string().max(500).nullable(),
    after: z.string().min(1).max(500),
    reason: z.string().min(4).max(500),
    evidenceIds: z.array(id).min(1),
  }).strict()).max(8),
  evidenceIds: z.array(id).min(1),
  confidence: z.enum(['high', 'medium', 'low']),
  status: z.literal('proposed'),
}).strict()

export const settingAssetProposalSchema = z.object({
  id,
  kind: z.enum(['location', 'faction', 'item', 'rule', 'timeline']),
  title: z.string().min(2).max(80),
  summary: z.string().min(8).max(800),
  detail: z.string().min(8).max(2_000),
  evidenceIds: z.array(id).min(1),
  status: z.literal('proposed'),
}).strict()

export const characterSimulationResultSchema = z.object({
  schemaVersion: z.literal('character-simulation.v1'),
  requestId: id,
  provider: z.literal('mirofish'),
  simulationRunId: id,
  scenarioSummary: z.string().min(8).max(1_000),
  evidence: z.array(characterSimulationEvidenceSchema).min(1).max(80),
  characterCardProposals: z.array(characterCardProposalSchema).max(16),
  settingAssetProposals: z.array(settingAssetProposalSchema).max(12),
  warnings: z.array(z.string().min(1).max(500)).max(20),
}).strict()

export type CharacterSimulationRequest = z.infer<typeof characterSimulationRequestSchema>
export type CharacterSimulationResult = z.infer<typeof characterSimulationResultSchema>
export type CharacterCardProposal = z.infer<typeof characterCardProposalSchema>

export interface CharacterSimulationProvider {
  simulate(request: CharacterSimulationRequest): Promise<CharacterSimulationResult>
}

function validateEvidenceReferences(result: CharacterSimulationResult) {
  const evidenceIds = new Set(result.evidence.map(item => item.id))
  const missing = [
    ...result.characterCardProposals.flatMap(proposal => [
      ...proposal.evidenceIds,
      ...proposal.stateChanges.flatMap(change => change.evidenceIds),
    ]),
    ...result.settingAssetProposals.flatMap(proposal => proposal.evidenceIds),
  ].filter(evidenceId => !evidenceIds.has(evidenceId))
  if (missing.length) {
    throw new CreationDecisionError(
      'evidence_missing',
      `Character simulation proposals reference missing evidence: ${Array.from(new Set(missing)).join(', ')}`,
    )
  }
}

export function validateCharacterSimulationResult(
  request: CharacterSimulationRequest,
  value: unknown,
): CharacterSimulationResult {
  const result = characterSimulationResultSchema.parse(value)
  if (result.requestId !== request.requestId) {
    throw new CreationDecisionError('model_output_invalid', 'Character simulation response targets another request.')
  }
  const selectedCharacterIds = new Set(request.characters.map(character => character.id))
  const unknownEvidenceActors = result.evidence
    .flatMap(evidence => evidence.actorIds)
    .filter(characterId => !selectedCharacterIds.has(characterId))
  if (unknownEvidenceActors.length) {
    throw new CreationDecisionError(
      'model_output_invalid',
      `Character simulation evidence references unselected characters: ${Array.from(new Set(unknownEvidenceActors)).join(', ')}`,
    )
  }
  const unknownCharacters = result.characterCardProposals
    .map(proposal => proposal.characterId)
    .filter(characterId => !selectedCharacterIds.has(characterId))
  if (unknownCharacters.length) {
    throw new CreationDecisionError(
      'model_output_invalid',
      `Character simulation proposed unselected characters: ${Array.from(new Set(unknownCharacters)).join(', ')}`,
    )
  }
  validateEvidenceReferences(result)
  return result
}

export function characterSimulationSeedMarkdown(request: CharacterSimulationRequest) {
  const characters = request.characters.map(character => {
    const state = Object.entries(character.state as CharacterStateSnapshot)
      .map(([dimension, value]) => `- ${dimension}: ${Array.isArray(value) ? value.join('；') : value}`)
      .join('\n')
    return `## ${character.name} (${character.id})\n${character.summary}\n${state || '- 暂无已确认状态'}`
  }).join('\n\n')
  return [
    '# 角色群像排练种子',
    '',
    '以下资料仅用于一次临时模拟。模拟结果不是正文，也不是正史。',
    '',
    `## 场景问题\n${request.scenario}`,
    '',
    `## 已选人物\n${characters}`,
    '',
    `## 已确认设定\n${request.settingFacts.map(item => `- ${item}`).join('\n') || '- 无'}`,
    '',
    `## 硬约束\n${request.hardConstraints.map(item => `- ${item}`).join('\n') || '- 无'}`,
  ].join('\n')
}
