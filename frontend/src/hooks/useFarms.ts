import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { QUERY_KEYS } from '../lib/queryClient'
import type { Farm, CreateFarmInput } from '../types'

interface FarmsResponse {
  farms: Farm[]
  total: number
  page: number
  limit: number
}

export function useFarms(page = 1, limit = 12) {
  return useQuery({
    queryKey: [...QUERY_KEYS.farms, page, limit],
    queryFn: async () => {
      const res = await api.get<FarmsResponse>('/api/farms', {
        params: { page, limit },
      })
      return res.data
    },
  })
}

export function useFarm(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.farm(id),
    queryFn: async () => {
      const res = await api.get<Farm>(`/api/farms/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useCreateFarm() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateFarmInput) => {
      const res = await api.post<Farm>('/api/farms', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.farms })
    },
  })
}

export function useUpdateFarm() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateFarmInput> }) => {
      const res = await api.put<Farm>(`/api/farms/${id}`, data)
      return res.data
    },
    onSuccess: (farm) => {
      queryClient.setQueryData(QUERY_KEYS.farm(farm.id), farm)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.farms })
    },
  })
}

export function useDeleteFarm() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/farms/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.farms })
    },
  })
}