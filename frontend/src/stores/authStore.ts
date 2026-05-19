import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import api from '../lib/api'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,

  initialize: () => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        try {
          const { data } = await api.post('/api/auth/google/sync', {
            user: session.user,
          })
          if (data.user?.id) {
            localStorage.setItem('vaagai_user_id', data.user.id)
          }
          if (data.token) {
            localStorage.setItem('vaagai_token', data.token)
          }
          set({ user: data.user, token: data.token || null, loading: false })
        } catch {
          set({ loading: false })
        }
      } else {
        localStorage.removeItem('vaagai_token')
        localStorage.removeItem('vaagai_user_id')
        set({ user: null, token: null, loading: false })
      }
    })
  },

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  },

  signInWithEmail: async (email, password) => {
    console.log('Attempting login with:', email)
    try {
      const response = await api.post('/api/auth/login', { email, password })
      console.log('Full login response:', response)
      const data = response.data
      console.log('Login response data:', data)
      localStorage.setItem('vaagai_token', data.token)
      if (data.user?.id) {
        localStorage.setItem('vaagai_user_id', data.user.id)
        console.log('Set userId:', data.user.id)
      } else {
        console.warn('No user id in response, using email as fallback')
        localStorage.setItem('vaagai_user_id', data.user?.email || email)
      }
      set({ user: data.user, token: data.token })
    } catch (err) {
      console.error('Login API error:', err)
      throw err
    }
  },

  signUpWithEmail: async (name, email, password) => {
    const nameParts = name.split(' ')
    const { data } = await api.post<{ user: any; token: string }>('/api/auth/register', {
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ') || undefined,
      email,
      password
    })
    localStorage.setItem('vaagai_token', data.token)
    if (data.user?.id) {
      localStorage.setItem('vaagai_user_id', data.user.id)
    }
    set({ user: data.user, token: data.token })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('vaagai_token')
    localStorage.removeItem('vaagai_user_id')
    set({ user: null, token: null })
  },
}))