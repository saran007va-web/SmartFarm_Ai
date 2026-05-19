import { useState, useEffect, useCallback } from 'react'
import {
  getIrrigationAdvice,
  getIrrigationLogs,
  logIrrigationActivity,
  getIrrigationSchedules,
  saveIrrigationSchedule,
  updateIrrigationSchedule,
  deleteIrrigationSchedule,
  getSensorData,
  IrrigationAdvice,
  IrrigationLog,
  IrrigationSchedule,
  SensorData,
} from './api'

export function useIrrigationAdvice() {
  const [advice, setAdvice] = useState<IrrigationAdvice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAdvice = useCallback(async (params: {
    farmId?: string
    soilMoisture?: number
    temperature?: number
    humidity?: number
    cropType?: string
    area?: number
    lastIrrigationDate?: string
  }) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getIrrigationAdvice(params)
      setAdvice(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get irrigation advice'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const clearAdvice = useCallback(() => {
    setAdvice(null)
    setError(null)
  }, [])

  return { advice, loading, error, fetchAdvice, clearAdvice }
}

export function useIrrigationLogs(farmId?: string) {
  const [logs, setLogs] = useState<IrrigationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async (params?: { limit?: number; startDate?: string; endDate?: string }) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getIrrigationLogs({ farmId, ...params })
      setLogs(result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch irrigation logs'
      setError(message)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [farmId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const refresh = useCallback(() => fetchLogs(), [fetchLogs])

  return { logs, loading, error, refresh }
}

export function useIrrigationSchedules(farmId?: string) {
  const [schedules, setSchedules] = useState<IrrigationSchedule[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getIrrigationSchedules(farmId)
      setSchedules(result)
      return result
    } catch (err) {
      console.error('Failed to fetch schedules:', err)
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }, [farmId])

  useEffect(() => {
    fetchSchedules()
  }, [fetchSchedules])

  const createSchedule = useCallback(async (schedule: Omit<IrrigationSchedule, 'id' | 'lastTriggered' | 'nextTrigger'>) => {
    const newSchedule = await saveIrrigationSchedule(schedule)
    setSchedules(prev => [...prev, newSchedule])
    return newSchedule
  }, [])

  const editSchedule = useCallback(async (id: string, updates: Partial<IrrigationSchedule>) => {
    const updated = await updateIrrigationSchedule(id, updates)
    setSchedules(prev => prev.map(s => s.id === id ? updated : s))
    return updated
  }, [])

  const removeSchedule = useCallback(async (id: string) => {
    await deleteIrrigationSchedule(id)
    setSchedules(prev => prev.filter(s => s.id !== id))
  }, [])

  const toggleSchedule = useCallback(async (id: string) => {
    const schedule = schedules.find(s => s.id === id)
    if (schedule) {
      return editSchedule(id, { isActive: !schedule.isActive })
    }
  }, [schedules, editSchedule])

  return {
    schedules,
    loading,
    refresh: fetchSchedules,
    createSchedule,
    editSchedule,
    removeSchedule,
    toggleSchedule,
  }
}

export function useSensorData(farmId: string, refreshInterval = 30000) {
  const [sensorData, setSensorData] = useState<SensorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSensorData = useCallback(async () => {
    try {
      const data = await getSensorData(farmId)
      setSensorData(data)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch sensor data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [farmId])

  useEffect(() => {
    fetchSensorData()
    const interval = setInterval(fetchSensorData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchSensorData, refreshInterval])

  return { sensorData, loading, error, refresh: fetchSensorData }
}

export function useAutoIrrigation(farmId: string) {
  const { sensorData, loading: sensorLoading } = useSensorData(farmId)
  const { advice, fetchAdvice } = useIrrigationAdvice()
  const { schedules, toggleSchedule } = useIrrigationSchedules(farmId)

  const activeSchedules = schedules.filter(s => s.isActive)

  const checkAndTrigger = useCallback(async () => {
    if (!sensorData || activeSchedules.length === 0) return

    for (const schedule of activeSchedules) {
      const conditions = schedule.triggerConditions
      if (!conditions) continue

      let shouldTrigger = true

      if (conditions.minMoisture && sensorData.moisture >= conditions.minMoisture) {
        shouldTrigger = false
      }
      if (conditions.maxMoisture && sensorData.moisture <= conditions.maxMoisture) {
        shouldTrigger = false
      }
      if (conditions.minTemperature && sensorData.temperature <= conditions.minTemperature) {
        shouldTrigger = false
      }
      if (conditions.maxTemperature && sensorData.temperature >= conditions.maxTemperature) {
        shouldTrigger = false
      }

      if (shouldTrigger) {
        // Auto-trigger irrigation advice
        await fetchAdvice({
          farmId,
          soilMoisture: sensorData.moisture,
          temperature: sensorData.temperature,
          humidity: sensorData.humidity,
          cropType: schedule.cropType,
        })
      }
    }
  }, [sensorData, activeSchedules, farmId, fetchAdvice])

  useEffect(() => {
    if (sensorData) {
      checkAndTrigger()
    }
  }, [sensorData, checkAndTrigger])

  return {
    sensorData,
    advice,
    activeSchedules,
    toggleSchedule,
    isLoading: sensorLoading,
  }
}