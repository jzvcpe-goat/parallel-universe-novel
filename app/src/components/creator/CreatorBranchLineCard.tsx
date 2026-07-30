import { Archive, Edit3 } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmActionDialog } from '@/components/creator/ConfirmActionDialog'
import { cn } from '@/lib/utils'
import type { PmfBranch, PmfChapter } from '@/features/pmf/types'

export interface CreatorBranchLineCardProps {
  branch: PmfBranch
  selected?: boolean
  typeLabel: string
  statusLabel: string
  statusVariant?: BadgeProps['variant']
  requestCount: number
  chapters: PmfChapter[]
  parentChapterLabel: string
  updatedAtLabel: string
  archiveDisabled?: boolean
  archiving?: boolean
  onSelect: () => void
  onStartWriting: () => void
  onArchive: () => void | Promise<void>
}

export function CreatorBranchLineCard({
  branch,
  selected,
  typeLabel,
  statusLabel,
  statusVariant,
  requestCount,
  chapters,
  parentChapterLabel,
  updatedAtLabel,
  archiveDisabled,
  archiving,
  onSelect,
  onStartWriting,
  onArchive,
}: CreatorBranchLineCardProps) {
  const isMain = branch.branch_type === 'main'

  return (
    <Card
      variant="glass"
      padding="sm"
      role="listitem"
      aria-current={selected ? 'true' : undefined}
      data-slot="creator-branch-line-card"
      data-line-kind={isMain ? 'main' : 'if'}
      className={cn(
        'pu-motion-lift relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[""]',
        isMain ? 'before:bg-[var(--creator-confirm)]' : 'before:bg-[var(--creator-accent)]',
        selected && 'ring-1 ring-[var(--creator-accent)]',
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isMain ? 'gold' : 'outline'}>{typeLabel}</Badge>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
            <Badge variant="outline">{requestCount} 条请求</Badge>
          </div>
          <Button
            type="button"
            className="shrink-0"
            variant={selected ? 'gold' : 'outline'}
            size="sm"
            aria-pressed={selected}
            onClick={onSelect}
          >
            {selected ? '正在看' : '查看'}
          </Button>
        </div>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div className="min-w-0">
            <CardTitle className="line-clamp-2 text-lg text-[var(--creator-text)]">{branch.title}</CardTitle>
            <CardDescription className="text-[var(--creator-text-muted)]">
              {branch.summary || '暂无支线说明。'}
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onStartWriting}>
            <Edit3 size={14} />
            开始写
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-2" aria-label="章节预览">
            {chapters.length ? chapters.map(chapter => (
              <div key={chapter.id} className="rounded-lg border border-[var(--creator-border)] bg-[var(--creator-surface)] px-3 py-2">
                <p className="text-sm font-semibold text-[var(--creator-text)]">第 {chapter.chapter_no} 章 · {chapter.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--creator-text-muted)]">{chapter.content}</p>
              </div>
            )) : (
              <p className="rounded-lg border border-[var(--creator-border)] bg-[var(--creator-surface)] px-3 py-2 text-sm text-[var(--creator-text-muted)]">
                这条线还没有章节。
              </p>
            )}
          </div>
          <div className="space-y-3 text-sm leading-6 text-[var(--creator-text-muted)]">
            <p>支线挂点：{parentChapterLabel}</p>
            <p>最近更新：{updatedAtLabel}</p>
            <ConfirmActionDialog
              title="确认归档支线"
              description="归档后，这条支线会从主要工作列表中降权。已发布章节不会被删除。"
              actionLabel="确认归档"
              pendingLabel="归档中..."
              variant="destructive"
              disabled={archiveDisabled}
              onConfirm={onArchive}
            >
              <Button variant="void" size="sm" disabled={archiveDisabled}>
                <Archive size={14} />
                {archiving ? '归档中...' : '归档支线'}
              </Button>
            </ConfirmActionDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
