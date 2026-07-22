import { BookOpen, Compass, Cpu, GitBranch, Radio } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface CreatorTodayContextWork {
  summary: string
  title: string
  updatedLabel: string
}

export interface CreatorTodayContextBranch {
  isMain: boolean
  title: string
  typeLabel: string
  updatedLabel: string
}

export interface CreatorTodayContextRailProps {
  branch: CreatorTodayContextBranch | null
  clientStatus: string
  phase: 'loading' | 'ready' | 'error'
  work: CreatorTodayContextWork | null
}

export function CreatorTodayContextRail({
  branch,
  clientStatus,
  phase,
  work,
}: CreatorTodayContextRailProps) {
  const phaseLabel = phase === 'loading' ? '读取中' : phase === 'error' ? '需要重试' : '已就绪'
  const phaseVariant = phase === 'ready' ? 'signal' : phase === 'error' ? 'destructive' : 'outline'

  return (
    <Card
      variant="glass"
      padding="none"
      data-slot="creator-today-context-rail"
      className="pu-motion-reveal overflow-hidden"
      aria-label="当前创作上下文"
      aria-busy={phase === 'loading'}
    >
      <CardHeader data-slot="creator-today-context-header" className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--creator-border)] bg-[var(--creator-accent-soft)] text-[var(--creator-accent)]">
                <Compass size={17} aria-hidden="true" />
              </span>
              <CardTitle className="text-lg text-[var(--creator-text)]">当前创作上下文</CardTitle>
            </div>
            <CardDescription className="mt-3 leading-6 text-[var(--creator-text-muted)]">
              当前状态、作品、故事线与私密写作边界。
            </CardDescription>
          </div>
          <Badge data-slot="creator-today-context-phase" variant={phaseVariant} className="shrink-0">
            {phaseLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="border-t border-[var(--creator-border)] p-4">
        <dl
          data-slot="creator-today-context-list"
          className="grid gap-px overflow-hidden rounded-lg border border-[var(--creator-border)] bg-[var(--creator-border)] md:grid-cols-2 xl:grid-cols-1"
        >
          <div data-slot="creator-today-context-item" className="min-w-0 bg-[var(--creator-surface)] p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold text-[var(--creator-text-dim)]">
              <Radio size={15} className="text-[var(--creator-confirm)]" aria-hidden="true" />
              工作状态
            </dt>
            <dd className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]" aria-live="polite">
              {phase === 'loading' ? '正在读取当前工作状态。' : clientStatus}
            </dd>
          </div>

          <div data-slot="creator-today-context-item" className="min-w-0 bg-[var(--creator-surface)] p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold text-[var(--creator-text-dim)]">
              <BookOpen size={15} className="text-[var(--creator-accent)]" aria-hidden="true" />
              最近作品
            </dt>
            <dd className="mt-2 min-w-0">
              {phase === 'loading' ? (
                <p className="text-sm leading-6 text-[var(--creator-text-muted)]">正在读取作品。</p>
              ) : phase === 'error' ? (
                <p className="text-sm leading-6 text-[var(--creator-text-muted)]">作品信息暂时不可用。</p>
              ) : work ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--creator-text)]">{work.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--creator-text-muted)]">{work.summary}</p>
                  <p className="mt-2 text-xs text-[var(--creator-text-dim)]">最近更新：{work.updatedLabel}</p>
                </div>
              ) : (
                <p className="text-sm leading-6 text-[var(--creator-text-muted)]">暂无可管理作品。</p>
              )}
            </dd>
          </div>

          <div data-slot="creator-today-context-item" className="min-w-0 bg-[var(--creator-surface)] p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold text-[var(--creator-text-dim)]">
              <GitBranch size={15} className="text-[var(--creator-confirm)]" aria-hidden="true" />
              最近支线
            </dt>
            <dd className="mt-2 min-w-0">
              {phase === 'loading' ? (
                <p className="text-sm leading-6 text-[var(--creator-text-muted)]">正在读取故事线。</p>
              ) : phase === 'error' ? (
                <p className="text-sm leading-6 text-[var(--creator-text-muted)]">故事线信息暂时不可用。</p>
              ) : branch ? (
                <div className="min-w-0">
                  <Badge variant={branch.isMain ? 'gold' : 'outline'}>{branch.typeLabel}</Badge>
                  <p className="mt-2 truncate text-sm font-semibold text-[var(--creator-text)]">{branch.title}</p>
                  <p className="mt-2 text-xs text-[var(--creator-text-dim)]">最近更新：{branch.updatedLabel}</p>
                </div>
              ) : (
                <p className="text-sm leading-6 text-[var(--creator-text-muted)]">暂无支线记录。</p>
              )}
            </dd>
          </div>

          <div data-slot="creator-today-context-item" className="min-w-0 bg-[var(--creator-surface)] p-4">
            <dt className="flex items-center gap-2 text-xs font-semibold text-[var(--creator-text-dim)]">
              <Cpu size={15} className="text-[var(--creator-accent)]" aria-hidden="true" />
              写作方式
            </dt>
            <dd className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]">
              你可以手写正文，也可以使用自己的写作工具起稿；确认发布前，读者不会看到未完成内容。
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
