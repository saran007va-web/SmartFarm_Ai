import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
    },
  },
})

export const QUERY_KEYS = {
  farms: ['farms'] as const,
  farm: (id: string) => ['farm', id] as const,
  tasks: ['tasks'] as const,
  todayTasks: ['tasks', 'today'] as const,
  marketPrices: ['market', 'prices'] as const,
  weather: (lat: number, lng: number) => ['weather', lat, lng] as const,
  analytics: (farmId?: string) => ['analytics', farmId] as const,
  notifications: ['notifications'] as const,
  uploads: ['uploads'] as const,
  health: ['health'] as const,
}