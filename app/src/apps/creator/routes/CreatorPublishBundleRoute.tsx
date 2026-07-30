import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import {
  CheckCircle2,
  Download,
  FileCheck2,
  ListFilter,
  PackageCheck,
  RefreshCw,
  Send,
  ShieldCheck,
  Upload,
} from 'lucide-react'
import { Panel } from '@/components/design-system/Panel'
import { CreatorActionBar } from '@/components/creator/CreatorActionBar'
import { ConfirmActionDialog } from '@/components/creator/ConfirmActionDialog'
import { CreatorAuthorDecisionCard } from '@/components/creator/CreatorAuthorDecisionCard'
import {
  CreatorPublishBundleContextPanel,
  CreatorPublishBundleImpactStrip,
  CreatorPublishBundleReviewPanel,
} from '@/components/creator/CreatorPublishBundlePanels'
import { MetricCard } from '@/components/creator/CreatorRouteControls'
import { CreatorStatePanel } from '@/components/creator/CreatorStatePanel'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  type PmfBranch,
  type PmfChapter,
  type PmfReaderRequest,
  type PmfWork,
} from '@/features/pmf/types'
import {
  requestStatusLabel,
  type CreatorAuthorizationStatus,
} from '@/lib/pmfSupabase'
import {
  importCreatorPublishBundleReceipt,
  runConfirmedCreatorBundleConfirmation,
  runConfirmedCreatorBundleExport,
  runConfirmedCreatorBundleSubmit,
  runCreatorPreparePublishBundle,
  runCreatorReviewPublishBundle,
} from './creatorPublishBundleActionService'
import {
  downloadCreatorPublishBundle,
  readCreatorPublishBundleReceiptFile,
  scheduleCreatorPublishBundleContextLoad,
  scheduleCreatorPublishBundleRouteDraftRefresh,
} from './creatorPublishBundleBrowserActionService'
import {
  readCreatorPublishBundleLocalSnapshot,
  readCreatorPublishBundleRouteRefs,
  resolveCreatorPublishBundleRouteDraftRef,
} from './creatorPublishBundleLoadService'
import {
  applyCreatorPublishBundleContextStatePatchToReact,
  applyCreatorPublishBundleLocalStatePatchToReact,
} from './creatorPublishBundleReactPatchApplier'
import {
  resolveCreatorPublishBundleInitialActiveDraftRef,
} from './creatorPublishBundleRouteController'
import {
  runCreatorPublishBundleContextEffect,
  runCreatorPublishBundleManualRefreshEffect,
  runCreatorPublishBundleRouteDraftRefreshEffect,
} from './creatorPublishBundleRouteEffectService'
import { createCreatorPublishBundleRouteViewModel } from './creatorPublishBundleRouteViewModels'
import { publishBundleFileName } from '@/features/creator-pivot/publishBundlePackage'
import {
  creatorFacingNotice,
  latestDateLabel,
  statusTone,
} from '../creatorViewHelpers'

