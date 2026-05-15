import { useState, useEffect, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FarmScene from './FarmScene'
import {
  InfoPanel,
  ControlPanel,
  Minimap,
  LoadingScreen,
  WeatherWidget,
  TimeWidget,
  EditToolbar,
} from './FarmUI'
import { useFarmStore } from './store'

export default function FarmVisualization() {
  const [isLoading, setIsLoading] = useState(true)
  const [showIntro, setShowIntro] = useState(true)
  const { selectedPlot, syncTimeWithSystem, fetchWeather, loadFarmFromBackend } = useFarmStore()

  useEffect(() => {
    // Sync time with system every minute
    syncTimeWithSystem()
    const timeInterval = setInterval(syncTimeWithSystem, 60000)
    return () => clearInterval(timeInterval)
  }, [syncTimeWithSystem])

  useEffect(() => {
    // Fetch weather on load
    fetchWeather()
    const weatherInterval = setInterval(fetchWeather, 600000) // Every 10 minutes
    return () => clearInterval(weatherInterval)
  }, [fetchWeather])

  useEffect(() => {
    // Load farm data from backend
    loadFarmFromBackend()
  }, [loadFarmFromBackend])

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Auto-hide intro after animation
    if (!isLoading) {
      const timer = setTimeout(() => {
        setShowIntro(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: '#0f172a' }}>
      {/* Loading Screen */}
      <AnimatePresence>
        {isLoading && <LoadingScreen />}
      </AnimatePresence>

      {/* Cinematic Intro */}
      <AnimatePresence>
        {showIntro && !isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 z-40 flex items-center justify-center"
            style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-center"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mb-8"
              >
                <div
                  className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <svg
                    viewBox="0 0 100 100"
                    className="w-14 h-14"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                  >
                    <path d="M50 20 L65 45 L90 50 L65 55 L50 80 L35 55 L10 50 L35 45 Z" />
                    <circle cx="50" cy="50" r="15" />
                  </svg>
                </div>
              </motion.div>

              <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-4xl font-bold mb-2"
                style={{ color: '#f8fafc' }}
              >
                SmartFarm AI
              </motion.h1>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-lg"
                style={{ color: '#94a3b8' }}
              >
                Digital Twin Agriculture Platform
              </motion.p>

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.7, duration: 1 }}
                className="mt-8 h-1 rounded-full overflow-hidden"
                style={{ width: 200, background: 'rgba(255, 255, 255, 0.1)' }}
              >
                <motion.div
                  className="h-full"
                  style={{ background: '#10b981', width: '100%' }}
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ delay: 0.7, duration: 1.5 }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main 3D Scene */}
      <Suspense fallback={null}>
        <FarmScene />
      </Suspense>

      {/* UI Overlay */}
      {!isLoading && (
        <>
          <ControlPanel />
          <InfoPanel />
          <Minimap />
          <WeatherWidget />
          <TimeWidget />
          <EditToolbar />

          {/* Top right info */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="fixed top-4 right-4 flex items-center gap-3 px-4 py-2 rounded-xl"
            style={{
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: '#10b981' }}
              />
              <span className="text-xs font-medium" style={{ color: '#10b981' }}>Live</span>
            </div>
            <span className="text-xs" style={{ color: '#64748b' }}>|</span>
            <span className="text-xs" style={{ color: '#94a3b8' }}>6 Plots Active</span>
          </motion.div>

          {/* Instructions hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 rounded-xl"
            style={{
              background: 'rgba(15, 23, 42, 0.7)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#64748b' }}>🖱️</span>
              <span className="text-xs" style={{ color: '#94a3b8' }}>Drag to rotate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#64748b' }}>🔍</span>
              <span className="text-xs" style={{ color: '#94a3b8' }}>Scroll to zoom</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#64748b' }}>👆</span>
              <span className="text-xs" style={{ color: '#94a3b8' }}>Click plot for details</span>
            </div>
          </motion.div>
        </>
      )}

      {/* Selected plot indicator */}
      <AnimatePresence>
        {selectedPlot && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <p className="text-sm" style={{ color: '#10b981' }}>
              Press <kbd className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(255,255,255,0.1)' }}>ESC</kbd> to deselect
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}