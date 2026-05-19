import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CropPlot {
  id: string
  name: string
  cropType: string
  x: number
  z: number
  width: number
  depth: number
  stage: 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'harvest'
  health: number
  plantedDate: string
  expectedHarvest: string
  notes?: string
  irrigationEnabled: boolean
  yieldEstimate?: number
}

export interface SensorReading {
  moisture: number
  temperature: number
  humidity: number
  timestamp: string
}

export interface WeatherData {
  temperature: number
  humidity: number
  windSpeed: number
  condition: string
  icon: string
  description: string
  precipitation: number
  uvIndex: number
  lastUpdated: string
}

export interface FarmState {
  // Farm info
  farmName: string
  location: { lat: number; lon: number; name: string }
  totalArea: number

  // Crops
  crops: CropPlot[]
  selectedCrop: string | null

  // Weather
  weather: WeatherData | null
  weatherLoading: boolean
  weatherError: string | null

  // Sensors
  sensors: {
    [plotId: string]: SensorReading
  }

  // Time
  currentTime: Date
  isNight: boolean
  timeSpeed: number // 1 = real time, 60 = 1 min = 1 hour, etc.

  // UI State
  editMode: boolean
  showGrid: boolean
  selectedTool: 'select' | 'move' | 'resize' | 'add' | 'delete'
  weatherSyncEnabled: boolean

  // Actions
  setFarmName: (name: string) => void
  setLocation: (location: { lat: number; lon: number; name: string }) => void
  setTotalArea: (area: number) => void
  addCrop: (crop: CropPlot) => void
  updateCrop: (id: string, data: Partial<CropPlot>) => void
  removeCrop: (id: string) => void
  selectCrop: (id: string | null) => void
  setWeather: (weather: WeatherData | null) => void
  setWeatherLoading: (loading: boolean) => void
  setWeatherError: (error: string | null) => void
  setCurrentTime: (time: Date) => void
  setTimeSpeed: (speed: number) => void
  setEditMode: (mode: boolean) => void
  setShowGrid: (show: boolean) => void
  setSelectedTool: (tool: FarmState['selectedTool']) => void
  setWeatherSyncEnabled: (enabled: boolean) => void
  updateSensorReading: (plotId: string, reading: SensorReading) => void
  getSelectedCrop: () => CropPlot | null
}

// Extended crop types with more details
export const CROP_TYPES: Record<string, {
  name: string
  color: string
  fruitColor?: string
  icon: string
  waterNeeds: 'low' | 'medium' | 'high'
  daysToHarvest: number
  optimalTemp: { min: number; max: number }
}> = {
  rice: { name: 'Rice', color: '#90EE90', icon: '🌾', waterNeeds: 'high', daysToHarvest: 120, optimalTemp: { min: 20, max: 35 } },
  wheat: { name: 'Wheat', color: '#F5DEB3', icon: '🌾', waterNeeds: 'medium', daysToHarvest: 150, optimalTemp: { min: 15, max: 25 } },
  corn: { name: 'Corn', color: '#FFD700', icon: '🌽', waterNeeds: 'high', daysToHarvest: 90, optimalTemp: { min: 18, max: 30 } },
  tomato: { name: 'Tomato', color: '#228B22', fruitColor: '#FF6347', icon: '🍅', waterNeeds: 'medium', daysToHarvest: 80, optimalTemp: { min: 18, max: 29 } },
  potato: { name: 'Potato', color: '#3D6B1E', fruitColor: '#DAA520', icon: '🥔', waterNeeds: 'medium', daysToHarvest: 100, optimalTemp: { min: 15, max: 20 } },
  onion: { name: 'Onion', color: '#4A7C23', fruitColor: '#D2B48C', icon: '🧅', waterNeeds: 'medium', daysToHarvest: 90, optimalTemp: { min: 15, max: 25 } },
  chili: { name: 'Chili', color: '#228B22', fruitColor: '#DC143C', icon: '🌶️', waterNeeds: 'medium', daysToHarvest: 75, optimalTemp: { min: 20, max: 30 } },
  cotton: { name: 'Cotton', color: '#90EE90', fruitColor: '#FFFAF0', icon: '☁️', waterNeeds: 'low', daysToHarvest: 180, optimalTemp: { min: 20, max: 35 } },
  sugarcane: { name: 'Sugarcane', color: '#32CD32', icon: '🎋', waterNeeds: 'high', daysToHarvest: 365, optimalTemp: { min: 20, max: 35 } },
  groundnut: { name: 'Groundnut', color: '#5A8C2E', fruitColor: '#CD853F', icon: '🥜', waterNeeds: 'medium', daysToHarvest: 120, optimalTemp: { min: 20, max: 30 } },
  vegetables: { name: 'Vegetables', color: '#228B22', icon: '🥬', waterNeeds: 'high', daysToHarvest: 60, optimalTemp: { min: 15, max: 25 } },
  fruits: { name: 'Fruits', color: '#228B22', fruitColor: '#FF6B6B', icon: '🍎', waterNeeds: 'medium', daysToHarvest: 180, optimalTemp: { min: 15, max: 30 } },
}

