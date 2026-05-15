import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFarmStore } from './store'
import {
  X, Droplets, Thermometer, Wind, Leaf, Bug, Calendar,
  TrendingUp, AlertTriangle, Activity, Sun, Cloud, CloudRain,
  Map, Grid, ToggleLeft, Navigation, Play, Pause,
  Clock, Zap, Box, Gauge, Eye, Wifi, CloudFog, Moon,
  Edit3, Save, Undo, Redo, Plus, Trash2, Move, RotateCw,
  Check, RefreshCw, AlertCircle
} from 'lucide-react'

export function InfoPanel() {
  const { selectedPlot, setSelectedPlot, getRecommendations, plots } = useFarmStore()
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedPlot(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setSelectedPlot])

  if (!selectedPlot) return null

  const recommendations = getRecommendations(selectedPlot.id)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 50, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 50, scale: 0.9 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed right-6 top-1/2 -translate-y-1/2 w-[380px] max-h-[80vh] overflow-y-auto"
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div
          className="p-5 border-b"
          style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-lg font-semibold"
                style={{ color: '#f8fafc' }}
              >
                {selectedPlot.name}
              </h2>
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                }}
              >
                {selectedPlot.data.growthStage}
              </span>
            </div>
            <button
              onClick={() => setSelectedPlot(null)}
              className="p-2 rounded-xl transition-colors"
              style={{ background: 'rgba(255, 255, 255, 0.1)' }}
            >
              <X size={18} style={{ color: '#94a3b8' }} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 p-2 border-b"
          style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
        >
          {['overview', 'sensors', 'ai', 'irrigation'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all"
              style={{
                background: activeTab === tab ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                color: activeTab === tab ? '#10b981' : '#94a3b8',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-5">
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Health Score */}
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{ width: 40, height: 40, background: 'rgba(16, 185, 129, 0.2)' }}
                  >
                    <Gauge size={20} style={{ color: '#10b981' }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>Health Score</p>
                    <p className="text-xl font-bold" style={{ color: '#f8fafc' }}>
                      {selectedPlot.data.healthScore}%
                    </p>
                  </div>
                </div>
                <div
                  className="w-16 h-2 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${selectedPlot.data.healthScore}%`,
                      background: selectedPlot.data.healthScore > 80 ? '#10b981' : '#f59e0b',
                    }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  icon={Droplets}
                  label="Soil Moisture"
                  value={`${selectedPlot.data.soilMoisture}%`}
                  color="#3b82f6"
                />
                <StatCard
                  icon={Thermometer}
                  label="Temperature"
                  value={`${selectedPlot.data.temperature}°C`}
                  color="#ef4444"
                />
                <StatCard
                  icon={Wind}
                  label="Humidity"
                  value={`${selectedPlot.data.humidity}%`}
                  color="#8b5cf6"
                />
                <StatCard
                  icon={Leaf}
                  label="Nutrients"
                  value={selectedPlot.data.nutrients}
                  color="#10b981"
                />
              </div>

              {/* Yield Estimate */}
              <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} style={{ color: '#10b981' }} />
                    <span className="text-sm" style={{ color: '#f8fafc' }}>Yield Estimate</span>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: '#10b981' }}>
                    {selectedPlot.data.yieldEstimate}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Calendar size={14} style={{ color: '#94a3b8' }} />
                  <span className="text-xs" style={{ color: '#94a3b8' }}>
                    Harvest: {selectedPlot.data.harvestDate}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'sensors' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <SensorRow label="Moisture Sensor" value={`${selectedPlot.data.soilMoisture}%`} active />
              <SensorRow label="Temperature Sensor" value={`${selectedPlot.data.temperature}°C`} active />
              <SensorRow label="Humidity Sensor" value={`${selectedPlot.data.humidity}%`} active />
              <SensorRow label="pH Level" value="6.5" active />
              <SensorRow label="NPK Sensor" value="Optimal" active />
              <SensorRow label="Light Intensity" value="850 lux" active />
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="p-3 rounded-xl" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={14} style={{ color: '#10b981' }} />
                  <span className="text-sm font-medium" style={{ color: '#10b981' }}>AI Recommendations</span>
                </div>
                <ul className="space-y-2">
                  {recommendations.map((rec, i) => (
                    <li key={i} className="text-xs flex items-start gap-2" style={{ color: '#cbd5e1' }}>
                      <span style={{ color: '#10b981' }}>•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                <div className="flex items-center gap-2">
                  <Bug size={14} style={{ color: selectedPlot.data.pestRisk === 'Low' ? '#10b981' : '#f59e0b' }} />
                  <span className="text-sm" style={{ color: '#cbd5e1' }}>Pest Risk</span>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    background: selectedPlot.data.pestRisk === 'Low' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: selectedPlot.data.pestRisk === 'Low' ? '#10b981' : '#f59e0b',
                  }}
                >
                  {selectedPlot.data.pestRisk}
                </span>
              </div>
            </motion.div>
          )}

          {activeTab === 'irrigation' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: selectedPlot.data.irrigationActive ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)' }}>
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{
                      width: 40,
                      height: 40,
                      background: selectedPlot.data.irrigationActive ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <Droplets size={20} style={{ color: selectedPlot.data.irrigationActive ? '#3b82f6' : '#94a3b8' }} />
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#f8fafc' }}>
                      {selectedPlot.data.irrigationActive ? 'Irrigation Active' : 'Irrigation Off'}
                    </p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>
                      {selectedPlot.data.waterConsumption} L/day
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                <p className="text-xs mb-2" style={{ color: '#94a3b8' }}>Water Usage This Week</p>
                <div className="flex items-end gap-1 h-16">
                  {[65, 80, 55, 90, 70, 85, 60].map((val, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t"
                      style={{
                        height: `${val}%`,
                        background: `rgba(59, 130, 246, ${0.4 + i * 0.1})`,
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <span key={i} className="text-[10px]" style={{ color: '#94a3b8' }}>{d}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color }} />
        <span className="text-xs" style={{ color: '#94a3b8' }}>{label}</span>
      </div>
      <p className="text-lg font-semibold" style={{ color: '#f8fafc' }}>{value}</p>
    </div>
  )
}

function SensorRow({ label, value, active }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
      <div className="flex items-center gap-2">
        <Wifi size={14} style={{ color: active ? '#10b981' : '#94a3b8' }} />
        <span className="text-sm" style={{ color: '#cbd5e1' }}>{label}</span>
      </div>
      <span className="text-sm font-medium" style={{ color: '#f8fafc' }}>{value}</span>
    </div>
  )
}

export function ControlPanel() {
  const {
    timeOfDay, setTimeOfDay,
    weatherMode, setWeatherMode,
    showMinimap, toggleMinimap,
    showGrid, toggleGrid,
    farmPulseMode, toggleFarmPulse,
  } = useFarmStore()

  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed left-4 top-4"
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center justify-between"
          style={{ borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.1)' : 'none' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-xl"
              style={{ width: 36, height: 36, background: 'rgba(16, 185, 129, 0.2)' }}
            >
              <Activity size={18} style={{ color: '#10b981' }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: '#f8fafc' }}>Farm Controls</h2>
              <p className="text-xs" style={{ color: '#94a3b8' }}>SmartFarm AI</p>
            </div>
          </div>
        </button>

        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* Time of Day */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: '#94a3b8' }}>Time of Day</span>
                <span className="text-xs font-mono" style={{ color: '#f8fafc' }}>
                  {String(Math.floor(timeOfDay)).padStart(2, '0')}:00
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={24}
                step={0.5}
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
                className="w-full"
                style={{
                  accentColor: '#10b981',
                }}
              />
            </div>

            {/* Weather Mode */}
            <div>
              <span className="text-xs block mb-2" style={{ color: '#94a3b8' }}>Weather</span>
              <div className="flex gap-2">
                {[
                  { mode: 'sunny', icon: Sun, label: 'Sunny' },
                  { mode: 'cloudy', icon: Cloud, label: 'Cloudy' },
                  { mode: 'rainy', icon: CloudRain, label: 'Rainy' },
                ].map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    onClick={() => setWeatherMode(mode)}
                    className="flex-1 py-2 px-2 rounded-lg flex flex-col items-center gap-1 transition-all"
                    style={{
                      background: weatherMode === mode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: weatherMode === mode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                    }}
                  >
                    <Icon size={16} style={{ color: weatherMode === mode ? '#10b981' : '#94a3b8' }} />
                    <span className="text-[10px]" style={{ color: weatherMode === mode ? '#10b981' : '#94a3b8' }}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Options */}
            <div className="space-y-2">
              <ToggleButton
                icon={Map}
                label="Minimap"
                active={showMinimap}
                onClick={toggleMinimap}
              />
              <ToggleButton
                icon={Grid}
                label="Grid Overlay"
                active={showGrid}
                onClick={toggleGrid}
              />
              <ToggleButton
                icon={Activity}
                label="Farm Pulse"
                active={farmPulseMode}
                onClick={toggleFarmPulse}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function ToggleButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-2 px-3 rounded-xl flex items-center justify-between transition-all"
      style={{
        background: active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
        border: active ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
      }}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: active ? '#10b981' : '#94a3b8' }} />
        <span className="text-xs" style={{ color: active ? '#10b981' : '#cbd5e1' }}>{label}</span>
      </div>
      <div
        className="w-8 h-4 rounded-full relative transition-colors"
        style={{ background: active ? '#10b981' : 'rgba(255, 255, 255, 0.2)' }}
      >
        <div
          className="absolute w-3 h-3 rounded-full top-0.5 transition-all"
          style={{
            background: '#fff',
            left: active ? '50%' : '2px',
          }}
        />
      </div>
    </button>
  )
}

