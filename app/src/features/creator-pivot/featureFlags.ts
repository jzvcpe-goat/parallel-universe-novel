export type CreatorPivotFeatureFlag =
  | 'creatorPivotV2'
  | 'localDataV2'
  | 'creatorEcho'
  | 'localWritingLibrary'
  | 'creatorIaV2'
  | 'publishBundles'
  | 'agentSurface'
  | 'stuckRescue'
  | 'backendPublishTransaction'
  | 'paymentEntitlements'
  | 'productionLaunch'

export type CreatorPivotWorkstream =
  | 'creator-pivot-local-ui-agent'
  | 'backend-database-security'
  | 'payment-production-launch'
  | 'legacy-refinement-deletion'

export type CreatorPivotEpicId =
  | 'epic-0-pivot-governance'
  | 'epic-1-legacy-refinement'
  | 'epic-2-local-creator-architecture'
  | 'epic-3-external-echo'
  | 'epic-4-creator-ui-pivot'
  | 'epic-5-backend-security'
  | 'epic-6-payment-entitlements'
  | 'epic-7-production-launch'

export interface CreatorPivotFeatureFlagMetadata {
  epic: CreatorPivotEpicId
  workstream: CreatorPivotWorkstream | 'cross-workstream-governance'
  defaultEnabled: false
  purpose: string
}

export const creatorPivotFeatureFlags: Record<CreatorPivotFeatureFlag, boolean> = {
  creatorPivotV2: false,
  localDataV2: false,
  creatorEcho: false,
  localWritingLibrary: false,
  creatorIaV2: false,
  publishBundles: false,
  agentSurface: false,
  stuckRescue: false,
  backendPublishTransaction: false,
  paymentEntitlements: false,
  productionLaunch: false,
}

export const creatorPivotFeatureFlagMetadata: Record<
  CreatorPivotFeatureFlag,
  CreatorPivotFeatureFlagMetadata
> = {
  creatorPivotV2: {
    epic: 'epic-0-pivot-governance',
    workstream: 'cross-workstream-governance',
    defaultEnabled: false,
    purpose: 'Master cutover guard for Creator Pivot V2.',
  },
  localDataV2: {
    epic: 'epic-2-local-creator-architecture',
    workstream: 'creator-pivot-local-ui-agent',
    defaultEnabled: false,
    purpose: 'Use the versioned local Creator repository as the active data owner.',
  },
  creatorEcho: {
    epic: 'epic-3-external-echo',
    workstream: 'creator-pivot-local-ui-agent',
    defaultEnabled: false,
    purpose: 'Present ReaderSignal input through the External Echo workflow.',
  },
  localWritingLibrary: {
    epic: 'epic-2-local-creator-architecture',
    workstream: 'creator-pivot-local-ui-agent',
    defaultEnabled: false,
    purpose: 'Enable the local writing library backed by local repositories.',
  },
  creatorIaV2: {
    epic: 'epic-4-creator-ui-pivot',
    workstream: 'creator-pivot-local-ui-agent',
    defaultEnabled: false,
    purpose: 'Cut over to the Pivot V2 Creator information architecture.',
  },
  publishBundles: {
    epic: 'epic-2-local-creator-architecture',
    workstream: 'creator-pivot-local-ui-agent',
    defaultEnabled: false,
    purpose: 'Require bundle-first author-confirmed publish preparation.',
  },
  agentSurface: {
    epic: 'epic-2-local-creator-architecture',
    workstream: 'creator-pivot-local-ui-agent',
    defaultEnabled: false,
    purpose: 'Enable manifest-registered agent actions on approved UI surfaces.',
  },
  stuckRescue: {
    epic: 'epic-4-creator-ui-pivot',
    workstream: 'creator-pivot-local-ui-agent',
    defaultEnabled: false,
    purpose: 'Enable author-controlled stuck-writing rescue actions.',
  },
  backendPublishTransaction: {
    epic: 'epic-5-backend-security',
    workstream: 'backend-database-security',
    defaultEnabled: false,
    purpose: 'Use the server-owned publish transaction instead of client multi-write.',
  },
  paymentEntitlements: {
    epic: 'epic-6-payment-entitlements',
    workstream: 'payment-production-launch',
    defaultEnabled: false,
    purpose: 'Enforce paid Reader entitlements after payment validation.',
  },
  productionLaunch: {
    epic: 'epic-7-production-launch',
    workstream: 'payment-production-launch',
    defaultEnabled: false,
    purpose: 'Permit production cutover only after release gates pass.',
  },
}

export function isCreatorPivotFeatureEnabled(flag: CreatorPivotFeatureFlag) {
  return creatorPivotFeatureFlags[flag] === true
}