export function CreatorPublishBundleRoute() {
  const location = useLocation()
  const navigate = useNavigate()
  const routeRefs = readCreatorPublishBundleRouteRefs(location.search)
  const routeBundleDraftId = routeRefs.bundleDraftId || null
  const routeLegacyDraftRef = routeRefs.legacyDraftRef || null
  const [initialLocalSnapshot] = useState(() => readCreatorPublishBundleLocalSnapshot(routeRefs))
  const [drafts, setDrafts] = useState(() => initialLocalSnapshot.drafts)
  const [publishBundles, setPublishBundles] = useState(() => initialLocalSnapshot.publishBundles)
  const [publishReceipts, setPublishReceipts] = useState(() => initialLocalSnapshot.publishReceipts)
  const routeDraftRef = resolveCreatorPublishBundleRouteDraftRef(routeRefs, publishBundles)
  const [activeDraftRef, setActiveDraftRef] = useState(
    () => resolveCreatorPublishBundleInitialActiveDraftRef(initialLocalSnapshot),
  )
  const [works, setWorks] = useState<PmfWork[]>([])
  const [branches, setBranches] = useState<PmfBranch[]>([])
  const [chapters, setChapters] = useState<PmfChapter[]>([])
  const [requests, setRequests] = useState<PmfReaderRequest[]>([])
  const [authorization, setAuthorization] = useState<CreatorAuthorizationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [bundleAction, setBundleAction] = useState<string | null>(null)
  const receiptFileRef = useRef<HTMLInputElement>(null)
  const [lastPublished, setLastPublished] = useState<{
    chapterTitle: string
    workTitle: string
    branchTitle: string
    requestImpact: string
    publishedAt: string
  } | null>(null)
  const [notice, setNotice] = useState('选择一份私密草稿后检查发布去向。')
  const {
    activeBranchTitle,
    activeBundle,
    activeDraft,
    activeWorkTitle,
    anchorLabel,
    canPrepareBundle,
    confirmGates,
    lifecycle,
    linkedRequest,
    mustGates,
    publishBundleInput,
    publishDecisionAnswer,
    publishDecisionQuestion,
    publishDecisionSteps,
    publishLineLabel,
    publishReviewSignals,
    publishedRequestImpact,
    readerLocationLabel,
    requestImpactLabel,
    warningGates,
  } = createCreatorPublishBundleRouteViewModel({
    activeDraftRef,
    authorization,
    branches,
    chapters,
    drafts,
    publishBundles,
    publishReceipts,
    requests,
    routeDraftRef,
    works,
  })
  const bundleBusy = bundleAction !== null

  const loadContext = useCallback(async () => {
    setLoading(true)
    const result = await runCreatorPublishBundleContextEffect({
      bundleDraftId: routeBundleDraftId,
      legacyDraftRef: routeLegacyDraftRef,
    })
    applyCreatorPublishBundleContextStatePatchToReact(
      result.contextStatePatch,
      { setAuthorization, setBranches, setChapters, setRequests, setWorks },
    )
    applyCreatorPublishBundleLocalStatePatchToReact(
      result.localStatePatch,
      { setActiveDraftRef, setDrafts, setNotice, setPublishBundles, setPublishReceipts },
    )
    setLoading(false)
  }, [
    routeBundleDraftId,
    routeLegacyDraftRef,
    setAuthorization,
    setBranches,
    setChapters,
    setLoading,
    setNotice,
    setRequests,
    setWorks,
  ])

  useEffect(() => {
    return scheduleCreatorPublishBundleContextLoad(loadContext)
  }, [loadContext])

  useEffect(() => {
    if (!routeDraftRef) return
    return scheduleCreatorPublishBundleRouteDraftRefresh(async () => {
      const statePatch = await runCreatorPublishBundleRouteDraftRefreshEffect(
        { bundleDraftId: routeBundleDraftId, legacyDraftRef: routeLegacyDraftRef },
        routeBundleDraftId,
      )
      applyCreatorPublishBundleLocalStatePatchToReact(
        statePatch,
        { setActiveDraftRef, setDrafts, setNotice, setPublishBundles, setPublishReceipts },
      )
    })
  }, [routeBundleDraftId, routeDraftRef, routeLegacyDraftRef])

  async function refreshDrafts(nextNotice?: string) {
    const statePatch = await runCreatorPublishBundleManualRefreshEffect(
      { bundleDraftId: routeBundleDraftId, legacyDraftRef: routeLegacyDraftRef },
      nextNotice,
    )
    applyCreatorPublishBundleLocalStatePatchToReact(
      statePatch,
      { setActiveDraftRef, setDrafts, setNotice, setPublishBundles, setPublishReceipts },
    )
  }

  async function prepareBundle() {
    const input = publishBundleInput
    if (!input || !canPrepareBundle) {
      setNotice('请先补齐标题、正文和发布去向。')
      return
    }
    setBundleAction('prepare')
    try {
      const result = await runCreatorPreparePublishBundle(input)
      const successNotice = result.ok && result.data.record.status === 'published'
        ? '这份内容已经公开，没有重复准备或发布。'
        : '发布包已准备，尚未公开。'
      await refreshDrafts(result.ok ? successNotice : result.message)
    } finally {
      setBundleAction(null)
    }
  }

  async function reviewBundle() {
    if (!activeBundle) return
    setBundleAction('review')
    try {
      const result = await runCreatorReviewPublishBundle(activeBundle.id)
      await refreshDrafts(result.ok ? '发布包审阅状态已保存。' : result.message)
    } finally {
      setBundleAction(null)
    }
  }

  async function confirmBundle() {
    if (!activeBundle) return
    setBundleAction('confirm')
    try {
      const result = await runConfirmedCreatorBundleConfirmation(activeBundle.id, {
        source: 'confirm-dialog',
        confirmedAt: new Date().toISOString(),
      })
      await refreshDrafts(result.ok ? '作者确认已保存；发布包仍未公开。' : result.message)
    } finally {
      setBundleAction(null)
    }
  }

  async function exportBundle() {
    if (!activeBundle) return
    setBundleAction('export')
    try {
      const result = await runConfirmedCreatorBundleExport(activeBundle.id, {
        source: 'confirm-dialog',
        confirmedAt: new Date().toISOString(),
      })
      if (result.ok) downloadCreatorPublishBundle(result.data.bytes, publishBundleFileName(result.data.bundle))
      await refreshDrafts(result.ok ? '发布包已导出，可交给工作伙伴或手动发布。' : result.message)
    } finally {
      setBundleAction(null)
    }
  }

  async function submitBundle() {
    if (!activeBundle) return
    setBundleAction('submit')
    try {
      const result = await runConfirmedCreatorBundleSubmit(activeBundle.id, {
        source: 'confirm-dialog',
        confirmedAt: new Date().toISOString(),
      })
      if (result.ok && activeDraft) {
        setLastPublished({
          chapterTitle: result.data.chapter?.title || activeDraft.title,
          workTitle: activeWorkTitle,
          branchTitle: activeBranchTitle,
          requestImpact: publishedRequestImpact,
          publishedAt: latestDateLabel(result.data.receipt.createdAt),
        })
      }
      await refreshDrafts(result.ok
        ? result.data.replayed ? '这份发布包已经公开，没有重复发布。' : `已发布：${activeDraft?.title || '当前章节'}。`
        : creatorFacingNotice(result.message) || '发布未完成，正文仍保存在本机，发布包也已保留。')
      if (result.ok) void loadContext()
    } finally {
      setBundleAction(null)
    }
  }

  async function importReceipt(file: File | null) {
    if (!file || !activeBundle) return
    setBundleAction('receipt')
    try {
      const value = await readCreatorPublishBundleReceiptFile(file)
      await importCreatorPublishBundleReceipt(activeBundle.id, value)
      await refreshDrafts('发布回执已核验并保存。')
    } catch {
      setNotice('回执无法核验；发布包和正文没有改变。')
    } finally {
      if (receiptFileRef.current) receiptFileRef.current.value = ''
      setBundleAction(null)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
      <aside className="space-y-4">
        <Panel className="p-5" motion="reveal">
          <div className="flex items-center gap-2">
            <ListFilter size={18} className="text-[var(--creator-accent)]" />
            <h2 className="text-lg font-semibold text-[var(--creator-text)]">私密草稿</h2>
          </div>
          <div className="mt-3 space-y-2">
            {drafts.map(draft => (
              <Button
                key={draft.localDraftRef}
                variant={draft.localDraftRef === activeDraft?.localDraftRef ? 'gold' : 'outline'}
                className="h-auto w-full justify-start px-3 py-3 text-left"
                onClick={() => setActiveDraftRef(draft.localDraftRef)}
              >
                <span>
                  <span className="block text-sm font-semibold">{draft.title}</span>
                  <span className="block text-xs opacity-70">{new Date(draft.updatedAt).toLocaleString()}</span>
                </span>
              </Button>
            ))}
            {!drafts.length ? (
              <div className="rounded-xl border border-dashed border-[var(--creator-border)] bg-[var(--creator-surface)] px-3 py-4">
                <p className="text-sm font-semibold text-[var(--creator-text)]">没有可检查的初稿</p>
                <p className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)]">
                  先到写作台保存私密草稿，再回来确认作品、支线、标题和读者可见位置。
                </p>
                <Button className="mt-3" variant="outline" size="sm" onClick={() => navigate('/creator/editor')}>
                  去写作台
                </Button>
              </div>
            ) : null}
          </div>
        </Panel>
      </aside>

      <Panel className="p-5" motion="reveal">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[var(--creator-accent)]" />
          <h2 className="text-xl font-semibold text-[var(--creator-text)]">发布包确认</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]">
          发布前确认作品、支线、标题、正文预览和读者端展示位置。确认后才会公开。
        </p>
        <div className="mt-4">
          {activeDraft ? (
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-3">
                <MetricCard label="发布作品" value={activeWorkTitle} />
                <MetricCard label="发布线" value={publishLineLabel} />
                <MetricCard label="发布包状态" value={lifecycle.statusLabel} />
              </div>
              <CreatorPublishBundleImpactStrip
                readerLocationLabel={readerLocationLabel}
                anchorLabel={anchorLabel}
                requestImpactLabel={requestImpactLabel}
              />
              <CreatorPublishBundleReviewPanel
                signals={publishReviewSignals}
                readerLocationLabel={readerLocationLabel}
              />
              <div className="grid gap-3 lg:grid-cols-3">
                <Card variant="glass" padding="sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-[var(--creator-text)]">必须通过</CardTitle>
                    <CardDescription className="text-[var(--creator-text-muted)]">缺失项会阻止发布。</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {mustGates.map(gate => (
                      <div key={gate.label} className="flex items-center justify-between text-sm">
                        <span className="text-[var(--creator-text-muted)]">{gate.label}</span>
                        <Badge variant={gate.pass ? 'gold' : 'destructive'}>{gate.pass ? '完成' : '待补'}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card variant="glass" padding="sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-[var(--creator-text)]">提醒项</CardTitle>
                    <CardDescription className="text-[var(--creator-text-muted)]">可以继续，但建议先看一眼。</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {warningGates.map(gate => (
                      <div key={gate.label} className="flex items-center justify-between text-sm">
                        <span className="text-[var(--creator-text-muted)]">{gate.label}</span>
                        <Badge variant={gate.warn ? 'outline' : 'gold'}>{gate.warn ? '注意' : '无碍'}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card variant="glass" padding="sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base text-[var(--creator-text)]">二次确认</CardTitle>
                    <CardDescription className="text-[var(--creator-text-muted)]">发布按钮会再次确认。</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {confirmGates.map(item => (
                      <p key={item} className="text-sm leading-6 text-[var(--creator-text-muted)]">{item}</p>
                    ))}
                  </CardContent>
                </Card>
              </div>
              <Card variant="glass" padding="sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{activeDraft.title}</CardTitle>
                  <CardDescription>{new Date(activeDraft.updatedAt).toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="creator-editor-surface max-h-[360px] overflow-auto rounded-md p-4">
                    <pre className="whitespace-pre-wrap font-serif text-sm leading-7 text-[var(--creator-editor-text)]">
                      {activeDraft.content}
                    </pre>
                  </div>
                </CardContent>
              </Card>
              <Alert className="border-[var(--creator-border)] bg-transparent text-[var(--creator-text-muted)]">
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>读者可见位置</AlertTitle>
                <AlertDescription>
                  {readerLocationLabel}。
                </AlertDescription>
              </Alert>
              {lastPublished ? (
                <Alert className="border-[var(--creator-confirm)] bg-[var(--creator-surface)] text-[var(--creator-text-muted)]">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>发布完成</AlertTitle>
                  <AlertDescription>
                    {lastPublished.workTitle} / {lastPublished.branchTitle} / {lastPublished.chapterTitle} 已公开；{lastPublished.requestImpact}。时间：{lastPublished.publishedAt}
                  </AlertDescription>
                </Alert>
              ) : null}
              <CreatorActionBar>
                <Button variant="outline" onClick={() => void refreshDrafts()} disabled={loading || bundleBusy}>
                  <RefreshCw size={15} />
                  刷新草稿
                </Button>
                <Button
                  variant="outline"
                  data-agent-action="prepare_publish_bundle"
                  data-agent-risk="medium"
                  data-agent-target={activeDraft.localDraftRef}
                  disabled={!lifecycle.canPrepare || bundleBusy}
                  loading={bundleAction === 'prepare'}
                  onClick={prepareBundle}
                >
                  <PackageCheck size={15} />
                  {activeBundle ? '重新准备' : '准备发布包'}
                </Button>
                {lifecycle.canReview ? (
                  <Button
                    variant="outline"
                    data-agent-action="review_publish_bundle"
                    data-agent-risk="medium"
                    data-agent-target={activeBundle?.id}
                    disabled={bundleBusy}
                    loading={bundleAction === 'review'}
                    onClick={reviewBundle}
                  >
                    <FileCheck2 size={15} />
                    完成审阅
                  </Button>
                ) : null}
                {lifecycle.canConfirm ? (
                  <ConfirmActionDialog
                    title="确认这份发布包"
                    description="这一步只保存作者确认，不会公开。确认后仍可先导出，再决定是否提交到阅读端。"
                    actionLabel="确认内容与去向"
                    disabled={bundleBusy}
                    onConfirm={confirmBundle}
                  >
                    <Button
                      variant="gold"
                      data-agent-action="confirm_publish_bundle"
                      data-agent-risk="high"
                      data-agent-target={activeBundle?.id}
                      disabled={bundleBusy}
                    >
                      <ShieldCheck size={15} />
                      确认发布包
                    </Button>
                  </ConfirmActionDialog>
                ) : null}
                {lifecycle.canExport ? (
                  <ConfirmActionDialog
                    title="导出这份发布包"
                    description="导出包包含正文、公开摘要和手动发布副本，只保存在你选择的位置。"
                    actionLabel="确认导出"
                    disabled={bundleBusy}
                    onConfirm={exportBundle}
                  >
                    <Button
                      variant="outline"
                      data-agent-action="export_publish_bundle"
                      data-agent-risk="high"
                      data-agent-target={activeBundle?.id}
                      disabled={bundleBusy}
                    >
                      <Download size={15} />
                      导出发布包
                    </Button>
                  </ConfirmActionDialog>
                ) : null}
                {lifecycle.canSubmit ? (
                  <ConfirmActionDialog
                    title="提交到阅读端"
                    description="确认后才会公开。重复提交同一份已发布内容不会再创建章节。"
                    actionLabel="确认提交"
                    pendingLabel="提交中..."
                    disabled={bundleBusy}
                    onConfirm={submitBundle}
                  >
                    <Button
                      variant="gold"
                      data-agent-action="submit_publish_bundle"
                      data-agent-risk="high"
                      data-agent-target={activeBundle?.id}
                      disabled={bundleBusy}
                      loading={bundleAction === 'submit'}
                    >
                      <Send size={15} />
                      提交到阅读端
                    </Button>
                  </ConfirmActionDialog>
                ) : null}
                {activeBundle ? (
                  <>
                    <input
                      ref={receiptFileRef}
                      className="hidden"
                      type="file"
                      accept="application/json,.json"
                      onChange={event => void importReceipt(event.target.files?.[0] || null)}
                    />
                    <Button
                      variant="ghost"
                      disabled={bundleBusy}
                      loading={bundleAction === 'receipt'}
                      onClick={() => receiptFileRef.current?.click()}
                    >
                      <Upload size={15} />
                      导入回执
                    </Button>
                  </>
                ) : null}
              </CreatorActionBar>
              {lifecycle.needsReceiptRecovery ? (
                <Alert className="border-[var(--creator-border)] bg-transparent text-[var(--creator-text-muted)]">
                  <Upload className="h-4 w-4" />
                  <AlertTitle>等待发布回执</AlertTitle>
                  <AlertDescription>
                    请先核对阅读端，或导入工作伙伴返回的回执。系统不会在结果不明时重复提交。
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          ) : (
            <CreatorStatePanel
              kind="empty"
              title="暂无待检查初稿"
              description="从写作台保存私密草稿后，会在这里检查发布去向和读者展示位置。"
              actionLabel="去写作台"
              onAction={() => navigate('/creator/editor')}
            />
          )}
        </div>
        <p className="mt-4 text-sm text-[var(--creator-text-muted)]">{notice}</p>
      </Panel>

      <aside className="space-y-4">
        <CreatorAuthorDecisionCard
          title="发布前最后一问"
          question={publishDecisionQuestion}
          answer={publishDecisionAnswer}
          steps={publishDecisionSteps}
          primaryLabel="回到写作台调整"
          secondaryLabel="刷新草稿"
          primaryDisabled={!activeDraft}
          onPrimary={() => navigate(activeDraft ? `/creator/editor?draft=${encodeURIComponent(activeDraft.localDraftRef)}` : '/creator/editor')}
          onSecondary={() => void refreshDrafts()}
        />
        <CreatorPublishBundleContextPanel
          workTitle={activeWorkTitle}
          branchTitle={activeBranchTitle}
          anchorLabel={anchorLabel}
          requestImpactLabel={requestImpactLabel}
          requestText={linkedRequest?.request_text}
          requestStatusLabel={linkedRequest ? requestStatusLabel(linkedRequest.status) : undefined}
          requestStatusTone={linkedRequest ? statusTone(linkedRequest.status) : undefined}
          requestVoteCount={linkedRequest?.vote_count}
        />
      </aside>
    </div>
  )
}