// Sample crop data
const initialCrops: CropPlot[] = [
  {
    id: 'plot_1',
    name: 'Rice Field - North',
    cropType: 'rice',
    x: -5,
    z: -4,
    width: 5,
    depth: 4,
    stage: 'vegetative',
    health: 95,
    plantedDate: '2026-04-15',
    expectedHarvest: '2026-08-15',
    irrigationEnabled: true,
    yieldEstimate: 5000,
  },
  {
    id: 'plot_2',
    name: 'Tomato Greenhouse',
    cropType: 'tomato',
    x: 2,
    z: -3,
    width: 4,
    depth: 3,
    stage: 'fruiting',
    health: 92,
    plantedDate: '2026-03-01',
    expectedHarvest: '2026-06-01',
    irrigationEnabled: true,
    yieldEstimate: 2500,
  },
  {
    id: 'plot_3',
    name: 'Corn Plot - East',
    cropType: 'corn',
    x: -4,
    z: 3,
    width: 4,
    depth: 5,
    stage: 'vegetative',
    health: 88,
    plantedDate: '2026-04-20',
    expectedHarvest: '2026-07-20',
    irrigationEnabled: true,
    yieldEstimate: 3500,
  },
  {
    id: 'plot_4',
    name: 'Wheat Field - West',
    cropType: 'wheat',
    x: 4,
    z: 2,
    width: 4,
    depth: 4,
    stage: 'flowering',
    health: 98,
    plantedDate: '2026-01-15',
    expectedHarvest: '2026-05-15',
    irrigationEnabled: false,
    yieldEstimate: 4200,
  },
  {
    id: 'plot_5',
    name: 'Vegetable Garden',
    cropType: 'vegetables',
    x: 0,
    z: 0,
    width: 3,
    depth: 3,
    stage: 'fruiting',
    health: 85,
    plantedDate: '2026-04-01',
    expectedHarvest: '2026-06-01',
    irrigationEnabled: true,
    yieldEstimate: 1500,
  },
]

export const useFarmStore = create<FarmState>()(
  persist(
    (set, get) => ({
      farmName: 'My Smart Farm',
      location: { lat: 11.0168, lon: 76.9558, name: 'Coimbatore, Tamil Nadu, India' },
      totalArea: 5.5,

      crops: initialCrops,
      selectedCrop: null,

      weather: null,
      weatherLoading: false,
      weatherError: null,

      sensors: {},

      currentTime: new Date(),
      isNight: false,
      timeSpeed: 1,

      editMode: false,
      showGrid: true,
      selectedTool: 'select',
      weatherSyncEnabled: true,

      setFarmName: (name) => set({ farmName: name }),
      setLocation: (location) => set({ location }),
      setTotalArea: (area) => set({ totalArea: area }),

      addCrop: (crop) => set((state) => ({ crops: [...state.crops, crop] })),

      updateCrop: (id, data) => set((state) => ({
        crops: state.crops.map((c) => (c.id === id ? { ...c, ...data } : c)),
      })),

      removeCrop: (id) => set((state) => ({
        crops: state.crops.filter((c) => c.id !== id),
        selectedCrop: state.selectedCrop === id ? null : state.selectedCrop,
      })),

      selectCrop: (id) => set({ selectedCrop: id }),

      setWeather: (weather) => set({ weather }),
      setWeatherLoading: (weatherLoading) => set({ weatherLoading }),
      setWeatherError: (weatherError) => set({ weatherError }),

      setCurrentTime: (time) => set({
        currentTime: time,
        isNight: time.getHours() < 6 || time.getHours() > 20
      }),

      setTimeSpeed: (timeSpeed) => set({ timeSpeed }),

      setEditMode: (editMode) => set({ editMode }),
      setShowGrid: (showGrid) => set({ showGrid }),
      setSelectedTool: (selectedTool) => set({ selectedTool }),
      setWeatherSyncEnabled: (weatherSyncEnabled) => set({ weatherSyncEnabled }),

      updateSensorReading: (plotId, reading) => set((state) => ({
        sensors: { ...state.sensors, [plotId]: reading }
      })),

      getSelectedCrop: () => {
        const state = get()
        return state.crops.find(c => c.id === state.selectedCrop) || null
      },
    }),
    {
      name: 'farm-storage',
      partialize: (state) => ({
        farmName: state.farmName,
        location: state.location,
        totalArea: state.totalArea,
        crops: state.crops,
        weatherSyncEnabled: state.weatherSyncEnabled,
      }),
    }
  )
)