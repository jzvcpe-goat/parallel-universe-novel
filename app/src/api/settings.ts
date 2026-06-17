import { api, unsupportedFeature } from './client'
import type {
  CheckoutCompletionResponse,
  CheckoutSession,
  CheckoutStatusResponse,
  CheckoutStartResponse,
  SubscriptionStatus,
} from '@/types'

export const settingsApi = {
  getSubscriptionStatus: (payload?: { accountId?: string | null; readerId?: string | null }) => {
    if (payload?.accountId) {
      return api.get<SubscriptionStatus>(`/reader/subscription?account_id=${encodeURIComponent(payload.accountId)}`)
    }
    if (payload?.readerId) {
      return api.get<SubscriptionStatus>(`/reader/subscription?reader_id=${encodeURIComponent(payload.readerId)}`)
    }
    return api.get<SubscriptionStatus>('/reader/subscription')
  },

  startCheckout: (payload: { accountId: string; tierId: string }) =>
    api.post<CheckoutStartResponse>('/reader/checkout/start', {
      account_id: payload.accountId,
      tier_id: payload.tierId,
    }),

  getCheckoutStatus: (payload: { accountId: string; checkoutSession: CheckoutSession }) => {
    const checkoutSessionId = payload.checkoutSession.checkout_session_id || payload.checkoutSession.session_id
    return api.get<CheckoutStatusResponse>(
      `/reader/checkout/${encodeURIComponent(String(checkoutSessionId))}/status?account_id=${encodeURIComponent(payload.accountId)}`,
    )
  },

  completeCheckout: async (payload: { checkoutSession: CheckoutSession; accountId: string }) => {
    const checkoutSessionId = payload.checkoutSession.checkout_session_id || payload.checkoutSession.session_id
    const status = await api.post<CheckoutStatusResponse>('/reader/checkout/return', {
      account_id: payload.accountId,
      checkout_session_id: checkoutSessionId,
    })
    const subscription = await settingsApi.getSubscriptionStatus({ accountId: payload.accountId })
    return {
      checkout: status.checkout || subscription.checkout_session || subscription.latest_checkout_session || payload.checkoutSession,
      subscription: status.subscription || subscription.subscription,
      wallets: status.wallets,
      effective_subscription: subscription.subscription,
      remote_checkout_status: status.checkout?.status || subscription.checkout_session?.status || subscription.latest_checkout_session?.status,
      public_state: status.public_state,
      recommended_action: status.recommended_action,
      message: status.message,
    } satisfies CheckoutCompletionResponse
  },

  startCustomerPortal: (payload: { accountId: string; returnUrl?: string }) => {
    void payload
    return unsupportedFeature(
      'customer_portal_unavailable',
      'The committed backend baseline does not expose customer portal sessions.',
    )
  },

  exportReport: (reportType: 'workspace_json' | 'workspace_csv' | 'workspace_pdf' | 'invoice_csv') => {
    void reportType
    return unsupportedFeature(
      'customer_export_unavailable',
      'The committed backend baseline does not expose customer export endpoints.',
    )
  },

  auditExport: () =>
    unsupportedFeature(
      'customer_audit_export_unavailable',
      'The committed backend baseline does not expose customer audit exports.',
    ),
}
