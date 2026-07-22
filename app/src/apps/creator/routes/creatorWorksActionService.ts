import type { PmfBranch, PmfWork } from '@/features/pmf/types'
import {
  createCreatorIfBranch,
  type PmfCreateBranchInput,
  type PmfResult,
  updateCreatorBranchStatus,
  updateCreatorWorkNotice,
  updateCreatorWorkStatus,
} from '@/lib/pmfSupabase'

export interface CreatorWorksActionApiPort {
  archiveBranch(branchId: string): Promise<PmfResult<PmfBranch>>
  createIfBranch(input: PmfCreateBranchInput): Promise<PmfResult<PmfBranch>>
  hideWork(workId: string): Promise<PmfResult<PmfWork>>
  saveNotice(workId: string, authorNotice: string): Promise<PmfResult<PmfWork>>
}

const defaultCreatorWorksActionApiPort: CreatorWorksActionApiPort = {
  archiveBranch: branchId => updateCreatorBranchStatus(branchId, 'archived'),
  createIfBranch: createCreatorIfBranch,
  hideWork: workId => updateCreatorWorkStatus(workId, 'hidden'),
  saveNotice: updateCreatorWorkNotice,
}

export function runCreatorWorkNoticeSave(
  workId: string,
  authorNotice: string,
  api: CreatorWorksActionApiPort = defaultCreatorWorksActionApiPort,
) {
  return api.saveNotice(workId, authorNotice)
}

export function runCreatorWorkHide(
  workId: string,
  api: CreatorWorksActionApiPort = defaultCreatorWorksActionApiPort,
) {
  return api.hideWork(workId)
}

export function runCreatorBranchArchive(
  branchId: string,
  api: CreatorWorksActionApiPort = defaultCreatorWorksActionApiPort,
) {
  return api.archiveBranch(branchId)
}

export function runCreatorIfBranchCreate(
  input: PmfCreateBranchInput,
  api: CreatorWorksActionApiPort = defaultCreatorWorksActionApiPort,
) {
  return api.createIfBranch(input)
}
