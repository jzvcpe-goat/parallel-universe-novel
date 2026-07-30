import type * as React from 'react'
import { BookOpen, ChevronLeft, GitBranch } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { WorldBranch, WorldChapter, WorldTemplate } from '@/features/parallel-universe/types'

interface ReaderStoryIndexPanelProps {
  template: WorldTemplate
  chapter: WorldChapter
  branches: WorldBranch[]
  activeBranchId: string
  onBack: () => void
  onSelectBranch: (branch: WorldBranch) => void
}

const branchPositions = [
  'left-1/2 top-2 -translate-x-1/2',
  'left-[10%] top-[98px]',
  'left-[43%] top-[158px]',
  'right-[10%] top-[98px]',
  'left-1/2 bottom-0 -translate-x-1/2',
]

function ReaderStoryBranchMap({
  branches,
  activeBranchId,
  onSelectBranch,
}: Pick<ReaderStoryIndexPanelProps, 'branches' | 'activeBranchId' | 'onSelectBranch'>) {
  return (
    <div className="reader-story-branch-map">
      <div className="reader-story-branch-map-axis reader-story-branch-map-axis-vertical" />
      <div className="reader-story-branch-map-axis reader-story-branch-map-axis-horizontal" />
      {branches.slice(0, 5).map((branch, index) => {
        const isActive = branch.id === activeBranchId
        return (
          <button
            key={branch.id}
            type="button"
            className={`reader-story-branch-map-node ${branchPositions[index] || branchPositions[0]}`}
            onClick={() => onSelectBranch(branch)}
          >
            <span className={`worldline-node ${isActive ? 'worldline-node-active' : ''}`}>
              {index === 0 ? 'Ω' : `Ω-${index}`}
            </span>
            <span className="reader-story-branch-map-name">{branch.name}</span>
          </button>
        )
      })}
    </div>
  )
}

export function ReaderStoryIndexPanel({
  template,
  chapter,
  branches,
  activeBranchId,
  onBack,
  onSelectBranch,
}: ReaderStoryIndexPanelProps) {
  const branchList = branches.length ? branches : []
  const coverStyle = {
    '--reader-story-cover-image': `url(${template.coverImage})`,
    '--reader-story-cover-position': template.coverPosition,
  } as React.CSSProperties

  return (
    <aside className="reader-story-index-panel space-y-4">
      <Card variant="glass" padding="md" className="reader-story-index-card pu-motion-lift">
        <CardHeader className="pb-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="w-fit px-0">
            <ChevronLeft className="h-4 w-4" />
            返回首页
          </Button>
        </CardHeader>
        <CardContent>
          <div className="reader-story-cover reader-story-cover-flagship" style={coverStyle}>
            <div className="reader-story-cover-content">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.16em] text-white/70">正在阅读</p>
                <p className="mt-1 text-sm font-semibold text-white">{template.title}</p>
              </div>
              <span className="reader-story-cover-count">{template.chapterCount}</span>
            </div>
          </div>
          <Badge variant={template.mode === 'flagship' ? 'gold' : 'outline'}>{template.subtitle}</Badge>
          <CardTitle className="mt-3 text-2xl leading-tight text-[var(--ink-paper)]">{template.title}</CardTitle>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{template.tagline}</p>
        </CardContent>
      </Card>

      <Card variant="glass" padding="md" className="reader-story-index-card pu-motion-lift">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--manuscript-gold)]" />
            <CardTitle className="text-lg text-[var(--ink-paper)]">章节阅读</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="reader-story-chapter-card">
            <p className="text-sm font-semibold text-[var(--ink-paper)]">{chapter.title}</p>
            <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">{chapter.kicker}</p>
          </div>
        </CardContent>
      </Card>

      <Card variant="glass" padding="md" className="reader-story-index-card pu-motion-lift">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-[var(--worldline-cyan)]" />
            <CardTitle className="text-lg text-[var(--ink-paper)]">分支地图</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ReaderStoryBranchMap
            branches={branchList}
            activeBranchId={activeBranchId}
            onSelectBranch={onSelectBranch}
          />
        </CardContent>
      </Card>
    </aside>
  )
}
