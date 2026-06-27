import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, CheckCircle2, GitBranch, RefreshCw, Send, ThumbsUp } from 'lucide-react'
import { Badge } from '@/components/primitives/Badge'
import { Button } from '@/components/primitives/Button'
import { Panel } from '@/components/design-system/Panel'
import {
  createReaderRequest,
  listPublicRequests,
  requestStatusLabel,
  requestTypeLabel,
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

export function ReaderRequestPanel({ workId, branchId, titleText, selectedChoiceLabel }: ReaderRequestPanelProps) {
  const [requests, setRequests] = useState<PmfReaderRequest[]>([])
  const [requestType, setRequestType] = useState<PmfRequestType>(selectedChoiceLabel ? 'if_branch' : 'next_chapter')
  const [requestText, setRequestText] = useState(defaultRequestText(requestType, selectedChoiceLabel))
  const [status, setStatus] = useState('正在读取请求状态...')
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
    const result = await listPublicRequests(workId)
    if (!result.ok) {
      setStatus(result.message)
      return
    }
    setRequests(result.data)
    setStatus(result.data.length ? '读者请求已同步。' : '还没有请求，成为第一个催更的人。')
  }, [workId])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  async function submitRequest() {
    if (loading) return
    setLoading(true)
    setStatus('正在提交请求...')
    const result = await createReaderRequest({
      workId,
      branchId,
      requestType,
      requestText,
    })
    if (!result.ok) {
      setStatus(result.message)
      setLoading(false)
      return
    }
    setStatus('请求已发送，作者本地创作端同步后会处理。')
    setLoading(false)
    await loadRequests()
  }

  async function vote(id: string) {
    const result = await voteForRequest(id)
    setStatus(result.ok ? '已为这个请求加热。' : result.message)
    if (result.ok) await loadRequests()
  }

  return (
    <Panel className="mt-4 w-full p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-[var(--worldline-cyan)]" />
            <p className="text-xs tracking-[0.16em] text-[var(--ink-dim)]">读者请求</p>
          </div>
          <h2 className="mt-1 text-xl font-semibold text-[var(--ink-paper)]">想让作者继续写哪里？</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">
            请求会进入作者处理台，作者确认后更新正文或支线。
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={loadRequests}>
          <RefreshCw size={14} />
          刷新状态
        </Button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
          <div className="flex flex-wrap gap-2">
            {(['next_chapter', 'if_branch', 'continue_branch'] as PmfRequestType[]).map(type => (
              <button
                key={type}
                type="button"
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${requestType === type ? 'border-[var(--manuscript-gold)]/55 bg-[var(--manuscript-gold)]/12 text-[var(--manuscript-gold)]' : 'border-white/10 text-[var(--ink-muted)] hover:text-[var(--ink-paper)]'}`}
                onClick={() => setRequestType(type)}
              >
                {requestTypeLabel(type)}
              </button>
            ))}
          </div>
          <textarea
            className="mt-3 min-h-[108px] w-full rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm leading-6 text-[var(--ink-paper)] outline-none placeholder:text-[var(--ink-dim)] focus:border-[var(--worldline-cyan)]/50"
            value={requestText}
            maxLength={280}
            onChange={event => setRequestText(event.target.value)}
            aria-label="读者请求内容"
          />
          <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-xs leading-5 text-[var(--ink-dim)]">
              《{titleText}》 · 请求会被聚合和限流，重复请求请投票加热。
            </p>
            <Button variant="gold" onClick={submitRequest} disabled={loading}>
              <Send size={15} />
              发送请求
            </Button>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">{status}</p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-[var(--manuscript-gold)]" />
            <h3 className="text-sm font-semibold text-[var(--ink-paper)]">热门请求</h3>
          </div>
          <div className="mt-3 space-y-2">
            {hotRequests.length ? hotRequests.map(item => (
              <div key={item.id} className="rounded-lg border border-white/10 bg-black/15 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={item.status === 'published' ? 'stasis' : 'outline'}>
                    {requestStatusLabel(item.status)}
                  </Badge>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--worldline-cyan)]"
                    onClick={() => vote(item.id)}
                  >
                    <ThumbsUp size={13} />
                    {item.vote_count}
                  </button>
                </div>
                <p className="mt-2 text-xs font-semibold text-[var(--ink-paper)]">{requestTypeLabel(item.request_type)}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--ink-muted)]">{item.request_text}</p>
                {item.status === 'published' && (
                  <p className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--manuscript-gold)]">
                    <CheckCircle2 size={13} />
                    已回写到阅读端
                  </p>
                )}
              </div>
            )) : (
              <p className="rounded-lg border border-dashed border-white/10 p-4 text-xs leading-5 text-[var(--ink-dim)]">
                暂无请求。提交后这里会显示聚合状态。
              </p>
            )}
          </div>
        </div>
      </div>
    </Panel>
  )
}
