// ============================================================
// NarrativeOS frontend integration types
// ============================================================

export type MembershipTier = 'free' | 'play_pass' | 'creator_pass' | 'studio_pass' | 'unknown'

export interface EmailProviderStatus {
  provider?: string
  mode?: string
  from_email?: string | null
  verified_domain?: boolean
}

export interface AuthIdentity {
  actor_id: string
  account_id?: string | null
  actor_role: string
  display_name?: string | null
  status?: string
  created_at?: string
  email_address?: string | null
  email_verified?: boolean
  verification_required?: boolean
  verification_sent_at?: string | null
  verified_at?: string | null
  verification_can_resend?: boolean
  verification_next_allowed_at?: string | null
  email_provider_status?: EmailProviderStatus
}

export interface AuthToken {
  access_token: string
  token_type: string
  expires_at?: string
}

export interface AuthSession {
  token_id?: string
  last_used_at?: string
}

export interface User {
  id: string
  accountId: string
  username: string
  displayName: string
  avatar: string
  email: string
  emailVerified: boolean
  verificationRequired: boolean
  inkBalance: number
  membershipTier: MembershipTier
  membershipLabel: string
  membershipExpiresAt: string | null
  createdAt: string
}

export interface LoginRequest {
  identifier: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  displayName: string
}

export interface AuthLoginResponse {
  token: AuthToken
  identity: AuthIdentity
  session?: AuthSession
}

export interface AuthRegisterResponse {
  identity: AuthIdentity
  verification?: {
    flow_token_id?: string
    flow_type?: string
    expires_at?: string
    token?: string
  } | null
  delivery?: {
    provider?: string
    message_id?: string
    preview_text?: string
  } | null
}

export interface AuthVerificationResponse {
  verification?: {
    flow_token_id?: string
    flow_type?: string
    expires_at?: string
    token?: string
  } | null
  delivery?: {
    provider?: string
    message_id?: string
    preview_text?: string
  } | null
}

export interface SubscriptionTier {
  tier_id: string
  display_name: string
  description: string
  price_usd_monthly: number
  reader_access: boolean
  author_access: string
  monthly_story_credits: number
  monthly_studio_credits: number
  capabilities: Record<string, boolean>
}

export interface WalletSnapshot {
  entitlement_id?: string
  wallet_type?: string | null
  balance?: number | null
  status?: string
  reason?: string
  tier_id?: string | null
}

export interface SubscriptionSummary {
  subscription_id: string
  account_id: string
  tier_id: string
  display_name: string
  description: string
  price_usd_monthly: number
  status: string
  provider: string
  period_start?: string | null
  period_end?: string | null
  cancel_at_period_end?: boolean
  next_action?: string | null
  renewable?: boolean
}

export interface SubscriptionStatus {
  account_id: string
  subscription: SubscriptionSummary | null
  wallets: Record<string, WalletSnapshot>
  checkout_session?: CheckoutSession | null
  latest_checkout_session?: CheckoutSession | null
  recent_checkout_sessions?: CheckoutSession[]
  lifecycle_history_summary?: Record<string, unknown>
  retryable?: boolean
  renewable?: boolean
  recommended_action?: string | null
  effective_tier?: string | null
  customer_portal_available?: boolean
  customer_id?: string | null
  checkout_provider_status?: {
    provider?: string
    configured?: boolean
    publishable_key?: string | null
  }
  provider_subscriptions?: Array<Record<string, unknown>>
  provider_source_summary?: Record<string, unknown>
  refund_dispute_summary?: Record<string, unknown>
  email_verified?: boolean
  verification_required?: boolean
  tiers: SubscriptionTier[]
  config_version?: string
}

export interface PaywallStatus {
  required: boolean
  reason?: string
  quote?: number
  access_tier?: string
  tier_id?: string | null
  balance?: number | null
  entitlement_type?: string | null
  status?: string
  required_tier?: string | null
  required_display_name?: string | null
  suggested_checkout_tier?: string | null
}

export interface ReaderWorld {
  world_id: string
  title: string
  status: string
  latest_version: string
  genres: string[]
  risk_rating?: string | null
  trial_available: boolean
  access_state: string
  created_at: string
  updated_at: string
}

export interface WorldVersionSummary {
  world_version_id: string
  status: string
  created_at?: string
  updated_at?: string
}

export interface ReaderWorldDetail {
  world_id: string
  title: string
  world_version_id: string
  manifest: Record<string, unknown>
  risk_policy: Record<string, unknown>
  worldpack: Record<string, unknown>
  versions: WorldVersionSummary[]
}

export interface ReaderSessionResponse {
  session_id: string
  reader_id?: string | null
  account_id?: string | null
  world_id: string
  world_version_id: string
  current_state: Record<string, unknown>
  paywall: PaywallStatus
  steering_checkpoint?: Record<string, unknown>
}

