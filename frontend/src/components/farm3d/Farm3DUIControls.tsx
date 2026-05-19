import { useState, useEffect, useCallback } from 'react'
import { useFarmStore, CROP_TYPES, type CropPlot } from './farmStore'
import {
  Cloud, CloudRain, Sun, Moon, Wind, Droplets, Thermometer,
  Plus, Trash2, Move, Maximize2, MousePointer, Edit3, Save, X,
  RefreshCw, MapPin, Ruler, Calendar, Leaf, Settings, Play, Pause,
  Sprout
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002"

// Weather sync hook
function useWeatherSync() {
  const { setWeather, setWeatherLoading, setWeatherError, location, weatherSyncEnabled } = useFarmStore()

  const fetchWeather = useCallback(async () => {
    if (!weatherSyncEnabled) return

    setWeatherLoading(true)
    setWeatherError(null)

    try {
      const response = await fetch(
        `${API_URL}/api/weather/current?location=${encodeURIComponent(location.name.split(',')[0])}`
      )

      if (!response.ok) throw new Error('Weather fetch failed')

      const data = await response.json()
      setWeather({
        temperature: data.temperature,
        humidity: data.humidity,
        windSpeed: data.wind_speed || 0,
        condition: data.weather_description || 'Clear',
        icon: data.weather_icon || '01d',
        description: data.weather_description || 'Clear sky',
        precipitation: data.precipitation || 0,
        uvIndex: data.uv_index || 0,
        lastUpdated: new Date().toISOString(),
      })
    } catch (err) {
      // Fallback demo weather on error
      setWeather({
        temperature: 28 + Math.random() * 5,
        humidity: 55 + Math.random() * 20,
        windSpeed: 8 + Math.random() * 10,
        condition: ['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)],
        icon: '02d',
        description: 'Weather data simulation',
        precipitation: Math.random() * 5,
        uvIndex: Math.floor(Math.random() * 10),
        lastUpdated: new Date().toISOString(),
      })
    } finally {
      setWeatherLoading(false)
    }
  }, [location.name, setWeather, setWeatherLoading, setWeatherError, weatherSyncEnabled])

  useEffect(() => {
    fetchWeather()
    const interval = setInterval(fetchWeather, 300000) // Refresh every 5 minutes
    return () => clearInterval(interval)
  }, [fetchWeather])
}

// Real-time clock hook
function useRealTimeClock() {
  const { setCurrentTime, timeSpeed } = useFarmStore()

  useEffect(() => {
    if (timeSpeed > 1) {
      const interval = setInterval(() => {
        setCurrentTime(new Date())
      }, 1000)
      return () => clearInterval(interval)
    }

    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000 / timeSpeed)
    return () => clearInterval(interval)
  }, [timeSpeed, setCurrentTime])
}

// Weather display widget
function WeatherWidget() {
  const { weather, weatherLoading, weatherSyncEnabled, setWeatherSyncEnabled } = useFarmStore()
  const { setWeather, setWeatherLoading, setWeatherError, location } = useFarmStore()

  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true)
    setWeatherError(null)
    try {
      const response = await fetch(
        `${API_URL}/api/weather/current?location=${encodeURIComponent(location.name.split(',')[0])}`
      )
      if (!response.ok) throw new Error('Weather fetch failed')
      const data = await response.json()
      setWeather({
        temperature: data.temperature,
        humidity: data.humidity,
        windSpeed: data.wind_speed || 0,
        condition: data.weather_description || 'Clear',
        icon: data.weather_icon || '01d',
        description: data.weather_description || 'Clear sky',
        precipitation: data.precipitation || 0,
        uvIndex: data.uv_index || 0,
        lastUpdated: new Date().toISOString(),
      })
    } catch (err) {
      setWeatherError('Failed to fetch')
      setWeather({
        temperature: 28,
        humidity: 65,
        windSpeed: 12,
        condition: 'Partly Cloudy',
        icon: '02d',
        description: 'Demo weather',
        precipitation: 0,
        uvIndex: 5,
        lastUpdated: new Date().toISOString(),
      })
    } finally {
      setWeatherLoading(false)
    }
  }, [location.name, setWeather, setWeatherLoading, setWeatherError])

  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase()
    if (c.includes('rain')) return <CloudRain size={20} />
    if (c.includes('cloud')) return <Cloud size={20} />
    if (c.includes('clear') || c.includes('sun')) return <Sun size={20} />
    return <Sun size={20} />
  }

  if (!weather) {
    return (
      <div className="p-4 bg-gray-900/90 rounded-xl border border-gray-700">
        <p className="text-sm text-gray-400">Loading weather...</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Cloud size={16} />
          Live Weather
        </h3>
        <button
          onClick={fetchWeather}
          disabled={weatherLoading}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <RefreshCw size={14} className={weatherLoading ? 'animate-spin text-emerald-400' : 'text-gray-400'} />
        </button>
      </div>

      <div className="flex items-center gap-4 mb-3">
        <div className="text-3xl text-yellow-400">
          {getWeatherIcon(weather.condition)}
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{Math.round(weather.temperature)}°C</p>
          <p className="text-xs text-gray-400">{weather.condition}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1 text-gray-300">
          <Droplets size={12} className="text-blue-400" />
          <span>{weather.humidity}%</span>
        </div>
        <div className="flex items-center gap-1 text-gray-300">
          <Wind size={12} className="text-gray-400" />
          <span>{Math.round(weather.windSpeed)} km/h</span>
        </div>
        <div className="flex items-center gap-1 text-gray-300">
          <Sun size={12} className="text-yellow-400" />
          <span>UV {weather.uvIndex}</span>
        </div>
      </div>

      <label className="flex items-center gap-2 mt-3 cursor-pointer">
        <input
          type="checkbox"
          checked={weatherSyncEnabled}
          onChange={(e) => setWeatherSyncEnabled(e.target.checked)}
          className="w-4 h-4 rounded accent-emerald-500"
        />
        <span className="text-xs text-gray-400">Auto-sync weather</span>
      </label>
    </div>
  )
}

