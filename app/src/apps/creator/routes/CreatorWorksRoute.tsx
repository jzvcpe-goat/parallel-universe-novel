import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import {
  BookOpen,
  Edit3,
  EyeOff,
  GitBranch,
  Megaphone,
  Plus,
  RefreshCw,
  Save,
} from 'lucide-react'
import { Panel } from '@/components/design-system/Panel'
import { CreatorStatePanel } from '@/components/creator/CreatorStatePanel'
import { CreatorWorkStructureStrip } from '@/components/creator/CreatorWorkStructureStrip'
import { CreatorSelect, MetricCard } from '@/components/creator/CreatorRouteControls'
import { ConfirmActionDialog } from '@/components/creator/ConfirmActionDialog'
import { CreatorAuthorDecisionCard } from '@/components/creator/CreatorAuthorDecisionCard'
import { CreatorBranchLineCard } from '@/components/creator/CreatorBranchLineCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  type PmfBranch,
  type PmfChapter,
  type PmfReaderRequest,
  type PmfWork,
} from '@/features/pmf/types'
import {
  runCreatorBranchArchiveFlow,
  runCreatorIfBranchCreateFlow,
  runCreatorWorkHideFlow,
  runCreatorWorkNoticeFlow,
} from './creatorWorksActionFlowService'
import { scheduleCreatorWorksInitialLoad } from './creatorWorksBrowserActionService'
import { resolveCreatorWorksSelection, runCreatorWorksLoad } from './creatorWorksLoadService'
import { createCreatorWorksRouteViewModel } from './creatorWorksRouteViewModels'
import { branchTypeLabel, creatorFacingNotice } from '../creatorViewHelpers'

type WorkStructureAction = 'notice' | 'hide' | 'archive' | 'create-branch'

