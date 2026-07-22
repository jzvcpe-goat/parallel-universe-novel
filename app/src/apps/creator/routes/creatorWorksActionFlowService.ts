import type { PmfBranch } from '@/features/pmf/types'
import { creatorFacingNotice } from '../creatorViewHelpers'
import {
  runCreatorBranchArchive,
  runCreatorIfBranchCreate,
  runCreatorWorkHide,
  runCreatorWorkNoticeSave,
} from './creatorWorksActionService'

export interface CreatorWorksActionFlowPort {
  archiveBranch: typeof runCreatorBranchArchive
  createIfBranch: typeof runCreatorIfBranchCreate
  hideWork: typeof runCreatorWorkHide
  saveNotice: typeof runCreatorWorkNoticeSave
}

export interface CreatorWorksActionFlowResult {
  notice: string
  reload?: {
    branchId: string
    workId: string
  }
  resetBranchForm: boolean
}

const defaultCreatorWorksActionFlowPort: CreatorWorksActionFlowPort = {
  archiveBranch: runCreatorBranchArchive,
  createIfBranch: runCreatorIfBranchCreate,
  hideWork: runCreatorWorkHide,
  saveNotice: runCreatorWorkNoticeSave,
}

export async function runCreatorWorkNoticeFlow(
  input: {
    authorNotice: string
    selectedBranchId: string
    workId: string
  },
  port: CreatorWorksActionFlowPort = defaultCreatorWorksActionFlowPort,
): Promise<CreatorWorksActionFlowResult> {
  const result = await port.saveNotice(input.workId, input.authorNotice)
  if (!result.ok) {
    return {
      notice: creatorFacingNotice(result.message),
      resetBranchForm: false,
    }
  }
  return {
    notice: '作者公告已保存。',
    reload: {
      branchId: input.selectedBranchId,
      workId: result.data.id,
    },
    resetBranchForm: false,
  }
}

export async function runCreatorWorkHideFlow(
  input: {
    selectedBranchId: string
    workId: string
  },
  port: CreatorWorksActionFlowPort = defaultCreatorWorksActionFlowPort,
): Promise<CreatorWorksActionFlowResult> {
  const result = await port.hideWork(input.workId)
  if (!result.ok) {
    return {
      notice: creatorFacingNotice(result.message),
      resetBranchForm: false,
    }
  }
  return {
    notice: '作品已隐藏。',
    reload: {
      branchId: input.selectedBranchId,
      workId: result.data.id,
    },
    resetBranchForm: false,
  }
}

export async function runCreatorBranchArchiveFlow(
  branch: PmfBranch,
  port: CreatorWorksActionFlowPort = defaultCreatorWorksActionFlowPort,
): Promise<CreatorWorksActionFlowResult> {
  const result = await port.archiveBranch(branch.id)
  if (!result.ok) {
    return {
      notice: creatorFacingNotice(result.message),
      resetBranchForm: false,
    }
  }
  return {
    notice: '支线已归档。',
    reload: {
      branchId: branch.id,
      workId: branch.work_id,
    },
    resetBranchForm: false,
  }
}

export async function runCreatorIfBranchCreateFlow(
  input: {
    parentBranchId: string
    parentChapterId: string
    summary: string
    title: string
    workId: string
  },
  port: CreatorWorksActionFlowPort = defaultCreatorWorksActionFlowPort,
): Promise<CreatorWorksActionFlowResult> {
  const result = await port.createIfBranch({
    parentBranchId: input.parentBranchId === 'none' ? null : input.parentBranchId,
    parentChapterId: input.parentChapterId === 'none' ? null : input.parentChapterId,
    summary: input.summary,
    title: input.title,
    workId: input.workId,
  })
  if (!result.ok) {
    return {
      notice: creatorFacingNotice(result.message),
      resetBranchForm: false,
    }
  }
  return {
    notice: '新 IF 支线已创建，发布章节前不会出现在读者阅读端。',
    reload: {
      branchId: result.data.id,
      workId: result.data.work_id,
    },
    resetBranchForm: true,
  }
}