export interface ReaderChoice {
  choiceId: string
  text: string
  motive?: string
  emotionalCost?: string
  accessTier?: string
  priceHint?: number
}

export interface ReaderChapterView {
  sessionId: string
  worldId: string
  worldVersionId: string
  chapterId: string
  chapterIndex: number
  chapterTitle: string
  recap?: string
  body: string
  relationshipHints: string[]
  choices: ReaderChoice[]
  canContinue: boolean
  paywall: PaywallStatus
  quality_trace_id?: string | null
}

export interface ReaderReplayView {
  chapter_title?: string
  recap?: string
  body: string
  relationship_hints?: string[]
  choices?: string[]
  can_continue?: boolean
  scene_card?: {
    summary?: string
  }
}

export interface ReaderReplayResponse {
  session: {
    session_id: string
    world_id: string
    metadata?: Record<string, unknown>
    current_state?: Record<string, unknown>
    created_at?: string
  }
  full_timeline: string[]
  reader_views: ReaderReplayView[]
  critic_trace: Array<Record<string, unknown>>
  state_snapshots: Array<Record<string, unknown>>
  promise_ledger_snapshots: Array<Array<Record<string, unknown>>>
  rendered_scenes: Array<Record<string, unknown>>
  evaluation_reports: Array<Record<string, unknown>>
}

export interface ReaderContinueResponse {
  session_id: string
  reader_id?: string | null
  world_id: string
  world_version_id: string
  chapter_view?: ReaderChapterView | null
  reader_view?: Record<string, unknown> | null
  chosen_event?: Record<string, unknown>
  updated_state?: Record<string, unknown>
  updated_state_summary?: Record<string, unknown> | null
  replay_preview?: Record<string, unknown> | null
  paywall: PaywallStatus
  status: 'ok' | 'payment_required' | 'restricted' | 'quality_guard_failed'
  continuity_contract?: {
    status: string
    resume_session_id: string
    preserve_session_context: boolean
    preserve_workspace: string
    preserve_view: string
    chapter_context_retained: boolean
    primary_action: string
    retryable: boolean
    message: string
  }
  steering_checkpoint?: Record<string, unknown>
  replan_checkpoint?: Record<string, unknown>
}

export type ReaderQuoteResponse = PaywallStatus

export interface ReaderPrefillResponse {
  suggested_intent?: string
  prompt?: string
  placeholders?: string[]
  [key: string]: unknown
}

export interface CheckoutSession {
  provider?: string
  tier_id: string
  checkout_url?: string
  checkout_session_id?: string
  session_id?: string
  status: string
  expires_at?: string
  created_at?: string
}

export interface CheckoutStartResponse {
  checkout: CheckoutSession
}

export interface CheckoutStatusResponse {
  account_id: string
  checkout?: CheckoutSession | null
  subscription?: SubscriptionSummary | null
  wallets?: Record<string, WalletSnapshot>
  public_state: 'processing' | 'active' | 'needs_action' | string
  recommended_action?: string | null
  message?: string
  retryable?: boolean
  renewable?: boolean
}

export interface CheckoutCompletionResponse {
  event?: Record<string, unknown>
  checkout?: CheckoutSession
  subscription?: SubscriptionSummary | null
  wallets?: Record<string, WalletSnapshot>
  customer_id?: string | null
  remote_checkout_status?: string
  effective_subscription?: SubscriptionSummary | null
  public_state?: string
  recommended_action?: string | null
  message?: string
}

export interface AccountSnapshot {
  account: {
    account_id: string
    reader_id?: string | null
    creator_id?: string | null
    display_name: string
    auth_state: 'guest_profile' | 'signed_in' | string
    sync_state: 'browser_profile_only' | 'server_snapshot_ready' | string
    requires_login_for_cross_device: boolean
  }
  membership: {
    status: string
    tier_id: string
    label: string
    story_credits: number
    studio_credits: number
    recommended_action?: string | null
    checkout_status?: string | null
  }
  reader_progress: {
    resume_available: boolean
    session_count: number
    latest?: {
      session_id: string
      world_id: string
      world_title: string
      chapter_index: number
      chapter_title: string
      updated_at?: string | null
      resume_available: boolean
    } | null
    recent: Array<{
      session_id: string
      world_id: string
      world_title: string
      chapter_index: number
      chapter_title: string
      updated_at?: string | null
      resume_available: boolean
    }>
  }
  creator_drafts: Array<{
    session_id: string
    title: string
    phase?: string | null
    turn_count: number
    opening_excerpt: string
    updated_at?: string | null
    resume_available: boolean
  }>
  story_projects: {
    status: string
    refs: Array<Record<string, unknown>>
    next_action?: string | null
  }
  local_fallback: {
    enabled: boolean
    merge_required: boolean
    server_state_present: boolean
    resolution: string
    message?: string | null
  }
  conflicts: Array<Record<string, unknown>>
  resume_action: {
    type: string
    label: string
    route: string
  }
  public_safe: boolean
  diagnostics?: Record<string, unknown>
}

