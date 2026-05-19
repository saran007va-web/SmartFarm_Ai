import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { useAuthStore } from '../stores/authStore'
import type { AuthResponse, User } from '../types'

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await api.post<AuthResponse>('/api/auth/login', credentials)
      return res.data
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token)
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; email: string; password: string }) => {
      const nameParts = data.name.split(' ')
      const res = await api.post<{ message: string; user: any }>('/api/auth/register', {
        firstName: nameParts[0],
        lastName: nameParts.slice(1).join(' ') || undefined,
        email: data.email,
        password: data.password
      })
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })
}

export function useCurrentUser() {
  const { isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await api.get<User>('/api/auth/me')
      return res.data
    },
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 30,
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; avatarUrl?: string }) => {
      const res = await api.put<User>('/api/auth/profile', data)
      return res.data
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['user'], user)
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { oldPassword: string; newPassword: string }) => {
      await api.post('/api/auth/change-password', data)
    },
  })
}