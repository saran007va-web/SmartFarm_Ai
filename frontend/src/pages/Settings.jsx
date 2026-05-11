import { useState } from 'react'
import { Globe, Layers, Lock, Eye, EyeOff, Server, ChevronDown, RefreshCw, Info, Moon, Sun, Bell, BellOff, Database, Zap, Shield, CreditCard, Users, BarChart3 } from 'lucide-react'

import TopBar from '../components/TopBar'
import { useTheme } from '../contexts/ThemeContext'

function ConfigRow({ icon: Icon, label, value, note }) {
  return (
    <div
      className="flex items-center justify-between gap-4 p-4 rounded-xl transition-all duration-150"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 38, height: 38, background: 'var(--color-surface-3)' }}
        >
          <Icon size={16} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{note}</p>
        </div>
      </div>
      <span
        className="text-sm font-mono px-3 py-1.5 rounded-xl flex-shrink-0"
        style={{
          background: 'rgba(16,185,129,0.08)',
          color: 'var(--color-primary)',
          border: '1px solid rgba(16,185,129,0.2)',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function ToggleRow({ icon: Icon, label, description, enabled, onToggle, disabled = false }) {
  return (
    <div
      className="flex items-center justify-between gap-4 p-4 rounded-xl transition-all duration-150"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', opacity: disabled ? 0.6 : 1 }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{ width: 38, height: 38, background: 'var(--color-surface-3)' }}
        >
          <Icon size={16} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{description}</p>
        </div>
      </div>
      <button
        onClick={() => !disabled && onToggle()}
        disabled={disabled}
        className="relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0"
        style={{
          background: enabled ? 'var(--color-primary)' : 'var(--color-border)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
          style={{
            left: enabled ? '28px' : '4px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  )
}

function AccordionSection({ icon: Icon, iconBg, iconColor, title, subtitle, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const IconBg = iconBg || 'rgba(16,185,129,0.1)'
  const IconClr = iconColor || 'var(--color-primary)'

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-4 flex items-center justify-between text-left transition-colors duration-150"
        style={{ background: open ? 'rgba(16,185,129,0.02)' : 'transparent' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-2)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = open ? 'rgba(16,185,129,0.02)' : 'transparent' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0"
            style={{ width: 38, height: 38, background: IconBg }}
          >
            <Icon size={17} style={{ color: IconClr }} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{title}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{subtitle}</p>
          </div>
        </div>
        <ChevronDown
          size={16}
          style={{
            color: 'var(--color-text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        />
      </button>
      {open && (
        <div
          className="px-5 pb-5 pt-2"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  const [savedMsg, setSavedMsg] = useState('')
  const { setMode, derived } = useTheme()

  // SaaS-level feature toggles
  const [aiFeatures, setAiFeatures] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [dataSync, setDataSync] = useState(true)
  const [autoAnalytics, setAutoAnalytics] = useState(true)

  const darkMode = derived === 'dark'

  const handleSave = () => {
    setSavedMsg('Settings saved!')
    setTimeout(() => setSavedMsg(''), 2500)
  }

  const handleDarkModeToggle = () => {
    setMode(darkMode ? 'light' : 'dark')
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <TopBar title="Settings" subtitle="Manage your SmartFarm AI preferences" />

      <div className="page-container">
        {/* ── Quick Stats ───────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Users, label: 'Farm Owners', value: '1', color: '#3b82f6' },
            { icon: Database, label: 'Active Farms', value: '1', color: '#10b981' },
            { icon: Zap, label: 'AI Credits', value: 'Unlimited', color: '#f59e0b' },
            { icon: CreditCard, label: 'Plan', value: 'Pro', color: '#8b5cf6' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="p-4 rounded-xl text-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex justify-center mb-2">
                <div className="p-2 rounded-xl" style={{ background: `${color}15` }}>
                  <Icon size={18} style={{ color }} strokeWidth={1.75} />
                </div>
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{value}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── AI & Automation Settings ─────────────────────────────── */}
        <div className="mb-6">
          <h2 className="section-title mb-1">AI & Automation</h2>
          <p className="section-subtitle mb-4">Configure AI-powered features</p>
          <div className="flex flex-col gap-3">
            <ToggleRow
              icon={Zap}
              label="AI Features"
              description="Enable AI-powered crop recommendations and chat"
              enabled={aiFeatures}
              onToggle={() => setAiFeatures(!aiFeatures)}
            />
            <ToggleRow
              icon={Database}
              label="Auto Data Sync"
              description="Automatically sync farm data to cloud"
              enabled={dataSync}
              onToggle={() => setDataSync(!dataSync)}
            />
            <ToggleRow
              icon={BarChart3}
              label="Auto Analytics"
              description="Generate analytics reports automatically"
              enabled={autoAnalytics}
              onToggle={() => setAutoAnalytics(!autoAnalytics)}
            />
          </div>
        </div>

        {/* ── Appearance ───────────────────────────────── */}
        <div className="mb-6">
          <h2 className="section-title mb-1">Appearance</h2>
          <p className="section-subtitle mb-4">Customize the look and feel</p>
          <div className="flex flex-col gap-3">
            <ToggleRow
              icon={Moon}
              label="Dark Mode"
              description="Switch between light and dark theme"
              enabled={darkMode}
              onToggle={handleDarkModeToggle}
            />
          </div>
        </div>

        {/* ── Notifications ───────────────────────────────── */}
        <div className="mb-6">
          <h2 className="section-title mb-1">Notifications</h2>
          <p className="section-subtitle mb-4">Manage your notification preferences</p>
          <div className="flex flex-col gap-3">
            <ToggleRow
              icon={Bell}
              label="Push Notifications"
              description="Receive alerts for tasks and recommendations"
              enabled={notifications}
              onToggle={() => setNotifications(!notifications)}
            />
          </div>
        </div>

        {/* ── Data Management ───────────────────────────────── */}
        <AccordionSection
          icon={Database}
          iconBg="rgba(59,130,246,0.1)"
          iconColor="#3b82f6"
          title="Data Management"
          subtitle="Manage your farm data"
          defaultOpen={false}
        >
          <div className="flex flex-col gap-3">
            <button
              className="flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-150"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 36, height: 36, background: 'rgba(239,68,68,0.08)' }}>
                <RefreshCw size={16} style={{ color: '#ef4444' }} strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Clear Chat History</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Remove all saved chat sessions</p>
              </div>
            </button>
            <button
              className="flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-150"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 36, height: 36, background: 'rgba(239,68,68,0.08)' }}>
                <Database size={16} style={{ color: '#ef4444' }} strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Reset Farm Data</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Clear all farm profiles and records</p>
              </div>
            </button>
          </div>
        </AccordionSection>

        {/* ── Security & Privacy ───────────────────────────────── */}
        <AccordionSection
          icon={Shield}
          iconBg="rgba(16,185,129,0.1)"
          iconColor="var(--color-primary)"
          title="Security & Privacy"
          subtitle="Your data is protected"
          defaultOpen={false}
        >
          <div className="flex flex-col gap-3">
            <div
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 36, height: 36, background: 'rgba(16,185,129,0.08)' }}>
                <Shield size={16} style={{ color: 'var(--color-primary)' }} strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Data Encryption</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>All farm data is encrypted at rest</p>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-primary)' }}>Active</span>
            </div>
            <div
              className="flex items-center gap-3 p-4 rounded-xl"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 36, height: 36, background: 'rgba(16,185,129,0.08)' }}>
                <Lock size={16} style={{ color: 'var(--color-primary)' }} strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Privacy Mode</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Your data is never shared with third parties</p>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-primary)' }}>Enabled</span>
            </div>
          </div>
        </AccordionSection>

        {/* ── Subscription ───────────────────────────────── */}
        <AccordionSection
          icon={CreditCard}
          iconBg="rgba(139,92,246,0.1)"
          iconColor="#8b5cf6"
          title="Subscription"
          subtitle="Manage your plan"
          defaultOpen={false}
        >
          <div className="flex flex-col gap-3">
            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Current Plan</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Pro Plan - Unlimited AI Credits</p>
              </div>
              <span className="text-sm font-bold px-3 py-1.5 rounded-xl" style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>Pro</span>
            </div>
            <button
              className="w-full p-4 rounded-xl text-center transition-all duration-150 font-semibold"
              style={{ background: 'var(--color-primary)', color: 'white' }}
            >
              Upgrade to Enterprise
            </button>
          </div>
        </AccordionSection>

        {/* ── Success Message ───────────────────────────────── */}
        {savedMsg && (
          <div
            className="fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg animate-fade-up"
            style={{ background: 'var(--color-primary)', color: 'white' }}
          >
            <span className="font-medium">{savedMsg}</span>
          </div>
        )}

        {/* ── Footer Info ───────────────────────────────── */}
        <div
          className="rounded-2xl p-5 flex items-start gap-3 mt-6"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          <div
            className="flex items-center justify-center rounded-xl flex-shrink-0"
            style={{ width: 36, height: 36, background: 'rgba(59,130,246,0.08)' }}
          >
            <Info size={16} style={{ color: '#3b82f6' }} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Privacy & Data</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
              Your farm data and personal information are stored securely. We do not share your data with external parties.
              All AI processing is done locally or through secure cloud services.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}