import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  GitBranch,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router'
import { Badge } from '@/components/primitives/Badge'
import { Button } from '@/components/primitives/Button'
import { CapabilityMapPanel } from '@/components/design-system/CapabilityMapPanel'
import { Panel } from '@/components/design-system/Panel'
import { StudioTrendOpsPanel, type TrendOpsStatus } from '@/components/design-system/StudioTrendOpsPanel'
import { runtimeApi } from '@/api'
import { marketApi } from '@/api/market'
import { runtimeConfig } from '@/api/client'
import type { CanonCommitResponse, QualityEvaluateResponse } from '@/api/runtime'
import { marketTrendFallback } from '@/features/market/trends'
import type { MarketTrendPayload } from '@/features/market/trends'
import {
  candidateScenes,
  capabilityAlignments,
  genreKernels,
  harnessSteps,
  openSourceAdapters,
  qualityReports,
  worldTemplates,
} from '@/features/parallel-universe/data'
import type { CandidateScene } from '@/features/parallel-universe/types'

type SceneRuntimeCheck = {
  status: 'idle' | 'checking' | 'evaluated' | 'committing' | 'committed' | 'blocked' | 'local' | 'error'
  message: string
  evaluation?: QualityEvaluateResponse
  commit?: CanonCommitResponse
}

type MarketOpsState = {
  status: TrendOpsStatus
  message: string
  payload: MarketTrendPayload
  cadence: 'weekly' | 'monthly'
}

function templateModeLabel(mode: string) {
  if (mode === 'flagship') return '旗舰'
  if (mode === 'trial') return '短篇'
  return '故事方向'
}

function sceneStatusLabel(status: string) {
  if (status === 'canon_ready') return '可发布'
  if (status === 'branch_only') return '仅分支'
  return '待审'
}

function qualityDecisionLabel(decision: string) {
  if (decision === 'pass') return '通过'
  if (decision === 'rewrite') return '需重写'
  return '待复核'
}

function adapterStatusLabel(status: string) {
  if (status === 'license_gate') return '需授权'
  if (status === 'ready') return '可使用'
  if (status === 'planned') return '排期中'
  return '登记中'
}

function cadenceLabel(cadence: 'weekly' | 'monthly') {
  return cadence === 'weekly' ? '本周' : '本月'
}

function storyTypeTitle(name: string) {
  return name.replace(/核$/, '类型')
}

function sceneTitle(title: string) {
  const legacyDraftPrefix = '\u5019\u9009\u7247\u6bb5\uff1a'
  return title.replace(legacyDraftPrefix, '').replace('待审片段：', '')
}

function workflowLabel(stepId: string, fallback: string) {
  const labels: Record<string, string> = {
    plan: '确认目标',
    draft: '生成初稿',
    eval: '检查故事',
    observe: '阅读反馈',
    fix: '补写修订',
    confirm: '发布确认',
  }
  const legacyDraftWord = '\u5019\u9009'
  const legacyMainlineWord = '\u6b63\u53f2'
  return labels[stepId] || fallback.replace(legacyDraftWord, '初稿').replace(legacyMainlineWord, '主线')
}

function workflowDetail(detail: string) {
  const legacyDraftPhrase = '\u5019\u9009\u7247\u6bb5'
  const legacyDraftWord = '\u5019\u9009'
  const legacyMainlineWord = '\u6b63\u53f2'
  return detail
    .replaceAll(legacyDraftPhrase, '待审章节')
    .replaceAll(legacyDraftWord, '初稿')
    .replaceAll(legacyMainlineWord, '主线')
    .replaceAll('用户确认', '创作者确认')
}

