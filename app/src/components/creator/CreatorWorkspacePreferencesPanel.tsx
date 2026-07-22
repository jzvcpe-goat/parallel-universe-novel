import { RotateCcw } from 'lucide-react'
import { ConfirmActionDialog } from '@/components/creator/ConfirmActionDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

export interface CreatorWorkspacePreferencesPanelProps {
  reduceMotion: boolean
  reduceTransparency: boolean
  clearing: boolean
  saving: boolean
  onReduceMotionChange: (checked: boolean) => void
  onReduceTransparencyChange: (checked: boolean) => void
  onClearPreferences: () => void
  className?: string
}

export function CreatorWorkspacePreferencesPanel({
  reduceMotion,
  reduceTransparency,
  clearing,
  saving,
  onReduceMotionChange,
  onReduceTransparencyChange,
  onClearPreferences,
  className,
}: CreatorWorkspacePreferencesPanelProps) {
  return (
    <div className={cn('creator-workspace-preferences-panel grid gap-4 lg:grid-cols-2', className)}>
      <Card variant="glass" padding="sm">
        <CardHeader className="p-0">
          <CardTitle className="text-base text-[var(--creator-text)]">显示偏好</CardTitle>
          <CardDescription className="text-[var(--creator-text-muted)]">
            偏好会立即应用到当前工作台。
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4 space-y-3 p-0">
          <label className="flex items-center gap-3 text-sm text-[var(--creator-text-muted)]">
            <Checkbox
              checked={reduceMotion}
              onCheckedChange={checked => onReduceMotionChange(checked === true)}
            />
            <span>减少动态效果</span>
          </label>
          <label className="flex items-center gap-3 text-sm text-[var(--creator-text-muted)]">
            <Checkbox
              checked={reduceTransparency}
              onCheckedChange={checked => onReduceTransparencyChange(checked === true)}
            />
            <span>减少透明效果</span>
          </label>
        </CardContent>
      </Card>

      <Card variant="glass" padding="sm">
        <CardHeader className="p-0">
          <CardTitle className="text-base text-[var(--creator-text)]">重置偏好</CardTitle>
          <CardDescription className="text-[var(--creator-text-muted)]">
            只重置当前设备的显示偏好，不影响草稿、设定和已发布内容。
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4 p-0">
          <ConfirmActionDialog
            title="重置显示偏好"
            description="这会恢复当前设备的默认显示方式。草稿、设定、备份和已发布内容不受影响。"
            actionLabel="确认重置"
            pendingLabel="重置中..."
            variant="destructive"
            disabled={clearing || saving}
            onConfirm={onClearPreferences}
          >
            <Button variant="void" disabled={clearing || saving}>
              <RotateCcw size={15} />
              {clearing ? '重置中...' : '重置显示偏好'}
            </Button>
          </ConfirmActionDialog>
        </CardContent>
      </Card>
    </div>
  )
}
