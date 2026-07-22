import { Download, History, ShieldCheck, Upload } from 'lucide-react'
import { ConfirmActionDialog } from '@/components/creator/ConfirmActionDialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type CreatorLocalWorkspaceConflictPolicy = 'keep-local' | 'use-import'

export interface CreatorLocalWorkspaceSummaryItem {
  label: string
  value: string
  detail: string
}

export interface CreatorLocalWorkspaceOperationItem {
  id: string
  label: string
  detail: string
  status: string
}

export interface CreatorLocalWorkspacePermissionItem {
  label: string
  value: string
  detail: string
}

export interface CreatorLocalWorkspacePanelProps {
  summaryItems: CreatorLocalWorkspaceSummaryItem[]
  operationItems: CreatorLocalWorkspaceOperationItem[]
  permissionItems: CreatorLocalWorkspacePermissionItem[]
  exportDisabled?: boolean
  importConflictPolicy: CreatorLocalWorkspaceConflictPolicy
  importFileName?: string
  importPreview?: {
    additions: number
    conflicts: number
    unchanged: number
    unsupported: number
  }
  importPending?: boolean
  onExportWorkspace: () => void
  onImportConflictPolicyChange: (value: CreatorLocalWorkspaceConflictPolicy) => void
  onImportFileChange: (file: File) => void
  onImportWorkspace: () => void | Promise<void>
  className?: string
}

