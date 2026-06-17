import type {
  AuthIdentity,
  MembershipTier,
  ReaderChapterView,
  ReaderReplayView,
  SubscriptionStatus,
  User,
} from '@/types'

const WORLD_COVERS = [
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200',
  'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200',
  'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=1200',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200',
  'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1200',
  'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200',
]

const MEMBERSHIP_LABELS: Record<MembershipTier, string> = {
  free: 'Free',
  play_pass: 'Play Pass',
  creator_pass: 'Creator Pass',
  studio_pass: 'Studio Pass',
  unknown: 'Unknown',
}

function hashString(input: string): number {
  let hash = 0
  for (const char of input) {
    hash = (hash << 5) - hash + char.charCodeAt(0)
    hash |= 0
  }
  return Math.abs(hash)
}

export function isEmailLike(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.includes('@')
}

export function normalizeMembershipTier(value: string | null | undefined): MembershipTier {
  if (!value) return 'free'
  if (value === 'play_pass' || value === 'creator_pass' || value === 'studio_pass') return value
  if (value === 'free') return value
  return 'unknown'
}

export function membershipLabel(tier: string | null | undefined, fallback?: string | null): string {
  const normalized = normalizeMembershipTier(tier)
  return fallback?.trim() || MEMBERSHIP_LABELS[normalized]
}

export function availableCreditBalance(subscription: SubscriptionStatus | null): number {
  if (!subscription) return 0
  return Object.values(subscription.wallets || {}).reduce((total, wallet) => total + Number(wallet.balance || 0), 0)
}

export function mapIdentityToUser(identity: AuthIdentity, subscription: SubscriptionStatus | null): User {
  const accountId = String(identity.account_id || identity.actor_id || '')
  const email = String(identity.email_address || (isEmailLike(identity.actor_id) ? identity.actor_id : '') || '')
  const tier = normalizeMembershipTier(subscription?.effective_tier || subscription?.subscription?.tier_id || 'free')

  return {
    id: String(identity.actor_id || ''),
    accountId,
    username: String(identity.actor_id || ''),
    displayName: String(identity.display_name || identity.actor_id || 'NarrativeOS User'),
    avatar: '',
    email,
    emailVerified: Boolean(identity.email_verified),
    verificationRequired: Boolean(identity.verification_required),
    inkBalance: availableCreditBalance(subscription),
    membershipTier: tier,
    membershipLabel: membershipLabel(tier, subscription?.subscription?.display_name),
    membershipExpiresAt: subscription?.subscription?.period_end || null,
    createdAt: String(identity.created_at || ''),
  }
}

export function coverImageForWorld(worldId: string): string {
  return WORLD_COVERS[hashString(worldId) % WORLD_COVERS.length]
}

export function buildChapterViewFromReplay(
  view: ReaderReplayView,
  sessionId: string,
  worldId: string,
  worldVersionId: string,
  chapterIndex: number,
): ReaderChapterView {
  return {
    sessionId,
    worldId,
    worldVersionId,
    chapterId: `${sessionId}_replay_${chapterIndex}`,
    chapterIndex,
    chapterTitle: String(view.chapter_title || `第 ${chapterIndex} 章`),
    recap: typeof view.recap === 'string' ? view.recap : undefined,
    body: view.body,
    relationshipHints: Array.isArray(view.relationship_hints) ? view.relationship_hints : [],
    choices: Array.isArray(view.choices)
      ? view.choices.map((choice, index) => ({
          choiceId: `choice_${chapterIndex}_${index + 1}`,
          text: choice,
          motive: view.scene_card?.summary,
          emotionalCost: '继续推进当前章节',
          accessTier: 'free',
          priceHint: 0,
        }))
      : [],
    canContinue: Boolean(view.can_continue),
    paywall: {
      required: false,
      reason: 'replay_loaded',
      quote: 0,
      access_tier: 'free',
    },
    quality_trace_id: null,
  }
}
