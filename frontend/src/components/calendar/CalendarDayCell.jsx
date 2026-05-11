import { memo } from 'react'

function CalendarDayCell({
  day,
  dateStr,
  tasks = [],
  isToday = false,
  isSelected = false,
  isPast = false,
  taskVisuals = {},
  onSelect,
}) {
  const visibleTasks = tasks.slice(0, 3)
  const remainingCount = Math.max(tasks.length - visibleTasks.length, 0)
  const highPriorityCount = tasks.filter((task) => (task.priority || 'medium') === 'high').length
  const countLabel = tasks.length > 0 ? (tasks.length <= 3 ? `${tasks.length} Tasks` : `+${tasks.length}`) : ''

  const priorityBorder = highPriorityCount > 0
    ? 'rgba(239, 68, 68, 0.5)'
    : tasks.length > 0
      ? 'rgba(16, 185, 129, 0.35)'
      : 'var(--color-border)'

  return (
    <button
      type="button"
      onClick={() => onSelect?.(dateStr)}
      className="text-left transition-all duration-200"
      style={{
        padding: '10px',
        borderRadius: '14px',
        cursor: 'pointer',
        border: isSelected
          ? '2px solid var(--color-primary)'
          : `1px solid ${priorityBorder}`,
        background: isToday
          ? 'rgba(16, 185, 129, 0.10)'
          : isSelected
            ? 'rgba(16, 185, 129, 0.06)'
            : 'var(--color-surface-2)',
        boxShadow: isSelected ? '0 0 0 1px rgba(16, 185, 129, 0.16)' : 'none',
        minHeight: '96px',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-col">
          <span
            style={{
              fontSize: '0.95rem',
              fontWeight: 800,
              color: isPast && !isToday ? 'var(--color-text-muted)' : isToday ? 'var(--color-primary)' : 'var(--color-text)',
            }}
          >
            {day}
          </span>
        </div>

        {tasks.length > 0 && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0"
            style={{ background: 'rgba(16, 185, 129, 0.12)', color: highPriorityCount > 0 ? '#fca5a5' : 'var(--color-primary)' }}
          >
            {countLabel}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {visibleTasks.map((task) => {
          const visual = taskVisuals[task.task_type] || {}
          const Icon = visual.icon
          const priority = task.priority || 'medium'
          const rowBackground = priority === 'high'
            ? 'rgba(239, 68, 68, 0.08)'
            : priority === 'urgent'
              ? 'rgba(245, 158, 11, 0.08)'
              : 'rgba(255,255,255,0.04)'

          return (
            <div key={task.id} className="flex items-center gap-2 rounded-lg px-2 py-1" style={{ background: rowBackground }}>
              {Icon ? (
                <Icon size={11} style={{ color: visual.color || 'var(--color-text-muted)' }} />
              ) : (
                <span className="w-2 h-2 rounded-full" style={{ background: visual.color || 'var(--color-text-muted)' }} />
              )}
              <span className="text-[11px] leading-tight truncate" style={{ color: 'var(--color-text)' }}>
                {task.title || task.description || visual.label || task.task_type}
              </span>
              {(task.priority || 'medium') === 'high' && (
                <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239, 68, 68, 0.16)', color: '#fca5a5' }}>
                  H
                </span>
              )}
            </div>
          )
        })}

        {remainingCount > 0 && (
          <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
            +{remainingCount} more
          </p>
        )}

        {tasks.length === 0 && (
          <div className="pt-3">
            <div className="h-0.5 w-16 rounded-full" style={{ background: 'rgba(255,255,255,0.10)' }} />
          </div>
        )}
      </div>
    </button>
  )
}

export default memo(CalendarDayCell)