// Crop plot editor panel
function CropEditorPanel() {
  const { crops, selectedCrop, updateCrop, removeCrop, selectCrop } = useFarmStore()
  const [editingCrop, setEditingCrop] = useState<CropPlot | null>(null)
  const [localChanges, setLocalChanges] = useState<Partial<CropPlot>>({})

  const selectedPlot = crops.find(c => c.id === selectedCrop)

  useEffect(() => {
    if (selectedPlot) {
      setEditingCrop(selectedPlot)
      setLocalChanges({})
    }
  }, [selectedPlot])

  const handleSave = () => {
    if (selectedCrop && Object.keys(localChanges).length > 0) {
      updateCrop(selectedCrop, localChanges)
      setLocalChanges({})
    }
  }

  const handleChange = (field: keyof CropPlot, value: unknown) => {
    setLocalChanges(prev => ({ ...prev, [field]: value }))
  }

  if (!editingCrop) {
    return (
      <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
        <p className="text-sm text-gray-400 text-center">
          Click a crop plot to view details
        </p>
      </div>
    )
  }

  const hasChanges = Object.keys(localChanges).length > 0

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Edit3 size={16} />
          Edit Crop Plot
        </h3>
        <button
          onClick={() => {
            selectCrop(null)
            setEditingCrop(null)
          }}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <X size={14} className="text-gray-400" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400">Plot Name</label>
          <input
            type="text"
            value={localChanges.name ?? editingCrop.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs text-gray-400">Crop Type</label>
          <select
            value={localChanges.cropType ?? editingCrop.cropType}
            onChange={(e) => handleChange('cropType', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            {Object.entries(CROP_TYPES).map(([key, value]) => (
              <option key={key} value={key}>{value.icon} {value.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Move size={12} /> X Position
            </label>
            <input
              type="number"
              value={localChanges.x ?? editingCrop.x}
              onChange={(e) => handleChange('x', parseFloat(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              step="0.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Move size={12} /> Z Position
            </label>
            <input
              type="number"
              value={localChanges.z ?? editingCrop.z}
              onChange={(e) => handleChange('z', parseFloat(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              step="0.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Maximize2 size={12} /> Width
            </label>
            <input
              type="number"
              value={localChanges.width ?? editingCrop.width}
              onChange={(e) => handleChange('width', parseFloat(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              step="0.5"
              min="1"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Maximize2 size={12} /> Depth
            </label>
            <input
              type="number"
              value={localChanges.depth ?? editingCrop.depth}
              onChange={(e) => handleChange('depth', parseFloat(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              step="0.5"
              min="1"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400">Growth Stage</label>
          <select
            value={localChanges.stage ?? editingCrop.stage}
            onChange={(e) => handleChange('stage', e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="seedling">🌱 Seedling</option>
            <option value="vegetative">🌿 Vegetative</option>
            <option value="flowering">🌸 Flowering</option>
            <option value="fruiting">🍎 Fruiting</option>
            <option value="harvest">🌾 Harvest Ready</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-400">Health: {localChanges.health ?? editingCrop.health}%</label>
          <input
            type="range"
            value={localChanges.health ?? editingCrop.health}
            onChange={(e) => handleChange('health', parseInt(e.target.value))}
            min="0"
            max="100"
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Poor</span>
            <span className={
              (localChanges.health ?? editingCrop.health) > 70 ? 'text-emerald-400' :
              (localChanges.health ?? editingCrop.health) > 40 ? 'text-yellow-400' : 'text-red-400'
            }>
              {(localChanges.health ?? editingCrop.health)}%
            </span>
            <span>Excellent</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar size={12} /> Planted Date
            </label>
            <input
              type="date"
              value={localChanges.plantedDate ?? editingCrop.plantedDate}
              onChange={(e) => handleChange('plantedDate', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar size={12} /> Expected Harvest
            </label>
            <input
              type="date"
              value={localChanges.expectedHarvest ?? editingCrop.expectedHarvest}
              onChange={(e) => handleChange('expectedHarvest', e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="irrigationEnabled"
            checked={localChanges.irrigationEnabled ?? editingCrop.irrigationEnabled}
            onChange={(e) => handleChange('irrigationEnabled', e.target.checked)}
            className="w-4 h-4 rounded accent-emerald-500"
          />
          <label htmlFor="irrigationEnabled" className="text-xs text-gray-400">
            Enable Smart Irrigation
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors ${
              hasChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save size={14} />
            Save Changes
          </button>
          <button
            onClick={() => {
              if (confirm('Delete this crop plot?')) {
                removeCrop(selectedCrop!)
                selectCrop(null)
              }
            }}
            className="bg-red-600/80 hover:bg-red-700 text-white px-3 py-2 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// Time control widget
function TimeControlWidget() {
  const { currentTime, isNight, timeSpeed, setCurrentTime, setTimeSpeed } = useFarmStore()

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          {isNight ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-yellow-400" />}
          Time Control
        </h3>
      </div>

      <div className="text-center mb-3">
        <p className="text-2xl font-bold text-white">{formatTime(currentTime)}</p>
        <p className="text-xs text-gray-400">{formatDate(currentTime)}</p>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setTimeSpeed(timeSpeed === 1 ? 60 : 1)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors ${
            timeSpeed > 1 ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
        >
          {timeSpeed > 1 ? <Pause size={12} /> : <Play size={12} />}
          {timeSpeed > 1 ? 'Fast' : 'Normal'}
        </button>
        <button
          onClick={() => setCurrentTime(new Date())}
          className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-xs text-gray-300 transition-colors"
        >
          Now
        </button>
      </div>

      <div>
        <label className="text-xs text-gray-400">Time Speed</label>
        <select
          value={timeSpeed}
          onChange={(e) => setTimeSpeed(parseInt(e.target.value))}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value={1}>1x (Real Time)</option>
          <option value={60}>60x (1 min = 1 hour)</option>
          <option value={300}>300x (1 min = 5 hours)</option>
          <option value={1440}>1440x (1 min = 1 day)</option>
        </select>
      </div>
    </div>
  )
}

// Farm stats widget
function FarmStatsWidget() {
  const { crops, farmName, totalArea, location } = useFarmStore()

  const totalCrops = crops.length
  const avgHealth = Math.round(crops.reduce((sum, c) => sum + c.health, 0) / totalCrops || 0)
  const activeIrrigation = crops.filter(c => c.irrigationEnabled).length

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
        <Sprout size={16} className="text-emerald-400" />
        Farm Overview
      </h3>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Farm Name</span>
          <span className="text-white font-medium">{farmName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400 flex items-center gap-1">
            <MapPin size={12} /> Location
          </span>
          <span className="text-white text-right text-xs">{location.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400 flex items-center gap-1">
            <Ruler size={12} /> Total Area
          </span>
          <span className="text-white">{totalArea} ha</span>
        </div>
        <div className="border-t border-gray-700 pt-2 mt-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Plots</span>
            <span className="text-white">{totalCrops}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Avg. Health</span>
            <span className={`${avgHealth > 70 ? 'text-emerald-400' : avgHealth > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
              {avgHealth}%
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Smart Irrigation</span>
            <span className="text-blue-400">{activeIrrigation} plots</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Tool selector
function ToolSelector() {
  const { editMode, setEditMode, selectedTool, setSelectedTool, showGrid, setShowGrid } = useFarmStore()

  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'move', icon: Move, label: 'Move' },
    { id: 'resize', icon: Maximize2, label: 'Resize' },
    { id: 'add', icon: Plus, label: 'Add' },
    { id: 'delete', icon: Trash2, label: 'Delete' },
  ] as const

  return (
    <div className="bg-gray-900/90 backdrop-blur-sm rounded-xl p-3 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Settings size={16} />
          Tools
        </h3>
        <button
          onClick={() => setEditMode(!editMode)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            editMode ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {editMode ? 'Done' : 'Edit Farm'}
        </button>
      </div>

      <div className="flex gap-1 mb-3">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => {
              setEditMode(true)
              setSelectedTool(tool.id)
            }}
            className={`flex-1 p-2 rounded-lg flex flex-col items-center gap-1 transition-colors ${
              selectedTool === tool.id && editMode
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <tool.icon size={16} />
            <span className="text-[10px]">{tool.label}</span>
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={showGrid}
          onChange={(e) => setShowGrid(e.target.checked)}
          className="w-4 h-4 rounded accent-emerald-500"
        />
        <span className="text-xs text-gray-400">Show Grid</span>
      </label>
    </div>
  )
}

// Main UI Controls component
export function Farm3DUIControls() {
  useWeatherSync()
  useRealTimeClock()

  const { selectedCrop } = useFarmStore()

  return (
    <div className="absolute top-4 left-4 right-4 pointer-events-none flex gap-4 z-10">
      <div className="pointer-events-auto space-y-4 w-72">
        <FarmStatsWidget />
        <WeatherWidget />
        <TimeControlWidget />
      </div>

      <div className="pointer-events-auto ml-auto w-72">
        <ToolSelector />
        {selectedCrop && (
          <div className="mt-4">
            <CropEditorPanel />
          </div>
        )}
      </div>
    </div>
  )
}

export default Farm3DUIControls