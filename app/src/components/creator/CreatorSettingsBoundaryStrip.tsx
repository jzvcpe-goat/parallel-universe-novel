import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export interface CreatorSettingsBoundaryStripProps {
  workspaceRecordCount: number
  workspacePortable: boolean
  isCreatorDevice: boolean
  authorReady: boolean
  creatorEnabled: boolean
  readerRequestsEnabled: boolean
  platformCreationClosed: boolean
}

export function CreatorSettingsBoundaryStrip({
  workspaceRecordCount,
  workspacePortable,
  isCreatorDevice,
  authorReady,
  creatorEnabled,
  readerRequestsEnabled,
  platformCreationClosed,
}: CreatorSettingsBoundaryStripProps) {
  const rows = [
    {
      label: '本机记录',
      value: `${workspaceRecordCount} 项`,
      ready: true,
      detail: '草稿、设定和创作判断保留在本机工作区。',
    },
    {
      label: '备份恢复',
      value: workspacePortable ? '可导出与恢复' : '请回到创作设备',
      ready: workspacePortable,
      detail: '迁移前先生成备份，导入时由作者确认。',
    },
    {
      label: '创作设备',
      value: isCreatorDevice ? '当前设备可用' : '请回到创作设备',
      ready: isCreatorDevice,
      detail: '请在你的创作设备上完成写作。',
    },
    {
      label: '公开规则',
      value: platformCreationClosed ? '公开自动写作关闭' : '请确认公开规则',
      ready: authorReady && creatorEnabled && readerRequestsEnabled && platformCreationClosed,
      detail: '读者只能看到已发布内容和请求状态。',
    },
  ]

  return (
    <Card
      variant="default"
      padding="none"
      className="mt-5 overflow-hidden rounded-md"
      data-slot="creator-settings-boundary-strip"
    >
      <CardContent className="p-0">
        <dl
          aria-label="本机工作区边界状态"
          className="grid lg:grid-cols-4"
          data-slot="creator-settings-boundary-list"
        >
          {rows.map((row, index) => (
            <div
              key={row.label}
              className={`min-w-0 px-4 py-4 ${index < rows.length - 1 ? 'border-b border-[var(--creator-border)] lg:border-b-0 lg:border-r' : ''}`}
              data-slot="creator-settings-boundary-item"
              data-state={row.ready ? 'ready' : 'pending'}
            >
              <div className="flex items-start justify-between gap-3">
                <dt className="text-xs font-medium text-[var(--creator-text-dim)]">{row.label}</dt>
                <Badge
                  variant={row.ready ? 'stasis' : 'outline'}
                  data-slot="creator-settings-boundary-status"
                >
                  {row.ready ? '就绪' : '待确认'}
                </Badge>
              </div>
              <dd className="mt-3 min-w-0">
                <p
                  className="text-base font-semibold leading-6 text-[var(--creator-text)]"
                  data-slot="creator-settings-boundary-value"
                >
                  {row.value}
                </p>
                <p
                  className="mt-1 text-sm leading-5 text-[var(--creator-text-muted)]"
                  data-slot="creator-settings-boundary-detail"
                >
                  {row.detail}
                </p>
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
