import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import {
  User, Lock, Bell, Sun, Moon, Loader2, Check,
  Eye, EyeOff,
} from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role: string
  createdAt: string
}

type SettingsTab = 'profile' | 'security' | 'preferences'

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'preferences', label: 'Preferences', icon: Bell },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })
  const queryClient = useQueryClient()

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await api.get<UserProfile>('/api/auth/me')
      return res.data
    },
  })

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: { name: string }) => {
      const res = await api.put<UserProfile>('/api/auth/profile', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })

  // Change password mutation
  const changePassword = useMutation({
    mutationFn: async (data: { oldPassword: string; newPassword: string }) => {
      await api.post('/api/auth/change-password', data)
    },
  })

  // Profile form state
  const [name, setName] = useState('')
  useEffect(() => {
    if (profile) setName(profile.name)
  }, [profile])

  // Security form state
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Toggle dark mode
  const toggleDarkMode = () => {
    const isDark = !darkMode
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    setDarkMode(isDark)
  }

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfile.mutate({ name })
  }

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    changePassword.mutate(
      { oldPassword, newPassword },
      {
        onSuccess: () => {
          setPasswordSuccess(true)
          setOldPassword('')
          setNewPassword('')
          setConfirmPassword('')
        },
        onError: () => {
          setPasswordError('Current password is incorrect')
        },
      }
    )
  }

  return (
    <div className="page-container">
      {/* Tabs */}
      <div className="tab-list mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card p-6 max-w-2xl">
          <h3 className="section-title mb-6">Profile Information</h3>
          {isLoading ? (
            <div className="space-y-4">
              <div className="skeleton w-20 h-20 rounded-full" />
              <div className="skeleton w-48 h-6 rounded" />
              <div className="skeleton w-64 h-4 rounded" />
            </div>
          ) : (
            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="flex items-center justify-center rounded-full text-white font-bold"
                  style={{
                    width: 80,
                    height: 80,
                    background: 'var(--color-primary)',
                    fontFamily: 'Sora, sans-serif',
                    fontSize: '1.5rem',
                  }}
                >
                  {profile?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {profile?.name}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {profile?.role}
                  </div>
                </div>
              </div>

              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={profile?.email || ''}
                  disabled
                  style={{ opacity: 0.6 }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={updateProfile.isPending}
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card p-6 max-w-2xl">
          <h3 className="section-title mb-6">Change Password</h3>

          {passwordError && (
            <div className="alert alert-danger mb-4">{passwordError}</div>
          )}
          {passwordSuccess && (
            <div className="alert alert-success mb-4">
              <Check size={16} />
              Password changed successfully
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  className="input pr-10"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? (
                    <EyeOff size={16} style={{ color: 'var(--color-text-muted)' }} />
                  ) : (
                    <Eye size={16} style={{ color: 'var(--color-text-muted)' }} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="label">New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Confirm New Password</label>
              <input
                type={showPasswords ? 'text' : 'password'}
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={changePassword.isPending}
            >
              {changePassword.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Password'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="card p-6 max-w-2xl">
          <h3 className="section-title mb-6">Preferences</h3>

          <div className="space-y-6">
            {/* Dark Mode */}
            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <div className="font-medium">Dark Mode</div>
                <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Switch between light and dark theme
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className="btn btn-secondary btn-icon"
                style={{ borderRadius: 'var(--radius-md)' }}
              >
                {darkMode ? (
                  <Moon size={18} style={{ color: 'var(--color-text-secondary)' }} />
                ) : (
                  <Sun size={18} style={{ color: 'var(--color-text-secondary)' }} />
                )}
              </button>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <div className="font-medium">Language</div>
                <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Select your preferred language
                </div>
              </div>
              <select className="input select w-auto" defaultValue="en">
                <option value="en">English</option>
              </select>
            </div>

            {/* Temperature Unit */}
            <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <div className="font-medium">Temperature Unit</div>
                <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Display temperatures in Celsius or Fahrenheit
                </div>
              </div>
              <select className="input select w-auto" defaultValue="celsius">
                <option value="celsius">°Celsius</option>
                <option value="fahrenheit">°Fahrenheit</option>
              </select>
            </div>

            {/* Notifications */}
            <div className="py-3">
              <div className="font-medium mb-3">Notification Preferences</div>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Task reminders</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Market price alerts</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Weather alerts</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}