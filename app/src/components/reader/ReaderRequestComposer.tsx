import { Bell, CheckCircle2, Clock3, Info, Send } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { requestTypeLabel } from '@/lib/pmfSupabaseReader'
import type { PmfRequestType } from '@/features/pmf/types'

export interface ReaderRequestFlowStep {
  title: string
  detail: string
}

export type ReaderRequestStatusTone = 'checking' | 'ready' | 'success' | 'unavailable' | 'error'

export interface ReaderRequestStatusNote {
  tone: ReaderRequestStatusTone
  title: string
  detail: string
}

export interface ReaderRequestComposerProps {
  flow: ReaderRequestFlowStep[]
  requestType: PmfRequestType
  requestText: string
  titleText: string
  status: ReaderRequestStatusNote
  loading?: boolean
  disabled?: boolean
  onRequestTypeChange: (type: PmfRequestType) => void
  onRequestTextChange: (text: string) => void
  onSubmit: () => void
}

const requestTypes: PmfRequestType[] = ['next_chapter', 'if_branch', 'continue_branch']

const statusToneClasses: Record<ReaderRequestStatusTone, string> = {
  checking: 'reader-request-status-note-checking',
  ready: 'reader-request-status-note-ready',
  success: 'reader-request-status-note-success',
  unavailable: 'reader-request-status-note-unavailable',
  error: 'reader-request-status-note-error',
}

function StatusIcon({ tone }: { tone: ReaderRequestStatusTone }) {
  if (tone === 'checking') return <Clock3 className="h-4 w-4" />
  if (tone === 'success') return <CheckCircle2 className="h-4 w-4" />
  if (tone === 'unavailable') return <Bell className="h-4 w-4" />
  if (tone === 'error') return <Info className="h-4 w-4" />
  return <Bell className="h-4 w-4" />
}

export function ReaderRequestComposer({
  flow,
  requestType,
  requestText,
  titleText,
  status,
  loading,
  disabled,
  onRequestTypeChange,
  onRequestTextChange,
  onSubmit,
}: ReaderRequestComposerProps) {
  const sendDisabled = disabled || loading
  const sendLabel = loading ? '发送中' : disabled ? '暂未开放' : '发送请求'

  return (
    <Card variant="glass" padding="sm" className="reader-request-composer-card pu-motion-lift">
      <div className="reader-request-flow mb-4" aria-label="请求会如何影响更新">
        {flow.map((step, index) => (
          <div key={step.title} className="reader-request-flow-step pu-motion-lift">
            <span className="reader-request-flow-index">{index + 1}</span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-[var(--ink-paper)]">{step.title}</span>
              <span className="mt-1 block text-[11px] leading-4 text-[var(--ink-dim)]">{step.detail}</span>
            </span>
          </div>
        ))}
      </div>
      <Tabs value={requestType} onValueChange={value => onRequestTypeChange(value as PmfRequestType)}>
        <TabsList className="grid h-auto w-full grid-cols-3 bg-[var(--pu-panel-850)] text-[var(--ink-muted)]">
          {requestTypes.map(type => (
            <TabsTrigger key={type} value={type} className="min-h-10 text-xs sm:text-sm">
              {requestTypeLabel(type)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Textarea
        className="mt-3 min-h-[108px]"
        value={requestText}
        maxLength={280}
        onChange={event => onRequestTextChange(event.target.value)}
        aria-label="读者请求内容"
        disabled={disabled}
      />
      <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-xs leading-5 text-[var(--ink-dim)]">
          《{titleText}》 · 相同方向会聚成热度，重复想看请直接加热。
        </p>
        <Button variant="gold" onClick={onSubmit} disabled={sendDisabled}>
          <Send size={15} />
          {sendLabel}
        </Button>
      </div>
      <Alert className={`reader-request-status-note mt-3 ${statusToneClasses[status.tone]}`} aria-live="polite">
        <StatusIcon tone={status.tone} />
        <AlertTitle>{status.title}</AlertTitle>
        <AlertDescription>{status.detail}</AlertDescription>
      </Alert>
    </Card>
  )
}
