import { useState, useEffect } from 'react'
import { Droplets, Thermometer, Wind, Clock, Plus, ToggleLeft, ToggleRight, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import { useIrrigationAdvice, useIrrigationLogs, useIrrigationSchedules, useSensorData } from '../hooks'
import ScheduleForm from './ScheduleForm'
import IrrigationScheduleList from './IrrigationScheduleList'
import RecommendationCard from './RecommendationCard'

interface SmartIrrigationDashboardProps {
  farmId?: string
}

const CROP_OPTIONS = ['Rice', 'Wheat', 'Maize', 'Tomato', 'Potato', 'Onion', 'Soybean', 'Cotton', 'Sugarcane', 'Groundnut', 'Sunflower', 'Chilli', 'Turmeric', 'Coffee', 'Tea', 'Banana', 'Mango']

export default function SmartIrrigationDashboard({ farmId }: SmartIrrigationDashboardProps) {
  const [form, setForm] = useState({
    soilMoisture: 50,
    cropType: 'Rice',
    temperature: '',
    humidity: '',
    area: '',
  })
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'schedules' | 'history'>('dashboard')

  const { advice, loading: adviceLoading, fetchAdvice } = useIrrigationAdvice()
  const { logs, refresh: refreshLogs } = useIrrigationLogs(farmId)
  const { schedules, createSchedule, toggleSchedule, removeSchedule } = useIrrigationSchedules(farmId)
  const { sensorData, loading: sensorLoading } = useSensorData(farmId || 'default')

  // Auto-fetch advice if we have sensor data
  useEffect(() => {
    if (sensorData && !advice) {
      handleAutoAdvice()
    }
  }, [sensorData])

  const handleAutoAdvice = async () => {
    if (sensorData) {
      try {
        await fetchAdvice({
          farmId,
          soilMoisture: Math.round(sensorData.moisture),
          temperature: Math.round(sensorData.temperature),
          humidity: Math.round(sensorData.humidity),
          cropType: form.cropType,
        })
      } catch (err) {
        console.error('Auto advice failed:', err)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
  }

  const handleSubmit = async () => {
    const payload: Parameters<typeof fetchAdvice>[0] = {
      farmId,
      soilMoisture: form.soilMoisture,
      cropType: form.cropType,
    }

    if (form.temperature) payload.temperature = parseFloat(form.temperature)
    if (form.humidity) payload.humidity = parseFloat(form.humidity)
    if (form.area) payload.area = parseFloat(form.area)

    await fetchAdvice(payload)
    refreshLogs()
  }

  const handleLogActivity = async () => {
    if (!advice || !farmId) return

    const { logIrrigationActivity } = await import('../api')
    await logIrrigationActivity({
      farmId,
      waterUsed: advice.waterNeeded,
      duration: advice.duration,
      notes: advice.notes,
    })
    refreshLogs()
  }

  const getUrgencyConfig = (recommendation: string) => {
    switch (recommendation) {
      case 'urgent':
        return { color: 'rose', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: AlertCircle, label: 'Urgent' }
      case 'needed':
        return { color: 'amber', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: AlertCircle, label: 'Needed' }
      case 'moderate':
        return { color: 'emerald', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle, label: 'Moderate' }
      case 'none':
        return { color: 'blue', bg: 'bg-blue-50 dark:bg-blue-500/10', icon: CheckCircle, label: 'No Irrigation' }
      default:
        return { color: 'gray', bg: 'bg-gray-50', icon: CheckCircle, label: 'Unknown' }
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="page-container">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'schedules'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Schedules
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            History
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <>
            {/* Sensor Data Display */}
            {sensorData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="card p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                    <Droplets className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Soil Moisture</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {sensorData.moisture.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                    <Thermometer className="text-orange-600" size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Temperature</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {sensorData.temperature.toFixed(1)}°C
                    </p>
                  </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-500/20 flex items-center justify-center">
                    <Wind className="text-cyan-600" size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Humidity</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {sensorData.humidity.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Input Form */}
              <div className="card" style={{ padding: '28px', borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-2 mb-5">
                  <div
                    className="flex items-center justify-center rounded-xl"
                    style={{ width: 38, height: 38, background: 'rgba(16,185,129,0.1)' }}
                  >
                    <Droplets size={17} style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="section-title">Smart Irrigation Input</h2>
                    <p className="section-subtitle">Enter conditions for AI-powered recommendations</p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label">Soil Moisture</label>
                      <span
                        className="text-sm font-bold px-2.5 py-0.5 rounded-lg"
                        style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--color-primary)' }}
                      >
                        {form.soilMoisture}%
                      </span>
                    </div>
                    <input
                      type="range"
                      name="soilMoisture"
                      value={form.soilMoisture}
                      onChange={handleChange}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                      <span>0% (dry)</span>
                      <span>100% (saturated)</span>
                    </div>
                  </div>

                  <div>
                    <label className="label">Crop Type</label>
                    <select
                      name="cropType"
                      value={form.cropType}
                      onChange={handleChange}
                      className="input select"
                    >
                      {CROP_OPTIONS.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Temperature (°C)</label>
                      <input
                        type="number"
                        name="temperature"
                        value={form.temperature}
                        onChange={handleChange}
                        placeholder="Optional"
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Humidity (%)</label>
                      <input
                        type="number"
                        name="humidity"
                        value={form.humidity}
                        onChange={handleChange}
                        placeholder="Optional"
                        className="input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Area (hectares)</label>
                    <input
                      type="number"
                      name="area"
                      value={form.area}
                      onChange={handleChange}
                      placeholder="Optional"
                      className="input"
                    />
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={adviceLoading}
                    className="btn btn-primary w-full mt-2"
                  >
                    {adviceLoading ? (
                      <>
                        <span className="spinner spinner-sm" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} className="mr-2" />
                        Get Smart Recommendation
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Recommendation Result */}
              {advice && (
                <RecommendationCard
                  advice={advice}
                  onLogActivity={handleLogActivity}
                  getUrgencyConfig={getUrgencyConfig}
                />
              )}

              {!advice && (
                <div className="card flex items-center justify-center" style={{ padding: '48px', minHeight: '400px', borderColor: 'var(--color-border)' }}>
                  <div className="text-center">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center mb-4 mx-auto"
                      style={{ background: 'var(--color-surface-2)' }}
                    >
                      <Droplets size={32} style={{ color: 'var(--color-text-muted)' }} strokeWidth={1.5} />
                    </div>
                    <p className="font-semibold text-base mb-2" style={{ color: 'var(--color-text)' }}>
                      Smart Irrigation Ready
                    </p>
                    <p className="text-sm max-w-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                      Enter soil and crop data to receive AI-powered irrigation recommendations
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'schedules' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="section-title">Irrigation Schedules</h2>
              <button
                onClick={() => setShowScheduleForm(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={16} />
                Add Schedule
              </button>
            </div>

            {showScheduleForm && (
              <ScheduleForm
                farmId={farmId}
                onSubmit={async (schedule) => {
                  await createSchedule(schedule)
                  setShowScheduleForm(false)
                }}
                onCancel={() => setShowScheduleForm(false)}
              />
            )}

            <IrrigationScheduleList
              schedules={schedules}
              onToggle={toggleSchedule}
              onDelete={removeSchedule}
            />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="section-title">Irrigation History</h2>
              <button onClick={refreshLogs} className="btn btn-secondary">
                <RefreshCw size={16} className="mr-2" />
                Refresh
              </button>
            </div>

            {logs.length === 0 ? (
              <div className="card p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400">No irrigation history yet</p>
              </div>
            ) : (
              <div className="card" style={{ padding: '24px', borderColor: 'var(--color-border)' }}>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th className="text-left">Date</th>
                        <th className="text-left">Farm</th>
                        <th className="text-right">Duration (min)</th>
                        <th className="text-right">Water (L)</th>
                        <th className="text-left">Status</th>
                        <th className="text-left">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map(log => (
                        <tr key={log.id}>
                          <td style={{ color: 'var(--color-text-muted)' }}>
                            {new Date(log.scheduledDate).toLocaleDateString()}
                          </td>
                          <td className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                            {log.farm?.name || 'N/A'}
                          </td>
                          <td className="text-right font-mono" style={{ color: 'var(--color-primary)' }}>
                            {log.quantity || '-'}
                          </td>
                          <td className="text-right font-mono" style={{ color: 'var(--color-primary)' }}>
                            {log.unit === 'L' ? log.quantity : '-'}
                          </td>
                          <td>
                            <span className={`badge ${
                              log.status === 'COMPLETED' ? 'badge-success' :
                              log.status === 'PENDING' ? 'badge-warning' :
                              'badge-default'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="max-w-[200px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                            {log.notes || log.description || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}