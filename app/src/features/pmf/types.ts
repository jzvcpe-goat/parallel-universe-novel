export type PmfRequestType = 'next_chapter' | 'if_branch' | 'continue_branch'

export type PmfRequestStatus =
  | 'pending'
  | 'acknowledged'
  | 'in_progress'
  | 'published'
  | 'rejected'

export type PmfBranchType = 'main' | 'if' | 'alt' | 'bonus'

export interface PmfWork {
  id: string
  title: string
  summary: string | null
  cover_url: string | null
  status: 'draft' | 'published' | 'hidden'
  author_notice: string | null
  updated_at: string | null
}

export interface PmfBranch {
  id: string
  work_id: string
  parent_branch_id?: string | null
  parent_chapter_id?: string | null
  branch_type: PmfBranchType
  title: string
  summary: string | null
  status: 'draft' | 'published' | 'archived'
  updated_at: string | null
}

export interface PmfChapter {
  id: string
  work_id: string
  branch_id: string
  chapter_no: number
  title: string
  content: string
  status: 'draft' | 'published' | 'hidden'
  published_at: string | null
}

export interface PmfReaderRequest {
  id: string
  work_id: string
  branch_id: string | null
  chapter_id: string | null
  request_type: PmfRequestType
  request_text: string
  status: PmfRequestStatus
  vote_count: number
  published_chapter_id: string | null
  published_branch_id: string | null
  publish_event_id: string | null
  created_at: string
  updated_at: string | null
}

export interface PmfPublishEvent {
  id: string
  reader_request_id: string | null
  work_id: string
  branch_id: string
  published_chapter_id: string | null
  published_branch_id: string | null
  local_draft_ref: string | null
  event_type: 'chapter_published' | 'branch_published'
  created_at: string
}

export interface PmfCreatorClient {
  id: string
  creator_id: string
  client_label: string
  app_mode: 'local'
  version: string
  online_status: 'online' | 'offline'
  last_seen_at: string
  last_sync_at: string | null
}

export interface PmfFeatureFlag {
  key: string
  enabled: boolean
  description: string | null
  updated_at: string | null
}

export interface PmfLocalDraft {
  localDraftRef: string
  requestId: string | null
  workId: string
  branchId: string
  chapterNumber?: number | null
  title: string
  content: string
  updatedAt: string
}

export type PmfLocalSettingAssetKind =
  | 'character'
  | 'skill'
  | 'location'
  | 'map'
  | 'faction'
  | 'item'
  | 'rule'
  | 'timeline'

export type PmfLocalSettingAssetStage =
  | 'intent'
  | 'scene'
  | 'draft'
  | 'memory'
  | 'publish'

export interface PmfLocalSettingAsset {
  localAssetRef: string
  workId: string
  branchId: string | null
  kind: PmfLocalSettingAssetKind
  stage: PmfLocalSettingAssetStage
  title: string
  summary: string
  detail: string
  tags: string[]
  updatedAt: string
}

export function pmfMainBranchId(workId: string) {
  return `${workId}:main`
}
