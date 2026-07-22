import { useCallback, useMemo, useState } from 'react'
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
    setPending(true)
    setRequest(readiness.request)
    setNotice('正在进行短期角色排练；正文和正史不会改变。')
    try {
      const next = await simulate(readiness.request)
      if (!next) {
        setNotice('角色排练没有完成；正文、人物卡和正史均未改变。')
        return null
      }
      setResult(next)
      setNotice('角色排练已通过独立审阅，只生成待作者确认的本机卡片候选。')
      return next
    } finally {
      setPending(false)
    }
  }, [draft, readiness.issue, readiness.request, simulate])

  const captureCharacter = useCallback((proposalId: string) => {
    if (!request || !result) return null
    try {
      const asset = captureCharacterRehearsalProposal({
        request,
        result,
        proposalId,
        authorConfirmed: true,
        branchId,
      })
      setSavedProposalIds(current => Array.from(new Set([...current, proposalId])))
      setNotice('人物卡候选已由作者确认并保存到本机写作智库；它仍不是正史。')
      onAssetSaved(asset)
      return asset
    } catch {
      setNotice('人物卡候选没有保存；现有人物卡、正文和正史均未改变。')
      return null
    }
  }, [branchId, onAssetSaved, request, result])

  const captureSetting = useCallback((proposalId: string) => {
    if (!request || !result) return null
    try {
      const asset = captureCharacterRehearsalSettingProposal({
        request,
        result,
        proposalId,
        authorConfirmed: true,
        branchId,
      })
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
