import { type ReactNode, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { CreatorShell } from '@/components/creator/CreatorShell'
import { CreatorStatePanel } from '@/components/creator/CreatorStatePanel'
import {
  CreatorAccessGate,
  type CreatorAccessCard,
} from '@/components/creator/CreatorLoginSurfaces'
import { CreatorShortcutBar } from '@/components/creator/workspace/CreatorWorkspaceShell'
import { CreatorAssistantSidecarSurface } from '@/components/creator/workspace/CreatorAssistantSidecar'
import { CreatorCommandPaletteSurface } from '@/components/creator/workspace/CreatorCommandPalette'
import { CreatorCommandCandidateSurface } from '@/components/creator/workspace/CreatorCommandCandidate'
import {
  assistantScopeForPath,
  assistantScopeLabel,
  commandCandidateFor,
  commandContextForScope,
  commandIntentKeywords,
  commandsForScope,
  resolveCommandCandidateOption,
  type CommandCandidate,
  type CommandCandidateApplyDetail,
  type CreatorAssistantScope,
  type CreatorCommand,
} from '@/components/creator/creatorCommandCandidateService'
import {
  confirmCreatorCommandCandidateApplyFlow,
  executeCreatorCommandCandidateApplyFlow,
  executeCreatorCommandCandidateStartFlow,
  recordCreatorCommandCandidateCancellation,
} from '@/agent-surface/operationFlow'
import {
  getCreatorPivotNavItems,
  resolveCreatorLegacyPath,
  resolveCreatorPageCopy,
} from '@/apps/creator/creatorRouteRegistry'
import type { CreatorSessionState } from '@/apps/creator/creatorSessionService'
import {
  bindCreatorFrameShortcuts,
  detectCreatorLocalSurface,
  dispatchCreatorCommandCandidateApply,
  signOutCreatorSession,
} from './creatorFrameBoundaryService'

const creatorAccessPreviews: Record<string, { title: string; description: string; cards: CreatorAccessCard[] }> = {
  '/creator': {
    title: '登录后继续你的创作',
    description: '本机草稿、外界回声、写作智库和发布包会在作者工作区汇合。',
    cards: [
      {
        tone: 'echo',
        label: '外界回声',
        title: '把真实反馈变成写作线索',
        description: '评论、愿望和高亮只提供上下文，不替作者决定下一章。',
      },
      {
        tone: 'draft',
        label: '本机草稿',
        title: '从上次停下的位置继续',
        description: '候选和未发布正文保留在当前工作区。',
      },
      {
        tone: 'library',
        label: '写作智库',
        title: '调用人物、场景与伏笔',
        description: '叙事资产在写作时出现，不要求作者先填完复杂表格。',
      },
      {
        tone: 'publish',
        label: '发布包',
        title: '确认影响后再公开',
        description: '作品、支线和读者可见位置会在发布前完整核对。',
      },
    ],
  },
  '/creator/requests': {
    title: '登录后查看外界回声',
    description: '把评论、愿望、高亮和支线呼声整理成可以采用或忽略的创作线索。',
    cards: [
      {
        tone: 'echo',
        label: '读者在意什么',
        title: '保留反馈的原始语境',
        description: '查看反馈来自哪部作品、哪一章和哪一段。',
      },
      {
        tone: 'library',
        label: '聚合线索',
        title: '相近反馈合并呈现',
        description: '重复回声不会伪装成多个独立创作任务。',
      },
      {
        tone: 'draft',
        label: '创作提醒',
        title: '由作者决定是否带入写作',
        description: '保存、编辑、忽略和关联草稿都需要作者主动选择。',
      },
      {
        tone: 'publish',
        label: '回应闭环',
        title: '发布后读者看到真实结果',
        description: '只有已经公开的内容才会更新读者端状态。',
      },
    ],
  },
  '/creator/editor': {
    title: '登录后进入写作台',
    description: '登录后会进入三栏写作界面：故事地图、安静正文、发布去向。',
    cards: [
      {
        tone: 'echo',
        label: '故事地图',
        title: '保留读者想看的原因',
        description: '从外界回声进入写作时，左侧保留作品、支线和读者原话。',
      },
      {
        tone: 'draft',
        label: '正文编辑',
        title: '中间只写标题和正文',
        description: '编辑区不使用强玻璃背景，避免打断长文本写作。',
      },
      {
        tone: 'library',
        label: '发布去向',
        title: '选择作品、主线或 IF 支线',
        description: '右侧只处理公开位置和准备度，不干扰正文。',
      },
      {
        tone: 'publish',
        label: '进入发布包确认',
        title: '保存后再确认公开',
        description: '草稿进入检查后，确认发布前读者不可见。',
      },
    ],
  },
  '/creator/works': {
    title: '登录后查看本机写作智库',
    description: '人物、场景、作品结构和伏笔会在需要时进入当前章节上下文。',
    cards: [
      {
        tone: 'library',
        label: '作品',
        title: '管理作者公告和公开状态',
        description: '作者公告帮助读者理解更新节奏和支线安排。',
      },
      {
        tone: 'echo',
        label: '支线',
        title: '主线和 IF 支线分开管理',
        description: '每条支线都能看到挂点、章节和待回应的外界回声。',
      },
      {
        tone: 'draft',
        label: '章节',
        title: '查看已发布章节列表',
        description: '章节只展示已经公开的内容结构。',
      },
      {
        tone: 'publish',
        label: '重动作',
        title: '隐藏和归档需要确认',
        description: '危险操作会先确认，不会误影响读者可见内容。',
      },
    ],
  },
  '/creator/publish': {
    title: '登录后查看发布包',
    description: '登录后会在公开前确认作品、支线、挂点、标题、正文预览和发布影响。',
    cards: [
      {
        tone: 'draft',
        label: '私密草稿',
        title: '从草稿进入检查',
        description: '发布失败时，正文仍在草稿箱。',
      },
      {
        tone: 'library',
        label: '公开位置',
        title: '确认作品、主线或 IF 支线',
        description: '读者会在这里看到章节或支线更新。',
      },
      {
        tone: 'echo',
        label: '关联回声',
        title: '说明这次回应了什么',
        description: '有关联回声时，公开后会显示读者可以看到的结果。',
      },
      {
        tone: 'publish',
        label: '二次确认',
        title: '人工确认后才公开',
        description: '发布按钮会再次确认，防止误发。',
      },
    ],
  },
  '/creator/settings': {
    title: '登录后管理本机工作区',
    description: '登录后可以管理本机保存、备份、助手权限和显示偏好。',
    cards: [
      {
        tone: 'library',
        label: '本机保存',
        title: '草稿和设定留在当前工作区',
        description: '未发布的创作内容不会进入读者端。',
      },
      {
        tone: 'draft',
        label: '备份恢复',
        title: '导出前核对，导入时确认',
        description: '换设备时通过工作区备份继续写作。',
      },
      {
        tone: 'echo',
        label: '操作记录',
        title: '查看最近由作者触发的助手动作',
        description: '用于判断哪些建议、保存或发布包确认已经发生。',
      },
      {
        tone: 'publish',
        label: '界面偏好',
        title: '减少动态效果和透明效果',
        description: '让长时间写作更安静。',
      },
    ],
  },
}

export function CreatorFrame({
  session,
  refreshSession,
  children,
}: {
  session: CreatorSessionState
  refreshSession: () => Promise<void>
  children: ReactNode
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [commandOpen, setCommandOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [commandCandidate, setCommandCandidate] = useState<CommandCandidate | null>(null)
  const [candidateFeedback, setCandidateFeedback] = useState('')
  const [candidateSelectedAction, setCandidateSelectedAction] = useState('')
  const [candidateConfirmation, setCandidateConfirmation] = useState<{
    operationId: string
    receiptId: string
    candidateId: string
    adoptionMode: CommandCandidateApplyDetail['mode']
    route: string
  } | null>(null)
  const [candidateConfirmationPending, setCandidateConfirmationPending] = useState(false)
  const activePath = location.pathname
  const legacyActivePath = resolveCreatorLegacyPath(activePath)
  const focusMode = legacyActivePath === '/creator/editor'
  const isLocal = detectCreatorLocalSurface()
  const pageCopy = resolveCreatorPageCopy(activePath)
  const navItems = getCreatorPivotNavItems(activePath)

  async function logout() {
    await signOutCreatorSession()
    await refreshSession()
    navigate('/creator/login')
  }

  function closeFrameSurfaces() {
    setCommandOpen(false)
    setAssistantOpen(false)
    setCommandCandidate(null)
    setCandidateFeedback('')
    setCandidateSelectedAction('')
    setCandidateConfirmation(null)
    setCandidateConfirmationPending(false)
  }

  useEffect(() => {
    return bindCreatorFrameShortcuts({
      closeSurfaces: closeFrameSurfaces,
      openCommands: () => setCommandOpen(true),
      sessionStatus: session.status,
      toggleAssistant: () => setAssistantOpen(previous => !previous),
    })
  }, [session.status])

  async function runCommand(command: CreatorCommand, scope: CreatorAssistantScope) {
    const candidate = commandCandidateFor(command, scope)
    const execution = await executeCreatorCommandCandidateStartFlow({
      actionName: command.agentAction,
      route: activePath,
      candidateId: candidate.id,
    })
    if ('status' in execution && execution.status !== 'succeeded') return
    setCommandCandidate(candidate)
    setCandidateFeedback('')
    setCandidateSelectedAction('')
    setCandidateConfirmation(null)
    setCandidateConfirmationPending(false)
  }

  async function chooseCandidateOption(label: string) {
    if (!commandCandidate) return
    const decision = resolveCommandCandidateOption(label)
    setCandidateSelectedAction(label)
    setCandidateConfirmation(null)
    setCandidateConfirmationPending(false)
    if (decision.kind === 'cancel') {
      await recordCreatorCommandCandidateCancellation(commandCandidate.id, activePath)
      setCandidateFeedback(decision.feedback)
      return
    }
    const execution = await executeCreatorCommandCandidateApplyFlow({
      route: activePath,
      candidateId: commandCandidate.id,
      adoptionMode: decision.applyMode,
    })
    if (execution.status !== 'awaiting_confirmation') return
    setCandidateConfirmation(execution.confirmation)
    setCandidateFeedback('等待作者确认；此时还没有修改正文。')
  }

  async function confirmCandidateOption() {
    if (!commandCandidate || !candidateConfirmation || !candidateSelectedAction) return
    setCandidateConfirmationPending(true)
    try {
      const execution = await confirmCreatorCommandCandidateApplyFlow(
        candidateConfirmation,
        () => {
          if (!legacyActivePath.includes('/creator/editor')) return
          const detail: CommandCandidateApplyDetail = {
            mode: candidateConfirmation.adoptionMode,
            label: candidateSelectedAction,
            candidateId: commandCandidate.id,
            candidateTitle: commandCandidate.title,
          }
          dispatchCreatorCommandCandidateApply(detail)
        },
      )
      if (execution.status !== 'succeeded') return
      setCandidateFeedback(commandCandidate.feedback)
      setCandidateConfirmation(null)
    } finally {
      setCandidateConfirmationPending(false)
    }
  }

  return (
    <CreatorShell
      navItems={navItems}
      isSignedIn={session.status === 'signed_in'}
      isLocalSurface={isLocal}
      pageTitle={pageCopy.title}
      pageDescription={pageCopy.description}
      onNavigate={href => navigate(href)}
      onLogout={logout}
      focusMode={focusMode}
    >
      {session.status === 'signed_in' && !focusMode ? (
        <CreatorShortcutBar
          onOpenCommands={() => setCommandOpen(true)}
          onOpenAssistant={() => setAssistantOpen(true)}
        />
      ) : null}
      {children}
      {commandOpen && session.status === 'signed_in' ? (
        <CreatorCommandPaletteSurface
          scopeLabel={assistantScopeLabel(assistantScopeForPath(activePath))}
          commands={commandsForScope(assistantScopeForPath(activePath))}
          intentKeywords={commandIntentKeywords}
          commandContext={commandContextForScope(assistantScopeForPath(activePath))}
          onClose={() => setCommandOpen(false)}
          onNavigate={href => navigate(href)}
          onRunCommand={command => void runCommand(command as CreatorCommand, assistantScopeForPath(activePath))}
        />
      ) : null}
      <CreatorAssistantSidecarSurface
        open={assistantOpen && session.status === 'signed_in'}
        scope={assistantScopeForPath(activePath)}
        onClose={() => setAssistantOpen(false)}
      />
      <CreatorCommandCandidateSurface
        candidate={session.status === 'signed_in' ? commandCandidate : null}
        feedback={candidateFeedback}
        selectedAction={candidateSelectedAction}
        awaitingAuthorConfirmation={Boolean(candidateConfirmation)}
        confirmingAuthorConfirmation={candidateConfirmationPending}
        onChoose={label => void chooseCandidateOption(label)}
        onConfirm={() => void confirmCandidateOption()}
        onClose={closeFrameSurfaces}
      />
    </CreatorShell>
  )
}


export function RequireCreator({ session, children }: { session: CreatorSessionState; children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const preview = creatorAccessPreviews[resolveCreatorLegacyPath(location.pathname)] || creatorAccessPreviews['/creator']
  if (session.status === 'loading') {
    return (
      <CreatorStatePanel
        kind="loading"
        title="正在读取作者身份"
        description="读取完成后会进入创作工作台。"
      />
    )
  }
  if (session.status !== 'signed_in') {
    return (
      <CreatorAccessGate preview={preview} onLogin={() => navigate('/creator/login')} />
    )
  }
  if (!detectCreatorLocalSurface()) {
    return (
      <CreatorStatePanel
        kind="error"
        title="请在本机创作工作区继续"
        description="为保护未发布正文和本机创作资产，此页面不会在公共地址打开可写操作。"
      />
    )
  }
  return <>{children}</>
}