export function Minimap() {
  const { showMinimap, plots, selectedPlot, setSelectedPlot } = useFarmStore()

  if (!showMinimap) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-4 right-4 w-48 h-48 rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <svg viewBox="-30 -30 60 60" className="w-full h-full">
        {/* Background */}
        <rect x="-30" y="-30" width="60" height="60" fill="#1e293b" />

        {/* Grid lines */}
        {[-20, -10, 0, 10, 20].map((pos) => (
          <g key={pos}>
            <line x1={pos} y1={-30} x2={pos} y2={30} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
            <line x1={-30} y1={pos} x2={30} y2={pos} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          </g>
        ))}

        {/* Plots */}
        {plots.map((plot) => {
          const colors = {
            rice: '#4a7c9b',
            wheat: '#daa520',
            maize: '#228b22',
            vegetables: '#32cd32',
            orchard: '#ff6347',
            greenhouse: '#98fb98',
          }
          return (
            <rect
              key={plot.id}
              x={plot.position[0]}
              y={plot.position[2]}
              width={plot.size[0]}
              height={plot.size[1]}
              fill={colors[plot.type] || '#666'}
              opacity={selectedPlot?.id === plot.id ? 1 : 0.5}
              stroke={selectedPlot?.id === plot.id ? '#10b981' : 'none'}
              strokeWidth="1"
              className="cursor-pointer"
              onClick={() => setSelectedPlot(plot)}
            />
          )
        })}

        {/* Camera indicator */}
        <circle cx="0" cy="0" r="2" fill="#10b981" />
      </svg>
    </motion.div>
  )
}

