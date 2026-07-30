import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Save, Settings } from 'lucide-react'
import { Panel } from '@/components/design-system/Panel'
import { CreatorActionBar } from '@/components/creator/CreatorActionBar'
import {
  CreatorLocalWorkspacePanel,
  type CreatorLocalWorkspaceConflictPolicy,
} from '@/components/creator/CreatorLocalWorkspacePanel'
import { CreatorSettingsBoundaryStrip } from '@/components/creator/CreatorSettingsBoundaryStrip'
import { CreatorSettingsStatusRail } from '@/components/creator/CreatorSettingsStatusRail'
import { CreatorWorkspacePreferencesPanel } from '@/components/creator/CreatorWorkspacePreferencesPanel'
import { CreatorWritingAssistancePreferencesPanel } from '@/components/creator/CreatorWritingAssistancePreferencesPanel'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  type PmfCreatorClient,
  type PmfFeatureFlag,
} from '@/features/pmf/types'
import { creatorAgentActions } from '@/agent-surface/actions'
import {
  clearCreatorWorkspacePreferences,
  clearCreatorWritingAssistPreferences,
  saveCreatorWritingAssistPreferences,
  saveCreatorWorkspacePreferences,
} from './creatorSettingsActionService'
import {
  applyCreatorSettingsDisplayPreferences,
  scheduleCreatorSettingsActionReset,
  scheduleCreatorSettingsRouteEffect,
} from './creatorSettingsBrowserActionService'
import {
  readCreatorSettingsLocalSnapshot,
  runCreatorSettingsLoad,
  type CreatorAuthorizationStatus,
  type CreatorDisplayPreferences,
  type LocalCreatorWorkspaceSnapshot,
} from './creatorSettingsLoadService'
import {
  createCreatorSettingsRouteViewModel,
  type CreatorSettingsPhase,
} from './creatorSettingsRouteViewModels'
import { runCreatorSettingsWorkspaceExport } from './creatorSettingsWorkspaceExportFlowService'
import {
  previewCreatorSettingsWorkspaceImport,
  runCreatorSettingsWorkspaceImport,
  type CreatorSettingsWorkspaceImportPreview,
} from './creatorSettingsWorkspaceImportFlowService'

