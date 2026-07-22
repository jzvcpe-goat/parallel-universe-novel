import type { PmfLocalSettingAssetKind } from '@/features/pmf/types'
import {
  chapterDirectionLabel,
  type ChapterDirectionId,
  type WritingGuideStep,
} from './creatorEditorViewModels'
import { compactExcerpt } from './creatorEditorSessionViewModels'
import {
  defaultSettingKindForStage,
  settingAssetKindLabel,
  writingGuideStepLabel,
} from './creatorEditorSocraticViewModels'

export interface EditorSettingAssetDraftInput {
  branchId: string | null
  chapterDirection: ChapterDirectionId
  content: string
  destinationLabel: string
  guideStep: WritingGuideStep
  linkedRequestText: string | null
  title: string
  workId: string
  workTitle: string
}

interface EditorSettingAssetDraft {
  workId: string
  branchId: string | null
  kind: PmfLocalSettingAssetKind
  stage: WritingGuideStep
  title: string
  summary: string
  detail: string
  tags: string[]
}

type EditorSettingAssetDraftResolution =
  | {
    ok: false
    notice: string
  }
  | {
    ok: true
    assetInput: EditorSettingAssetDraft
    nextGuideStep: WritingGuideStep
  }

export function resolveEditorSettingAssetDraft({
  branchId,
  chapterDirection,
  content,
  destinationLabel,
  guideStep,
  linkedRequestText,
  title,
  workId,
  workTitle,
}: EditorSettingAssetDraftInput): EditorSettingAssetDraftResolution {
  if (!workId) {
    return {
      ok: false,
      notice: '先选择作品，再把回答沉淀成设定。',
    }
  }

  const kind = defaultSettingKindForStage(guideStep)
  const stageLabel = writingGuideStepLabel(guideStep)
  const requestSummary = linkedRequestText
    ? compactExcerpt(linkedRequestText, '读者愿望')
    : '自主章节'
  const proseSummary = content.trim()
    ? compactExcerpt(content.trim(), '当前正文')
    : requestSummary
  const titleBase: Record<WritingGuideStep, string> = {
    intent: `${workTitle || '当前作品'} · 核心承诺`,
    scene: `${chapterDirectionLabel(chapterDirection)} · 场景压力`,
    draft: `${title.trim() || '新章节'} · 人物动作`,
    memory: `${settingAssetKindLabel(kind)} · ${stageLabel}`,
    publish: `${title.trim() || '新章节'} · 发布影响`,
  }

  return {
    ok: true,
    assetInput: {
      workId,
      branchId,
      kind,
      stage: guideStep,
      title: titleBase[guideStep],
      summary: guideStep === 'memory'
        ? `从当前正文沉淀：${proseSummary}`
        : `从${stageLabel}沉淀：${requestSummary}`,
      detail: `阶段：${stageLabel}。当前去向：${destinationLabel}。${proseSummary}`,
      tags: [settingAssetKindLabel(kind), stageLabel, chapterDirectionLabel(chapterDirection)],
    },
    nextGuideStep: 'memory',
  }
}
