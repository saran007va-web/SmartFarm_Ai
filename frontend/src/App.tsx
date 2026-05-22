import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'

// Layout
import AppLayout from './components/AppLayout'

// Auth pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import AuthCallback from './pages/auth/AuthCallback'

// Main pages
import Recommendations from './pages/Recommendations'
import PlotDetails from './pages/PlotDetails'
import Market from './pages/Market'
import Weather from './pages/Weather'
import Settings from './pages/Settings'
// Planning page removed per user request
import CropCalendar from './pages/CropCalendar'
import FarmCalendar from './pages/FarmCalendar'

// Farm 3D Page
import FarmPage from './components/farm3d/FarmPage'

// Protected route wrapper - checks token more thoroughly
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('vaagai_token')
  const userId = localStorage.getItem('vaagai_user_id')

  // Debug log (remove in production)
  console.log('ProtectedRoute check:', { token: !!token, userId })

  if (!token || !userId) {
    console.log('Redirecting to login - no token or userId')
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

// Protected layout with sidebar
function ProtectedLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <AppLayout title={title} subtitle={subtitle}>
      {children}
    </AppLayout>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Protected routes - 3D Farm is default after login */}
          <Route
            path="/dashboard"
            element={<Navigate to="/farm" replace />}
          />
          <Route
            path="/"
            element={<Navigate to="/farm" replace />}
          />

          {/* 3D Farm - Main page for farmers */}
          <Route
            path="/farm"
            element={
              <ProtectedRoute>
                <FarmPage />
              </ProtectedRoute>
            }
          />

          <Route path="/farms" element={<Navigate to="/recommendations" replace />} />
          <Route
            path="/recommendations"
            element={
              <ProtectedRoute>
                <ProtectedLayout title="Crop Recommendations" subtitle="Season-aware crop guidance and weather outlook">
                  <Recommendations />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/plot-details"
            element={
              <ProtectedRoute>
                <ProtectedLayout title="Plot Details" subtitle="Detailed view of your 3D farm plots">
                  <PlotDetails />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/market"
            element={
              <ProtectedRoute>
                <ProtectedLayout title="Market Prices" subtitle="Live crop price trends across markets">
                  <Market />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/weather"
            element={
              <ProtectedRoute>
                <ProtectedLayout title="Weather" subtitle="Real-time weather forecasts">
                  <Weather />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <ProtectedLayout title="Settings" subtitle="Configure your SmartFarm AI environment">
                  <Settings />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          {/* Crop Planning removed */}
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <ProtectedLayout title="Crop Calendar" subtitle="Daily tasks and stage guidance">
                  <FarmCalendar />
                </ProtectedLayout>
              </ProtectedRoute>
            }
          />
          {/* Fallback to 3D farm */}
          <Route path="*" element={<Navigate to="/farm" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App