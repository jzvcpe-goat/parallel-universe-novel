import type {
  AuthIdentity,
  MembershipTier,
  SubscriptionStatus,
  User,
} from '@/types'

const MEMBERSHIP_LABELS: Record<MembershipTier, string> = {
  free: 'Free',
  play_pass: 'Play Pass',
  creator_pass: 'Creator Pass',
  studio_pass: 'Studio Pass',
  unknown: 'Unknown',
}

function isEmailLike(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.includes('@')
}

function normalizeMembershipTier(value: string | null | undefined): MembershipTier {
  if (!value) return 'free'
  if (value === 'play_pass' || value === 'creator_pass' || value === 'studio_pass') return value
  if (value === 'free') return value
  return 'unknown'
}

export function membershipLabel(tier: string | null | undefined, fallback?: string | null): string {
  const normalized = normalizeMembershipTier(tier)
  return fallback?.trim() || MEMBERSHIP_LABELS[normalized]
}

function availableCreditBalance(subscription: SubscriptionStatus | null): number {
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
