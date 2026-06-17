import { ServerCog } from 'lucide-react'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { Panel } from '@/components/design-system/Panel'
import { cn } from '@/lib/utils'
import type { CapabilityAlignment } from '@/features/parallel-universe/types'

interface CapabilityMapPanelProps {
  items: CapabilityAlignment[]
  className?: string
}

function capabilityModeLabel(mode: string) {
  if (mode.startsWith('interactive')) return '已进产品路径'
  if (mode === 'service_contract') return '已接服务合同'
  if (mode === 'studio_contract') return '仅工作台可见'
  return '二期规划'
}

function capabilityModeVariant(mode: string): NonNullable<BadgeProps['variant']> {
  if (mode.startsWith('interactive')) return 'stasis'
  if (mode === 'service_contract') return 'gold'
  if (mode === 'studio_contract') return 'outline'
  return 'secondary'
}

export function CapabilityMapPanel({ items, className }: CapabilityMapPanelProps) {
  return (
    <Panel className={cn('p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-[var(--ink-dim)]">能力边界</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--ink-paper)]">入口与服务对应关系</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-muted)]">
            已进入产品路径的能力保留公开入口；只适合创作者和运营查看的能力集中在这里，避免反向污染读者页面。
          </p>
        </div>
        <ServerCog className="text-[var(--worldline-cyan)]" size={24} />
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {items.map(item => (
          <article key={item.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs text-[var(--ink-dim)]">{item.frontendEntry}</p>
                <h3 className="mt-2 text-base font-semibold text-[var(--ink-paper)]">{item.title}</h3>
              </div>
              <Badge variant={capabilityModeVariant(item.mode)}>{capabilityModeLabel(item.mode)}</Badge>
            </div>
            <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">{item.implementationBoundary}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.productSurface.slice(0, 4).map(surface => (
                <span key={surface} className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] text-[var(--ink-muted)]">
                  {surface}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </Panel>
  )
}
