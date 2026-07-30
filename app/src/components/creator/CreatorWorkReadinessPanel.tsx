import { ArrowRight, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CreatorStatePanel } from './CreatorStatePanel'
import type { PmfBranch, PmfChapter, PmfReaderRequest, PmfWork } from '@/features/pmf/types'

export interface CreatorWorkReadinessPanelProps {
  phase: 'loading' | 'ready' | 'error'
  works: PmfWork[]
  branches: PmfBranch[]
  chapters: PmfChapter[]
  requests: PmfReaderRequest[]
  onOpenWorks: () => void
}

export function CreatorWorkReadinessPanel({
  phase,
  works,
  branches,
  chapters,
  requests,
  onOpenWorks,
}: CreatorWorkReadinessPanelProps) {
  const openRequests = requests.filter(request => request.status !== 'published' && request.status !== 'rejected')
  const publishedChapters = chapters.filter(chapter => chapter.status === 'published')
  const activeBranches = branches.filter(branch => branch.status !== 'archived')
  const recentWorks = works.slice(0, 3)
  const readinessMetrics = [
    { label: '作品', value: works.length, detail: '当前可管理' },
    { label: '故事线', value: activeBranches.length, detail: '主线与 IF 支线' },
    { label: '已公开章节', value: publishedChapters.length, detail: '读者现在可见' },
    { label: '待回应回声', value: openRequests.length, detail: '可转为创作提醒' },
  ]

  if (phase === 'loading') {
    return (
      <section data-slot="creator-work-readiness-panel" aria-label="作品准备状态">
        <CreatorStatePanel
          kind="loading"
          title="正在读取作品准备状态"
          description="读取完成后，会显示作品、支线、章节和待处理回声。"
        />
      </section>
    )
  }

  if (phase === 'error') {
    return (
      <section data-slot="creator-work-readiness-panel" aria-label="作品准备状态">
        <CreatorStatePanel
          kind="error"
          title="作品准备状态暂时不可用"
          description="你的创作内容没有变化，可以稍后从作品与支线重新进入。"
          actionLabel="查看作品与支线"
          onAction={onOpenWorks}
        />
      </section>
    )
  }

  if (!works.length) {
    return (
      <section data-slot="creator-work-readiness-panel" aria-label="作品准备状态">
        <CreatorStatePanel
          kind="empty"
          title="还没有读取到可管理作品"
          description="有作品后，会显示主线、IF 支线、章节和作者公告。"
          actionLabel="查看作品与支线"
          onAction={onOpenWorks}
        />
      </section>
    )
  }

  return (
    <Card
      variant="glass"
      padding="none"
      data-slot="creator-work-readiness-panel"
      className="pu-motion-reveal overflow-hidden"
      aria-label="作品准备状态"
    >
      <CardHeader data-slot="creator-work-readiness-header" className="p-5 pb-4 md:p-6 md:pb-5">
        <div className="flex items-start justify-between gap-4 max-[720px]:flex-col">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--creator-border)] bg-[var(--creator-accent-soft)] text-[var(--creator-accent)]">
                <BookOpen size={17} aria-hidden="true" />
              </span>
              <CardTitle className="text-lg text-[var(--creator-text)]">作品准备状态</CardTitle>
            </div>
            <CardDescription className="mt-3 max-w-2xl leading-6 text-[var(--creator-text-muted)]">
              按当前作品、故事线、公开章节与外界回声，确认可以从哪里继续。
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={onOpenWorks}
            data-slot="creator-work-readiness-action"
            className="min-h-10 shrink-0"
          >
            <span>查看作品与支线</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 border-t border-[var(--creator-border)] p-5 md:p-6">
        <section data-slot="creator-work-readiness-metrics" aria-label="作品准备概览">
          <p className="mb-2 text-xs font-semibold text-[var(--creator-text-dim)]">准备概览</p>
          <dl className="grid overflow-hidden rounded-lg border border-[var(--creator-border)] grid-cols-2 xl:grid-cols-4">
            {readinessMetrics.map(metric => (
              <div
                key={metric.label}
                data-slot="creator-work-readiness-metric"
                className="grid min-w-0 gap-1 border-l border-t border-[var(--creator-border)] bg-[var(--creator-surface)] p-3 first:border-l-0 first:border-t-0 [&:nth-child(2)]:border-t-0 [&:nth-child(odd)]:border-l-0 xl:border-t-0 xl:[&:nth-child(3)]:border-l xl:[&:nth-child(odd)]:border-l"
              >
                <dt className="text-xs font-semibold text-[var(--creator-text-dim)]">{metric.label}</dt>
                <dd className="text-xl font-semibold leading-7 text-[var(--creator-text)]">{metric.value}</dd>
                <dd className="truncate text-xs leading-5 text-[var(--creator-text-muted)]">{metric.detail}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section data-slot="creator-work-readiness-list" aria-labelledby="creator-recent-works-title">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p id="creator-recent-works-title" className="text-xs font-semibold text-[var(--creator-text-dim)]">
              最近作品
            </p>
            <Badge variant="outline">{recentWorks.length} 部</Badge>
          </div>
          <ul className="overflow-hidden rounded-lg border border-[var(--creator-border)] bg-[var(--creator-surface)]">
            {recentWorks.map(work => {
              const workBranches = branches.filter(branch => branch.work_id === work.id && branch.status !== 'archived')
              const workChapters = publishedChapters.filter(chapter => chapter.work_id === work.id)
              const workRequests = openRequests.filter(request => request.work_id === work.id)
              return (
                <li
                  key={work.id}
                  data-slot="creator-work-readiness-item"
                  className="grid min-w-0 gap-3 border-t border-[var(--creator-border)] p-3 first:border-t-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={work.status === 'published' ? 'gold' : 'outline'}>
                        {work.status === 'published' ? '已公开' : work.status === 'hidden' ? '已隐藏' : '未公开'}
                      </Badge>
                      <Badge variant="outline">{workRequests.length} 条回声</Badge>
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold leading-5 text-[var(--creator-text)]">{work.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--creator-text-muted)]">
                      {work.summary || '等待补充作品说明。'}
                    </p>
                  </div>
                  <dl className="grid grid-cols-2 gap-4 sm:min-w-32 sm:justify-self-end">
                    <div>
                      <dt className="text-xs text-[var(--creator-text-dim)]">故事线</dt>
                      <dd className="mt-1 text-sm font-semibold text-[var(--creator-text)]">{workBranches.length}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--creator-text-dim)]">章节</dt>
                      <dd className="mt-1 text-sm font-semibold text-[var(--creator-text)]">{workChapters.length}</dd>
                    </div>
                  </dl>
                </li>
              )
            })}
          </ul>
        </section>
      </CardContent>
    </Card>
  )
}
