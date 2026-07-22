import { useEffect, useState } from 'react'
import type { HistoricalStateBackfillProposal } from '@/features/creator-decision/types'
import {
  creatorLocalDecisionRepository,
  readCreatorHistoricalStateBackfillsForWork,
} from '@/local-db/creatorLocalDecisionRepository'
import {
  runHistoricalStateConfirmThroughAgent,
  runHistoricalStateImportThroughAgent,
  runHistoricalStateRejectThroughAgent,
} from './creatorHistoricalStateAgentExecutionService'
import {
  buildHistoricalStateReviewItems,
  parseHistoricalStateBackfillImports,
  type CreatorHistoricalStateReviewItem,
} from './creatorHistoricalStateReviewService'

const maxImportFiles = 20
const maxImportBytes = 8 * 1024 * 1024

interface UseCreatorHistoricalStateReviewInput {
  workId: string
  onNotice: (notice: string) => void
  onCommitted: () => void
}

export function useCreatorHistoricalStateReview({
  workId,
  onNotice,
  onCommitted,
}: UseCreatorHistoricalStateReviewInput) {
  const [items, setItems] = useState<CreatorHistoricalStateReviewItem[]>([])
  const [refreshRevision, setRefreshRevision] = useState(0)
  const [importing, setImporting] = useState(false)
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!workId) {
      setItems([])
      return () => {
        cancelled = true
      }
    }
    void (async () => {
      try {
        const proposals = (await readCreatorHistoricalStateBackfillsForWork(workId))
          .filter(proposal => proposal.status === 'proposed')
        const reviewItems = await buildHistoricalStateReviewItems({
          proposals,
          repository: creatorLocalDecisionRepository,
        })
        if (!cancelled) setItems(reviewItems)
      } catch {
        if (!cancelled) onNotice('历史状态候选读取失败，现有正文和本机正史没有变化。')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [onNotice, refreshRevision, workId])

  async function importFiles(files: File[]) {
    if (!workId) {
      onNotice('请先打开要核对的作品。')
      return
    }
    if (!files.length || files.length > maxImportFiles) {
      onNotice(`一次可导入 1 到 ${maxImportFiles} 个历史状态候选文件。`)
      return
    }
    if (files.reduce((total, file) => total + file.size, 0) > maxImportBytes) {
      onNotice('候选文件过大，请分批导入。')
      return
    }
    setImporting(true)
    try {
      const values = await Promise.all(files.map(async file => JSON.parse(await file.text()) as unknown))
      const proposals = parseHistoricalStateBackfillImports(values)
      if (proposals.some(proposal => proposal.workId !== workId)) {
        throw new Error('candidate_work_mismatch')
      }
      const execution = await runHistoricalStateImportThroughAgent({ workId, proposals })
      if (!execution.ok || !execution.result?.length) throw new Error('candidate_import_failed')
      setRefreshRevision(current => current + 1)
      onNotice(`已导入 ${execution.result.length} 条历史状态候选；正文和本机正史尚未变化。`)
    } catch {
      onNotice('候选文件没有导入，请确认它来自当前作品的历史状态审阅。')
    } finally {
      setImporting(false)
    }
  }

  async function confirmProposal(proposal: HistoricalStateBackfillProposal) {
    setBusyProposalId(proposal.id)
    try {
      const execution = await runHistoricalStateConfirmThroughAgent(proposal)
      if (!execution.ok || !execution.result) throw new Error('candidate_confirm_failed')
      setRefreshRevision(current => current + 1)
      onCommitted()
      const chapter = items.find(item => item.proposal.id === proposal.id)?.chapterNumber
      onNotice(`${chapter ? `第 ${chapter} 章` : '历史章节'}状态已写入本机；正文没有变化。`)
    } catch {
      onNotice('这条候选没有写入；请确认历史正文和本机正史仍与证据一致。')
    } finally {
      setBusyProposalId(null)
    }
  }

  async function rejectProposal(proposal: HistoricalStateBackfillProposal) {
    setBusyProposalId(proposal.id)
    try {
      const execution = await runHistoricalStateRejectThroughAgent(proposal)
      if (!execution.ok || !execution.result) throw new Error('candidate_reject_failed')
      setRefreshRevision(current => current + 1)
      onNotice('已拒绝这条历史状态候选；正文和本机正史没有变化。')
    } catch {
      onNotice('这条候选没有被拒绝，请重试。')
    } finally {
      setBusyProposalId(null)
    }
  }

  return {
    items,
    importing,
    busyProposalId,
    importFiles,
    confirmProposal,
    rejectProposal,
  }
}
