import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import {
  User, Lock, Palette, Key, Bell, Shield, LogOut, Loader2,
  Eye, EyeOff, Moon, Sun, Check, Copy, AlertTriangle,
  Settings as SettingsIcon, ChevronRight, Mail, Calendar
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useNavigate } from 'react-router-dom'

interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  createdAt: string
  lastLoginAt?: string
}

type SettingsSection = 'account' | 'appearance' | 'api' | 'security' | 'notifications'

interface NavItem {
  id: SettingsSection
  label: string
  icon: React.ElementType
  description: string
}

const navItems: NavItem[] = [
  { id: 'account', label: 'Account', icon: User, description: 'Personal information' },
  { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Theme & display' },
  { id: 'api', label: 'API & Integrations', icon: Key, description: 'Project secrets' },
  { id: 'security', label: 'Security', icon: Shield, description: 'Password & auth' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Preferences' },
]

export default function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('account')
  const [darkMode, setDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark')
  })
  const queryClient = useQueryClient()
  const { signOut } = useAuthStore()
  const navigate = useNavigate()

  // Fetch user profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await api.get<{ user: UserProfile }>('/api/auth/me')
      return res.data.user
    },
  })

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      const res = await api.put<{ user: UserProfile }>('/api/auth/profile', data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
    },
  })

  // Change password mutation
  const changePassword = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      await api.post('/api/auth/change-password', data)
    },
  })

  // State
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [profileSuccess, setProfileSuccess] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeys, setApiKeys] = useState<{ name: string; key: string; description: string }[]>([])

  // Initialize from profile
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '')
      setLastName(profile.lastName || '')
    }
  }, [profile])

  // Load API keys from env
  useEffect(() => {
    const keys = [
      { name: 'Supabase URL', key: import.meta.env.VITE_SUPABASE_URL || 'Not configured', description: 'Your Supabase project URL' },
      { name: 'Groq API', key: import.meta.env.VITE_GROQ_API_KEY ? '••••••••••••••••' : 'Not set', description: 'AI processing API' },
      { name: 'Weather API', key: import.meta.env.VITE_WEATHER_API_KEY ? '••••••••••••••••' : 'Not set', description: 'Open-Meteo weather data' },
      { name: 'AGMARKNET API', key: import.meta.env.VITE_AGMARKNET_API_KEY ? '••••••••••••••••' : 'Not set', description: 'Market price data' },
    ]
    setApiKeys(keys)
  }, [])

  // Toggle dark mode
  const toggleDarkMode = () => {
    const isDark = !darkMode
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    setDarkMode(isDark)
  }

  // Logout
  const handleLogout = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (e) {
      navigate('/login')
    }
  }

  // Save profile
  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfile.mutate(
      { firstName, lastName },
      {
        onSuccess: () => {
          setProfileSuccess(true)
          setTimeout(() => setProfileSuccess(false), 3000)
        },
      }
    )
  }

  // Change password
  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setPasswordSuccess(true)
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
        },
        onError: () => {
          setPasswordError('Current password is incorrect')
        },
      }
    )
  }

  const getInitials = (first?: string, last?: string) => {
    const f = first?.charAt(0) || ''
    const l = last?.charAt(0) || ''
    return (f + l).toUpperCase() || 'U'
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="page-container">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <nav className="lg:w-72 flex-shrink-0">
          <div className="card p-4 lg:sticky lg:top-4">
            <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div
                className="flex items-center justify-center rounded-xl text-white font-bold"
                style={{
                  width: 48,
                  height: 48,
                  background: 'var(--color-primary)',
                  fontFamily: 'Sora, sans-serif',
                }}
              >
                {getInitials(profile?.firstName, profile?.lastName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {profile?.firstName} {profile?.lastName}
                </div>
                <div className="text-sm truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {profile?.email}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${
                    activeSection === item.id
                      ? 'bg-[var(--color-primary-light)] text-[var(--color-primary-dark)]'
                      : 'hover:bg-[var(--color-muted)]'
                  }`}
                >
                  <item.icon size={18} />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.label}</div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
                </button>
              ))}
            </div>

            {/* Logout Button */}
            <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition"
              >
                <LogOut size={18} />
                <div className="font-medium text-sm">Sign Out</div>
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Account Section */}
          {activeSection === 'account' && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <User size={24} style={{ color: 'var(--color-primary)' }} />
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Account Settings
                </h2>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  <div className="skeleton w-20 h-20 rounded-full" />
                  <div className="skeleton w-48 h-6 rounded" />
                </div>
              ) : (
                <form onSubmit={handleProfileSave} className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4 pb-6" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div
                      className="flex items-center justify-center rounded-full text-white font-bold"
                      style={{
                        width: 80,
                        height: 80,
                        background: 'var(--color-primary)',
                        fontFamily: 'Sora, sans-serif',
                        fontSize: '1.75rem',
                      }}
                    >
                      {getInitials(profile?.firstName, profile?.lastName)}
                    </div>
                    <div>
                      <div className="font-semibold text-lg">
                        {profile?.firstName} {profile?.lastName}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {profile?.role}
                      </div>
                    </div>
                  </div>

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">First Name</label>
                      <input
                        type="text"
                        className="input"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Last Name</label>
                      <input
                        type="text"
                        className="input"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Email Address</label>
                    <div className="flex items-center gap-2">
                      <Mail size={16} style={{ color: 'var(--color-text-muted)' }} />
                      <input
                        type="email"
                        className="input"
                        value={profile?.email || ''}
                        disabled
                        style={{ opacity: 0.6 }}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Contact support to change your email
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    <Calendar size={14} />
                    <span>Member since {formatDate(profile?.createdAt)}</span>
                  </div>

                  {profileSuccess && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                      <Check size={16} />
                      Profile updated successfully
                    </div>
                  )}

                  <div className="flex gap-3">
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
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <Palette size={24} style={{ color: 'var(--color-primary)' }} />
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Appearance
                </h2>
              </div>

              <div className="space-y-6">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
                  <div className="flex items-center gap-4">
                    <div
                      className="flex items-center justify-center rounded-lg"
                      style={{
                        width: 48,
                        height: 48,
                        background: darkMode ? 'var(--color-surface-dark-3)' : 'var(--color-surface)',
                      }}
                    >
                      {darkMode ? (
                        <Moon size={24} style={{ color: 'var(--color-primary)' }} />
                      ) : (
                        <Sun size={24} style={{ color: 'var(--color-primary)' }} />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">Theme</div>
                      <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                        {darkMode ? 'Dark mode is enabled' : 'Light mode is enabled'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={toggleDarkMode}
                    className="relative w-14 h-8 rounded-full transition-colors"
                    style={{
                      background: darkMode ? 'var(--color-primary)' : 'var(--color-border)',
                    }}
                  >
                    <div
                      className="absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform"
                      style={{
                        transform: darkMode ? 'translateX(28px)' : 'translateX(4px)',
                      }}
                    />
                  </button>
                </div>

                {/* Theme Info */}
                <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} style={{ color: 'var(--color-text-muted)' }} className="mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">About themes</div>
                      <div className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        VaagAi supports light and dark themes. Dark mode is recommended for low-light conditions and reduces eye strain during nighttime use.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API & Integrations Section */}
          {activeSection === 'api' && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <Key size={24} style={{ color: 'var(--color-primary)' }} />
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
                  API & Integrations
                </h2>
              </div>

              <div className="space-y-4">
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  These are your project configuration values. Keep sensitive keys secure and never share them publicly.
                </p>

                {apiKeys.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg"
                    style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{item.name}</div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setShowApiKey((s) => !s)}
                      >
                        {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <div
                      className="font-mono text-sm p-3 rounded"
                      style={{ background: 'var(--color-surface)', marginBottom: 8 }}
                    >
                      {item.key}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {item.description}
                    </div>
                  </div>
                ))}

                <div className="p-4 rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/50">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-600 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm text-amber-800 dark:text-amber-200">Security Notice</div>
                      <div className="text-sm mt-1 text-amber-700 dark:text-amber-300">
                        API keys are masked for security. Contact your administrator to update these values.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield size={24} style={{ color: 'var(--color-primary)' }} />
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Security
                </h2>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div>
                  <h3 className="font-medium mb-4">Change Password</h3>

                  {passwordError && (
                    <div className="alert alert-danger mb-4">{passwordError}</div>
                  )}
                  {passwordSuccess && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950 p-3 rounded-lg mb-4">
                      <Check size={16} />
                      Password changed successfully
                    </div>
                  )}

                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="label">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords ? 'text' : 'password'}
                          className="input pr-10"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
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
                        minLength={8}
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
                        minLength={8}
                      />
                    </div>
                  </div>
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
                    'Update Password'
                  )}
                </button>
              </form>

              {/* Session Info */}
              <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <Lock size={18} style={{ color: 'var(--color-text-muted)' }} />
                  <h3 className="font-medium">Active Sessions</h3>
                </div>
                <div className="p-4 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Current Session</div>
                      <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Active now
                      </div>
                    </div>
                    <div className="px-2 py-1 rounded text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      Active
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <Bell size={24} style={{ color: 'var(--color-primary)' }} />
                <h2 className="text-xl font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Notifications
                </h2>
              </div>

              <div className="space-y-6">
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Choose what notifications you want to receive
                </p>

                <div className="space-y-4">
                  {[
                    { label: 'Weather Alerts', description: 'Get notified about weather changes and forecasts' },
                    { label: 'Market Price Updates', description: 'Receive alerts when crop prices change significantly' },
                    { label: 'Task Reminders', description: 'Daily reminders for scheduled farming tasks' },
                    { label: 'Crop Stage Updates', description: 'Notifications when crops reach growth stages' },
                    { label: 'System Updates', description: 'Important platform updates and maintenance' },
                  ].map((item, index) => (
                    <label
                      key={index}
                      className="flex items-center justify-between p-4 rounded-lg cursor-pointer"
                      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                    >
                      <div>
                        <div className="font-medium">{item.label}</div>
                        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                          {item.description}
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer peer-checked:bg-[var(--color-primary)] cursor-pointer transition-colors" />
                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                      </div>
                    </label>
                  ))}
                </div>

                <button className="btn btn-primary">
                  Save Preferences
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}