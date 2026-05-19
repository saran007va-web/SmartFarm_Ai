import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import { QUERY_KEYS } from '../lib/queryClient'
import type { WeatherCurrent, WeatherForecast, WeatherLocation } from '../types'

export function useWeather(lat: number, lng: number) {
  return useQuery({
    queryKey: QUERY_KEYS.weather(lat, lng),
    queryFn: async () => {
      const res = await api.get<WeatherCurrent>('/api/weather/current', {
        params: { lat, lng },
      })
      return res.data
    },
    enabled: !!lat && !!lng,
    staleTime: 1000 * 60 * 10,
  })
}

export function useWeatherForecast(lat: number, lng: number, days = 7) {
  return useQuery({
    queryKey: [...QUERY_KEYS.weather(lat, lng), 'forecast', days],
    queryFn: async () => {
      const res = await api.get<WeatherForecast[]>('/api/weather/forecast', {
        params: { lat, lng, days },
      })
      return res.data
    },
    enabled: !!lat && !!lng,
    staleTime: 1000 * 60 * 30,
  })
}

export function useSearchLocations(query: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.weather(0, 0), 'search', query],
    queryFn: async () => {
      const res = await api.get<WeatherLocation[]>('/api/weather/locations', {
        params: { q: query },
      })
      return res.data
    },
    enabled: query.length >= 2,
  })
}