import { api } from './client'
import type { MarketTrendPayload } from '@/features/market/trends'

export const marketApi = {
  getTrends: (cadence: 'weekly' | 'monthly' = 'weekly') => {
    if (cadence === 'weekly') return api.get<MarketTrendPayload>('/market/trends')
    return api.post<MarketTrendPayload>('/market/trends/scan', { cadence, force: false })
  },

  scanTrends: (cadence: 'weekly' | 'monthly' = 'weekly') =>
    api.post<MarketTrendPayload>('/market/trends/scan', { cadence, force: true }),
}
