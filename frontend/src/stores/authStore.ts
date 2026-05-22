import { create } from 'zustand'
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
    // Check for existing token on load
    const storedToken = localStorage.getItem('vaagai_token')
    const storedUserId = localStorage.getItem('vaagai_user_id')

    if (storedToken) {
      // Validate token with backend
      api.get('/api/auth/me')
        .then(res => {
          set({ user: res.data.user, token: storedToken, loading: false })
        })
        .catch(() => {
          localStorage.removeItem('vaagai_token')
          localStorage.removeItem('vaagai_user_id')
          set({ user: null, token: null, loading: false })
        })
    } else {
      set({ loading: false })
    }

    // Listen for messages from OAuth redirect (for Google OAuth)
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { user, token } = event.data
        localStorage.setItem('vaagai_token', token)
        localStorage.setItem('vaagai_user_id', user.id)
        set({ user, token, loading: false })
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        set({ loading: false })
      }
    })
  },

  signInWithGoogle: async () => {
    // Redirect to backend Google OAuth endpoint
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002'
    window.location.href = `${backendUrl}/api/auth/google`
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
    try {
      await api.post('/api/auth/logout')
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('vaagai_token')
    localStorage.removeItem('vaagai_user_id')
    set({ user: null, token: null })
  },
}))