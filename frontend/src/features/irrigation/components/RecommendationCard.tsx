import { AlertCircle, CheckCircle, Clock, Droplets, Play, Info } from 'lucide-react'
import { IrrigationAdvice } from '../api'

interface RecommendationCardProps {
  advice: IrrigationAdvice
  onLogActivity: () => void
  getUrgencyConfig: (recommendation: string) => {
    color: string
    bg: string
    icon: typeof AlertCircle
    label: string
  }
}

export default function RecommendationCard({ advice, onLogActivity, getUrgencyConfig }: RecommendationCardProps) {
  const config = getUrgencyConfig(advice.recommendation)
  const UrgencyIcon = config.icon

  return (
    <div className="card" style={{ padding: '28px', borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-5">
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ width: 38, height: 38, background: 'rgba(16,185,129,0.1)' }}
        >
          <Droplets size={17} style={{ color: 'var(--color-primary)' }} strokeWidth={2} />
        </div>
        <div>
          <h2 className="section-title">Smart Recommendation</h2>
          <p className="section-subtitle">AI-powered irrigation advice</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Urgency Badge */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${config.bg}`}>
          <UrgencyIcon size={20} className={`text-${config.color}-600`} />
          <span className={`text-sm font-semibold capitalize text-${config.color}-700 dark:text-${config.color}-300`}>
            {config.label}
          </span>
        </div>

        {/* Recommendation Details */}
        <div
          className="p-4 rounded-xl"
          style={{ background: 'var(--color-info-bg)', border: '1px solid rgba(59,130,246,0.2)' }}
        >
          <p className="text-sm leading-relaxed" style={{ color: '#1d4ed8' }}>
            {advice.recommendation === 'urgent' && '⚠️ Immediate irrigation required!'}
            {advice.recommendation === 'needed' && '💧 Irrigation recommended today'}
            {advice.recommendation === 'moderate' && '✓ Current watering schedule is optimal'}
            {advice.recommendation === 'none' && '⏸️ No irrigation needed - soil moisture is adequate'}
          </p>
        </div>

        {/* Detailed Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Duration
            </p>
            <p className="text-lg font-bold flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
              <Clock size={16} />
              {advice.duration} min
            </p>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
              Water Needed
            </p>
            <p className="text-lg font-bold flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
              <Droplets size={16} />
              {advice.waterNeeded}L
            </p>
          </div>
        </div>

        {/* Frequency */}
        <div className="p-3 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Recommended Frequency
          </p>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {advice.frequency === 'twice_daily' && 'Twice daily (morning & evening)'}
            {advice.frequency === 'daily' && 'Daily'}
            {advice.frequency === 'every_other_day' && 'Every other day'}
            {advice.frequency === 'weekly' && 'Weekly'}
            {advice.frequency === 'skip' && 'Skip irrigation'}
          </p>
        </div>

        {/* Best Time */}
        <div className="p-3 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
            Best Time to Irrigate
          </p>
          <p className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="text-lg">🌅</span>
            {advice.bestTime || 'N/A'}
          </p>
        </div>

        {/* Notes */}
        {advice.notes && (
          <div className="p-3 rounded-lg border" style={{ background: 'var(--color-surface-1)', borderColor: 'var(--color-border)' }}>
            <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
              <Info size={12} />
              Notes
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {advice.notes}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onLogActivity}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Play size={16} />
            Log Activity
          </button>
        </div>
      </div>
    </div>
  )
}