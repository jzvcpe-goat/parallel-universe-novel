import { Edit3, HeartPulse, Radio } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmActionDialog } from './ConfirmActionDialog'
import { CreatorActionBar } from './CreatorActionBar'
import { CreatorStatePanel } from './CreatorStatePanel'

export interface CreatorEchoWritingRailRequest {
  statusLabel: string
  statusVariant?: BadgeProps['variant']
  typeLabel: string
  clusterCount: number
  intentLabel: string
  requestText: string
  writingQuestion: string
  authorDecision: string
  workTitle: string
  branchTitle: string
  voteLabel: string
}

export interface CreatorEchoWritingRailProps {
  request: CreatorEchoWritingRailRequest | null
  busy?: boolean
  acknowledgePending?: boolean
  startPending?: boolean
  clusterPending?: boolean
  rejectPending?: boolean
  canAcknowledge?: boolean
  canStart?: boolean
  canCluster?: boolean
  canReject?: boolean
  onAcknowledge: () => void
  onStart: () => void
  onCluster: () => void
  onOpenReader: () => void
  onReject: () => Promise<void> | void
}

export function CreatorEchoWritingRail({
  request,
  busy,
  acknowledgePending,
  startPending,
  clusterPending,
  rejectPending,
  canAcknowledge,
  canStart,
  canCluster,
  canReject,
  onAcknowledge,
  onStart,
  onCluster,
  onOpenReader,
  onReject,
}: CreatorEchoWritingRailProps) {
  return (
    <>
      <Card variant="glass" padding="sm" className="creator-echo-writing-rail">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HeartPulse size={18} className="text-[var(--creator-accent)]" />
            <CardTitle className="text-base text-[var(--creator-text)]">写作入口</CardTitle>
          </div>
          <CardDescription className="text-[var(--creator-text-muted)]">
            把选中的读者愿望变成一次可写的正文动作。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {request ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={request.statusVariant}>{request.statusLabel}</Badge>
                <Badge variant="outline">{request.typeLabel}</Badge>
                {request.clusterCount > 1 ? <Badge variant="gold">同类 {request.clusterCount}</Badge> : null}
              </div>
              <div className="creator-echo-entry-card">
                <span>读者愿望</span>
                <strong>{request.intentLabel}</strong>
                <p>“{request.requestText}”</p>
              </div>
              <div className="creator-echo-entry-card accent">
                <span>作者一问</span>
                <strong>{request.writingQuestion}</strong>
                <p>{request.authorDecision}</p>
              </div>
              <div className="creator-echo-entry-meta">
                <span>
                  <small>作品</small>
                  <b>{request.workTitle}</b>
                </span>
                <span>
                  <small>发布线</small>
                  <b>{request.branchTitle}</b>
                </span>
                <span>
                  <small>热度</small>
                  <b>{request.voteLabel}</b>
                </span>
                <span>
                  <small>同类</small>
                  <b>{request.clusterCount} 条</b>
                </span>
              </div>
              <CreatorActionBar>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy || !canAcknowledge}
                  onClick={onAcknowledge}
                >
                  {acknowledgePending ? '更新中...' : '稍后'}
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  disabled={busy || !canStart}
                  onClick={onStart}
                >
                  <Edit3 size={14} />
                  {startPending ? '打开中...' : '开始写'}
                </Button>
                <ConfirmActionDialog
                  title="只看同类回声"
                  description="这只会切换当前页面视图，不会改变任何反馈记录。"
                  actionLabel="只看同类"
                  pendingLabel="筛选中..."
                  disabled={busy || !canCluster}
                  onConfirm={onCluster}
                >
                  <Button variant="outline" size="sm" disabled={busy || !canCluster}>
                    {clusterPending ? '筛选中...' : '查看同类'}
                  </Button>
                </ConfirmActionDialog>
                <Button variant="outline" size="sm" onClick={onOpenReader}>
                  查看读者视角
                </Button>
                <ConfirmActionDialog
                  title="确认暂不处理"
                  description="该请求会标记为暂不处理。之后如需恢复，需要重新打开并说明原因。"
                  actionLabel="暂不处理"
                  pendingLabel="更新中..."
                  variant="destructive"
                  disabled={busy || !canReject}
                  onConfirm={onReject}
                >
                  <Button variant="void" size="sm" disabled={busy || !canReject}>
                    {rejectPending ? '更新中...' : '不处理'}
                  </Button>
                </ConfirmActionDialog>
              </CreatorActionBar>
            </div>
          ) : (
            <CreatorStatePanel kind="empty" title="请选择回声" description="选中外界回声后，会在这里显示写作入口。" />
          )}
        </CardContent>
      </Card>

      <Card variant="glass" padding="sm" className="creator-echo-processing-order">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Radio size={18} className="text-[var(--creator-confirm)]" />
            <CardTitle className="text-base text-[var(--creator-text)]">处理顺序</CardTitle>
          </div>
          <CardDescription className="text-[var(--creator-text-muted)]">
            回声只能从已收到进入已看到，再进入处理中；已发布和暂不处理不会直接回到处理中。
          </CardDescription>
        </CardHeader>
      </Card>
    </>
  )
}
