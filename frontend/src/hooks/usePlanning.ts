import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { QUERY_KEYS } from '../lib/queryClient'
import type { CropPlan, Task, CreatePlanInput, CreateTaskInput, TaskStatus } from '../types'

export function usePlans(farmId?: string, status?: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.tasks, 'plans', farmId, status],
    queryFn: async () => {
      const res = await api.get<CropPlan[]>('/api/planning', {
        params: { farmId, status },
      })
      return res.data
    },
  })
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.tasks, 'plan', id],
    queryFn: async () => {
      const res = await api.get<CropPlan>(`/api/planning/${id}`)
      return res.data
    },
    enabled: !!id,
  })
}

export function useTodayTasks() {
  return useQuery({
    queryKey: QUERY_KEYS.todayTasks,
    queryFn: async () => {
      const res = await api.get<Task[]>('/api/planning/tasks/today')
      return res.data
    },
    staleTime: 1000 * 30,
  })
}

export function useTasksByDate(start: string, end: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.tasks, 'by-date', start, end],
    queryFn: async () => {
      const res = await api.get<Task[]>('/api/planning/tasks/by-date', {
        params: { start, end },
      })
      return res.data
    },
  })
}

export function useCreatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePlanInput) => {
      const res = await api.post<CropPlan>('/api/planning', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks })
    },
  })
}

export function useUpdatePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreatePlanInput> }) => {
      const res = await api.put<CropPlan>(`/api/planning/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks })
    },
  })
}

export function useDeletePlan() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/planning/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks })
    },
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTaskInput) => {
      const res = await api.post<Task>('/api/planning/tasks', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ status: TaskStatus }> }) => {
      const res = await api.put<Task>(`/api/planning/tasks/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks })
    },
  })
}

export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/planning/tasks/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tasks })
    },
  })
}