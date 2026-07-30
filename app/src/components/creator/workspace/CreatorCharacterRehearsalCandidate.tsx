import { Check, MessageSquareMore, ShieldCheck, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { CreatorCharacterRehearsalViewState } from '@/apps/creator/routes/useCreatorCharacterRehearsal'

export interface CreatorCharacterRehearsalCandidateProps {
  state: CreatorCharacterRehearsalViewState
  disabled: boolean
  onConfirmRun: () => void
  onCaptureCharacter: (proposalId: string) => void
  onCaptureSetting: (proposalId: string) => void
  onDismiss: () => void
}

function EvidenceList({ evidenceIds, state }: {
  evidenceIds: string[]
  state: CreatorCharacterRehearsalViewState
}) {
  const evidenceById = new Map(state.result?.evidence.map(item => [item.id, item]) || [])
  return (
    <div className="mt-3 grid gap-2 border-l-2 border-[var(--creator-border-strong)] pl-3">
      {evidenceIds.map(evidenceId => {
        const evidence = evidenceById.get(evidenceId)
        return evidence ? (
          <div key={evidenceId}>
            <p className="text-sm leading-6 text-[var(--creator-text)]">“{evidence.quote}”</p>
            <p className="text-xs leading-5 text-[var(--creator-text-muted)]">{evidence.summary}</p>
          </div>
        ) : null
      })}
    </div>
  )
}

function CaptureConfirmation(props: {
  action: 'save_character_rehearsal_card' | 'save_character_rehearsal_setting'
  proposalId: string
  label: string
  disabled: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={props.disabled}
          data-agent-action={props.action}
          data-agent-risk="medium"
          data-agent-target={props.proposalId}
        >
          {props.disabled ? <Check size={13} aria-hidden="true" /> : <ShieldCheck size={13} aria-hidden="true" />}
          {props.disabled ? '已存本机' : props.label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>保存这张排练候选？</AlertDialogTitle>
          <AlertDialogDescription>
            它会作为独立卡片保存到本机写作智库，不会改写现有人物卡、正文或正史。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>继续比较</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button type="button" onClick={props.onConfirm}>确认保存</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function CreatorCharacterRehearsalCandidate({
  state,
  disabled,
  onConfirmRun,
  onCaptureCharacter,
  onCaptureSetting,
  onDismiss,
}: CreatorCharacterRehearsalCandidateProps) {
  if (!state.draft) return null

  if (!state.result) {
    return (
      <div data-slot="creator-character-rehearsal-request">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{state.draft.rounds} 轮短期排练</Badge>
          {state.draft.characterNames.map(name => <Badge key={name} variant="outline">{name}</Badge>)}
        </div>
        <p className="mt-3 text-base leading-7 text-[var(--creator-text)]">{state.draft.scenario}</p>
        <p className="mt-2 text-xs leading-5 text-[var(--creator-text-muted)]">
          只交给本机排练当前点名的人物卡、已选设定与硬约束；不发送正文，不写入正史。
        </p>
        {state.issue ? <p className="mt-3 text-sm leading-6 text-[var(--creator-danger)]" role="status">{state.issue}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                disabled={disabled || state.pending || Boolean(state.issue)}
                data-agent-action="start_character_rehearsal"
                data-agent-risk="medium"
                data-agent-target={state.request?.requestId || 'prepared-character-rehearsal'}
              >
                <MessageSquareMore size={14} aria-hidden="true" />
                {state.pending ? '正在排练' : '确认开始本机排练'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>把选定人物交给本机角色排练？</AlertDialogTitle>
                <AlertDialogDescription>
                  本次只运行 {state.draft.rounds} 轮，使用 {state.draft.characterNames.join('、')} 的本机卡片和当前约束。结果仍须独立审阅与逐张确认。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>返回修改</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button type="button" onClick={onConfirmRun}>确认排练</Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button type="button" variant="ghost" onClick={onDismiss} disabled={disabled || state.pending}>
            <X size={14} aria-hidden="true" />收起
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div data-slot="creator-character-rehearsal-result">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="gold">独立审阅已通过</Badge>
        <Badge variant="outline">{state.result.simulationRunId}</Badge>
      </div>
      <p className="mt-3 text-base leading-7 text-[var(--creator-text)]">{state.result.scenarioSummary}</p>
      {state.result.characterCardProposals.map(proposal => (
        <section key={proposal.id} className="mt-5 border-t border-[var(--creator-border)] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-[var(--creator-text)]">{proposal.title}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--creator-text-muted)]">{proposal.summary}</p>
            </div>
            <CaptureConfirmation
              action="save_character_rehearsal_card"
              proposalId={proposal.id}
              label="保存人物卡候选"
              disabled={disabled || state.savedProposalIds.includes(proposal.id)}
              onConfirm={() => onCaptureCharacter(proposal.id)}
            />
          </div>
          <p className="mt-3 text-sm leading-6 text-[var(--creator-text)]">叙事作用：{proposal.narrativeFunction}</p>
          {proposal.stateChanges.length ? (
            <div className="mt-3 grid gap-1 text-sm leading-6 text-[var(--creator-text-muted)]">
              {proposal.stateChanges.map(change => (
                <p key={`${proposal.id}:${change.dimension}`}>{change.dimension}：{change.before || '未记录'} → {change.after}</p>
              ))}
            </div>
          ) : null}
          <EvidenceList evidenceIds={proposal.evidenceIds} state={state} />
        </section>
      ))}
      {state.result.settingAssetProposals.map(proposal => (
        <section key={proposal.id} className="mt-5 border-t border-[var(--creator-border)] pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-[var(--creator-text)]">{proposal.title}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--creator-text-muted)]">{proposal.summary}</p>
            </div>
            <CaptureConfirmation
              action="save_character_rehearsal_setting"
              proposalId={proposal.id}
              label="保存设定卡候选"
              disabled={disabled || state.savedProposalIds.includes(proposal.id)}
              onConfirm={() => onCaptureSetting(proposal.id)}
            />
          </div>
          <EvidenceList evidenceIds={proposal.evidenceIds} state={state} />
        </section>
      ))}
      {!state.result.characterCardProposals.length && !state.result.settingAssetProposals.length ? (
        <p className="mt-4 text-sm leading-6 text-[var(--creator-text-muted)]">
          本轮没有足够直接证据形成卡片候选，不会为了填满结果而补写人物变化。
        </p>
      ) : null}
      <Button type="button" variant="ghost" size="sm" className="mt-4" onClick={onDismiss} disabled={disabled}>
        <X size={13} aria-hidden="true" />收起本轮排练
      </Button>
    </div>
  )
}
