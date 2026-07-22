import type { CreatorPublishBundleLocalStatePatch } from './creatorPublishBundleRouteController'
import type { CreatorPublishBundleContextStatePatch } from './creatorPublishBundleRouteEffectService'

type CreatorPublishBundleStateSetter<Value> = (
  value: Value | ((previous: Value) => Value),
) => void

export interface CreatorPublishBundleLocalStatePatchSetters {
  setActiveDraftRef: CreatorPublishBundleStateSetter<string>
  setDrafts: CreatorPublishBundleStateSetter<CreatorPublishBundleLocalStatePatch['drafts']>
  setNotice: CreatorPublishBundleStateSetter<string>
  setPublishBundles: CreatorPublishBundleStateSetter<CreatorPublishBundleLocalStatePatch['publishBundles']>
  setPublishReceipts: CreatorPublishBundleStateSetter<CreatorPublishBundleLocalStatePatch['publishReceipts']>
}

export interface CreatorPublishBundleContextStatePatchSetters {
  setAuthorization: CreatorPublishBundleStateSetter<CreatorPublishBundleContextStatePatch['authorization']>
  setBranches: CreatorPublishBundleStateSetter<CreatorPublishBundleContextStatePatch['branches']>
  setChapters: CreatorPublishBundleStateSetter<CreatorPublishBundleContextStatePatch['chapters']>
  setRequests: CreatorPublishBundleStateSetter<CreatorPublishBundleContextStatePatch['requests']>
  setWorks: CreatorPublishBundleStateSetter<CreatorPublishBundleContextStatePatch['works']>
}

export function applyCreatorPublishBundleContextStatePatchToReact(
  statePatch: CreatorPublishBundleContextStatePatch,
  setters: CreatorPublishBundleContextStatePatchSetters,
) {
  setters.setWorks(statePatch.works)
  setters.setBranches(statePatch.branches)
  setters.setChapters(statePatch.chapters)
  setters.setRequests(statePatch.requests)
  setters.setAuthorization(statePatch.authorization)
}

export function applyCreatorPublishBundleLocalStatePatchToReact(
  statePatch: CreatorPublishBundleLocalStatePatch,
  setters: CreatorPublishBundleLocalStatePatchSetters,
) {
  setters.setDrafts(statePatch.drafts)
  setters.setPublishBundles(statePatch.publishBundles)
  setters.setPublishReceipts(statePatch.publishReceipts)
  setters.setActiveDraftRef(statePatch.resolveActiveDraftRef)
  setters.setNotice(statePatch.notice)
}
