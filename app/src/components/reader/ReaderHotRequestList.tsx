import { Bell, CheckCircle2, GitBranch, ThumbsUp } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requestStatusLabel, requestTypeLabel } from '@/lib/pmfSupabaseReader'
import type { PmfReaderRequest } from '@/features/pmf/types'

interface ReaderHotRequestListProps {
  requests: PmfReaderRequest[]
  emptyTitle?: string
  emptyDescription?: string
  onVote: (id: string) => void
}

export function ReaderHotRequestList({
  requests,
  emptyTitle = '暂无请求',
  emptyDescription = '提交后这里会显示聚合状态。',
  onVote,
}: ReaderHotRequestListProps) {
  return (
    <Card variant="glass" padding="sm" className="reader-hot-request-list pu-motion-lift">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <GitBranch size={16} className="text-[var(--manuscript-gold)]" />
          <CardTitle className="text-sm">热门请求</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="reader-hot-request-stack" aria-label="正在升温的读者请求">
          {requests.length ? requests.map(item => (
            <article key={item.id} className="reader-hot-request-row pu-motion-lift">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={item.status === 'published' ? 'stasis' : 'outline'}>
                  {requestStatusLabel(item.status)}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => onVote(item.id)} aria-label={`为${requestTypeLabel(item.request_type)}加热`}>
                  <ThumbsUp size={13} />
                  {item.vote_count}
                </Button>
              </div>
              <p className="mt-2 text-xs font-semibold text-[var(--ink-paper)]">{requestTypeLabel(item.request_type)}</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--ink-muted)]">{item.request_text}</p>
              {item.status === 'published' && (
                <p className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--manuscript-gold)]">
                  <CheckCircle2 size={13} />
                  已发布
                </p>
              )}
            </article>
          )) : (
            <Alert className="border-dashed border-white/10 bg-transparent text-[var(--ink-dim)]">
              <Bell className="h-4 w-4" />
              <AlertTitle>{emptyTitle}</AlertTitle>
              <AlertDescription>{emptyDescription}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
