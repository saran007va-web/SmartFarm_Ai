import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { QUERY_KEYS } from '../lib/queryClient'
import type { Notification, NotificationResponse } from '../types'

export function useNotifications(page = 1, limit = 20) {
  return useQuery({
    queryKey: [...QUERY_KEYS.notifications, page, limit],
    queryFn: async () => {
      const res = await api.get<NotificationResponse>('/api/notifications', {
        params: { page, limit },
      })
      return res.data
    },
    staleTime: 1000 * 30,
  })
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await api.post('/api/notifications/mark-read', { ids })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications })
    },
  })
}