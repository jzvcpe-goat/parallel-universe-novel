import type {
  CreatorDashboardPhase,
  CreatorDashboardRouteStatePatch,
} from './creatorDashboardRouteEffectService'

type CreatorDashboardStateSetter<Value> = (
  value: Value | ((previous: Value) => Value),
) => void

export interface CreatorDashboardRouteStatePatchSetters {
  setBranches: CreatorDashboardStateSetter<CreatorDashboardRouteStatePatch['branches']>
  setChapters: CreatorDashboardStateSetter<CreatorDashboardRouteStatePatch['chapters']>
  setClientStatus: CreatorDashboardStateSetter<string>
  setDrafts: CreatorDashboardStateSetter<NonNullable<CreatorDashboardRouteStatePatch['drafts']>>
  setNotice: CreatorDashboardStateSetter<string>
  setPhase: CreatorDashboardStateSetter<CreatorDashboardPhase>
  setPublishEvents: CreatorDashboardStateSetter<CreatorDashboardRouteStatePatch['publishEvents']>
  setRequests: CreatorDashboardStateSetter<CreatorDashboardRouteStatePatch['requests']>
  setWorks: CreatorDashboardStateSetter<CreatorDashboardRouteStatePatch['works']>
}

export function applyCreatorDashboardRouteStatePatchToReact(
  statePatch: CreatorDashboardRouteStatePatch,
  setters: CreatorDashboardRouteStatePatchSetters,
) {
  setters.setClientStatus(statePatch.clientStatus)
  setters.setRequests(statePatch.requests)
  setters.setWorks(statePatch.works)
  setters.setBranches(statePatch.branches)
  setters.setChapters(statePatch.chapters)
  setters.setPublishEvents(statePatch.publishEvents)
  if (statePatch.drafts) setters.setDrafts(statePatch.drafts)
  setters.setPhase(statePatch.phase)
  setters.setNotice(statePatch.notice)
}
