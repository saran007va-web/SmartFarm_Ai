import api from '@/lib/api'

export interface IrrigationAdvice {
  recommendation: 'urgent' | 'needed' | 'moderate' | 'none'
  duration: number
  frequency: string
  waterNeeded: number
  bestTime: string
  notes: string
}

export interface IrrigationLog {
  id: string
  farmId: string
  taskType: string
  title: string
  description?: string
  scheduledDate: string
  completedDate?: string
  status: string
  quantity?: number
  unit?: string
  notes?: string
  farm?: {
    id: string
    name: string
  }
}

export interface IrrigationSchedule {
  id: string
  farmId: string
  plotId?: string
  name: string
  cropType: string
  startTime: string
  endTime: string
  frequency: 'daily' | 'every_other_day' | 'weekly' | 'custom'
  customDays?: number[]
  duration: number
  waterAmount: number
  isActive: boolean
  triggerConditions?: {
    minMoisture?: number
    maxMoisture?: number
    minTemperature?: number
    maxTemperature?: number
  }
  lastTriggered?: string
  nextTrigger?: string
}

export interface SensorData {
  moisture: number
  temperature: number
  humidity: number
  timestamp: string
}

// Get irrigation advice based on conditions
export const getIrrigationAdvice = async (params: {
  farmId?: string
  soilMoisture?: number
  temperature?: number
  humidity?: number
  cropType?: string
  area?: number
  lastIrrigationDate?: string
}): Promise<IrrigationAdvice> => {
  const response = await api.post('/irrigation/advice', params)
  return response.data
}

// Get irrigation logs
export const getIrrigationLogs = async (params?: {
  farmId?: string
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<IrrigationLog[]> => {
  const response = await api.get('/irrigation/logs', { params })
  return response.data.logs || response.data || []
}

// Log irrigation activity
export const logIrrigationActivity = async (data: {
  farmId: string
  taskId?: string
  waterUsed?: number
  duration?: number
  notes?: string
}): Promise<IrrigationLog> => {
  const response = await api.post('/irrigation/log', data)
  return response.data
}

// Get irrigation schedules (stored locally or fetched from backend)
export const getIrrigationSchedules = async (farmId?: string): Promise<IrrigationSchedule[]> => {
  const stored = localStorage.getItem('irrigation_schedules')
  let schedules: IrrigationSchedule[] = stored ? JSON.parse(stored) : []

  if (farmId) {
    schedules = schedules.filter(s => s.farmId === farmId)
  }

  return schedules
}

// Save irrigation schedule
export const saveIrrigationSchedule = async (schedule: Omit<IrrigationSchedule, 'id' | 'lastTriggered' | 'nextTrigger'>): Promise<IrrigationSchedule> => {
  const stored = localStorage.getItem('irrigation_schedules')
  const schedules: IrrigationSchedule[] = stored ? JSON.parse(stored) : []

  const newSchedule: IrrigationSchedule = {
    ...schedule,
    id: `irr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    lastTriggered: undefined,
    nextTrigger: calculateNextTrigger(schedule),
  }

  schedules.push(newSchedule)
  localStorage.setItem('irrigation_schedules', JSON.stringify(schedules))

  return newSchedule
}

// Update irrigation schedule
export const updateIrrigationSchedule = async (id: string, updates: Partial<IrrigationSchedule>): Promise<IrrigationSchedule> => {
  const stored = localStorage.getItem('irrigation_schedules')
  const schedules: IrrigationSchedule[] = stored ? JSON.parse(stored) : []

  const index = schedules.findIndex(s => s.id === id)
  if (index === -1) throw new Error('Schedule not found')

  schedules[index] = {
    ...schedules[index],
    ...updates,
    nextTrigger: calculateNextTrigger(schedules[index]),
  }

  localStorage.setItem('irrigation_schedules', JSON.stringify(schedules))
  return schedules[index]
}

// Delete irrigation schedule
export const deleteIrrigationSchedule = async (id: string): Promise<void> => {
  const stored = localStorage.getItem('irrigation_schedules')
  const schedules: IrrigationSchedule[] = stored ? JSON.parse(stored) : []

  const filtered = schedules.filter(s => s.id !== id)
  localStorage.setItem('irrrigation_schedules', JSON.stringify(filtered))
}

// Calculate next trigger time
function calculateNextTrigger(schedule: IrrigationSchedule): string {
  const now = new Date()
  const [hours, minutes] = schedule.startTime.split(':').map(Number)
  let next = new Date(now)
  next.setHours(hours, minutes, 0, 0)

  if (next <= now) {
    switch (schedule.frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1)
        break
      case 'every_other_day':
        next.setDate(next.getDate() + 2)
        break
      case 'weekly':
        next.setDate(next.getDate() + 7)
        break
      case 'custom':
        if (schedule.customDays && schedule.customDays.length > 0) {
          const currentDay = next.getDay()
          const nextDay = schedule.customDays.find(d => d > currentDay)
          if (nextDay !== undefined) {
            next.setDate(next.getDate() + (nextDay - currentDay))
          } else {
            next.setDate(next.getDate() + (7 - currentDay + schedule.customDays[0]))
          }
        }
        break
    }
  }

  return next.toISOString()
}

// Simulate sensor data (in real app, this would connect to actual IoT sensors)
export const getSensorData = async (farmId: string): Promise<SensorData> => {
  // Simulate real-time sensor readings
  return {
    moisture: Math.random() * 60 + 20, // 20-80% range
    temperature: Math.random() * 20 + 20, // 20-40°C range
    humidity: Math.random() * 40 + 40, // 40-80% range
    timestamp: new Date().toISOString(),
  }
}

// Get farm plots for irrigation zones
export const getFarmPlots = async (farmId: string) => {
  const response = await api.get(`/farms/${farmId}/plots`)
  return response.data
}