export function CreatorWorksRoute() {
  const navigate = useNavigate()
  const [works, setWorks] = useState<PmfWork[]>([])
  const [branches, setBranches] = useState<PmfBranch[]>([])
  const [chapters, setChapters] = useState<PmfChapter[]>([])
  const [requests, setRequests] = useState<PmfReaderRequest[]>([])
  const [selectedWorkId, setSelectedWorkId] = useState('')
  const [selectedBranchId, setSelectedBranchId] = useState('')
  const [authorNotice, setAuthorNotice] = useState('')
  const [newBranchTitle, setNewBranchTitle] = useState('')
  const [newBranchSummary, setNewBranchSummary] = useState('')
  const [parentBranchId, setParentBranchId] = useState('none')
  const [parentChapterId, setParentChapterId] = useState('none')
  const [notice, setNotice] = useState('正在读取作品结构...')
  const [loading, setLoading] = useState(true)
  const [workAction, setWorkAction] = useState<WorkStructureAction | null>(null)

  const load = useCallback(async (nextSelectedWorkId = '', nextSelectedBranchId = '') => {
    setLoading(true)
    const result = await runCreatorWorksLoad({
      selectedBranchId: nextSelectedBranchId,
      selectedWorkId: nextSelectedWorkId,
    })
    setWorks(result.works)
    setBranches(result.branches)
    setChapters(result.chapters)
    setRequests(result.requests)
    if (!result.ok) {
      setNotice(creatorFacingNotice(result.notice))
    } else {
      setSelectedWorkId(result.selection.selectedWorkId)
      setSelectedBranchId(result.selection.selectedBranchId)
      setAuthorNotice(result.selection.authorNotice)
      setParentBranchId(result.selection.parentBranchId)
      setNotice(result.notice)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    return scheduleCreatorWorksInitialLoad(load)
  }, [load])

  const {
    branchRows,
    selectedBranch,
    selectedBranchAnswer,
    selectedBranchChapters,
    selectedBranchDecisionSteps,
    selectedBranchQuestion,
    selectedBranchRequests,
    selectedBranchTypeLabel,
    selectedBranchUpdatedAtLabel,
    selectedParentBranchLabel,
    selectedParentChapterLabel,
    selectedWork,
    selectedWorkBranches,
    selectedWorkChapters,
    selectedWorkRequests,
    workRows,
  } = useMemo(() => createCreatorWorksRouteViewModel({
    branches,
    chapters,
    requests,
    selectedBranchId,
    selectedWorkId,
    works,
  }), [branches, chapters, requests, selectedBranchId, selectedWorkId, works])

  function selectWork(work: PmfWork) {
    const selection = resolveCreatorWorksSelection([work], branches, {
      selectedWorkId: work.id,
    })
    setSelectedWorkId(selection.selectedWorkId)
    setSelectedBranchId(selection.selectedBranchId)
    setAuthorNotice(selection.authorNotice)
    setParentBranchId(selection.parentBranchId)
    setParentChapterId('none')
  }

  async function saveAuthorNotice() {
    if (!selectedWork) {
      setNotice('请先选择作品。')
      return
    }
    setWorkAction('notice')
    try {
      const result = await runCreatorWorkNoticeFlow({
        authorNotice,
        selectedBranchId,
        workId: selectedWork.id,
      })
      setNotice(result.notice)
      if (result.reload) await load(result.reload.workId, result.reload.branchId)
    } finally {
      setWorkAction(null)
    }
  }

  async function hideSelectedWork() {
    if (!selectedWork) return
    setWorkAction('hide')
    try {
      const result = await runCreatorWorkHideFlow({
        selectedBranchId,
        workId: selectedWork.id,
      })
      setNotice(result.notice)
      if (result.reload) await load(result.reload.workId, result.reload.branchId)
    } finally {
      setWorkAction(null)
    }
  }

  async function archiveBranch(branch: PmfBranch) {
    setWorkAction('archive')
    try {
      const result = await runCreatorBranchArchiveFlow(branch)
      setNotice(result.notice)
      if (result.reload) await load(result.reload.workId, result.reload.branchId)
    } finally {
      setWorkAction(null)
    }
  }

  async function createIfBranch() {
    if (!selectedWork) {
      setNotice('请先选择作品。')
      return
    }
    setWorkAction('create-branch')
    try {
      const result = await runCreatorIfBranchCreateFlow({
        parentBranchId,
        parentChapterId,
        summary: newBranchSummary,
        title: newBranchTitle,
        workId: selectedWork.id,
      })
      setNotice(result.notice)
      if (result.resetBranchForm) {
        setNewBranchTitle('')
        setNewBranchSummary('')
        setParentChapterId('none')
      }
      if (result.reload) await load(result.reload.workId, result.reload.branchId)
    } finally {
      setWorkAction(null)
    }
  }

  function openDraftForBranch(branch: PmfBranch) {
    navigate(`/creator/editor?work=${encodeURIComponent(branch.work_id)}&branch=${encodeURIComponent(branch.id)}`)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
      <aside className="space-y-4">
        <Panel className="p-4" motion="reveal">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-[var(--creator-accent)]" />
            <h2 className="text-base font-semibold text-[var(--creator-text)]">作品列表</h2>
          </div>
          <div className="mt-3 grid gap-2">
            {workRows.map(({ branchCount, chapterCount, openRequestCount, work }) => (
                <Button
                  key={work.id}
                  variant={selectedWork?.id === work.id ? 'gold' : 'outline'}
                  className="h-auto w-full justify-start px-3 py-3 text-left"
                  onClick={() => selectWork(work)}
                >
                  <span>
                    <span className="block text-sm font-semibold">{work.title}</span>
                    <span className="block text-xs opacity-70">{branchCount} 条线 · {chapterCount} 章 · {openRequestCount} 条请求</span>
                  </span>
                </Button>
            ))}
            {!works.length ? (
              <CreatorStatePanel kind="empty" title="暂无作品" description="作者拥有作品后，会在这里显示主线、IF 支线和章节。" />
            ) : null}
          </div>
        </Panel>
      </aside>

      <section className="min-w-0 space-y-4">
        <Panel className="p-5" motion="reveal">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2">
                <GitBranch size={18} className="text-[var(--creator-accent)]" />
                <h2 className="text-xl font-semibold text-[var(--creator-text)]">作品与支线</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]">{notice}</p>
            </div>
            <Button variant="outline" onClick={() => load(selectedWork?.id, selectedBranch?.id)} disabled={loading} loading={loading}>
              <RefreshCw size={15} />
              刷新
            </Button>
          </div>
        </Panel>

        {selectedWork ? (
          <Panel className="p-5" motion="reveal">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={selectedWork.status === 'published' ? 'gold' : 'outline'}>
                    {selectedWork.status === 'published' ? '已公开' : selectedWork.status === 'hidden' ? '已隐藏' : '未公开'}
                  </Badge>
                  <Badge variant="outline">{selectedWorkBranches.length} 条线</Badge>
                  <Badge variant="outline">{selectedWorkChapters.length} 章</Badge>
                </div>
                <h3 className="mt-3 text-2xl font-semibold text-[var(--creator-text)]">{selectedWork.title}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--creator-text-muted)]">
                  {selectedWork.summary || '等待补充作品说明。'}
                </p>
              </div>
              <ConfirmActionDialog
                title="确认隐藏作品"
                description="隐藏后，读者将无法继续从公开入口看到这部作品。已发布记录仍可由作者查看。"
                actionLabel="确认隐藏"
                pendingLabel="隐藏中..."
                variant="destructive"
                disabled={selectedWork.status === 'hidden' || Boolean(workAction)}
                onConfirm={hideSelectedWork}
              >
                <Button variant="void" disabled={selectedWork.status === 'hidden' || Boolean(workAction)}>
                  <EyeOff size={15} />
                  {workAction === 'hide' ? '隐藏中...' : '隐藏作品'}
                </Button>
              </ConfirmActionDialog>
            </div>
          </Panel>
        ) : null}

        {selectedWork ? (
          <CreatorWorkStructureStrip
            branches={selectedWorkBranches}
            chapters={selectedWorkChapters}
            requests={selectedWorkRequests}
          />
        ) : null}

        <div className="space-y-3">
          {branchRows.map(({
            branch,
            chapters: branchChapters,
            parentChapterLabel,
            requestCount,
            statusLabel,
            statusVariant,
            typeLabel,
            updatedAtLabel,
          }) => (
              <CreatorBranchLineCard
                key={branch.id}
                branch={branch}
                selected={selectedBranch?.id === branch.id}
                typeLabel={typeLabel}
                statusLabel={statusLabel}
                statusVariant={statusVariant}
                requestCount={requestCount}
                chapters={branchChapters}
                parentChapterLabel={parentChapterLabel}
                updatedAtLabel={updatedAtLabel}
                archiveDisabled={branch.branch_type === 'main' || branch.status === 'archived' || Boolean(workAction)}
                archiving={workAction === 'archive'}
                onSelect={() => setSelectedBranchId(branch.id)}
                onStartWriting={() => openDraftForBranch(branch)}
                onArchive={() => archiveBranch(branch)}
              />
          ))}
          {!selectedWorkBranches.length ? (
            <CreatorStatePanel kind="empty" title="暂无支线" description="可以先创建一条 IF 支线，或等待作品主线创建完成。" />
          ) : null}
        </div>
      </section>

      <aside className="space-y-4">
        <CreatorAuthorDecisionCard
          title="这条线下一步"
          question={selectedBranchQuestion}
          answer={selectedBranchAnswer}
          steps={selectedBranchDecisionSteps}
          primaryLabel="去这条线写正文"
          secondaryLabel="查看外界回声"
          primaryDisabled={!selectedBranch}
          secondaryDisabled={!selectedWork}
          onPrimary={() => selectedBranch ? openDraftForBranch(selectedBranch) : undefined}
          onSecondary={() => navigate('/creator/requests')}
        />
        <Panel className="p-5" motion="reveal">
          <div className="flex items-center gap-2">
            <GitBranch size={18} className="text-[var(--creator-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--creator-text)]">支线详情</h2>
          </div>
          {selectedBranch ? (
            <div className="mt-4 space-y-4 text-sm leading-6 text-[var(--creator-text-muted)]">
              <div className="flex flex-wrap gap-2">
                <Badge variant={selectedBranch.branch_type === 'main' ? 'gold' : 'outline'}>{selectedBranchTypeLabel}</Badge>
                <Badge variant={selectedBranch.status === 'published' ? 'outline' : selectedBranch.status === 'archived' ? 'destructive' : 'stasis'}>
                  {selectedBranch.status === 'published' ? '已公开' : selectedBranch.status === 'archived' ? '已归档' : '未公开'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-[var(--creator-text-dim)]">当前支线</p>
                <p className="mt-1 text-base font-semibold text-[var(--creator-text)]">{selectedBranch.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="章节" value={selectedBranchChapters.length} detail="当前线" />
                <MetricCard label="请求" value={selectedBranchRequests.length} detail="读者想看" />
              </div>
              <div className="rounded-lg border border-[var(--creator-border)] bg-[var(--creator-surface)] p-3">
                <p>父线：{selectedParentBranchLabel}</p>
                <p>挂点：{selectedParentChapterLabel}</p>
                <p>最近更新：{selectedBranchUpdatedAtLabel}</p>
              </div>
              <Button className="w-full" variant="outline" onClick={() => openDraftForBranch(selectedBranch)}>
                <Edit3 size={14} />
                去这条线写正文
              </Button>
            </div>
          ) : (
            <CreatorStatePanel kind="empty" title="请选择支线" description="选中主线或 IF 支线后，会在这里显示挂点、章节和请求。" />
          )}
        </Panel>
        <Panel className="p-5" motion="reveal">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-[var(--creator-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--creator-text)]">作者公告</h2>
          </div>
          <Textarea
            className="mt-3 min-h-[150px] border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]"
            value={authorNotice}
            onChange={event => setAuthorNotice(event.target.value)}
            placeholder="告诉读者本周优先写什么、哪些支线暂缓。"
          />
          <Button className="mt-3 w-full" variant="gold" onClick={saveAuthorNotice} disabled={!selectedWork || loading || Boolean(workAction)} loading={workAction === 'notice'}>
            <Save size={15} />
            {workAction === 'notice' ? '保存中...' : '保存公告'}
          </Button>
        </Panel>
        <Panel className="p-5" motion="reveal">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-[var(--creator-confirm)]" />
            <h2 className="text-lg font-semibold text-[var(--creator-text)]">新建 IF 支线</h2>
          </div>
          <div className="mt-3 grid gap-3">
            <label className="grid gap-2 text-xs text-[var(--creator-text-dim)]">
              支线标题
              <Input
                value={newBranchTitle}
                onChange={event => setNewBranchTitle(event.target.value)}
                className="border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]"
              />
            </label>
            <label className="grid gap-2 text-xs text-[var(--creator-text-dim)]">
              支线说明
              <Textarea
                value={newBranchSummary}
                onChange={event => setNewBranchSummary(event.target.value)}
                className="min-h-[90px] border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]"
              />
            </label>
            <label className="grid gap-2 text-xs text-[var(--creator-text-dim)]">
              父线
              <CreatorSelect
                value={parentBranchId}
                onValueChange={setParentBranchId}
                options={[
                  { value: 'none', label: '不指定' },
                  ...selectedWorkBranches.map(branch => ({ value: branch.id, label: `${branchTypeLabel(branch)} · ${branch.title}` })),
                ]}
              />
            </label>
            <label className="grid gap-2 text-xs text-[var(--creator-text-dim)]">
              挂点章节
              <CreatorSelect
                value={parentChapterId}
                onValueChange={setParentChapterId}
                options={[
                  { value: 'none', label: '暂不指定' },
                  ...selectedWorkChapters.map(chapter => ({ value: chapter.id, label: `第 ${chapter.chapter_no} 章 · ${chapter.title}` })),
                ]}
              />
            </label>
            <Button variant="gold" onClick={createIfBranch} disabled={!selectedWork || !newBranchTitle.trim() || Boolean(workAction)} loading={workAction === 'create-branch'}>
              <Plus size={15} />
              {workAction === 'create-branch' ? '创建中...' : '创建支线'}
            </Button>
          </div>
        </Panel>
      </aside>
    </div>
  )
}
