import { create } from 'zustand'

// Helper to get current hour (0-24)
const getCurrentHour = () => {
  const now = new Date()
  return now.getHours() + now.getMinutes() / 60
}

// Weather condition mapping from Open-Meteo codes
const mapWeatherCode = (code) => {
  if (code === 0) return 'sunny'
  if (code >= 1 && code <= 3) return 'cloudy'
  if (code >= 45 && code <= 48) return 'foggy'
  if (code >= 51 && code <= 67) return 'rainy'
  if (code >= 71 && code <= 77) return 'snowy'
  if (code >= 80 && code <= 82) return 'rainy'
  if (code >= 85 && code <= 86) return 'snowy'
  if (code >= 95 && code <= 99) return 'stormy'
  return 'sunny'
}

export const useFarmStore = create((set, get) => ({
  // Selected plot state
  selectedPlot: null,
  hoveredPlot: null,

  // Time of day (0-24 hours) - auto-synced with system
  timeOfDay: getCurrentHour(),
  isTimeSynced: true,

  // Weather - real data from API
  weatherMode: 'sunny',
  weatherData: {
    temperature: 25,
    humidity: 60,
    windSpeed: 10,
    precipitation: 0,
    cloudCover: 20,
    uvIndex: 5,
    weatherCode: 0,
    isDay: true,
  },
  weatherLocation: {
    latitude: 12.9716,  // Default: Bangalore, India
    longitude: 77.5946,
  },
  lastWeatherUpdate: null,

  // Real-time sync
  syncTimeWithSystem: () => {
    set({ timeOfDay: getCurrentHour() })
  },

  // Farm data
  plots: [
    {
      id: 'rice-field-1',
      name: 'Rice Field A1',
      type: 'rice',
      position: [-8, 0, -6],
      size: [6, 6],
      data: {
        growthStage: 'Flowering',
        soilMoisture: 85,
        temperature: 28,
        humidity: 72,
        nutrients: 'High',
        waterConsumption: 450,
        healthScore: 94,
        pestRisk: 'Low',
        harvestDate: '2026-06-15',
        yieldEstimate: '5.2 tons/ha',
        irrigationActive: true,
      },
    },
    {
      id: 'wheat-field-1',
      name: 'Wheat Field B2',
      type: 'wheat',
      position: [4, 0, -5],
      size: [5, 5],
      data: {
        growthStage: 'Ripening',
        soilMoisture: 45,
        temperature: 26,
        humidity: 55,
        nutrients: 'Medium',
        waterConsumption: 180,
        healthScore: 88,
        pestRisk: 'Low',
        harvestDate: '2026-04-20',
        yieldEstimate: '3.8 tons/ha',
        irrigationActive: false,
      },
    },
    {
      id: 'maize-field-1',
      name: 'Maize Field C1',
      type: 'maize',
      position: [-10, 0, 5],
      size: [5, 7],
      data: {
        growthStage: 'Vegetative',
        soilMoisture: 60,
        temperature: 30,
        humidity: 65,
        nutrients: 'High',
        waterConsumption: 320,
        healthScore: 91,
        pestRisk: 'Medium',
        harvestDate: '2026-08-10',
        yieldEstimate: '9.5 tons/ha',
        irrigationActive: true,
      },
    },
    {
      id: 'vegetable-bed-1',
      name: 'Vegetable Garden D1',
      type: 'vegetables',
      position: [6, 0, 6],
      size: [4, 4],
      data: {
        growthStage: 'Harvest Ready',
        soilMoisture: 70,
        temperature: 24,
        humidity: 68,
        nutrients: 'High',
        waterConsumption: 150,
        healthScore: 96,
        pestRisk: 'Low',
        harvestDate: '2026-05-18',
        yieldEstimate: '2.5 tons/ha',
        irrigationActive: true,
      },
    },
    {
      id: 'orchard-1',
      name: 'Mango Orchard E1',
      type: 'orchard',
      position: [-3, 0, 10],
      size: [6, 5],
      data: {
        growthStage: 'Fruiting',
        soilMoisture: 55,
        temperature: 27,
        humidity: 60,
        nutrients: 'Medium',
        waterConsumption: 200,
        healthScore: 89,
        pestRisk: 'Medium',
        harvestDate: '2026-06-01',
        yieldEstimate: '15 tons/ha',
        irrigationActive: false,
      },
    },
    {
      id: 'greenhouse-1',
      name: 'Hydroponic Greenhouse',
      type: 'greenhouse',
      position: [10, 0, 0],
      size: [4, 6],
      data: {
        growthStage: 'Growing',
        soilMoisture: 80,
        temperature: 22,
        humidity: 75,
        nutrients: 'Optimized',
        waterConsumption: 90,
        healthScore: 98,
        pestRisk: 'Very Low',
        harvestDate: '2026-05-25',
        yieldEstimate: '8 tons/ha',
        irrigationActive: true,
      },
    },
  ],

  // Camera state
  cameraPosition: [25, 25, 25],
  cameraTarget: [0, 0, 0],
  isFirstPerson: false,

  // Edit mode state
  editMode: false,
  editingPlot: null,
  history: [],
  historyIndex: -1,
  isDirty: false,
  saveStatus: 'saved', // 'saved', 'saving', 'unsaved'

  // UI state
  showMinimap: true,
  showGrid: false,
  farmPulseMode: false,

  // Actions
  setSelectedPlot: (plot) => set({ selectedPlot: plot }),
  setHoveredPlot: (plot) => set({ hoveredPlot: plot }),
  setTimeOfDay: (time) => set({ timeOfDay: time }),
  setWeatherData: (data) => {
    const weatherCode = data.weatherCode || 0
    const isDay = data.isDay !== undefined ? data.isDay : get().timeOfDay > 6 && get().timeOfDay < 18
    const weatherMode = mapWeatherCode(weatherCode)
    set({
      weatherData: { ...data, weatherCode, isDay },
      weatherMode: isDay ? weatherMode : 'night',
      lastWeatherUpdate: new Date().toISOString()
    })
  },
  setWeatherMode: (mode) => set({ weatherMode: mode }),
  setWeatherLocation: (loc) => set({ weatherLocation: loc }),

  // Fetch weather from backend API (which uses Open-Meteo)
  fetchWeather: async () => {
    try {
      const response = await fetch('/api/weather/current?location=Coimbatore')
      const data = await response.json()
      if (data.temperature !== undefined) {
        const weatherData = {
          temperature: Math.round(data.temperature),
          humidity: data.humidity,
          precipitation: data.precipitation,
          cloudCover: data.humidity > 80 ? 80 : data.humidity > 50 ? 50 : 20, // Estimate from humidity
          windSpeed: Math.round(data.windSpeed),
          isDay: get().timeOfDay > 6 && get().timeOfDay < 18,
          uvIndex: 5,
          weatherCode: data.weatherCode,
        }
        get().setWeatherData(weatherData)
      }
    } catch (error) {
      console.error('Failed to fetch weather:', error)
    }
  },

  // Edit mode actions
  toggleEditMode: () => set((state) => ({ editMode: !state.editMode })),
  setEditingPlot: (plot) => set({ editingPlot: plot }),
  setSaveStatus: (status) => set({ saveStatus: status }),

  // Plot management with undo support
  saveToHistory: () => {
    const { plots, history, historyIndex } = get()
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(JSON.parse(JSON.stringify(plots)))
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: true
    })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex > 0) {
      const prevPlots = history[historyIndex - 1]
      set({
        plots: prevPlots,
        historyIndex: historyIndex - 1,
        isDirty: true
      })
    }
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex < history.length - 1) {
      const nextPlots = history[historyIndex + 1]
      set({
        plots: nextPlots,
        historyIndex: historyIndex + 1,
        isDirty: true
      })
    }
  },

  addPlot: (plot) => {
    get().saveToHistory()
    const { plots } = get()
    const newPlot = {
      id: `${plot.type}-${Date.now()}`,
      name: `${plot.type.charAt(0).toUpperCase() + plot.type.slice(1)} Field ${plots.length + 1}`,
      type: plot.type,
      position: plot.position || [0, 0, 0],
      size: plot.size || [5, 5],
      data: {
        growthStage: 'Planting',
        soilMoisture: 50,
        temperature: 25,
        humidity: 60,
        nutrients: 'Medium',
        waterConsumption: 100,
        healthScore: 100,
        pestRisk: 'Low',
        harvestDate: null,
        yieldEstimate: 'N/A',
        irrigationActive: false,
      },
    }
    set({ plots: [...plots, newPlot] })
  },

  updatePlot: (plotId, updates) => {
    get().saveToHistory()
    const { plots } = get()
    set({
      plots: plots.map(p => p.id === plotId ? { ...p, ...updates } : p)
    })
  },

  removePlot: (plotId) => {
    get().saveToHistory()
    const { plots } = get()
    set({ plots: plots.filter(p => p.id !== plotId) })
  },

  movePlot: (plotId, newPosition) => {
    get().saveToHistory()
    const { plots } = get()
    set({
      plots: plots.map(p => p.id === plotId ? { ...p, position: newPosition } : p)
    })
  },

  // Save to backend
  saveFarmToBackend: async () => {
    const { plots, setSaveStatus } = get()
    setSaveStatus('saving')
    try {
      const response = await fetch('/api/farm/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plots }),
      })
      if (response.ok) {
        setSaveStatus('saved')
        set({ isDirty: false })
      } else {
        setSaveStatus('error')
      }
    } catch (error) {
      console.error('Failed to save farm:', error)
      setSaveStatus('error')
    }
  },

  // Load from backend
  loadFarmFromBackend: async () => {
    try {
      const response = await fetch('/api/farm')
      if (response.ok) {
        const data = await response.json()
        if (data.plots && data.plots.length > 0) {
          set({ plots: data.plots })
        }
      }
    } catch (error) {
      console.error('Failed to load farm:', error)
    }
  },
  setCameraPosition: (position) => set({ cameraPosition: position }),
  setCameraTarget: (target) => set({ cameraTarget: target }),
  toggleFirstPerson: () => set((state) => ({ isFirstPerson: !state.isFirstPerson })),
  toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
  toggleFarmPulse: () => set((state) => ({ farmPulseMode: !state.farmPulseMode })),

  // AI recommendations per plot
  getRecommendations: (plotId) => {
    const recommendations = {
      'rice-field-1': [
        'Consider draining field slightly to prevent fungal growth',
        'Apply nitrogen fertilizer within 3 days',
        'Monitor for rice blast disease',
      ],
      'wheat-field-1': [
        'Harvest recommended within 10 days for optimal yield',
        'Reduce irrigation to prevent lodging',
        'Check for rust infection',
      ],
      'maize-field-1': [
        'Increase irrigation frequency during hot hours',
        'Apply side-dress nitrogen fertilizer',
        'Monitor for fall armyworm',
      ],
      'vegetable-bed-1': [
        'Harvest ready crops immediately',
        'Apply organic pesticide as preventive measure',
        'Succession plant for continuous harvest',
      ],
      'orchard-1': [
        'Apply fruit thinning for better yield',
        'Install bird nets to protect developing fruits',
        'Check for mango hopper infestation',
      ],
      'greenhouse-1': [
        'System operating optimally',
        'CO2 levels can be increased for faster growth',
        'Check nutrient solution pH',
      ],
    }
    return recommendations[plotId] || ['No recommendations available']
  },
}))