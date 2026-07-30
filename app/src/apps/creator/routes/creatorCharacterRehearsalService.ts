import type { PmfLocalSettingAsset } from '@/features/pmf/types'
import {
  validateCharacterSimulationResult,
  type CharacterSimulationRequest,
  type CharacterSimulationResult,
} from '@/features/creator-decision/characterSimulation'
import type { WritingAgentCapabilities } from '@/features/creator-decision/types'
import { CreationDecisionError } from '@/features/creator-decision/types'
import {
  readLocalSettingAssets,
  upsertLocalSettingAsset,
  type PmfLocalSettingAssetInput,
} from '@/local-db/creatorLocalSettingAssetRepository'

export interface CreatorCharacterAssetPersistencePort {
  read?(workId: string): PmfLocalSettingAsset[]
  save(input: PmfLocalSettingAssetInput): PmfLocalSettingAsset
}

const defaultPersistence: CreatorCharacterAssetPersistencePort = {
  read: readLocalSettingAssets,
  save: upsertLocalSettingAsset,
}

export async function runCreatorCharacterRehearsal(
  agent: WritingAgentCapabilities,
  request: CharacterSimulationRequest,
) {
  if (!agent.simulateCharacters) {
    throw new CreationDecisionError(
      'character_simulation_unavailable',
      'The active writing agent does not provide character rehearsal.',
    )
  }
  return agent.simulateCharacters(request)
}

function proposalDetail(input: {
  result: CharacterSimulationResult
  proposalId: string
}) {
  const proposal = input.result.characterCardProposals.find(item => item.id === input.proposalId)
  if (!proposal) throw new CreationDecisionError('evidence_missing', 'The selected character-card proposal no longer exists.')
  const evidenceById = new Map(input.result.evidence.map(item => [item.id, item]))
  const arcLabels = [
    ['欲望', proposal.arc.desire],
    ['恐惧', proposal.arc.fear],
    ['创伤', proposal.arc.wound],
    ['防御方式', proposal.arc.defense],
    ['关系压力', proposal.arc.relationshipPressure],
    ['成长机会', proposal.arc.growthOpportunity],
    ['错误信念', proposal.arc.falseBelief],
    ['选择代价', proposal.arc.costOfChoice],
  ].filter(([, value]) => value)
  const stateChanges = proposal.stateChanges.map(change => (
    `- ${change.dimension}: ${change.before || '未记录'} -> ${change.after}（${change.reason}）`
  ))
  const evidence = proposal.evidenceIds.map(evidenceId => {
    const item = evidenceById.get(evidenceId)
    return item ? `- “${item.quote}”\n  ${item.summary}` : ''
  }).filter(Boolean)
  return {
    proposal,
    detail: [
      '该人物卡来自短期群像排练，经作者确认后保存；它仍不是正史。',
      '',
      `叙事功能：${proposal.narrativeFunction}`,
      '',
      ...arcLabels.map(([label, value]) => `${label}：${value}`),
      '',
      '22 维状态变化提案：',
      ...(stateChanges.length ? stateChanges : ['- 无']),
      '',
      '模拟证据：',
      ...(evidence.length ? evidence : ['- 无']),
    ].join('\n'),
  }
}

function rehearsalSourceTag(result: CharacterSimulationResult, proposalId: string) {
  return `排练来源:${result.simulationRunId}:${proposalId}`
}

function existingCapturedAsset(input: {
  workId: string
  sourceTag: string
  persistence: CreatorCharacterAssetPersistencePort
}) {
  return input.persistence.read?.(input.workId).find(asset => asset.tags.includes(input.sourceTag)) || null
}

function rehearsalRunLabel(result: CharacterSimulationResult) {
  return result.simulationRunId.replace(/[^\p{L}\p{N}]+/gu, '').slice(-8) || '本轮'
}

export function captureCharacterRehearsalProposal(input: {
  request: CharacterSimulationRequest
  result: CharacterSimulationResult
  proposalId: string
  authorConfirmed: boolean
  branchId?: string | null
}, persistence: CreatorCharacterAssetPersistencePort = defaultPersistence) {
  if (!input.authorConfirmed) {
    throw new CreationDecisionError(
      'author_confirmation_required',
      'Author confirmation is required before saving a rehearsal proposal as a character card.',
    )
  }
  const result = validateCharacterSimulationResult(input.request, input.result)
  const { proposal, detail } = proposalDetail({ result, proposalId: input.proposalId })
  const character = input.request.characters.find(item => item.id === proposal.characterId)
  if (!character) throw new CreationDecisionError('model_output_invalid', 'The proposal targets an unselected character.')
  const sourceTag = rehearsalSourceTag(result, proposal.id)
  const existing = existingCapturedAsset({
    workId: input.request.workId,
    sourceTag,
    persistence,
  })
  if (existing) return existing
  return persistence.save({
    workId: input.request.workId,
    branchId: input.branchId || null,
    kind: 'character',
    stage: 'memory',
    title: `人物 · ${character.name} · ${proposal.title}（排练 ${rehearsalRunLabel(result)}）`,
    summary: proposal.summary,
    detail,
    tags: ['角色排练', proposal.characterId, proposal.confidence, sourceTag],
  })
}

export function captureCharacterRehearsalSettingProposal(input: {
  request: CharacterSimulationRequest
  result: CharacterSimulationResult
  proposalId: string
  authorConfirmed: boolean
  branchId?: string | null
}, persistence: CreatorCharacterAssetPersistencePort = defaultPersistence) {
  if (!input.authorConfirmed) {
    throw new CreationDecisionError(
      'author_confirmation_required',
      'Author confirmation is required before saving a rehearsal proposal as a setting card.',
    )
  }
  const result = validateCharacterSimulationResult(input.request, input.result)
  const proposal = result.settingAssetProposals.find(item => item.id === input.proposalId)
  if (!proposal) throw new CreationDecisionError('evidence_missing', 'The selected setting-card proposal no longer exists.')
  const sourceTag = rehearsalSourceTag(result, proposal.id)
  const existing = existingCapturedAsset({
    workId: input.request.workId,
    sourceTag,
    persistence,
  })
  if (existing) return existing
  const evidenceById = new Map(result.evidence.map(item => [item.id, item]))
  const evidence = proposal.evidenceIds.map(evidenceId => {
    const item = evidenceById.get(evidenceId)
    return item ? `- “${item.quote}”\n  ${item.summary}` : ''
  }).filter(Boolean)
  return persistence.save({
    workId: input.request.workId,
    branchId: input.branchId || null,
    kind: proposal.kind,
    stage: 'memory',
    title: `${proposal.title}（排练 ${rehearsalRunLabel(result)}）`,
    summary: proposal.summary,
    detail: [
      '该设定卡来自短期群像排练，经作者确认后保存；它仍不是正史。',
      '',
      proposal.detail,
      '',
      '模拟证据：',
      ...(evidence.length ? evidence : ['- 无']),
    ].join('\n'),
    tags: ['角色排练', proposal.kind, sourceTag],
  })
}
