import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, RefreshCw } from 'lucide-react'
import { Panel } from '@/components/design-system/Panel'
import { Button } from '@/components/ui/button'
import { ReaderHotRequestList } from '@/components/reader/ReaderHotRequestList'
import { ReaderRequestComposer } from '@/components/reader/ReaderRequestComposer'
import type { ReaderRequestStatusNote } from '@/components/reader/ReaderRequestComposer'
import {
  createReaderRequest,
  listPublicRequests,
  voteForRequest,
} from '@/lib/pmfSupabaseReader'
import type { PmfReaderRequest, PmfRequestType } from '@/features/pmf/types'

interface ReaderRequestPanelProps {
  workId: string
  branchId: string
  titleText: string
  selectedChoiceLabel?: string
}

function defaultRequestText(type: PmfRequestType, choice?: string) {
  if (type === 'if_branch') return choice ? `想看「${choice}」展开成 IF 支线。` : '想看当前选择展开成 IF 支线。'
  if (type === 'continue_branch') return '想继续看这条支线。'
  return '想看下一章。'
}

const readerFlow = [
  { title: '说出想看', detail: '下一章、支线或继续某个选择' },
  { title: '聚成热度', detail: '相同想法会合并成更强信号' },
  { title: '作者已看到', detail: '高热方向会优先进入创作' },
  { title: '新章出现', detail: '发布后直接回到你的阅读线' },
]

const checkingStatus: ReaderRequestStatusNote = {
  tone: 'checking',
  title: '正在查看读者请求',
  detail: '正在读取当前作品的请求热度和更新方向。',
}

const unavailableStatus: ReaderRequestStatusNote = {
  tone: 'unavailable',
  title: '作者暂未开放读者请求',
  detail: '你仍可以继续阅读当前章节；开放后可以请求下一章或 IF 支线。',
}

function failedStatus(message: string): ReaderRequestStatusNote {
  return {
    tone: 'error',
    title: '请求暂时没有完成',
    detail: message,
  }
}

export function ReaderRequestPanel({ workId, branchId, titleText, selectedChoiceLabel }: ReaderRequestPanelProps) {
  const [requests, setRequests] = useState<PmfReaderRequest[]>([])
  const [requestType, setRequestType] = useState<PmfRequestType>(selectedChoiceLabel ? 'if_branch' : 'next_chapter')
  const [requestText, setRequestText] = useState(defaultRequestText(requestType, selectedChoiceLabel))
  const [status, setStatus] = useState<ReaderRequestStatusNote>(checkingStatus)
  const [requestAccess, setRequestAccess] = useState<'checking' | 'open' | 'closed'>('checking')
  const [loading, setLoading] = useState(false)

  const hotRequests = useMemo(
    () => requests.slice(0, 4),
    [requests],
  )

  useEffect(() => {
    setRequestType(selectedChoiceLabel ? 'if_branch' : 'next_chapter')
  }, [selectedChoiceLabel])

  useEffect(() => {
    setRequestText(defaultRequestText(requestType, selectedChoiceLabel))
  }, [requestType, selectedChoiceLabel])

  const loadRequests = useCallback(async () => {
    setRequestAccess(current => (current === 'closed' ? current : 'checking'))
    setStatus(current => (current.tone === 'unavailable' ? current : checkingStatus))
    const result = await listPublicRequests(workId)
    if (!result.ok) {
      const isUnavailable = result.code === 'supabase_unconfigured'
      setRequestAccess(isUnavailable ? 'closed' : 'open')
      setStatus(isUnavailable ? unavailableStatus : failedStatus(result.message))
      return
    }
    setRequests(result.data)
    setRequestAccess('open')
    setStatus(result.data.length
      ? {
          tone: 'ready',
          title: '这些方向正在升温',
          detail: '你可以给同样的想法加热，也可以写下新的下一章或支线请求。',
        }
      : {
          tone: 'ready',
          title: '还没有读者请求',
          detail: '你可以成为第一个提出下一章或支线方向的人。',
        })
  }, [workId])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  async function submitRequest() {
    if (loading) return
    setLoading(true)
    setStatus({
      tone: 'checking',
      title: '正在送达请求',
      detail: '正在把你的想法加入当前作品的请求热度里。',
    })
    const result = await createReaderRequest({
      workId,
      branchId,
      requestType,
      requestText,
    })
    if (!result.ok) {
      const isUnavailable = result.code === 'supabase_unconfigured'
      setRequestAccess(isUnavailable ? 'closed' : 'open')
      setStatus(isUnavailable ? unavailableStatus : failedStatus(result.message))
      setLoading(false)
      return
    }
    setRequestAccess('open')
    setStatus({
      tone: 'success',
      title: '请求已送达',
      detail: '热度越高，越可能推动下一次更新。',
    })
    setLoading(false)
    await loadRequests()
  }

  async function vote(id: string) {
    const result = await voteForRequest(id)
    setStatus(result.ok
      ? {
          tone: 'success',
          title: '已为这个请求加热',
          detail: '相同想法会聚成更强的更新信号。',
        }
      : failedStatus(result.message))
    if (result.ok) await loadRequests()
  }

  return (
    <Panel className="reader-cosmic-request mt-4 w-full p-4" motion="reveal">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-[var(--worldline-cyan)]" />
            <p className="text-xs tracking-[0.16em] text-[var(--ink-dim)]">读者请求</p>
          </div>
          <h2 className="mt-1 text-xl font-semibold text-[var(--ink-paper)]">你想让世界往哪里走？</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">
            你的想法会和其他读者的选择一起形成热度，推动下一章或新的 IF 支线。
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadRequests}>
          <RefreshCw size={14} />
          刷新状态
        </Button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ReaderRequestComposer
          flow={readerFlow}
          requestType={requestType}
          requestText={requestText}
          titleText={titleText}
          status={status}
          loading={loading}
          disabled={requestAccess !== 'open'}
          onRequestTypeChange={setRequestType}
          onRequestTextChange={setRequestText}
          onSubmit={submitRequest}
        />
        <ReaderHotRequestList
          requests={hotRequests}
          emptyTitle={requestAccess === 'closed' ? '请求尚未开放' : undefined}
          emptyDescription={requestAccess === 'closed' ? '开放后，这里会显示读者最想看的更新方向。' : undefined}
          onVote={vote}
        />
      </div>
    </Panel>
  )
}
