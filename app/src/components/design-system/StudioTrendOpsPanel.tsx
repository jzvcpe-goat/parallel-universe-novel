import { BarChart3, RefreshCw } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/design-system/Panel'
import { cn } from '@/lib/utils'
import type { MarketTrendPayload } from '@/features/market/trends'

export type TrendOpsStatus = 'loading' | 'ready' | 'scanning' | 'local' | 'error'

interface StudioTrendOpsPanelProps {
  payload: MarketTrendPayload
  status: TrendOpsStatus
  message: string
  cadence: 'weekly' | 'monthly'
  onRefresh: (cadence: 'weekly' | 'monthly') => void
  className?: string
}

function cadenceLabel(cadence: 'weekly' | 'monthly') {
  return cadence === 'weekly' ? '本周' : '本月'
}

function statusLabel(status: TrendOpsStatus) {
  if (status === 'scanning') return '刷新中'
  if (status === 'ready') return '已同步'
  if (status === 'local') return '本地索引'
  if (status === 'error') return '待重试'
  return '读取中'
}

function statusVariant(status: TrendOpsStatus): NonNullable<BadgeProps['variant']> {
  if (status === 'ready') return 'stasis'
  if (status === 'scanning') return 'gold'
  if (status === 'error') return 'flux'
  return 'outline'
}

export function StudioTrendOpsPanel({
  payload,
  status,
  message,
  cadence,
  onRefresh,
  className,
}: StudioTrendOpsPanelProps) {
  const trends = payload.trends.slice(0, 6)
  const sourceHealth = payload.ops?.source_health || payload.source_adapters?.map(adapter => ({
    id: adapter.id,
    status: adapter.status,
    message: adapter.handoff || '等待下一次刷新。',
    items: 0,
    scanned_at: payload.generated_at,
  })) || []
  const audit = payload.ops?.audit
  const weightChanges = payload.ops?.weight_changes?.slice(0, 6) || []

  return (
    <Panel className={cn('p-5', className)}>
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs tracking-[0.16em] text-[var(--ink-dim)]">运营刷新</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--ink-paper)]">题材趋势与模板排序</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
            这里处理公开页背后的题材趋势刷新。刷新结果只影响推荐排序和创作方向，读者不会看到扫描细节。
          </p>
        </div>
        <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {trends.map(trend => (
          <article key={trend.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-[var(--ink-dim)]">#{trend.rank} · {trend.category}</p>
                <h3 className="mt-2 text-base font-semibold text-[var(--ink-paper)]">{trend.label}</h3>
              </div>
              <Badge variant="gold">{trend.heat}</Badge>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">{trend.sample}</p>
            <p className="mt-3 text-xs leading-5 text-[var(--worldline-cyan)]">{trend.template_title} · {trend.hooks}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-sm font-semibold text-[var(--ink-paper)]">{message}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
              当前周期：{cadenceLabel(cadence)} · 下一次刷新：{payload.next_refresh}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              data-testid="market-scan-weekly"
              loading={status === 'scanning' && cadence === 'weekly'}
              disabled={status === 'scanning'}
              onClick={() => onRefresh('weekly')}
            >
              <RefreshCw size={14} />
              刷新本周
            </Button>
            <Button
              size="sm"
              variant="outline"
              data-testid="market-scan-monthly"
              loading={status === 'scanning' && cadence === 'monthly'}
              disabled={status === 'scanning'}
              onClick={() => onRefresh('monthly')}
            >
              <RefreshCw size={14} />
              刷新本月
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-[var(--worldline-cyan)]" size={18} />
            <p className="text-sm font-semibold text-[var(--ink-paper)]">题材扫描合同</p>
          </div>
          <p className="mt-2 break-words text-xs leading-5 text-[var(--ink-muted)]">
            {payload.function_call.name} · {payload.function_call.description}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold text-[var(--ink-paper)]">调度入口</p>
          <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
            weekly {payload.scan_schedule.weekly.cron}
            <br />
            monthly {payload.scan_schedule.monthly.cron}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
          <p className="text-xs font-semibold text-[var(--ink-paper)]">来源健康</p>
          <div className="mt-3 space-y-2">
            {sourceHealth.map(source => (
              <div key={source.id} className="rounded-md border border-white/10 bg-black/15 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-[var(--ink-muted)]">{source.id}</span>
                  <Badge variant={source.status === 'error' ? 'flux' : source.status === 'fallback' ? 'outline' : 'stasis'}>
                    {source.status === 'fallback' ? 'seed' : source.status}
                  </Badge>
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--ink-dim)]">{source.items} 条 · {source.scanned_at}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
          <p className="text-xs font-semibold text-[var(--ink-paper)]">扫描审计</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-md border border-white/10 bg-black/15 p-3">
              <p className="text-lg font-semibold text-[var(--ink-paper)]">{audit?.sources_succeeded ?? 0}</p>
              <p className="text-xs text-[var(--ink-dim)]">成功来源</p>
            </div>
            <div className="rounded-md border border-white/10 bg-black/15 p-3">
              <p className="text-lg font-semibold text-[var(--ink-paper)]">{audit?.sources_failed ?? 0}</p>
              <p className="text-xs text-[var(--ink-dim)]">失败来源</p>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">
            去重：{audit?.dedupe_key || 'template_id'} · 归一化：{audit?.normalization || 'heat_0_100'}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
          <p className="text-xs font-semibold text-[var(--ink-paper)]">模板影响</p>
          <div className="mt-3 space-y-2">
            {weightChanges.slice(0, 4).map(item => (
              <div key={item.template_id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/15 px-3 py-2">
                <span className="truncate text-xs text-[var(--ink-muted)]">{item.template_id}</span>
                <span className="text-xs font-semibold text-[var(--worldline-cyan)]">#{item.rank} · {item.recommendation_weight}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}
