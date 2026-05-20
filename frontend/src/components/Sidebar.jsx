import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Sprout, BarChart3,
  Settings, MapPin, TrendingUp, Calendar,
  DollarSign, FolderOpen, Radio, ChevronRight, X,
  Cloud, FileText, Bell, Tractor, Layers3,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { to: '/farm', label: '3D Farm', icon: Tractor },
      { to: '/recommendations', label: 'Crop Recommendations', icon: Sprout },
      { to: '/plot-details', label: 'Plot Details', icon: Layers3 },
      { to: '/planning', label: 'Crop Planning', icon: Sprout },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/market', label: 'Market Prices', icon: TrendingUp },
      { to: '/weather', label: 'Weather', icon: Cloud },
      { to: '/calendar', label: 'Calendar', icon: Calendar },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/files', label: 'Files & Uploads', icon: FileText },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export default function Sidebar({ isOpen, onClose }) {
  const [isMobile, setIsMobile] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close sidebar on navigation (mobile only)
  useEffect(() => {
    if (isMobile && onClose) {
      onClose()
    }
  }, [location.pathname, isMobile])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobile, isOpen])

  // Don't render on mobile unless open
  if (isMobile && !isOpen) return null

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${isMobile
          ? 'fixed top-0 left-0 z-40 h-screen w-[280px] transition-transform duration-300'
          : 'relative z-20 h-screen w-[var(--sidebar-width)] flex-none'} flex flex-col`}
        style={{
          width: isMobile ? '280px' : 'var(--sidebar-width)',
          background: 'linear-gradient(180deg, #0d1810 0%, #112015 48%, #162718 100%)',
          borderRight: isMobile ? 'none' : '1px solid rgba(123, 207, 137, 0.18)',
          boxShadow: 'inset -1px 0 0 rgba(120, 220, 140, 0.06), 0 16px 40px rgba(0, 0, 0, 0.24)',
          transform: isMobile
            ? (isOpen ? 'translateX(0)' : 'translateX(-100%)')
            : 'translateX(0)',
        }}
      >
        {/* Mobile Close Button */}
        {isMobile && (
          <div className="flex items-center justify-between px-4" style={{ height: 'var(--topbar-height)', borderBottom: '1px solid var(--color-border)' }}>
            <div />
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              aria-label="Close menu"
            >
              <X size={20} style={{ color: '#e5f5e6' }} />
            </button>
          </div>
        )}

        {/* Logo & Brand */}
        <div
          className="flex items-center gap-3 px-5"
          style={{ height: 'var(--topbar-height)', borderBottom: '1px solid rgba(123, 207, 137, 0.14)' }}
        >
          <div
            className="flex items-center justify-center rounded-2xl shadow-md"
            style={{
              width: 42, height: 42,
              background: 'linear-gradient(135deg, #7bf1a8 0%, #2e7d32 52%, #11361a 100%)',
              boxShadow: '0 6px 18px rgba(72, 201, 116, 0.28)',
            }}
          >
            <Sprout size={22} strokeWidth={2.2} style={{ color: 'white' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-none tracking-tight" style={{ color: '#effdf1', fontFamily: 'Sora, sans-serif' }}>
              VaagAi
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#8dbf96' }}>
              Smart Farming
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-5">
              <p
                className="text-[10px] font-bold tracking-widest uppercase px-3 mb-2"
                style={{ color: '#7fb58a' }}
              >
                {section.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {section.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      [
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative overflow-hidden',
                        isActive
                          ? 'text-primary font-semibold'
                          : 'hover:text-[var(--color-text)]',
                      ].join(' ')
                    }
                    style={({ isActive }) =>
                      isActive
                        ? {
                            background: 'linear-gradient(135deg, rgba(123, 241, 168, 0.16), rgba(45, 122, 45, 0.14))',
                            color: '#effdf1',
                          }
                        : { color: '#a7c9af' }
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active indicator bar */}
                        {isActive && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-full"
                            style={{
                              height: '60%',
                              background: 'linear-gradient(180deg, #9cf0b7, #43a047)',
                              boxShadow: '0 0 10px rgba(123,241,168,0.45)',
                            }}
                          />
                        )}

                        {/* Icon */}
                        <span
                          className="flex items-center justify-center rounded-lg transition-all duration-150"
                          style={{
                            width: 34, height: 34,
                            background: isActive
                              ? 'rgba(123,241,168,0.14)'
                              : 'transparent',
                          }}
                        >
                          <Icon
                            size={18}
                            strokeWidth={isActive ? 2.25 : 1.75}
                            style={isActive ? { color: '#8ff0ab' } : { color: '#97b79e' }}
                          />
                        </span>

                        <span className="flex-1">{label}</span>

                        {/* Hover arrow */}
                        <ChevronRight
                          size={14}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          style={{ color: '#7fa18a' }}
                        />
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div
          className="px-5 py-4 text-center"
          style={{ borderTop: '1px solid rgba(123, 207, 137, 0.14)' }}
        >
          <p className="text-[11px]" style={{ color: '#86ae8e' }}>
            VaagAi — Smart AI Farming Platform
          </p>
        </div>
      </aside>
    </>
  )
}
