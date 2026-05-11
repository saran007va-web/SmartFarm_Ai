import { memo } from 'react'
import { CheckCircle2, Circle, Edit2, Trash2, Clock3, Bell, Flag, CalendarDays, Tag, MapPin } from 'lucide-react'

const PRIORITY_STYLES = {
  low: { bg: 'rgba(107, 114, 128, 0.14)', color: '#cbd5e1' },
  medium: { bg: 'rgba(59, 130, 246, 0.14)', color: '#93c5fd' },
  high: { bg: 'rgba(239, 68, 68, 0.16)', color: '#fca5a5' },
  urgent: { bg: 'rgba(245, 158, 11, 0.18)', color: '#fdba74' },
}

const STATUS_STYLES = {
  planned: { bg: 'rgba(59, 130, 246, 0.12)', color: '#93c5fd' },
  in_progress: { bg: 'rgba(245, 158, 11, 0.14)', color: '#fdba74' },
  completed: { bg: 'rgba(16, 185, 129, 0.14)', color: '#6ee7b7' },
  missed: { bg: 'rgba(239, 68, 68, 0.14)', color: '#fca5a5' },
}

const formatTime = (value) => {
  if (!value) return '—'
  if (/^\d{2}:\d{2}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function TaskCard({
  task,
  taskVisual = {},
  cropName,
  farmName,
  onToggleComplete,
  onEdit,
  onDelete,
  onPriorityChange,
  onStatusChange,
  onReschedule,
}) {
  const completed = Boolean(task.completed || task.status === 'completed')
  const status = task.status || (completed ? 'completed' : 'planned')
  const priority = task.priority || 'medium'
  const Icon = taskVisual.icon
  const title = task.title || task.description || taskVisual.label || task.task_type
  const assignedCrop = task.assigned_crop || cropName || '—'
  const stageLabel = task.growth_stage || '—'

  return (
    <div
      className="rounded-2xl border transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: completed ? 'rgba(16, 185, 129, 0.06)' : 'var(--color-surface-2)',
        borderColor: completed ? 'rgba(16, 185, 129, 0.24)' : 'var(--color-border)',
        padding: '14px',
      }}
    >
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => onToggleComplete?.(task)} className="btn btn-ghost btn-icon btn-sm mt-0.5">
          {completed ? <CheckCircle2 size={18} style={{ color: 'var(--color-primary)' }} /> : <Circle size={18} style={{ color: 'var(--color-text-muted)' }} />}
        </button>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {Icon ? <Icon size={14} style={{ color: taskVisual.color || 'var(--color-text)' }} /> : null}
                <p
                  className="font-semibold truncate"
                  style={{
                    color: completed ? 'var(--color-text-muted)' : 'var(--color-text)',
                    textDecoration: completed ? 'line-through' : 'none',
                  }}
                >
                  {title}
                </p>
              </div>

              <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                <span className="px-2 py-0.5 rounded-full" style={STATUS_STYLES[status] || STATUS_STYLES.planned}>
                  {status.replace(/_/g, ' ')}
                </span>
                <span className="px-2 py-0.5 rounded-full" style={PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium}>
                  priority: {priority}
                </span>
                {task.is_auto_generated && (
                  <span className="px-2 py-0.5 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.10)', color: 'var(--color-primary)' }}>
                    recurring
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => onEdit?.(task)} className="btn btn-ghost btn-icon btn-sm" title="Edit task">
                <Edit2 size={14} />
              </button>
              <button type="button" onClick={() => onDelete?.(task)} className="btn btn-ghost btn-icon btn-sm" title="Delete task">
                <Trash2 size={14} style={{ color: '#ef4444' }} />
              </button>
            </div>
          </div>

          {task.description && <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{task.description}</p>}

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-xl px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><Clock3 size={11} /> start</span>
              <p className="mt-0.5 font-medium" style={{ color: 'var(--color-text)' }}>{formatTime(task.start_time) || formatTime(task.task_date)}</p>
            </div>
            <div className="rounded-xl px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><Clock3 size={11} /> end</span>
              <p className="mt-0.5 font-medium" style={{ color: 'var(--color-text)' }}>{formatTime(task.end_time) || '—'}</p>
            </div>
            <div className="rounded-xl px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><MapPin size={11} /> crop</span>
              <p className="mt-0.5 font-medium truncate" style={{ color: 'var(--color-text)' }}>{assignedCrop}</p>
            </div>
            <div className="rounded-xl px-2 py-1.5" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}><CalendarDays size={11} /> stage</span>
              <p className="mt-0.5 font-medium truncate" style={{ color: 'var(--color-text)' }}>{stageLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-1" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-muted)' }}>
              <Flag size={11} /> {priority}
            </span>
            {task.reminder_minutes != null && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-muted)' }}>
                <Bell size={11} /> remind {task.reminder_minutes}m before
              </span>
            )}
            {farmName && (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-1" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-muted)' }}>
                <Tag size={11} /> {farmName}
              </span>
            )}
          </div>

          {task.notes && <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{task.notes}</p>}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button type="button" onClick={() => onToggleComplete?.(task)} className="btn btn-sm">
              {completed ? 'Mark active' : 'Mark complete'}
            </button>
            <button type="button" onClick={() => onReschedule?.(task)} className="btn btn-sm btn-ghost">Reschedule</button>
            <select
              value={priority}
              onChange={(e) => onPriorityChange?.(task, e.target.value)}
              className="input"
              style={{ width: '120px', fontSize: '0.75rem', padding: '8px 10px' }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select
              value={status}
              onChange={(e) => onStatusChange?.(task, e.target.value)}
              className="input"
              style={{ width: '130px', fontSize: '0.75rem', padding: '8px 10px' }}
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="missed">Missed</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(TaskCard)