export function CreatorSettingsRoute() {
  const [initialLocalSnapshot] = useState(() => readCreatorSettingsLocalSnapshot())
  const [preferences, setPreferences] = useState<CreatorDisplayPreferences>(() => initialLocalSnapshot.preferences)
  const [writingAssistPreferences, setWritingAssistPreferences] = useState(() => initialLocalSnapshot.writingAssistPreferences)
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState<LocalCreatorWorkspaceSnapshot>(() => initialLocalSnapshot.workspaceSnapshot)
  const [client, setClient] = useState<PmfCreatorClient | null>(null)
  const [authorization, setAuthorization] = useState<CreatorAuthorizationStatus | null>(null)
  const [flags, setFlags] = useState<PmfFeatureFlag[]>([])
  const [phase, setPhase] = useState<CreatorSettingsPhase>('loading')
  const [notice, setNotice] = useState('正在读取创作环境。')
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [writingAssistSaving, setWritingAssistSaving] = useState(false)
  const [writingAssistClearing, setWritingAssistClearing] = useState(false)
  const [workspaceImport, setWorkspaceImport] = useState<CreatorSettingsWorkspaceImportPreview | null>(null)
  const [importConflictPolicy, setImportConflictPolicy] = useState<CreatorLocalWorkspaceConflictPolicy>('keep-local')
  const [importing, setImporting] = useState(false)
  const isLocalSurface = initialLocalSnapshot.isLocalSurface

  const load = useCallback(async () => {
    setPhase('loading')
    const result = await runCreatorSettingsLoad()
    setPreferences(result.preferences)
    setWritingAssistPreferences(result.writingAssistPreferences)
    setWorkspaceSnapshot(result.workspaceSnapshot)
    setClient(result.client)
    setAuthorization(result.authorization)
    setFlags(result.flags)

    if (!result.ok) {
      setPhase('error')
      setNotice(result.notice)
      return
    }

    setPhase('ready')
    setNotice(result.notice)
  }, [])

  useEffect(() => {
    return scheduleCreatorSettingsRouteEffect(() => {
      void load()
    })
  }, [load])

  useEffect(() => {
    applyCreatorSettingsDisplayPreferences(preferences)
  }, [preferences])

  function save() {
    setSaving(true)
    const result = saveCreatorWorkspacePreferences(preferences)
    setNotice(result.notice)
    scheduleCreatorSettingsActionReset(() => setSaving(false))
  }

  function clearDisplayPreferences() {
    setClearing(true)
    const result = clearCreatorWorkspacePreferences()
    setPreferences(result.preferences)
    setNotice(result.notice)
    scheduleCreatorSettingsActionReset(() => setClearing(false))
  }

  function saveWritingAssistance() {
    setWritingAssistSaving(true)
    const result = saveCreatorWritingAssistPreferences(writingAssistPreferences)
    setNotice(result.notice)
    scheduleCreatorSettingsActionReset(() => setWritingAssistSaving(false))
  }

  function clearWritingAssistance() {
    setWritingAssistClearing(true)
    const result = clearCreatorWritingAssistPreferences()
    setWritingAssistPreferences(result.preferences)
    setNotice(result.notice)
    scheduleCreatorSettingsActionReset(() => setWritingAssistClearing(false))
  }

  async function exportLocalWorkspaceBackup() {
    const result = await runCreatorSettingsWorkspaceExport(preferences)
    setWorkspaceSnapshot(result.snapshot)
    setNotice(result.notice)
  }

  async function previewLocalWorkspaceBackup(file: File) {
    setImporting(true)
    try {
      const selected = await previewCreatorSettingsWorkspaceImport(file)
      setWorkspaceImport(selected)
      setImportConflictPolicy('keep-local')
      setNotice(`已预览备份：新增 ${selected.preview.additions.length} 项，冲突 ${selected.preview.conflicts.length} 项。确认前不会写入。`)
    } catch {
      setWorkspaceImport(null)
      setNotice('备份无法读取或校验未通过，没有写入任何内容。')
    } finally {
      setImporting(false)
    }
  }

  async function importLocalWorkspaceBackup() {
    if (!workspaceImport) return
    setImporting(true)
    try {
      const result = await runCreatorSettingsWorkspaceImport(workspaceImport, importConflictPolicy)
      setWorkspaceSnapshot(result.snapshot)
      setWorkspaceImport(null)
      setNotice(result.notice)
    } catch {
      setNotice('备份恢复未完成，本机原有内容保持不变。')
      throw new Error('Workspace import failed')
    } finally {
      setImporting(false)
    }
  }

  const {
    authorReady,
    creatorEnabled,
    operationItems,
    permissionItems,
    platformCreationClosed,
    readerRequestsEnabled,
    readinessItems,
    settingsFlagItems,
    settingsPromises,
    settingsStatusItems,
    workspaceRecordCount,
    workspaceSummaryItems,
  } = useMemo(() => createCreatorSettingsRouteViewModel({
    actions: creatorAgentActions,
    authorization,
    client,
    flags,
    isLocalSurface,
    phase,
    workspaceSnapshot,
  }), [authorization, client, flags, isLocalSurface, phase, workspaceSnapshot])

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Panel className="p-5" motion="reveal">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-[var(--creator-accent)]" />
          <h2 className="text-xl font-semibold text-[var(--creator-text)]">本机工作区</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--creator-text-muted)]">
          管理当前设备上的草稿、设定、备份、操作记录和助手权限。公开内容仍必须从发布包确认。
        </p>
        <CreatorSettingsBoundaryStrip
          workspaceRecordCount={workspaceRecordCount}
          workspacePortable={isLocalSurface}
          isCreatorDevice={isLocalSurface}
          authorReady={authorReady}
          creatorEnabled={creatorEnabled}
          readerRequestsEnabled={readerRequestsEnabled}
          platformCreationClosed={platformCreationClosed}
        />

        <CreatorLocalWorkspacePanel
          className="mt-5"
          summaryItems={workspaceSummaryItems}
          operationItems={operationItems}
          permissionItems={permissionItems}
          importConflictPolicy={importConflictPolicy}
          importFileName={workspaceImport?.fileName}
          importPreview={workspaceImport ? {
            additions: workspaceImport.preview.additions.length,
            conflicts: workspaceImport.preview.conflicts.length,
            unchanged: workspaceImport.preview.unchanged.length,
            unsupported: workspaceImport.preview.unsupported.length,
          } : undefined}
          importPending={importing}
          onExportWorkspace={exportLocalWorkspaceBackup}
          onImportConflictPolicyChange={setImportConflictPolicy}
          onImportFileChange={file => void previewLocalWorkspaceBackup(file)}
          onImportWorkspace={importLocalWorkspaceBackup}
        />

        <div className="mt-5">
          <CreatorWritingAssistancePreferencesPanel
            preferences={writingAssistPreferences}
            saving={writingAssistSaving}
            clearing={writingAssistClearing}
            onChange={setWritingAssistPreferences}
            onSave={saveWritingAssistance}
            onClear={clearWritingAssistance}
            className="mb-5"
          />
          <CreatorWorkspacePreferencesPanel
            reduceMotion={preferences.reduceMotion}
            reduceTransparency={preferences.reduceTransparency}
            clearing={clearing}
            saving={saving}
            onReduceMotionChange={reduceMotion => setPreferences(previous => ({ ...previous, reduceMotion }))}
            onReduceTransparencyChange={reduceTransparency => setPreferences(previous => ({ ...previous, reduceTransparency }))}
            onClearPreferences={clearDisplayPreferences}
          />

          <CreatorActionBar>
            <Button variant="outline" onClick={load} disabled={phase === 'loading' || saving || clearing}>
              <RefreshCw size={15} />
              读取状态
            </Button>
            <Button variant="gold" onClick={save} disabled={saving || clearing} loading={saving}>
              <Save size={15} />
              {saving ? '保存中...' : '保存显示偏好'}
            </Button>
          </CreatorActionBar>
        </div>

        <Alert className="mt-5 border-[var(--creator-border)] bg-transparent text-[var(--creator-text-muted)]">
          <AlertTitle className="text-[var(--creator-text)]">当前状态</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      </Panel>

      <CreatorSettingsStatusRail
        statusItems={settingsStatusItems}
        readinessItems={readinessItems}
        flagItems={settingsFlagItems}
        promises={settingsPromises}
      />
    </div>
  )
}
