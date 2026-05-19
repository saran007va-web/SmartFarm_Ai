import { Clock, Droplets, Calendar, Trash2, ToggleLeft, ToggleRight, Play } from 'lucide-react'
import { IrrigationSchedule } from '../api'

interface IrrigationScheduleListProps {
  schedules: IrrigationSchedule[]
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

export default function IrrigationScheduleList({ schedules, onToggle, onDelete }: IrrigationScheduleListProps) {
  const getFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Daily'
      case 'every_other_day': return 'Every Other Day'
      case 'weekly': return 'Weekly'
      case 'custom': return 'Custom'
      default: return frequency
    }
  }

  const getNextTriggerDate = (nextTrigger?: string) => {
    if (!nextTrigger) return 'Not scheduled'
    const date = new Date(nextTrigger)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)

    if (days > 0) return `in ${days} day${days > 1 ? 's' : ''}`
    if (hours > 0) return `in ${hours} hour${hours > 1 ? 's' : ''}`
    return 'Soon'
  }

  if (schedules.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <Calendar size={28} className="text-gray-400" />
        </div>
        <p className="font-semibold text-base mb-2" style={{ color: 'var(--color-text)' }}>
          No Schedules Yet
        </p>
        <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--color-text-muted)' }}>
          Create automated irrigation schedules to optimize water usage and crop health
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {schedules.map(schedule => (
        <div
          key={schedule.id}
          className={`card p-5 transition-opacity ${
            schedule.isActive ? '' : 'opacity-60'
          }`}
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-semibold text-base" style={{ color: 'var(--color-text)' }}>
                  {schedule.name}
                </h3>
                <span className={`badge ${
                  schedule.isActive ? 'badge-success' : 'badge-default'
                }`}>
                  {schedule.isActive ? 'Active' : 'Paused'}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Crop</p>
                  <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    {schedule.cropType}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Frequency</p>
                  <p className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    {getFrequencyLabel(schedule.frequency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Time</p>
                  <p className="font-medium flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <Clock size={14} />
                    {schedule.startTime} - {schedule.endTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Water</p>
                  <p className="font-medium flex items-center gap-1" style={{ color: 'var(--color-text-secondary)' }}>
                    <Droplets size={14} />
                    {schedule.waterAmount}L / {schedule.duration}min
                  </p>
                </div>
              </div>

              {schedule.triggerConditions && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Auto-trigger conditions:</p>
                  <div className="flex gap-4 text-xs">
                    {schedule.triggerConditions.minMoisture !== undefined && (
                      <span className="px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded">
                        Min moisture: {schedule.triggerConditions.minMoisture}%
                      </span>
                    )}
                    {schedule.triggerConditions.maxMoisture !== undefined && (
                      <span className="px-2 py-1 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 rounded">
                        Max moisture: {schedule.triggerConditions.maxMoisture}%
                      </span>
                    )}
                  </div>
                </div>
              )}

              {schedule.nextTrigger && schedule.isActive && (
                <div className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Next irrigation: {getNextTriggerDate(schedule.nextTrigger)}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggle(schedule.id)}
                className={`p-2 rounded-lg transition-colors ${
                  schedule.isActive
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 hover:bg-emerald-200 dark:hover:bg-emerald-500/30'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
                title={schedule.isActive ? 'Pause schedule' : 'Activate schedule'}
              >
                {schedule.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              </button>
              <button
                onClick={() => onDelete(schedule.id)}
                className="p-2 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-600 hover:bg-rose-200 dark:hover:bg-rose-500/30 transition-colors"
                title="Delete schedule"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}