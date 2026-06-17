import { useCallback, useState } from 'react'
import { settingsApi } from '@/api'
import type { CheckoutCompletionResponse, CheckoutSession, SubscriptionStatus } from '@/types'

export function useSettings() {
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [checkout, setCheckout] = useState<CheckoutSession | null>(null)
  const [completion, setCompletion] = useState<CheckoutCompletionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSubscription = useCallback(async (accountId?: string | null) => {
    setIsLoading(true)
    setError(null)
    try {
      const status = await settingsApi.getSubscriptionStatus({ accountId })
      setSubscription(status)
      if (status.checkout_session || status.latest_checkout_session) {
        setCheckout(status.checkout_session || status.latest_checkout_session || null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '订阅状态加载失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const startCheckout = useCallback(async (accountId: string, tierId: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await settingsApi.startCheckout({ accountId, tierId })
      setCheckout(response.checkout)
      setCompletion(null)
      return response.checkout
    } catch (err) {
      setError(err instanceof Error ? err.message : '结账启动失败')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const completeCheckout = useCallback(async (accountId: string, checkoutSession: CheckoutSession) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await settingsApi.completeCheckout({ accountId, checkoutSession })
      setCompletion(response)
      const status = await settingsApi.getSubscriptionStatus({ accountId })
      setSubscription(status)
      setCheckout(status.checkout_session || status.latest_checkout_session || checkoutSession)
      return response
    } catch (err) {
      setError(err instanceof Error ? err.message : '开通状态检查失败')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    subscription,
    checkout,
    completion,
    isLoading,
    error,
    loadSubscription,
    startCheckout,
    completeCheckout,
  }
}
