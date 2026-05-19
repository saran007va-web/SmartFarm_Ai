import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import FarmScene from './Farm3DScene'
import Farm3DUIControls from './Farm3DUIControls'
import Sidebar from '../Sidebar'
import { Menu, X } from 'lucide-react'

export default function FarmPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Close sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Desktop sidebar takes layout space; mobile uses the drawer behavior */}
      {!isMobile && <Sidebar isOpen={true} onClose={() => setSidebarOpen(false)} />}

      {/* Main 3D workspace */}
      <div className="relative flex-1 min-w-0 overflow-hidden">
        <div className="absolute inset-0">
          <FarmScene />
        </div>

        <Farm3DUIControls />

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900/80 rounded-lg text-white"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile sidebar and overlay */}
      {isMobile && sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed top-0 left-0 h-full z-40">
            <Sidebar isOpen={true} onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}
    </div>
  )
}