export function CreatorLocalWorkspacePanel({
  summaryItems,
  operationItems,
  permissionItems,
  exportDisabled = false,
  importConflictPolicy,
  importFileName,
  importPreview,
  importPending = false,
  onExportWorkspace,
  onImportConflictPolicyChange,
  onImportFileChange,
  onImportWorkspace,
  className,
}: CreatorLocalWorkspacePanelProps) {
  return (
    <Card
      variant="glass"
      padding="none"
      className={cn('creator-local-workspace-panel overflow-hidden rounded-md', className)}
      data-slot="creator-local-workspace-panel"
    >
      <CardHeader className="border-b border-[var(--creator-border)] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Download size={18} className="mt-0.5 shrink-0 text-[var(--creator-confirm)]" />
          <div className="min-w-0">
            <CardTitle className="text-base text-[var(--creator-text)]">本机保存</CardTitle>
            <CardDescription className="mt-1 text-[var(--creator-text-muted)]">
              草稿、设定和发布包先留在当前设备，作者确认后才公开。
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent
        className="grid min-w-0 p-0 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]"
        data-slot="creator-local-workspace-content"
      >
        <section className="min-w-0 p-4 sm:p-5" aria-labelledby="creator-local-workspace-summary-title">
          <h4 id="creator-local-workspace-summary-title" className="text-sm font-semibold text-[var(--creator-text)]">
            当前设备记录
          </h4>
          <p className="mt-1 text-sm leading-6 text-[var(--creator-text-muted)]">
            这些内容只汇总当前工作区，不会因为查看状态而公开。
          </p>
          <dl
            className="mt-4 grid min-w-0 gap-px overflow-hidden rounded-md border border-[var(--creator-border)] bg-[var(--creator-border)] sm:grid-cols-2 lg:grid-cols-3"
            data-slot="creator-local-workspace-summary-list"
          >
            {summaryItems.map(item => (
              <div
                key={item.label}
                className="min-w-0 bg-[var(--creator-surface)] p-3 last:sm:col-span-2 last:lg:col-span-3"
                data-slot="creator-local-workspace-summary-item"
              >
                <dt className="text-xs text-[var(--creator-text-dim)]">{item.label}</dt>
                <dd className="mt-1 text-xl font-semibold text-[var(--creator-text)]" data-slot="creator-local-workspace-summary-value">
                  {item.value}
                </dd>
                <dd className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)]" data-slot="creator-local-workspace-summary-detail">
                  {item.detail}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <aside
          className="min-w-0 border-t border-[var(--creator-border)] p-4 sm:p-5 xl:border-l xl:border-t-0"
          aria-label="助手权限与操作记录"
          data-slot="creator-local-workspace-rail"
        >
          <section aria-labelledby="creator-local-workspace-permissions-title">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[var(--creator-accent)]" />
              <div className="min-w-0">
                <h4 id="creator-local-workspace-permissions-title" className="text-sm font-semibold text-[var(--creator-text)]">
                  助手权限
                </h4>
                <p className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)]">
                  助手只在作者触发时行动，公开动作必须再次确认。
                </p>
              </div>
            </div>
            <ul className="mt-3 divide-y divide-[var(--creator-border)] border-y border-[var(--creator-border)]" data-slot="creator-local-workspace-permission-list">
              {permissionItems.map(item => (
                <li key={item.label} className="min-w-0 py-3" data-slot="creator-local-workspace-permission-item">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <span className="min-w-0 text-sm font-semibold text-[var(--creator-text)]">{item.label}</span>
                    <Badge variant="outline" data-slot="creator-local-workspace-permission-status">{item.value}</Badge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)]">{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>

          <Separator className="my-5 bg-[var(--creator-border)]" />

          <section aria-labelledby="creator-local-workspace-operations-title">
            <div className="flex items-start gap-3">
              <History size={18} className="mt-0.5 shrink-0 text-[var(--creator-confirm)]" />
              <div className="min-w-0">
                <h4 id="creator-local-workspace-operations-title" className="text-sm font-semibold text-[var(--creator-text)]">
                  操作记录
                </h4>
                <p className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)]">
                  最近由作者触发的助手动作会留在当前设备。
                </p>
              </div>
            </div>
            {operationItems.length ? (
              <ol className="mt-3 divide-y divide-[var(--creator-border)] border-y border-[var(--creator-border)]" data-slot="creator-local-workspace-operation-list">
                {operationItems.map(item => (
                  <li key={item.id} className="min-w-0 py-3" data-slot="creator-local-workspace-operation-item">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <span className="min-w-0 text-sm font-semibold text-[var(--creator-text)]">{item.label}</span>
                      <Badge variant="stasis" data-slot="creator-local-workspace-operation-status">{item.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[var(--creator-text-muted)]">{item.detail}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <Alert className="mt-3 rounded-md border-[var(--creator-border)] bg-[var(--creator-surface)] text-[var(--creator-text)]" data-slot="creator-local-workspace-operation-empty">
                <AlertTitle>还没有助手操作记录</AlertTitle>
                <AlertDescription className="text-[var(--creator-text-muted)]">
                  开始处理回声、保存草稿或进入发布包后，这里会出现最近动作。
                </AlertDescription>
              </Alert>
            )}
          </section>
        </aside>
      </CardContent>

      <CardFooter
        className="m-0 flex-col items-stretch gap-3 border-t border-[var(--creator-border)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        data-slot="creator-local-workspace-backup-actions"
      >
        <p className="min-w-0 text-sm leading-6 text-[var(--creator-text-muted)]">
          导出会生成当前设备的工作区备份；导入前必须先预览并由作者确认，不会自动覆盖现有内容。
        </p>
        <div className="flex min-w-0 shrink-0 flex-col gap-2 sm:max-w-[28rem] sm:flex-row sm:flex-wrap sm:justify-end">
          <Button variant="gold" onClick={onExportWorkspace} disabled={exportDisabled} data-slot="creator-local-workspace-export-action">
            <Download size={15} />
            导出备份
          </Button>
          <label
            className={buttonVariants({
              variant: 'outline',
              className: cn(importPending && 'pointer-events-none opacity-50'),
            })}
            data-slot="creator-local-workspace-import-file-action"
          >
            <Upload size={15} />
            选择备份
            <input
              className="sr-only"
              type="file"
              accept=".zip,.pufw.zip,application/zip"
              disabled={importPending}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                if (file) onImportFileChange(file)
                event.currentTarget.value = ''
              }}
            />
          </label>
          {importPreview ? (
            <Select
              value={importConflictPolicy}
              onValueChange={value => onImportConflictPolicyChange(value as CreatorLocalWorkspaceConflictPolicy)}
              disabled={importPending || importPreview.conflicts === 0}
            >
              <SelectTrigger className="w-full sm:w-[10rem]" aria-label="备份冲突处理">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keep-local">保留本机冲突项</SelectItem>
                <SelectItem value="use-import">使用备份冲突项</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
          <ConfirmActionDialog
            title="确认恢复本机工作区？"
            description={importPreview
              ? `${importFileName ?? '所选备份'}：新增 ${importPreview.additions} 项，冲突 ${importPreview.conflicts} 项，未变化 ${importPreview.unchanged} 项，不支持 ${importPreview.unsupported} 项。恢复不会公开任何内容。`
              : '请先选择并预览本机工作区备份。'}
            actionLabel="确认恢复"
            pendingLabel="恢复中..."
            disabled={!importPreview || importPending}
            onConfirm={onImportWorkspace}
          >
            <Button
              variant="outline"
              disabled={!importPreview || importPending}
              loading={importPending}
              data-slot="creator-local-workspace-import-action"
            >
              导入备份
            </Button>
          </ConfirmActionDialog>
          {importPreview ? (
            <p className="w-full text-xs leading-5 text-[var(--creator-text-muted)]" aria-live="polite">
              已预览 {importFileName}：新增 {importPreview.additions} 项，冲突 {importPreview.conflicts} 项。
            </p>
          ) : null}
        </div>
      </CardFooter>
    </Card>
  )
}