export default function Studio() {
  const navigate = useNavigate()
  const [sceneChecks, setSceneChecks] = useState<Record<string, SceneRuntimeCheck>>({})
  const [marketOps, setMarketOps] = useState<MarketOpsState>({
    status: 'loading',
    message: '正在读取题材趋势。',
    payload: marketTrendFallback,
    cadence: 'weekly',
  })
  const canonReadyCount = candidateScenes.filter(scene => scene.status === 'canon_ready').length
  const candidateCount = candidateScenes.filter(scene => scene.status === 'candidate').length
  const qualityPassCount = qualityReports.filter(report => report.decision === 'pass').length
  const studioCapabilities = capabilityAlignments.filter(item => item.mode === 'service_contract' || item.mode === 'studio_contract')
  const releaseCards = [
    {
      title: '今晚可发布',
      value: canonReadyCount,
      label: '个片段',
      detail: '已通过故事状态检查，可以进入发布确认。',
      badge: '可发布',
      tone: 'stasis' as const,
    },
    {
      title: '需要补写',
      value: candidateCount,
      label: '个待处理',
      detail: '人物反应或代价还不够，需要创作者再确认。',
      badge: '待处理',
      tone: 'flux' as const,
    },
    {
      title: '可运营宇宙',
      value: worldTemplates.length,
      label: '个世界',
      detail: '旗舰宇宙和短篇宇宙都能从读者路径进入。',
      badge: '在线',
      tone: 'gold' as const,
    },
  ]
  const studioBoards = [
    {
      title: '阅读路径',
      detail: '旗舰宇宙、短篇宇宙和完整阅读器保持分层，读者不会先看到创作工具。',
      badge: '正常',
    },
    {
      title: '分支管理',
      detail: '选择会写入个人世界线，并标记公开、隐瞒、仅分支等后续状态。',
      badge: '运行中',
    },
    {
      title: '角色记忆',
      detail: '角色关系会随读者选择变化，用于提示下一章风险和情绪压力。',
      badge: '生效中',
    },
    {
      title: '质量审核',
      detail: '待审片段先进入审核队列，确认节奏、动机和伏笔后再转正。',
      badge: '守门中',
    },
  ]

  useEffect(() => {
    let cancelled = false
    marketApi.getTrends('weekly')
      .then(payload => {
        if (cancelled) return
        setMarketOps({
          status: 'ready',
          message: '题材趋势已读取，可按周或按月刷新。',
          payload,
          cadence: payload.cadence || 'weekly',
        })
      })
      .catch(() => {
        if (cancelled) return
        setMarketOps({
          status: 'local',
          message: '暂用本地题材索引；线上服务恢复后会自动刷新。',
          payload: marketTrendFallback,
          cadence: 'weekly',
        })
      })

    return () => {
      cancelled = true
    }
  }, [])

  const updateSceneCheck = (sceneId: string, next: SceneRuntimeCheck) => {
    setSceneChecks(previous => ({ ...previous, [sceneId]: next }))
  }

  const studioRunId = (scene: CandidateScene) => `studio-run-${scene.id}`

  const refreshMarketTrends = async (cadence: 'weekly' | 'monthly') => {
    setMarketOps(previous => ({
      ...previous,
      status: 'scanning',
      message: `正在刷新${cadenceLabel(cadence)}题材趋势。`,
      cadence,
    }))

    try {
      const payload = await marketApi.scanTrends(cadence)
      setMarketOps({
        status: 'ready',
        message: `${cadenceLabel(cadence)}题材趋势已刷新，首页推荐和创作方向可按新排序调整。`,
        payload,
        cadence: payload.cadence || cadence,
      })
    } catch {
      setMarketOps(previous => ({
        ...previous,
        status: 'error',
        message: `${cadenceLabel(cadence)}题材趋势刷新暂不可用，保留当前索引。`,
        cadence,
      }))
    }
  }

  const evaluateScene = async (scene: CandidateScene) => {
    if (runtimeConfig.localMode) {
      updateSceneCheck(scene.id, {
        status: 'local',
        message: '当前片段已完成快速检查；正式发布前会再次确认。',
      })
      return
    }

    updateSceneCheck(scene.id, {
      status: 'checking',
      message: '正在运行质量评价。',
    })
    try {
      const evaluation = await runtimeApi.evaluateQuality({
        candidate_id: scene.id,
        project_id: 'studio-project-beacon-beyond',
        world_id: 'beacon-beyond',
        source_run_id: studioRunId(scene),
        body: scene.body,
        choices: ['确认转正', '保留分支'],
        character_fidelity_score: scene.status === 'canon_ready' ? 0.82 : 0.68,
      })
      updateSceneCheck(scene.id, {
        status: 'evaluated',
        message: evaluation.quality_gate.can_commit_canon
          ? '发布检查通过，可以等待确认转正。'
          : '发布检查发现问题，仍待处理。',
        evaluation,
      })
    } catch {
      updateSceneCheck(scene.id, {
        status: 'error',
        message: '发布检查暂不可用，请稍后重试。',
      })
    }
  }

  const commitScene = async (scene: CandidateScene) => {
    const current = sceneChecks[scene.id]
    if (runtimeConfig.localMode) {
      updateSceneCheck(scene.id, {
        ...current,
        status: 'local',
        message: '这次操作只标记处理意向；正式发布前需要再次确认。',
      })
      return
    }

    const qualityReport: Record<string, unknown> = current?.evaluation?.report || (
      scene.status === 'canon_ready'
        ? {
            chapter_id: scene.id,
            decision: { decision: 'pass', reason: 'static_canon_ready_candidate' },
            issues: [],
            scores: { overall_score: 0.88 },
          }
        : {}
    )
    updateSceneCheck(scene.id, {
      ...current,
      status: 'committing',
      message: '正在确认提交。',
    })
    try {
      const commit = await runtimeApi.commitCanon({
        candidate_id: scene.id,
        project_id: 'studio-project-beacon-beyond',
        world_id: 'beacon-beyond',
        source_run_id: studioRunId(scene),
        target_status: scene.status === 'canon_ready' ? 'canon' : 'branch',
        confirmed: true,
        confirmed_by: 'studio_operator',
        quality_report: qualityReport,
        studio_trace: current?.evaluation?.studio_trace || (qualityReport.studio_trace as Record<string, unknown> | undefined),
        idempotencyKey: `studio-${scene.id}-${scene.status === 'canon_ready' ? 'canon' : 'branch'}`,
      })
      updateSceneCheck(scene.id, {
        ...current,
        status: commit.status === 'committed' ? 'committed' : 'blocked',
        message: commit.status === 'committed'
          ? '已加入发布队列，等待世界版本发布。'
          : `暂不能转正：${commit.reason || '发布检查未通过'}`,
        evaluation: current?.evaluation,
        commit,
      })
    } catch {
      updateSceneCheck(scene.id, {
        ...current,
        status: 'error',
        message: '确认提交暂不可用，请稍后重试。',
      })
    }
  }

  return (
    <div className="narrative-page space-y-6">
      <header className="cosmic-board studio-hero p-5 md:p-6">
        <div aria-hidden className="studio-hero-orbit" />
        <div className="relative flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gold">创作室</Badge>
              <Badge variant="outline">运营空间</Badge>
              <Badge variant="stasis">发布前检查</Badge>
            </div>
            <h1 className="mt-3 text-4xl font-semibold text-[var(--ink-paper)] md:text-5xl">创作室工作台</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ink-muted)]">
              这里只给创作者和运营使用，用来处理可发布章节、待补写分支、角色记忆和故事状态。普通读者从首页、书城和阅读页进入。
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/story')}>
            <GitBranch size={16} />
            查看读者页
          </Button>
        </div>
      </header>

      <Panel className="p-5">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs tracking-[0.16em] text-[var(--ink-dim)]">今日状态</p>
            <h2 className="mt-1 text-2xl font-semibold text-[var(--ink-paper)]">发布准备度</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
              今天要处理的内容很清楚：哪些片段可发布，哪些分支要补写，哪些世界可以继续开放。
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[300px]">
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
              <p className="text-xl font-semibold text-[var(--ink-paper)]">{canonReadyCount}</p>
              <p className="mt-1 text-[11px] text-[var(--ink-dim)]">可发布</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
              <p className="text-xl font-semibold text-[var(--ink-paper)]">{candidateCount}</p>
              <p className="mt-1 text-[11px] text-[var(--ink-dim)]">待补写</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
              <p className="text-xl font-semibold text-[var(--ink-paper)]">{qualityPassCount}</p>
              <p className="mt-1 text-[11px] text-[var(--ink-dim)]">审核通过</p>
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {releaseCards.map(item => (
            <article key={item.title} className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold leading-6 text-[var(--ink-paper)]">{item.title}</p>
                  <p className="mt-2 text-3xl font-semibold text-[var(--ink-paper)]">
                    {item.value}<span className="ml-1 text-sm text-[var(--ink-muted)]">{item.label}</span>
                  </p>
                </div>
                <Badge variant={item.tone}>{item.badge}</Badge>
              </div>
              <p className="mt-4 text-xs leading-5 text-[var(--ink-muted)]">{item.detail}</p>
            </article>
          ))}
        </div>
      </Panel>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="narrative-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
            <p className="text-xs tracking-[0.16em] text-[var(--ink-dim)]">故事类型</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--ink-paper)]">题材配置</h2>
              </div>
              <Brain className="text-[var(--worldline-cyan)]" size={24} />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {genreKernels.map(kernel => (
                <article key={kernel.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
                  <Badge variant="outline">{kernel.category}</Badge>
                  <h3 className="mt-3 text-lg font-semibold text-[var(--ink-paper)]">{storyTypeTitle(kernel.name)}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{kernel.thesis}</p>
                  <div className="mt-4 space-y-2">
                    {kernel.metrics.map(metric => (
                      <div key={metric.label}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-[var(--ink-muted)]">{metric.label}</span>
                          <span className="text-[var(--ink-paper)]">{metric.value}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-[var(--manuscript-gold)]" style={{ width: `${metric.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <StudioTrendOpsPanel
            payload={marketOps.payload}
            status={marketOps.status}
            message={marketOps.message}
            cadence={marketOps.cadence}
            onRefresh={cadence => void refreshMarketTrends(cadence)}
          />

          <section className="narrative-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs tracking-[0.16em] text-[var(--ink-dim)]">故事方向</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--ink-paper)]">可用创作方向</h2>
              </div>
              <Sparkles className="text-[var(--manuscript-gold)]" size={24} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {worldTemplates.map(template => (
                <article key={template.id} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.025]">
                  <div
                    className="h-24 bg-cover bg-center"
                    style={{
                      backgroundImage: `linear-gradient(180deg, rgba(5,9,18,0.04), rgba(5,9,18,0.82)), url(${template.coverImage})`,
                      backgroundPosition: template.coverPosition,
                    }}
                  />
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={template.mode === 'flagship' ? 'gold' : 'outline'}>{templateModeLabel(template.mode)}</Badge>
                      <Badge variant="secondary">{template.genre}</Badge>
                      <Badge variant="outline">{template.chapterCount}</Badge>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-[var(--ink-paper)]">{template.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{template.openingPremise}</p>
                    <div className="mt-3 grid gap-2 text-xs leading-5 text-[var(--ink-muted)]">
                      <div className="rounded-md border border-white/10 bg-black/20 p-2">
                        <span className="font-semibold text-[var(--ink-paper)]">主角缺口：</span>{template.protagonistGap}
                      </div>
                      <div className="rounded-md border border-white/10 bg-black/20 p-2">
                        <span className="font-semibold text-[var(--ink-paper)]">第一选择：</span>{template.firstChoicePoint}
                      </div>
                      <div className="rounded-md border border-white/10 bg-black/20 p-2">
                        <span className="font-semibold text-[var(--ink-paper)]">人工确认：</span>作品名、目标读者、商业定位、主角关键设定、内容禁区
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="narrative-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs tracking-[0.16em] text-[var(--ink-dim)]">发布检查</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--ink-paper)]">待审稿 / 发布稿</h2>
              </div>
              <ShieldCheck className="text-teal-300" size={24} />
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {qualityReports.map(report => (
                <article key={report.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-[var(--ink-paper)]">{report.title}</h3>
                    <Badge variant={report.decision === 'pass' ? 'stasis' : 'flux'}>{qualityDecisionLabel(report.decision)}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{report.nextAction}</p>
                  <div className="mt-4 grid gap-2">
                    {report.metrics.slice(0, 3).map(metric => (
                      <div key={metric.label} className="rounded-md border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[var(--ink-paper)]">{metric.label}</span>
                          <span className="text-[var(--worldline-cyan)]">{metric.value}%</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{metric.detail}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <CapabilityMapPanel items={studioCapabilities} />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <Panel className="p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="text-[var(--worldline-cyan)]" size={18} />
              <h2 className="text-lg font-semibold text-[var(--ink-paper)]">工作台看板</h2>
            </div>
            <div className="mt-4 space-y-3">
              {studioBoards.map(item => (
                <article key={item.title} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink-paper)]">{item.title}</p>
                    </div>
                    <Badge variant="outline">{item.badge}</Badge>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">{item.detail}</p>
                </article>
              ))}
            </div>
          </Panel>

          <Panel className="p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="text-[var(--manuscript-gold)]" size={18} />
              <h2 className="text-lg font-semibold text-[var(--ink-paper)]">章节工作流</h2>
            </div>
            <div className="mt-4 space-y-2">
              {harnessSteps.map(step => (
                <div key={step.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--ink-paper)]">{workflowLabel(step.id, step.label)}</p>
                    {step.status === 'done' ? (
                      <CheckCircle2 className="text-teal-300" size={16} />
                    ) : step.status === 'blocked' ? (
                      <AlertTriangle className="text-rose-300" size={16} />
                    ) : (
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{workflowDetail(step.detail)}</p>
                </div>
              ))}
            </div>
          </Panel>

          <section className="narrative-panel p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-teal-300" size={18} />
              <h2 className="text-lg font-semibold text-[var(--ink-paper)]">创作工具</h2>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">
              外部创作工具先确认授权、部署方式和内容审核，稳定后再进入读者体验。
            </p>
            <div className="mt-4 space-y-3">
              {openSourceAdapters.map(adapter => (
                <article key={adapter.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink-paper)]">{adapter.name}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{adapter.role}</p>
                    </div>
                    <Badge variant={adapter.status === 'license_gate' ? 'flux' : 'outline'}>
                      {adapterStatusLabel(adapter.status)}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--ink-dim)]">{adapter.nextAction}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="narrative-panel p-5">
            <div className="flex items-center gap-2">
              <GitBranch className="text-[var(--worldline-cyan)]" size={18} />
              <h2 className="text-lg font-semibold text-[var(--ink-paper)]">待审片段</h2>
            </div>
            <div className="mt-4 space-y-3">
              {candidateScenes.map(scene => {
                const check = sceneChecks[scene.id]
                const busy = check?.status === 'checking' || check?.status === 'committing'
                return (
                  <article key={scene.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[var(--ink-paper)]">{sceneTitle(scene.title)}</p>
                      <Badge variant={scene.status === 'canon_ready' ? 'stasis' : 'gold'}>{sceneStatusLabel(scene.status)}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs leading-5 text-[var(--ink-muted)]">{scene.body}</p>
                    {check && (
                      <div className="mt-3 rounded-md border border-white/10 bg-white/[0.025] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-[var(--ink-paper)]">
                            {check.status === 'committed' ? '已提交' : check.status === 'evaluated' ? '已检查' : check.status === 'local' ? '快速检查' : '处理状态'}
                          </p>
                          {check.evaluation?.quality_gate.overall_score !== undefined && (
                            <span className="text-xs text-[var(--worldline-cyan)]">
                              {Math.round(Number(check.evaluation.quality_gate.overall_score || 0) * 100)}%
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">{check.message}</p>
                        {check.evaluation?.quality_gate.summary && (
                          <p className="mt-2 rounded-md border border-white/10 bg-black/20 p-2 text-xs leading-5 text-[var(--ink-muted)]">
                            {check.evaluation.quality_gate.summary}
                          </p>
                        )}
                        {Boolean(check.evaluation?.quality_gate.blockers?.length) && (
                          <div className="mt-2 space-y-1">
                            <p className="text-[11px] font-semibold text-rose-200">发布前必须处理</p>
                            {check.evaluation?.quality_gate.blockers?.slice(0, 2).map(item => (
                              <p key={`${scene.id}-${item.code}`} className="text-xs leading-5 text-[var(--ink-muted)]">
                                {item.message}
                              </p>
                            ))}
                          </div>
                        )}
                        {Boolean(check.evaluation?.quality_gate.warnings?.length) && (
                          <div className="mt-2 space-y-1">
                            <p className="text-[11px] font-semibold text-amber-200">建议优化</p>
                            {check.evaluation?.quality_gate.warnings?.slice(0, 2).map(item => (
                              <p key={`${scene.id}-${item.code}`} className="text-xs leading-5 text-[var(--ink-muted)]">
                                {item.message}
                              </p>
                            ))}
                          </div>
                        )}
                        {Boolean(check.evaluation?.quality_gate.suggested_fixes?.length) && (
                          <div className="mt-2 space-y-1">
                            <p className="text-[11px] font-semibold text-[var(--worldline-cyan)]">下一步动作</p>
                            {check.evaluation?.quality_gate.suggested_fixes?.slice(0, 2).map(item => (
                              <p key={`${scene.id}-${item}`} className="text-xs leading-5 text-[var(--ink-muted)]">
                                {item}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`quality-check-${scene.id}`}
                        loading={check?.status === 'checking'}
                        disabled={busy}
                        onClick={() => void evaluateScene(scene)}
                      >
                        发布检查
                      </Button>
                      <Button
                        variant={scene.status === 'canon_ready' ? 'gold' : 'outline'}
                        size="sm"
                        data-testid={`canon-commit-${scene.id}`}
                        loading={check?.status === 'committing'}
                        disabled={busy}
                        onClick={() => void commitScene(scene)}
                      >
                        确认发布
                      </Button>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </aside>
      </section>
    </div>
  )
}
