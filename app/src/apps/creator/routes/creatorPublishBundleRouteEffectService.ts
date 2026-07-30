import type {
  PmfBranch,
  PmfChapter,
  PmfReaderRequest,
  PmfWork,
} from '@/features/pmf/types'
import type { CreatorAuthorizationStatus } from '@/lib/pmfSupabase'
import { creatorFacingNotice } from '../creatorViewHelpers'
import {
  runCreatorPublishBundleContextLoad,
  runCreatorPublishBundleLocalLoad,
  type CreatorPublishBundleRouteRefInput,
} from './creatorPublishBundleLoadService'
import {
  resolveCreatorPublishBundleContextSnapshotPatch,
  resolveCreatorPublishBundleManualRefreshPatch,
  resolveCreatorPublishBundleRouteDraftRefreshPatch,
  type CreatorPublishBundleLocalStatePatch,
} from './creatorPublishBundleRouteController'

export interface CreatorPublishBundleContextStatePatch {
  authorization: CreatorAuthorizationStatus | null
  branches: PmfBranch[]
  chapters: PmfChapter[]
  requests: PmfReaderRequest[]
  works: PmfWork[]
}

export interface CreatorPublishBundleRouteEffectPort {
  loadContext: typeof runCreatorPublishBundleContextLoad
  loadLocal: typeof runCreatorPublishBundleLocalLoad
}

const defaultCreatorPublishBundleRouteEffectPort: CreatorPublishBundleRouteEffectPort = {
  loadContext: runCreatorPublishBundleContextLoad,
  loadLocal: runCreatorPublishBundleLocalLoad,
}

export async function runCreatorPublishBundleContextEffect(
  routeRefs: CreatorPublishBundleRouteRefInput,
  port: CreatorPublishBundleRouteEffectPort = defaultCreatorPublishBundleRouteEffectPort,
): Promise<{
  contextStatePatch: CreatorPublishBundleContextStatePatch
  localStatePatch: CreatorPublishBundleLocalStatePatch
}> {
  const [context, localSnapshot] = await Promise.all([
    port.loadContext(),
    port.loadLocal(routeRefs),
  ])

  return {
    contextStatePatch: {
      authorization: context.authorization,
      branches: context.branches,
      chapters: context.chapters,
      requests: context.requests,
      works: context.works,
    },
    localStatePatch: resolveCreatorPublishBundleContextSnapshotPatch(
      localSnapshot,
      context.ok ? context.notice : creatorFacingNotice(context.notice),
    ),
  }
}

export async function runCreatorPublishBundleRouteDraftRefreshEffect(
  routeRefs: CreatorPublishBundleRouteRefInput,
  routeBundleDraftId: string | null,
  port: CreatorPublishBundleRouteEffectPort = defaultCreatorPublishBundleRouteEffectPort,
) {
  const localSnapshot = await port.loadLocal(routeRefs)
  return resolveCreatorPublishBundleRouteDraftRefreshPatch(localSnapshot, routeBundleDraftId)
}

export async function runCreatorPublishBundleManualRefreshEffect(
  routeRefs: CreatorPublishBundleRouteRefInput,
  nextNotice?: string,
  port: CreatorPublishBundleRouteEffectPort = defaultCreatorPublishBundleRouteEffectPort,
) {
  const localSnapshot = await port.loadLocal(routeRefs)
  return resolveCreatorPublishBundleManualRefreshPatch(localSnapshot, nextNotice)
}