export function FloatingLabels() {
  const { plots, hoveredPlot, setHoveredPlot } = useFarmStore()

  return (
    <group>
      {plots.map((plot) => (
        <group key={plot.id} position={[plot.position[0], 3, plot.position[2] - plot.size[1] / 2 - 1]}>
          {hoveredPlot?.id === plot.id && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="px-3 py-1.5 rounded-lg whitespace-nowrap"
                style={{
                  background: 'rgba(15, 23, 42, 0.9)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}
              >
                <span className="text-xs font-medium" style={{ color: '#f8fafc' }}>
                  {plot.name}
                </span>
              </div>
            </motion.div>
          )}
        </group>
      ))}
    </group>
  )
}

export function LoadingScreen() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer)
          return 100
        }
        return p + Math.random() * 15
      })
    }, 200)
    return () => clearInterval(timer)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: '#0f172a' }}
    >
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 mx-auto mb-6 rounded-2xl border-4 border-t-transparent"
          style={{ borderTopColor: '#10b981' }}
        />
        <h1 className="text-2xl font-bold mb-2" style={{ color: '#f8fafc' }}>
          SmartFarm AI
        </h1>
        <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>
          Loading farm visualization...
        </p>
        <div className="w-48 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: '#10b981' }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </motion.div>
  )
}

