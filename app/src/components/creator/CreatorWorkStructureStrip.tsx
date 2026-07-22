import { Badge } from '@/components/ui/badge'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PmfBranch, PmfChapter, PmfReaderRequest } from '@/features/pmf/types'

export interface CreatorWorkStructureStripProps {
  branches: PmfBranch[]
  chapters: PmfChapter[]
  requests: PmfReaderRequest[]
}

export function CreatorWorkStructureStrip({
  branches,
  chapters,
  requests,
}: CreatorWorkStructureStripProps) {
  const mainCount = branches.filter(branch => branch.branch_type === 'main').length
  const ifCount = branches.filter(branch => branch.branch_type === 'if').length
  const archivedCount = branches.filter(branch => branch.status === 'archived').length
  const openRequestCount = requests.filter(request => request.status !== 'published' && request.status !== 'rejected').length
  const emptyLineCount = branches.filter(branch => !chapters.some(chapter => chapter.branch_id === branch.id)).length
  const publishedChapterCount = chapters.filter(chapter => chapter.status === 'published').length
  const rows = [
    {
      label: '作品结构',
      value: `${mainCount} 主线 / ${ifCount} IF`,
      detail: archivedCount ? `${archivedCount} 条已归档。` : '主线和 IF 支线分开处理。',
    },
    {
      label: '公开章节',
      value: `${publishedChapterCount} 章`,
      detail: '读者端可见的正文内容。',
    },
    {
      label: '请求压力',
      value: `${openRequestCount} 条`,
      detail: '未结束请求会影响今日优先级。',
    },
    {
      label: '待补线索',
      value: `${emptyLineCount} 条`,
      detail: emptyLineCount ? '没有章节的线适合先补开场。' : '每条线都有章节承接。',
    },
  ]

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {rows.map(row => (
        <Card key={row.label} variant="glass" padding="sm" className="pu-motion-lift">
          <CardHeader className="p-0">
            <Badge variant="outline">{row.label}</Badge>
            <CardTitle className="mt-3 text-base text-[var(--creator-text)]">{row.value}</CardTitle>
            <CardDescription className="text-[var(--creator-text-muted)]">{row.detail}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
