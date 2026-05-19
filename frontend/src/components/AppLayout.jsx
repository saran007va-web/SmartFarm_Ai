import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function AppLayout({ children, title, subtitle, status = 'connected' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-background)' }}>
      {/* Sidebar - hidden on mobile unless open */}
      <div className={`${isMobile ? 'hidden lg:block' : ''}`}>
        <Sidebar isOpen={isMobile ? sidebarOpen : true} onClose={closeSidebar} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <TopBar
          title={title}
          subtitle={subtitle}
          status={status}
          onMenuToggle={toggleSidebar}
          menuOpen={sidebarOpen}
        />
        <main className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}