export function WeatherWidget() {
  const { weatherData, weatherMode, fetchWeather, lastWeatherUpdate } = useFarmStore()

  const getWeatherIcon = () => {
    if (weatherMode === 'rainy') return CloudRain
    if (weatherMode === 'cloudy') return Cloud
    if (weatherMode === 'foggy') return CloudFog
    if (weatherMode === 'night') return Moon
    return Sun
  }

  const WeatherIcon = getWeatherIcon()

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 rounded-xl"
      style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="flex items-center gap-3">
        <WeatherIcon size={20} style={{ color: weatherMode === 'sunny' ? '#fbbf24' : '#94a3b8' }} />
        <div>
          <p className="text-lg font-semibold" style={{ color: '#f8fafc' }}>
            {weatherData.temperature}°C
          </p>
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            {weatherMode.charAt(0).toUpperCase() + weatherMode.slice(1)}
          </p>
        </div>
      </div>

      <div className="h-8 w-px" style={{ background: 'rgba(255, 255, 255, 0.1)' }} />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Droplets size={14} style={{ color: '#3b82f6' }} />
          <span className="text-xs" style={{ color: '#cbd5e1' }}>{weatherData.humidity}%</span>
        </div>
        <div className="flex items-center gap-1">
          <Wind size={14} style={{ color: '#94a3b8' }} />
          <span className="text-xs" style={{ color: '#cbd5e1' }}>{weatherData.windSpeed} km/h</span>
        </div>
        <div className="flex items-center gap-1">
          <Sun size={14} style={{ color: '#f59e0b' }} />
          <span className="text-xs" style={{ color: '#cbd5e1' }}>UV {weatherData.uvIndex}</span>
        </div>
      </div>

      <button
        onClick={fetchWeather}
        className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
        title="Refresh weather"
      >
        <RefreshCw size={14} style={{ color: '#94a3b8' }} />
      </button>
    </motion.div>
  )
}

