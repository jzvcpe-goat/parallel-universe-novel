import { useCallback, useMemo, useState } from 'react'
import { confirmCreatorAgentConfirmation } from '@/agent-surface/confirmation'
import { createCreatorAgentExecutor } from '@/agent-surface/executor'
import type {
  CharacterSimulationRequest,
  CharacterSimulationResult,
} from '@/features/creator-decision/characterSimulation'
import type { ContextSnapshot, CreationSession } from '@/features/creator-decision/types'
import type { PmfLocalSettingAsset } from '@/features/pmf/types'
import {
  captureCharacterRehearsalProposal,
  captureCharacterRehearsalSettingProposal,
} from './creatorCharacterRehearsalService'
import {
  buildCharacterRehearsalRequest,
  parseCharacterRehearsalConversation,
  type CreatorCharacterRehearsalDraft,
} from './creatorCharacterRehearsalConversationService'

export interface CreatorCharacterRehearsalViewState {
  draft: CreatorCharacterRehearsalDraft | null
  request: CharacterSimulationRequest | null
  result: CharacterSimulationResult | null
  selectedCharacterNames: string[]
  issue: string | null
  pending: boolean
  savedProposalIds: string[]
}

export function useCreatorCharacterRehearsal(input: {
  session: CreationSession | null
  context: ContextSnapshot | null
  branchId: string | null
  settingAssets: PmfLocalSettingAsset[]
  simulate: (request: CharacterSimulationRequest) => Promise<CharacterSimulationResult | null>
  onAssetSaved: (asset: PmfLocalSettingAsset) => void
}) {
  const {
    session,
    context,
    branchId,
    settingAssets,
    simulate,
    onAssetSaved,
  } = input
  const [draft, setDraft] = useState<CreatorCharacterRehearsalDraft | null>(null)
  const [request, setRequest] = useState<CharacterSimulationRequest | null>(null)
  const [result, setResult] = useState<CharacterSimulationResult | null>(null)
  const [pending, setPending] = useState(false)
  const [savedProposalIds, setSavedProposalIds] = useState<string[]>([])
  const [notice, setNotice] = useState('')

  const readiness = useMemo(() => (
    draft
      ? buildCharacterRehearsalRequest({
          draft,
          session,
          context,
          settingAssets,
        })
      : { request: null, selectedCharacterNames: [], issue: null }
  ), [context, draft, session, settingAssets])

  const prepare = useCallback((message: string) => {
    const parsed = parseCharacterRehearsalConversation(message)
    if (!parsed.recognized) return false
    setRequest(null)
    setResult(null)
    setSavedProposalIds([])
    setDraft(parsed.draft)
    setNotice(parsed.issue || '角色排练请求已整理；确认后才会把点名人物和当前约束交给本机排练。')
    return true
  }, [])

  const confirmRun = useCallback(async () => {
    if (!draft || !readiness.request || readiness.issue) {
      setNotice(readiness.issue || '角色排练请求还不完整。')
      return null
    }
    const rehearsalRequest = readiness.request
    let simulationResult: CharacterSimulationResult | null = null
    const execute = createCreatorAgentExecutor({
      start_character_rehearsal: async parsedInput => {
        const next = await simulate(rehearsalRequest)
        simulationResult = next
        if (next) setResult(next)
        return {
          kind: 'character_rehearsal_candidates_ready',
          targetId: parsedInput.targetId,
          recordId: next?.simulationRunId,
          messageCode: next ? 'character_rehearsal_ready' : 'character_rehearsal_unavailable',
        }
      },
    })
    setPending(true)
    setRequest(rehearsalRequest)
    setNotice('正在进行短期角色排练；正文和正史不会改变。')
    try {
      const requested = await execute({
        actionName: 'start_character_rehearsal',
        input: {
          route: '/creator/editor',
          targetId: rehearsalRequest.requestId,
          requestId: rehearsalRequest.requestId,
          contextSnapshotId: rehearsalRequest.contextSnapshotId,
          characterIds: rehearsalRequest.characters.map(character => character.id),
          scenario: rehearsalRequest.scenario,
        },
      })
      if (requested.status !== 'awaiting_confirmation') {
        setNotice('角色排练没有完成；正文、人物卡和正史均未改变。')
        return null
      }
      const confirmed = await confirmCreatorAgentConfirmation(requested.receipt.id)
      if (!confirmed.ok) {
        setNotice('角色排练没有确认；正文、人物卡和正史均未改变。')
        return null
      }
      const completed = await execute({
        actionName: 'start_character_rehearsal',
        input: {
          route: '/creator/editor',
          targetId: rehearsalRequest.requestId,
          requestId: rehearsalRequest.requestId,
          contextSnapshotId: rehearsalRequest.contextSnapshotId,
          characterIds: rehearsalRequest.characters.map(character => character.id),
          scenario: rehearsalRequest.scenario,
        },
        operationId: requested.operationId,
        confirmationReceiptId: requested.receipt.id,
      })
      if (completed.status !== 'succeeded' || !simulationResult) {
        setNotice('角色排练没有完成；正文、人物卡和正史均未改变。')
        return null
      }
      setNotice('角色排练已通过独立审阅，只生成待作者确认的本机卡片候选。')
      return simulationResult
    } finally {
      setPending(false)
    }
  }, [draft, readiness.issue, readiness.request, simulate])

  const captureCharacter = useCallback(async (proposalId: string) => {
    if (!request || !result) return null
    try {
      let asset: PmfLocalSettingAsset | null = null
      const execute = createCreatorAgentExecutor({
        save_character_rehearsal_card: parsedInput => {
          asset = captureCharacterRehearsalProposal({ request, result, proposalId, authorConfirmed: true, branchId })
          return { kind: 'character_rehearsal_card_saved', targetId: parsedInput.targetId, recordId: asset.localAssetRef }
        },
      })
      const actionInput = { route: '/creator/editor', targetId: proposalId, proposalId, simulationRunId: result.simulationRunId }
      const requested = await execute({ actionName: 'save_character_rehearsal_card', input: actionInput })
      if (requested.status !== 'awaiting_confirmation') throw new Error('confirmation_required')
      const confirmed = await confirmCreatorAgentConfirmation(requested.receipt.id)
      if (!confirmed.ok) throw new Error('confirmation_failed')
      const completed = await execute({ actionName: 'save_character_rehearsal_card', input: actionInput, operationId: requested.operationId, confirmationReceiptId: requested.receipt.id })
      if (completed.status !== 'succeeded' || !asset) throw new Error('capture_failed')
      setSavedProposalIds(current => Array.from(new Set([...current, proposalId])))
      setNotice('人物卡候选已由作者确认并保存到本机写作智库；它仍不是正史。')
      onAssetSaved(asset)
      return asset
    } catch {
      setNotice('人物卡候选没有保存；现有人物卡、正文和正史均未改变。')
      return null
    }
  }, [branchId, onAssetSaved, request, result])

  const captureSetting = useCallback(async (proposalId: string) => {
    if (!request || !result) return null
    try {
      let asset: PmfLocalSettingAsset | null = null
      const execute = createCreatorAgentExecutor({
        save_character_rehearsal_setting: parsedInput => {
          asset = captureCharacterRehearsalSettingProposal({ request, result, proposalId, authorConfirmed: true, branchId })
          return { kind: 'character_rehearsal_setting_saved', targetId: parsedInput.targetId, recordId: asset.localAssetRef }
        },
      })
      const actionInput = { route: '/creator/editor', targetId: proposalId, proposalId, simulationRunId: result.simulationRunId }
      const requested = await execute({ actionName: 'save_character_rehearsal_setting', input: actionInput })
      if (requested.status !== 'awaiting_confirmation') throw new Error('confirmation_required')
      const confirmed = await confirmCreatorAgentConfirmation(requested.receipt.id)
      if (!confirmed.ok) throw new Error('confirmation_failed')
      const completed = await execute({ actionName: 'save_character_rehearsal_setting', input: actionInput, operationId: requested.operationId, confirmationReceiptId: requested.receipt.id })
      if (completed.status !== 'succeeded' || !asset) throw new Error('capture_failed')
      setSavedProposalIds(current => Array.from(new Set([...current, proposalId])))
      setNotice('设定卡候选已由作者确认并保存到本机写作智库；它仍不是正史。')
      onAssetSaved(asset)
      return asset
    } catch {
      setNotice('设定卡候选没有保存；现有设定卡、正文和正史均未改变。')
      return null
    }
  }, [branchId, onAssetSaved, request, result])

  const dismiss = useCallback(() => {
    setDraft(null)
    setRequest(null)
    setResult(null)
    setSavedProposalIds([])
    setNotice('角色排练候选已收起，没有写入正文、人物卡或正史。')
  }, [])

  const state: CreatorCharacterRehearsalViewState = {
    draft,
    request,
    result,
    selectedCharacterNames: readiness.selectedCharacterNames,
    issue: readiness.issue,
    pending,
    savedProposalIds,
  }

  return {
    state,
    notice,
    actions: {
      prepare,
      confirmRun,
      captureCharacter,
      captureSetting,
      dismiss,
    },
  }
}