export interface AccountMergePreview {
  public_safe: boolean
  public_state: 'requires_login' | 'no_data' | 'ready_to_merge' | 'needs_review' | string
  account: {
    account_id: string
    reader_id: string
    creator_id: string
    display_name: string
    auth_state: 'signed_in' | string
  } | null
  browser_profile: {
    reader_id: string
    creator_id: string
    merge_available: boolean
  }
  summary: {
    reader_progress_count: number
    creator_draft_count: number
    story_project_ref_count: number
    membership_status: string
  }
  merge_actions: Array<{
    kind: string
    label: string
    count: number
    action?: string
  }>
  conflicts: Array<{
    type?: string
    label?: string
    severity?: string
    resolution?: string
  }>
  recommended_action: string
  message: string
  diagnostics?: Record<string, unknown>
}

export interface AccountMergeConfirmResponse {
  public_safe: boolean
  public_state: 'merged' | string
  account: AccountMergePreview['account']
  browser_profile: AccountMergePreview['browser_profile']
  summary: {
    reader_progress_merged: number
    creator_drafts_merged: number
    story_project_refs_merged: number
    membership_status: string
  }
  conflicts: AccountMergePreview['conflicts']
  resolution: string
  resume_action: AccountSnapshot['resume_action']
  snapshot: AccountSnapshot
  message: string
}

export interface AccountDataExportResponse {
  public_safe: boolean
  public_state: 'ready' | string
  filename: string
  content_type: string
  summary: {
    reader_session_count: number
    creator_draft_count: number
    subscription_count: number
    active_session_count: number
  }
  package: Record<string, unknown>
  message: string
}

export interface AccountDeletePreviewResponse {
  public_safe: boolean
  public_state: 'requires_confirmation' | string
  account: {
    account_id: string
    actor_id: string
    display_name?: string | null
  }
  summary: {
    reader_session_count: number
    creator_draft_count: number
    active_subscription_count: number
    active_session_count: number
  }
  consequences: Array<{
    kind: string
    label: string
    count: number
    action: string
  }>
  confirmation_required: string
  message: string
}

export interface AccountDeleteConfirmResponse {
  public_safe: boolean
  public_state: 'deleted' | string
  account: {
    account_id: string
    actor_id: string
    status: string
  }
  summary: {
    reader_sessions_deleted: number
    reader_chapters_deleted: number
    reader_choices_deleted: number
    creator_drafts_deleted: number
    subscriptions_marked_for_closure: number
    sessions_revoked: number
  }
  retained_records: string[]
  message: string
}

export interface CustomerPortalResponse {
  portal: {
    url?: string
    [key: string]: unknown
  }
}

export interface CustomerExportPayload {
  report_type: string
  filename: string
  content_type: string
  content?: string | Record<string, unknown>
  content_base64?: string
}

export interface AuditExportResponse {
  audit_export?: Record<string, unknown>
  export_payload?: Record<string, unknown>
  [key: string]: unknown
}

export interface FeatureAvailability {
  supported: boolean
  code: string
  reason: string
  nextAction?: string
}

export interface WsEvent<T = Record<string, unknown>> {
  type: string
  payload: T
  receivedAt: string
}

export interface DeviationAnalysis {
  totalScore: number
  breakdown: {
    character: number
    plot: number
    theme: number
  }
  trend: 'increasing' | 'decreasing' | 'stable'
  maxPossible: number
  ifBranchCount: number
  parallelWorlds: number
}

export interface SoulDimension {
  label: string
  value: number
  max: number
}

export interface StudioNode {
  id: string
  title: string
  type: 'root' | 'branch' | 'end'
  x: number
  y: number
  description: string
  status: 'active' | 'draft'
}

export interface NodeConnection {
  from: string
  to: string
  label?: string
}

export interface BackendErrorDetail {
  code?: string
  reason?: string
  stage?: string
  retryable?: boolean
  action_hint?: string
  can_resend_verification?: boolean
  next_allowed_at?: string | null
  identity?: AuthIdentity
  [key: string]: unknown
}

export interface MembershipPlan {
  id: string
  name: string
  price: number
  period: 'monthly' | 'yearly'
  features: string[]
  isCurrent: boolean
  expiresAt: string | null
}

export interface InkPackage {
  id: string
  amount: number
  bonus: number
  price: number
  isRecommended: boolean
}
