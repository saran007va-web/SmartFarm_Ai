import { useState } from 'react'
import { X, Clock, Droplets, Calendar } from 'lucide-react'
import { IrrigationSchedule } from '../api'

interface ScheduleFormProps {
  farmId?: string
  schedule?: IrrigationSchedule
  onSubmit: (schedule: Omit<IrrigationSchedule, 'id' | 'lastTriggered' | 'nextTrigger'>) => void
  onCancel: () => void
}

const CROP_OPTIONS = ['Rice', 'Wheat', 'Maize', 'Tomato', 'Potato', 'Onion', 'Soybean', 'Cotton', 'Sugarcane', 'Groundnut', 'Sunflower', 'Chilli', 'Turmeric', 'Coffee', 'Tea', 'Banana', 'Mango']

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'every_other_day', label: 'Every Other Day' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom Days' },
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

export default function ScheduleForm({ farmId, schedule, onSubmit, onCancel }: ScheduleFormProps) {
  const [form, setForm] = useState({
    farmId: farmId || '',
    name: schedule?.name || '',
    cropType: schedule?.cropType || 'Rice',
    startTime: schedule?.startTime || '06:00',
    endTime: schedule?.endTime || '18:00',
    frequency: schedule?.frequency || 'daily',
    customDays: schedule?.customDays || [],
    duration: schedule?.duration || 30,
    waterAmount: schedule?.waterAmount || 5000,
    isActive: schedule?.isActive ?? true,
    triggerConditions: schedule?.triggerConditions || {
      minMoisture: 30,
      maxMoisture: 80,
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
              type === 'number' ? parseFloat(value) || 0 : value,
    }))
  }

  const handleDayToggle = (day: number) => {
    setForm(f => ({
      ...f,
      customDays: f.customDays.includes(day)
        ? f.customDays.filter(d => d !== day)
        : [...f.customDays, day].sort(),
    }))
  }

  const handleConditionChange = (field: string, value: number | undefined) => {
    setForm(f => ({
      ...f,
      triggerConditions: {
        ...f.triggerConditions,
        [field]: value,
      },
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...form,
      farmId: farmId || form.farmId || 'default',
    })
  }

  return (
    <div className="card mb-6" style={{ padding: '24px', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
          {schedule ? 'Edit Schedule' : 'New Irrigation Schedule'}
        </h3>
        <button onClick={onCancel} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <X size={20} style={{ color: 'var(--color-text-muted)' }} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Schedule Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Morning Irrigation"
              className="input"
              required
            />
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label flex items-center gap-2">
              <Clock size={14} />
              Start Time
            </label>
            <input
              type="time"
              name="startTime"
              value={form.startTime}
              onChange={handleChange}
              className="input"
              required
            />
          </div>
          <div>
            <label className="label flex items-center gap-2">
              <Clock size={14} />
              End Time
            </label>
            <input
              type="time"
              name="endTime"
              value={form.endTime}
              onChange={handleChange}
              className="input"
              required
            />
          </div>
        </div>

        <div>
          <label className="label flex items-center gap-2">
            <Calendar size={14} />
            Frequency
          </label>
          <select
            name="frequency"
            value={form.frequency}
            onChange={handleChange}
            className="input select"
          >
            {FREQUENCY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {form.frequency === 'custom' && (
          <div>
            <label className="label">Select Days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleDayToggle(day.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    form.customDays.includes(day.value)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label flex items-center gap-2">
              <Clock size={14} />
              Duration (minutes)
            </label>
            <input
              type="number"
              name="duration"
              value={form.duration}
              onChange={handleChange}
              min={5}
              max={180}
              className="input"
            />
          </div>
          <div>
            <label className="label flex items-center gap-2">
              <Droplets size={14} />
              Water Amount (L)
            </label>
            <input
              type="number"
              name="waterAmount"
              value={form.waterAmount}
              onChange={handleChange}
              min={100}
              max={50000}
              className="input"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
          <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            Auto-Trigger Conditions (Optional)
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Min Moisture (%)</label>
              <input
                type="number"
                value={form.triggerConditions.minMoisture}
                onChange={(e) => handleConditionChange('minMoisture', parseFloat(e.target.value))}
                min={0}
                max={100}
                className="input"
                placeholder="Auto-trigger below"
              />
            </div>
            <div>
              <label className="label">Max Moisture (%)</label>
              <input
                type="number"
                value={form.triggerConditions.maxMoisture}
                onChange={(e) => handleConditionChange('maxMoisture', parseFloat(e.target.value))}
                min={0}
                max={100}
                className="input"
                placeholder="Auto-trigger above"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            {schedule ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </div>
      </form>
    </div>
  )
}