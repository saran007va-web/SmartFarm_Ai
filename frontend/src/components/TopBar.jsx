import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Moon, Sun, Bell, Search, ChevronDown, LogOut, Menu, X,
  Settings, CircleCheckBig, Clock3, Tractor, Sprout, BarChart3, Cloud,
} from 'lucide-react'
import { useCurrentUser } from '../hooks/useAuth'
import { useTodayTasks } from '../hooks/usePlanning'
import { useNotifications } from '../hooks/useNotifications'
import { useAuthStore } from '../stores/authStore'
import { useFarmStore } from './farm3d/farmStore'

function ThemeToggle({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="btn btn-ghost btn-icon relative overflow-hidden"
      style={{ borderRadius: 'var(--radius-md)' }}
    >
      <span className="absolute inset-0 flex items-center justify-center transition-all duration-300" style={{ opacity: isDark ? 0 : 1, transform: isDark ? 'rotate(90deg) scale(0.5)' : 'rotate(0deg) scale(1)' }}>
        <Sun size={17} strokeWidth={2} style={{ color: 'var(--color-text-secondary)' }} />
      </span>
      <span className="absolute inset-0 flex items-center justify-center transition-all duration-300" style={{ opacity: isDark ? 1 : 0, transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.5)' }}>
        <Moon size={17} strokeWidth={2} style={{ color: 'var(--color-text-secondary)' }} />
      </span>
    </button>
  )
}

const SITE_ROUTES = [
  { to: '/farm', label: '3D Farm', description: 'View and edit your farm in 3D', icon: Tractor },
  { to: '/recommendations', label: 'Crop Recommendations', description: 'Season-aware crop guidance', icon: Sprout },
  { to: '/plot-details', label: 'Plot Details', description: 'Inspect plots and create new ones', icon: BarChart3 },
  { to: '/calendar', label: 'Calendar', description: 'Daily activities and harvest view', icon: Clock3 },
  { to: '/market', label: 'Market Prices', description: 'Live crop price trends', icon: BarChart3 },
  { to: '/weather', label: 'Weather', description: 'Forecasts and alerts', icon: Cloud },
  { to: '/settings', label: 'Settings', description: 'Profile and preferences', icon: Settings },
]

export default function TopBar({ title, subtitle, status = 'connected', actions, onMenuToggle, menuOpen }) {
  const navigate = useNavigate()
  const { user: authUser, signOut } = useAuthStore()
  const { data: currentUser } = useCurrentUser()
  const { data: todayTasks } = useTodayTasks()
  const { data: notifications } = useNotifications(1, 6)
  const { farmName, crops } = useFarmStore()

  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const searchRef = useRef(null)
  const notificationsRef = useRef(null)
  const profileRef = useRef(null)

  const displayName = useMemo(() => {
    const full = [currentUser?.firstName || authUser?.firstName, currentUser?.lastName || authUser?.lastName].filter(Boolean).join(' ').trim()
    if (full) return full
    const localUser = localStorage.getItem('user')
    if (localUser) {
      try {
        const parsed = JSON.parse(localUser)
        const parsedName = [parsed?.firstName, parsed?.lastName].filter(Boolean).join(' ').trim() || parsed?.name
        if (parsedName) return parsedName
      } catch {
        // ignore parse issues
      }
    }
    return 'Farmer'
  }, [authUser, currentUser])

  const initials = useMemo(() => {
    return displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'F'
  }, [displayName])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    const results = []

    SITE_ROUTES.forEach((item) => {
      const haystack = `${item.label} ${item.description}`.toLowerCase()
      if (haystack.includes(q)) {
        results.push({ type: 'page', label: item.label, description: item.description, icon: item.icon, action: () => navigate(item.to) })
      }
    })

    crops.forEach((crop) => {
      const haystack = `${crop.name} ${crop.cropType} ${crop.notes || ''}`.toLowerCase()
      if (haystack.includes(q)) {
        results.push({ type: 'plot', label: crop.name, description: `${crop.cropType} · ${crop.stage}`, icon: Tractor, action: () => navigate('/farm') })
      }
    })

    ;(todayTasks || []).forEach((task) => {
      const haystack = `${task.title} ${task.farmName} ${task.status}`.toLowerCase()
      if (haystack.includes(q)) {
        results.push({ type: 'task', label: task.title, description: `${task.farmName} · due ${new Date(task.dueDate).toLocaleDateString()}`, icon: CircleCheckBig, action: () => navigate('/calendar') })
      }
    })

    ;(notifications?.notifications || []).forEach((item) => {
      const haystack = `${item.title} ${item.message} ${item.type}`.toLowerCase()
      if (haystack.includes(q)) {
        results.push({ type: 'notification', label: item.title, description: item.message, icon: Bell, action: () => setNotificationsOpen(true) })
      }
    })

    return results.slice(0, 8)
  }, [searchQuery, crops, todayTasks, notifications, navigate])

  const todayTaskNotifications = useMemo(() => {
    return (todayTasks || []).slice(0, 4).map((task) => ({
      id: task.id,
      title: task.title,
      message: `${task.farmName} · due ${new Date(task.dueDate).toLocaleDateString()}`,
      action: () => navigate('/calendar'),
    }))
  }, [todayTasks, navigate])

  const unreadNotifications = useMemo(() => {
    return notifications?.notifications?.filter((n) => !n.read) || []
  }, [notifications])

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved === 'dark' || (!saved && prefersDark)
    document.documentElement.classList.toggle('dark', isDark)
    setDark(isDark)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) setSearchOpen(false)
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) setNotificationsOpen(false)
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false)
    }
    window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleDark = () => {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    setDark(isDark)
  }

  return (
    <header
      className="flex items-center px-4 sm:px-6 gap-3 sm:gap-4"
      style={{
        height: 'var(--topbar-height)',
        background: 'linear-gradient(180deg, rgba(12, 20, 14, 0.98) 0%, rgba(16, 28, 18, 0.92) 100%)',
        backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(123, 207, 137, 0.14)',
      }}
    >
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X size={22} style={{ color: 'var(--color-text)' }} /> : <Menu size={22} style={{ color: 'var(--color-text)' }} />}
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#8dbf96' }}>
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]" />
          VaagAi Smart Farming Platform
        </div>
        <h1
          className="leading-none font-bold tracking-tight truncate"
          style={{
            fontSize: '1.0625rem',
            color: '#eefdf0',
            background: 'linear-gradient(90deg, #f1fff3 0%, #b8ffd0 45%, #7cf0a8 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            textShadow: '0 0 16px rgba(123, 241, 168, 0.08)',
          }}
        >
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-xs leading-none" style={{ color: '#95be9f' }}>{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div ref={searchRef} className="relative hidden md:block">
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className="flex h-10 w-[280px] items-center gap-2 rounded-2xl border px-3 text-left transition-colors hover:border-emerald-400/50"
            style={{ borderColor: 'rgba(123, 207, 137, 0.18)', background: 'rgba(255,255,255,0.03)' }}
          >
            <Search size={16} strokeWidth={2} style={{ color: '#90b69a' }} />
            <span className="text-sm" style={{ color: '#a7c9af' }}>Search plots, tasks, pages...</span>
          </button>

          {searchOpen && (
            <div className="absolute right-0 mt-2 w-[420px] rounded-2xl border p-3 shadow-xl z-50" style={{ borderColor: 'rgba(123, 207, 137, 0.18)', background: 'linear-gradient(180deg, #122118 0%, #0e1712 100%)' }}>
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search site data..."
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                style={{ borderColor: 'rgba(123, 207, 137, 0.16)', background: 'rgba(255,255,255,0.03)', color: '#eefdf0' }}
              />
              <div className="mt-3 max-h-72 overflow-y-auto space-y-2">
                {searchQuery.trim() ? (
                  searchResults.length > 0 ? searchResults.map((item, index) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={`${item.type}-${index}`}
                        type="button"
                        onClick={() => {
                          item.action()
                          setSearchOpen(false)
                          setSearchQuery('')
                        }}
                        className="flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition-colors hover:border-emerald-400/40 hover:bg-white/5"
                        style={{ borderColor: 'rgba(123, 207, 137, 0.12)' }}
                      >
                        <span className="mt-0.5 rounded-lg p-2" style={{ background: 'rgba(123, 241, 168, 0.08)' }}>
                          <Icon size={15} style={{ color: '#8ff0ab' }} />
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-medium" style={{ color: '#eefdf0' }}>{item.label}</span>
                          <span className="block text-xs" style={{ color: '#95be9f' }}>{item.description}</span>
                        </span>
                      </button>
                    )
                  }) : (
                    <div className="rounded-xl border px-3 py-4 text-sm" style={{ borderColor: 'rgba(123, 207, 137, 0.12)', color: '#95be9f' }}>
                      No results found.
                    </div>
                  )
                ) : (
                  <div className="rounded-xl border px-3 py-4 text-sm" style={{ borderColor: 'rgba(123, 207, 137, 0.12)', color: '#95be9f' }}>
                    Try searching plots, pages, tasks, or notifications.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((v) => !v)}
            className="btn btn-ghost btn-icon relative"
            style={{ borderRadius: 'var(--radius-md)' }}
            aria-label="Open notifications"
          >
            <Bell size={17} strokeWidth={2} style={{ color: '#90b69a' }} />
            {(unreadNotifications.length > 0 || todayTaskNotifications.length > 0) && (
              <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: 'var(--color-primary)', color: 'white' }}>
                {unreadNotifications.length + todayTaskNotifications.length}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-[380px] rounded-2xl border p-3 shadow-xl z-50" style={{ borderColor: 'rgba(123, 207, 137, 0.18)', background: 'linear-gradient(180deg, #122118 0%, #0e1712 100%)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold" style={{ color: '#eefdf0' }}>Notifications</div>
                  <div className="text-xs" style={{ color: '#95be9f' }}>Today tasks and recent alerts</div>
                </div>
                <div className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'rgba(123,241,168,0.08)', color: '#8ff0ab' }}>
                  {unreadNotifications.length + todayTaskNotifications.length}
                </div>
              </div>

              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#7fb58a' }}>Today Tasks</div>
                  {todayTaskNotifications.length > 0 ? todayTaskNotifications.map((task) => (
                    <button key={task.id} type="button" onClick={() => { task.action(); setNotificationsOpen(false) }} className="flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(123, 207, 137, 0.12)' }}>
                      <span className="mt-0.5 rounded-lg p-2" style={{ background: 'rgba(123,241,168,0.08)' }}>
                        <CircleCheckBig size={15} style={{ color: '#8ff0ab' }} />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium" style={{ color: '#eefdf0' }}>{task.title}</span>
                        <span className="block text-xs" style={{ color: '#95be9f' }}>{task.message}</span>
                      </span>
                    </button>
                  )) : (
                    <div className="rounded-xl border px-3 py-4 text-sm" style={{ borderColor: 'rgba(123, 207, 137, 0.12)', color: '#95be9f' }}>
                      No tasks scheduled for today.
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: '#7fb58a' }}>Recent Alerts</div>
                  {(notifications?.notifications || []).length > 0 ? notifications.notifications.slice(0, 4).map((item) => (
                    <button key={item.id} type="button" className="flex w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition-colors hover:bg-white/5" style={{ borderColor: 'rgba(123, 207, 137, 0.12)' }}>
                      <span className="mt-0.5 rounded-lg p-2" style={{ background: 'rgba(123,241,168,0.08)' }}>
                        <Bell size={15} style={{ color: '#8ff0ab' }} />
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium" style={{ color: '#eefdf0' }}>{item.title}</span>
                        <span className="block text-xs" style={{ color: '#95be9f' }}>{item.message}</span>
                      </span>
                    </button>
                  )) : (
                    <div className="rounded-xl border px-3 py-4 text-sm" style={{ borderColor: 'rgba(123, 207, 137, 0.12)', color: '#95be9f' }}>
                      No notifications yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <ThemeToggle isDark={dark} onToggle={toggleDark} />

        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex h-10 items-center gap-2 rounded-2xl border px-3 transition-colors hover:border-emerald-400/40"
            style={{ borderColor: 'rgba(123, 207, 137, 0.16)', background: 'rgba(255,255,255,0.03)' }}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold" style={{ background: 'linear-gradient(135deg, #7bf1a8 0%, #2e7d32 100%)', color: 'white' }}>
              {initials}
            </span>
            <span className="hidden sm:block text-left">
              <span className="block text-xs" style={{ color: '#95be9f' }}>Signed in as</span>
              <span className="block text-sm font-semibold truncate" style={{ color: '#eefdf0', maxWidth: '140px' }}>{displayName}</span>
            </span>
            <ChevronDown size={14} style={{ color: '#90b69a' }} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border p-2 shadow-xl z-50" style={{ borderColor: 'rgba(123, 207, 137, 0.18)', background: 'linear-gradient(180deg, #122118 0%, #0e1712 100%)' }}>
              <div className="px-3 py-2 border-b mb-2" style={{ borderColor: 'rgba(123, 207, 137, 0.12)' }}>
                <div className="text-sm font-semibold" style={{ color: '#eefdf0' }}>{displayName}</div>
                <div className="text-xs" style={{ color: '#95be9f' }}>{farmName}</div>
              </div>
              <button
                type="button"
                onClick={() => { setProfileOpen(false); navigate('/settings') }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
                style={{ color: '#eefdf0' }}
              >
                <Settings size={15} />
                Settings
              </button>
              <button
                type="button"
                onClick={async () => { setProfileOpen(false); await signOut(); navigate('/login') }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
                style={{ color: '#fecaca' }}
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
