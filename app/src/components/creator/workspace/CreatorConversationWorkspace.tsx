import { useRef, useState } from 'react'
import { ArrowLeft, Clock3, FileUp, MoreHorizontal, PanelRightOpen, Save, Send, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { CreatorRecallCandidate } from '@/apps/creator/routes/creatorEditorRecallViewModels'
import type { CreatorConversationTimelineProps } from './CreatorConversationTimeline'
import { CreatorConversationTimeline } from './CreatorConversationTimeline'
import { CreatorRecallRail } from './CreatorRecallRail'

export interface CreatorConversationWorkspaceProps extends CreatorConversationTimelineProps {
  workTitle: string
  chapterTitle: string
  destinationLabel: string
  activeDraftRef: string
  canSaveDraft: boolean
  canEnterPublishCheck: boolean
  draftAction: 'save' | 'publish' | null
  pendingAction: string | null
  loading: boolean
  historicalStateImporting: boolean
  historicalStateWorkId: string
  recallCandidates: CreatorRecallCandidate[]
  appliedRecallIds: string[]
  contextRecallSourceIds: string[]
  onBack: () => void
  onSaveDraft: () => void
  onEnterPublishCheck: () => void
  onProposeIntent: (storySeed: string) => void
  onAnswerCustom: (answer: string) => void
  onCaptureSetting: (message: string) => boolean
  onConversationCommand: (message: string) => boolean
  onUnscopedMessage: (message: string) => void
  onApplyRecall: (ids: string[]) => void
  onImportHistoricalStateFiles: (files: File[]) => void
}

function composerPlaceholder(props: CreatorConversationWorkspaceProps) {
  if (!props.intent) return '说一个画面、异常或人物困境…'
  if (props.question) return '直接回答，或插一句“设定：…”…'
  if (props.intent.status === 'draft') return '直接修正本章意图，或锁定后比较路径…'
  return '继续说，或插一句“设定：…”…'
}

export function CreatorConversationWorkspace(props: CreatorConversationWorkspaceProps) {
  const [composerValue, setComposerValue] = useState('')
  const [submittedMessages, setSubmittedMessages] = useState<string[]>([])
  const [recallOpen, setRecallOpen] = useState(true)
  const timelineRef = useRef<HTMLDivElement>(null)
  const historicalStateFileInputRef = useRef<HTMLInputElement>(null)
  const workspaceRestoring = props.loading || props.pendingAction === 'initialize'
  const workspaceState = workspaceRestoring ? 'restoring' : props.pending ? 'busy' : 'ready'

  function submitMessage(message = composerValue) {
    const value = message.trim()
    if (!value || props.pending || workspaceRestoring) return
    if (props.onCaptureSetting(value)) {
      setComposerValue('')
      return
    }
    if (props.onConversationCommand(value)) {
      setComposerValue('')
      return
    }
    if (!props.intent || props.intent.status === 'draft') {
      props.onProposeIntent(value)
      setComposerValue('')
      return
    }
    if (props.question) {
      props.onAnswerCustom(value)
      setComposerValue('')
      return
    }
    setSubmittedMessages(current => [...current.slice(-2), value])
    props.onUnscopedMessage(value)
    setComposerValue('')
  }

  return (
    <section
      className="flex h-screen min-h-0 flex-col overflow-hidden bg-[var(--creator-bg)] text-[var(--creator-text)]"
      data-slot="creator-conversation-workspace"
      data-agent-workspace-state={workspaceState}
      data-agent-ready={workspaceState === 'ready' ? 'true' : 'false'}
      aria-busy={workspaceState !== 'ready'}
    >
      <header
        className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-[var(--creator-border)] bg-[var(--creator-surface)] px-3 md:px-5"
        data-slot="creator-conversation-header"
      >
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={props.onBack} aria-label="返回今日创作路径">
            <ArrowLeft size={18} aria-hidden="true" />
          </Button>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-lg font-semibold text-[var(--creator-text)] md:text-xl">{props.workTitle}</h1>
              <Badge variant="outline" className="hidden shrink-0 sm:flex">{props.destinationLabel}</Badge>
            </div>
            <p className="truncate text-sm text-[var(--creator-text-muted)]">{props.chapterTitle}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 md:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => timelineRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="回到本轮开头"
          >
            <Clock3 size={16} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={props.onSaveDraft}
            disabled={workspaceRestoring || !props.canSaveDraft || Boolean(props.draftAction)}
            loading={props.draftAction === 'save'}
            data-agent-action="save_local_draft"
            data-agent-risk="medium"
            data-agent-target={props.activeDraftRef || 'new-draft'}
          >
            <Save size={15} aria-hidden="true" />
            <span className="hidden sm:inline">{props.activeDraftRef ? '已存本机' : '保存'}</span>
          </Button>
          {!recallOpen ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setRecallOpen(true)} aria-label="打开本章召回">
              <PanelRightOpen size={17} aria-hidden="true" />
              <span className="hidden lg:inline">本章召回</span>
              <Badge variant="outline" className="hidden xl:flex">{props.appliedRecallIds.length}</Badge>
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="更多创作操作">
                <MoreHorizontal size={18} aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={() => setRecallOpen(current => !current)}>
                <PanelRightOpen size={15} className="mr-2" aria-hidden="true" />
                {recallOpen ? '收起本章召回' : '打开本章召回'}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={workspaceRestoring || props.historicalStateImporting}
                onSelect={() => window.requestAnimationFrame(() => historicalStateFileInputRef.current?.click())}
                data-agent-action="import_historical_state_candidate"
                data-agent-risk="medium"
                data-agent-target={props.historicalStateWorkId || 'unselected-work'}
              >
                <FileUp size={15} className="mr-2" aria-hidden="true" />
                {props.historicalStateImporting ? '正在导入状态候选' : '导入历史状态候选'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={workspaceRestoring || !props.canEnterPublishCheck || Boolean(props.draftAction)}
                onSelect={props.onEnterPublishCheck}
                data-agent-action="enter_publish_check"
                data-agent-risk="low"
                data-agent-target={props.activeDraftRef || 'new-draft'}
              >
                <Upload size={15} className="mr-2" aria-hidden="true" />
                准备发布包
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={historicalStateFileInputRef}
            type="file"
            accept="application/json,.json"
            multiple
            hidden
            onChange={event => {
              const files = Array.from(event.currentTarget.files || [])
              event.currentTarget.value = ''
              if (files.length) props.onImportHistoricalStateFiles(files)
            }}
          />
        </div>
      </header>

      <div className={cn(
        'grid min-h-0 flex-1',
        recallOpen
          ? 'grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(15rem,38vh)] lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26vw)] lg:grid-rows-1'
          : 'grid-cols-1',
      )}>
        <div className="flex min-h-0 min-w-0 flex-col">
          <div
            ref={timelineRef}
            className="min-h-0 flex-1 overflow-y-auto"
            data-slot="creator-conversation-timeline-region"
          >
            <div className="px-4 pb-8 pt-4 sm:px-8 md:pt-6">
              <CreatorConversationTimeline
                {...props}
                submittedMessages={submittedMessages}
                pending={props.pending || workspaceRestoring}
              />
            </div>
          </div>

          <div
            className="shrink-0 border-t border-[var(--creator-border)] bg-[var(--creator-surface)] px-3 py-2.5 sm:px-6"
            data-slot="creator-conversation-composer"
          >
            <div className="mx-auto w-full max-w-4xl">
              <div className="relative">
                <Textarea
                  data-slot="creator-conversation-input"
                  value={composerValue}
                  placeholder={composerPlaceholder(props)}
                  disabled={props.pending || workspaceRestoring}
                  onChange={event => setComposerValue(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      submitMessage()
                    }
                  }}
                  className="min-h-24 resize-none pr-14"
                  aria-label="给创作伙伴的输入"
                />
                <Button
                  type="button"
                  size="icon"
                  className="absolute bottom-3 right-3"
                  onClick={() => submitMessage()}
                  disabled={!composerValue.trim() || props.pending || workspaceRestoring}
                  aria-label="提交"
                >
                  <Send size={16} aria-hidden="true" />
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 px-1 text-xs text-[var(--creator-text-dim)]">
                <span>每轮只确认一件事</span>
                <span>{workspaceRestoring
                  ? '正在恢复本机创作状态…'
                  : props.pendingAction === 'generate_scene'
                  ? '正在整理召回并写当前场景，通常需要 1–3 分钟…'
                  : props.pending
                    ? '正在处理本轮…'
                    : '正文不会自动写入'}</span>
              </div>
            </div>
          </div>
        </div>

        {recallOpen ? (
          <div className="min-h-0 h-[42vh] lg:h-full" data-slot="creator-conversation-recall-region">
            <CreatorRecallRail
              candidates={props.recallCandidates}
              appliedIds={props.appliedRecallIds}
              contextSourceIds={props.contextRecallSourceIds}
              disabled={props.pending || workspaceRestoring}
              onApply={props.onApplyRecall}
              onClose={() => setRecallOpen(false)}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
