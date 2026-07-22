import { CheckCircle2, Radio, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

export interface CreatorSettingsStatusItem {
  label: string
  value: string
}

export interface CreatorSettingsReadinessItem {
  label: string
  value: string
  ready: boolean
}

export interface CreatorSettingsFlagItem {
  key: string
  label: string
  value: string
  enabled?: boolean
}

export interface CreatorSettingsStatusRailProps {
  statusItems: CreatorSettingsStatusItem[]
  readinessItems: CreatorSettingsReadinessItem[]
  flagItems: CreatorSettingsFlagItem[]
  promises: string[]
  className?: string
}

export function CreatorSettingsStatusRail({
  statusItems,
  readinessItems,
  flagItems,
  promises,
  className,
}: CreatorSettingsStatusRailProps) {
  return (
    <aside
      data-slot="creator-settings-status-rail"
      className={cn('creator-settings-status-rail', className)}
    >
      <Card
        data-slot="creator-settings-status-card"
        variant="glass"
        padding="none"
        className="rounded-md"
      >
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center gap-2">
            <Radio aria-hidden="true" size={18} className="text-[var(--creator-confirm)]" />
            <CardTitle className="text-base text-[var(--creator-text)]">当前状态</CardTitle>
          </div>
          <CardDescription className="text-[var(--creator-text-muted)]">
            只显示作者工作台能否继续使用。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 px-4 pb-4">
          <dl
            data-slot="creator-settings-status-list"
            className="divide-y divide-[var(--creator-border)] border-y border-[var(--creator-border)]"
          >
            {statusItems.map(item => (
              <div
                key={item.label}
                data-slot="creator-settings-status-item"
                className="flex items-baseline justify-between gap-4 py-3"
              >
                <dt className="text-sm text-[var(--creator-text-muted)]">{item.label}</dt>
                <dd
                  data-slot="creator-settings-status-value"
                  className="text-right text-sm font-semibold leading-6 text-[var(--creator-text)]"
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          <Separator />

          <section
            data-slot="creator-settings-readiness-section"
            aria-labelledby="creator-settings-readiness-title"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck aria-hidden="true" size={18} className="text-[var(--creator-confirm)]" />
              <h3
                id="creator-settings-readiness-title"
                className="text-base font-semibold text-[var(--creator-text)]"
              >
                工作台准备度
              </h3>
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--creator-text-muted)]">
              开始处理外界回声前，先看哪些条件已经可用。
            </p>
            <dl
              data-slot="creator-settings-readiness-list"
              className="mt-3 divide-y divide-[var(--creator-border)]"
            >
              {readinessItems.map(item => (
                <div
                  key={item.label}
                  data-slot="creator-settings-readiness-item"
                  data-state={item.ready ? 'ready' : 'pending'}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <dt className="text-sm text-[var(--creator-text-muted)]">{item.label}</dt>
                  <dd>
                    <Badge
                      data-slot="creator-settings-readiness-status"
                      variant={item.ready ? 'stasis' : 'outline'}
                    >
                      {item.value}
                    </Badge>
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <Separator />

          <section
            data-slot="creator-settings-boundary-section"
            aria-labelledby="creator-settings-public-boundary-title"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" size={18} className="text-[var(--creator-accent)]" />
              <h3
                id="creator-settings-public-boundary-title"
                className="text-base font-semibold text-[var(--creator-text)]"
              >
                公开边界
              </h3>
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--creator-text-muted)]">
              读者只会看到已公开作品和请求进度。
            </p>
            <dl
              data-slot="creator-settings-boundary-state-list"
              className="mt-3 divide-y divide-[var(--creator-border)]"
            >
              {flagItems.map(item => (
                <div
                  key={item.key}
                  data-slot="creator-settings-boundary-state-item"
                  data-state={item.enabled === true ? 'ready' : item.enabled === false ? 'pending' : 'unknown'}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <dt className="text-sm text-[var(--creator-text-muted)]">{item.label}</dt>
                  <dd
                    data-slot="creator-settings-boundary-state-value"
                    className={item.enabled
                      ? 'text-right text-sm font-semibold text-[var(--creator-confirm)]'
                      : 'text-right text-sm font-semibold text-[var(--creator-text-dim)]'}
                  >
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <Separator />

          <section
            data-slot="creator-settings-promise-section"
            aria-labelledby="creator-settings-promise-title"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck aria-hidden="true" size={18} className="text-[var(--creator-confirm)]" />
              <h3
                id="creator-settings-promise-title"
                className="text-base font-semibold text-[var(--creator-text)]"
              >
                发布承诺
              </h3>
            </div>
            <p className="mt-1 text-sm leading-6 text-[var(--creator-text-muted)]">
              所有公开动作都由作者确认。
            </p>
            <ul
              data-slot="creator-settings-promise-list"
              className="mt-3 divide-y divide-[var(--creator-border)] text-sm leading-6 text-[var(--creator-text-muted)]"
            >
              {promises.map(promise => (
                <li
                  key={promise}
                  data-slot="creator-settings-promise-item"
                  className="flex items-start gap-2 py-3"
                >
                  <CheckCircle2
                    aria-hidden="true"
                    size={15}
                    className="mt-1 shrink-0 text-[var(--creator-confirm)]"
                  />
                  <span>{promise}</span>
                </li>
              ))}
            </ul>
          </section>
        </CardContent>
      </Card>
    </aside>
  )
}
