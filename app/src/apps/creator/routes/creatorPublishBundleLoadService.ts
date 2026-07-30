import type {
  PmfBranch,
  PmfChapter,
  PmfLocalDraft,
  PmfReaderRequest,
  PmfWork,
} from '@/features/pmf/types'
import {
  legacyPublishDraftQueryKey,
  publishBundleDraftQueryKey,
  resolvePublishBundleDraftRouteRef,
} from '@/features/creator-pivot/publishBundleDraftHandoff'
import {
  getCreatorAuthorizationStatus,
  listCreatorBranches,
  listCreatorChapters,
  listCreatorRequests,
  listCreatorWorks,
  type CreatorAuthorizationStatus,
  type PmfResult,
} from '@/lib/pmfSupabase'
import { readLocalDrafts } from '@/local-db/creatorLocalDraftRepository'
import {
  readLocalPublishBundles,
  readLocalPublishReceipts,
} from '@/local-db/creatorLocalPublishRepository'
import { hydrateLocalWorkspace } from '@/local-db/creatorLocalWorkspaceRepository'
import type { PublishBundleRecord, PublishReceiptRecord } from '@/local-db/schema'

export interface CreatorPublishBundleContextApiPort {
  getAuthorizationStatus(): Promise<PmfResult<CreatorAuthorizationStatus>>
  listBranches(): Promise<PmfResult<PmfBranch[]>>
  listChapters(): Promise<PmfResult<PmfChapter[]>>
  listRequests(): Promise<PmfResult<PmfReaderRequest[]>>
  listWorks(): Promise<PmfResult<PmfWork[]>>
}

export interface CreatorPublishBundleLocalReadPort {
  hydrate(): Promise<void>
  readDrafts(): PmfLocalDraft[]
  readPublishBundles(): PublishBundleRecord[]
  readPublishReceipts(): PublishReceiptRecord[]
}

export interface CreatorPublishBundleRouteRefInput {
  bundleDraftId?: string | null
  legacyDraftRef?: string | null
}

interface CreatorPublishBundleLocalSnapshot {
  drafts: PmfLocalDraft[]
  publishBundles: PublishBundleRecord[]
  publishReceipts: PublishReceiptRecord[]
  routeDraftRef: string
}

type RunCreatorPublishBundleContextLoadResult =
  | {
    authorization: CreatorAuthorizationStatus | null
    branches: PmfBranch[]
    chapters: PmfChapter[]
    notice: string
    ok: false
    requests: PmfReaderRequest[]
    works: PmfWork[]
  }
  | {
    authorization: CreatorAuthorizationStatus | null
    branches: PmfBranch[]
    chapters: PmfChapter[]
    notice: string
    ok: true
    requests: PmfReaderRequest[]
    works: PmfWork[]
  }

const defaultCreatorPublishBundleContextApiPort: CreatorPublishBundleContextApiPort = {
  getAuthorizationStatus: getCreatorAuthorizationStatus,
  listBranches: listCreatorBranches,
  listChapters: listCreatorChapters,
  listRequests: listCreatorRequests,
  listWorks: listCreatorWorks,
}

const defaultCreatorPublishBundleLocalReadPort: CreatorPublishBundleLocalReadPort = {
  hydrate: hydrateLocalWorkspace,
  readDrafts: readLocalDrafts,
  readPublishBundles: readLocalPublishBundles,
  readPublishReceipts: readLocalPublishReceipts,
}

export function readCreatorPublishBundleRouteRefs(search: string): CreatorPublishBundleRouteRefInput {
  const searchParams = new URLSearchParams(search)

  return {
    bundleDraftId: searchParams.get(publishBundleDraftQueryKey),
    legacyDraftRef: searchParams.get(legacyPublishDraftQueryKey),
  }
}

export function resolveCreatorPublishBundleRouteDraftRef(
  input: CreatorPublishBundleRouteRefInput,
  publishBundles: PublishBundleRecord[],
) {
  return resolvePublishBundleDraftRouteRef({
    bundleDraftId: input.bundleDraftId || null,
    legacyDraftRef: input.legacyDraftRef || null,
    publishBundles,
  })
}

export function readCreatorPublishBundleLocalSnapshot(
  input: CreatorPublishBundleRouteRefInput = {},
  local: CreatorPublishBundleLocalReadPort = defaultCreatorPublishBundleLocalReadPort,
): CreatorPublishBundleLocalSnapshot {
  const drafts = local.readDrafts()
  const publishBundles = local.readPublishBundles()
  const publishReceipts = local.readPublishReceipts()
  const routeDraftRef = resolveCreatorPublishBundleRouteDraftRef(input, publishBundles)

  return {
    drafts,
    publishBundles,
    publishReceipts,
    routeDraftRef: routeDraftRef || '',
  }
}

export async function runCreatorPublishBundleLocalLoad(
  input: CreatorPublishBundleRouteRefInput = {},
  local: CreatorPublishBundleLocalReadPort = defaultCreatorPublishBundleLocalReadPort,
) {
  await local.hydrate()
  return readCreatorPublishBundleLocalSnapshot(input, local)
}

export async function runCreatorPublishBundleContextLoad(
  api: CreatorPublishBundleContextApiPort = defaultCreatorPublishBundleContextApiPort,
): Promise<RunCreatorPublishBundleContextLoadResult> {
  const [workResult, branchResult, chapterResult, requestResult, authorizationResult] = await Promise.all([
    api.listWorks(),
    api.listBranches(),
    api.listChapters(),
    api.listRequests(),
    api.getAuthorizationStatus(),
  ])

  const works = workResult.ok ? workResult.data : []
  const branches = branchResult.ok ? branchResult.data : []
  const chapters = chapterResult.ok ? chapterResult.data : []
  const requests = requestResult.ok ? requestResult.data : []
  const authorization = authorizationResult.ok ? authorizationResult.data : null
  const firstError = [workResult, branchResult, chapterResult, requestResult, authorizationResult].find(result => !result.ok)

  if (firstError && !firstError.ok) {
    return {
      authorization,
      branches,
      chapters,
      notice: firstError.message,
      ok: false,
      requests,
      works,
    }
  }

  return {
    authorization,
    branches,
    chapters,
    notice: '发布包信息已更新。',
    ok: true,
    requests,
    works,
  }
}