export function TimeWidget() {
  const { timeOfDay, isTimeSynced } = useFarmStore()

  const formatTime = (hour) => {
    const h = Math.floor(hour)
    const m = Math.floor((hour - h) * 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const getTimePeriod = (hour) => {
    if (hour < 6) return 'Night'
    if (hour < 12) return 'Morning'
    if (hour < 17) return 'Afternoon'
    if (hour < 20) return 'Evening'
    return 'Night'
  }

  const getTimeIcon = () => {
    if (timeOfDay < 6 || timeOfDay > 20) return Moon
    if (timeOfDay < 12) return Sun
    return Sun
  }

  const TimeIcon = getTimeIcon()

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed top-4 left-4 flex items-center gap-3 px-4 py-2 rounded-xl"
      style={{
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <TimeIcon size={18} style={{ color: timeOfDay > 6 && timeOfDay < 18 ? '#fbbf24' : '#94a3b8' }} />
      <div>
        <p className="text-lg font-semibold" style={{ color: '#f8fafc' }}>{formatTime(timeOfDay)}</p>
        <p className="text-xs" style={{ color: '#94a3b8' }}>{getTimePeriod(timeOfDay)}</p>
      </div>
      {isTimeSynced && (
        <div className="flex items-center gap-1 ml-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px]" style={{ color: '#10b981' }}>Synced</span>
        </div>
      )}
    </motion.div>
  )
}

export function EditToolbar() {
  const {
    editMode, toggleEditMode,
    undo, redo, history, historyIndex,
    saveFarmToBackend, saveStatus, isDirty,
    addPlot, removePlot, selectedPlot
  } = useFarmStore()

  const [showAddMenu, setShowAddMenu] = useState(false)

  const cropTypes = [
    { type: 'rice', label: 'Rice', color: '#4a7c9b' },
    { type: 'wheat', label: 'Wheat', color: '#daa520' },
    { type: 'maize', label: 'Maize', color: '#228b22' },
    { type: 'vegetables', label: 'Vegetables', color: '#32cd32' },
    { type: 'orchard', label: 'Orchard', color: '#ff6347' },
    { type: 'greenhouse', label: 'Greenhouse', color: '#98fb98' },
  ]

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Edit Mode Toggle */}
      <button
        onClick={toggleEditMode}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
          editMode ? 'bg-green-600' : 'bg-white/10'
        }`}
      >
        <Edit3 size={16} style={{ color: editMode ? '#fff' : '#94a3b8' }} />
        <span className="text-xs font-medium" style={{ color: editMode ? '#fff' : '#94a3b8' }}>
          {editMode ? 'Editing' : 'Edit Farm'}
        </span>
      </button>

      {editMode && (
        <>
          <div className="w-px h-8" style={{ background: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
          >
            <Undo size={16} style={{ color: canUndo ? '#94a3b8' : '#64748b' }} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-2 rounded-lg transition-colors disabled:opacity-30"
            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
          >
            <Redo size={16} style={{ color: canRedo ? '#94a3b8' : '#64748b' }} />
          </button>

          <div className="w-px h-8" style={{ background: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Add Plot */}
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1 px-3 py-2 rounded-lg transition-colors"
              style={{ background: 'rgba(59, 130, 246, 0.2)' }}
            >
              <Plus size={16} style={{ color: '#3b82f6' }} />
              <span className="text-xs" style={{ color: '#3b82f6' }}>Add Plot</span>
            </button>

            {showAddMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-0 mb-2 p-2 rounded-xl grid grid-cols-2 gap-1"
                style={{
                  background: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  minWidth: '160px',
                }}
              >
                {cropTypes.map(({ type, label, color }) => (
                  <button
                    key={type}
                    onClick={() => {
                      addPlot({ type, position: [0, 0, 0], size: [5, 5] })
                      setShowAddMenu(false)
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/10"
                  >
                    <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                    <span className="text-xs" style={{ color: '#cbd5e1' }}>{label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Remove Plot */}
          {selectedPlot && (
            <button
              onClick={() => removePlot(selectedPlot.id)}
              className="flex items-center gap-1 px-3 py-2 rounded-lg transition-colors"
              style={{ background: 'rgba(239, 68, 68, 0.2)' }}
            >
              <Trash2 size={16} style={{ color: '#ef4444' }} />
              <span className="text-xs" style={{ color: '#ef4444' }}>Remove</span>
            </button>
          )}

          <div className="w-px h-8" style={{ background: 'rgba(255, 255, 255, 0.1)' }} />

          {/* Save */}
          <button
            onClick={saveFarmToBackend}
            disabled={!isDirty || saveStatus === 'saving'}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
            style={{
              background: saveStatus === 'saved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
            }}
          >
            {saveStatus === 'saving' ? (
              <RefreshCw size={16} className="animate-spin" style={{ color: '#94a3b8' }} />
            ) : saveStatus === 'saved' ? (
              <Check size={16} style={{ color: '#10b981' }} />
            ) : saveStatus === 'error' ? (
              <AlertCircle size={16} style={{ color: '#ef4444' }} />
            ) : (
              <Save size={16} style={{ color: '#94a3b8' }} />
            )}
            <span className="text-xs" style={{ color: saveStatus === 'saved' ? '#10b981' : '#94a3b8' }}>
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Error' : 'Save'}
            </span>
          </button>
        </>
      )}
    </motion.div>
  )
}