import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { QUERY_KEYS } from '../lib/queryClient'
import type { MarketPrice, MarketPriceHistory } from '../types'

export function useMarketPrices(page = 1, limit = 20, crop?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.marketPrices, page, limit, crop],
    queryFn: async () => {
      const res = await api.get<{ prices: MarketPrice[]; total: number }>('/api/market/prices', {
        params: { page, limit, crop },
      })
      return res.data
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useMarketPriceHistory(crop: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.marketPrices, 'history', crop],
    queryFn: async () => {
      const res = await api.get<MarketPriceHistory>(`/api/market/prices/${crop}`)
      return res.data
    },
    enabled: !!crop,
    staleTime: 1000 * 60 * 5,
  })
}