import { useMemo, useState, useEffect, useRef } from 'react'
import { useFarmStore } from '../components/farm3d/farmStore'
import { format, startOfMonth, startOfWeek, addDays, subMonths, addMonths, isSameDay } from 'date-fns'
import { getTasksForDay } from '../lib/cropDatabase'
import api from '../lib/api'

function daysBetween(start: string, end: Date) {
  try {
    const s = new Date(start)
    const diff = Math.ceil((+end - +s) / (1000 * 60 * 60 * 24))
    return Math.max(1, diff)
  } catch (e) {
    return 1
  }
}

export default function FarmCalendar() {
  const { crops, taskCompletions, setTaskCompletions, markTaskComplete, unmarkTaskComplete } = useFarmStore()
  const [viewDate, setViewDate] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [selectedPlotId, setSelectedPlotId] = useState<string>('all')
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle')
  const hasLoadedRef = useRef(false)

  const monthStart = startOfMonth(viewDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })

  const filteredCrops = useMemo(
    () => (selectedPlotId === 'all' ? crops : crops.filter((c) => c.id === selectedPlotId)),
    [crops, selectedPlotId]
  )

  const days = useMemo(() => {
    const arr: Date[] = []
    // show 6 weeks
    for (let i = 0; i < 42; i++) {
      arr.push(addDays(calendarStart, i))
    }
    return arr
  }, [calendarStart])

  const daySummaries = useMemo(() => {
    const map = new Map<string, { total: number; completed: number; plots: { id: string; name: string }[] }>()
    days.forEach((d) => {
      const key = d.toISOString().slice(0, 10)
      let total = 0
      let completed = 0
      const plots: { id: string; name: string }[] = []
      filteredCrops.forEach((plot) => {
        const dayNum = daysBetween(plot.plantedDate, d)
        const tasks = getTasksForDay(plot.cropType, dayNum).tasks || []
        if (tasks.length > 0) {
          total += tasks.length
          plots.push({ id: plot.id, name: plot.name })
          const completedList = (taskCompletions && taskCompletions[plot.id] && taskCompletions[plot.id][key]) || []
          completed += completedList.length
        }
      })
      map.set(key, { total, completed, plots })
    })
    return map
  }, [days, filteredCrops, taskCompletions])

  // load persisted completions from backend once
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await api.get<{ taskCompletions: Record<string, Record<string, string[]>> }>('/api/calendar/task-completions')
        if (active && res.data?.taskCompletions) {
          setTaskCompletions(res.data.taskCompletions)
        }
        if (active) {
          hasLoadedRef.current = true
          setSyncState('saved')
        }
      } catch {
        if (active) {
          hasLoadedRef.current = true
          setSyncState('error')
        }
      }
    })()
    return () => {
      active = false
    }
  }, [setTaskCompletions])

  // debounce sync to backend whenever completion map changes after initial load
  useEffect(() => {
    if (!hasLoadedRef.current) return
    const t = window.setTimeout(async () => {
      try {
        setSyncState('syncing')
        await api.put('/api/calendar/task-completions', { taskCompletions })
        setSyncState('saved')
      } catch {
        setSyncState('error')
      }
    }, 700)
    return () => window.clearTimeout(t)
  }, [taskCompletions])

  const openPrev = () => setViewDate((d) => subMonths(d, 1))
  const openNext = () => setViewDate((d) => addMonths(d, 1))

  const heatmap = useMemo(() => {
    const cells: { key: string; date: Date; ratio: number; total: number; completed: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const date = addDays(new Date(), -i)
      const key = date.toISOString().slice(0, 10)
      let total = 0
      let completed = 0
      filteredCrops.forEach((plot) => {
        const dayNum = daysBetween(plot.plantedDate, date)
        const tasks = getTasksForDay(plot.cropType, dayNum).tasks || []
        total += tasks.length
        const done = (taskCompletions?.[plot.id]?.[key] || []).length
        completed += done
      })
      const ratio = total > 0 ? Math.min(1, completed / total) : 0
      cells.push({ key, date, ratio, total, completed })
    }
    return cells
  }, [filteredCrops, taskCompletions])

  const onDayKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, d: Date) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setSelectedDate(d)
      return
    }
    let target: Date | null = null
    if (e.key === 'ArrowRight') target = addDays(d, 1)
    if (e.key === 'ArrowLeft') target = addDays(d, -1)
    if (e.key === 'ArrowDown') target = addDays(d, 7)
    if (e.key === 'ArrowUp') target = addDays(d, -7)
    if (target) {
      e.preventDefault()
      setSelectedDate(target)
      setViewDate(target)
    }
  }

  const heatColor = (ratio: number) => {
    if (ratio <= 0) return 'bg-gray-200'
    if (ratio < 0.25) return 'bg-emerald-100'
    if (ratio < 0.5) return 'bg-emerald-300'
    if (ratio < 0.75) return 'bg-emerald-500'
    return 'bg-emerald-700'
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title">Farm Calendar</h1>
          <p className="page-subtitle">Monthly view of tasks across your plots</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input w-44"
            value={selectedPlotId}
            onChange={(e) => setSelectedPlotId(e.target.value)}
            aria-label="Filter by plot"
          >
            <option value="all">All plots</option>
            {crops.map((plot) => (
              <option key={plot.id} value={plot.id}>{plot.name}</option>
            ))}
          </select>
          <button className="btn" onClick={openPrev}>Prev</button>
          <div className="text-sm font-semibold px-2">{format(viewDate, 'MMMM yyyy')}</div>
          <button className="btn" onClick={openNext}>Next</button>
        </div>
      </div>

      <div className="mb-3 text-xs">
        <span className={`px-2 py-1 rounded ${syncState === 'saved' ? 'bg-emerald-100 text-emerald-700' : syncState === 'syncing' ? 'bg-blue-100 text-blue-700' : syncState === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
          Sync: {syncState}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1 bg-transparent">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="text-[11px] uppercase tracking-wide text-muted-foreground text-center py-1 font-semibold">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 mt-2">
        {days.map((d) => {
          const key = d.toISOString().slice(0,10)
          const summary = daySummaries.get(key) || { total: 0, completed: 0, plots: [] }
          const isCurrentMonth = d.getMonth() === monthStart.getMonth()
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => onDayKeyDown(e, d)}
              className={`p-2 rounded-lg border transition-colors hover:border-emerald-300 hover:bg-emerald-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 ${isSameDay(d, selectedDate || new Date()) ? 'border-emerald-500 bg-emerald-50' : 'border-border bg-transparent'}`}
              onClick={() => setSelectedDate(d)}
            >
              <div className={`text-sm font-medium ${isCurrentMonth ? 'text-gray-800' : 'text-gray-400'}`}>{d.getDate()}</div>
              {summary.total > 0 && (
                <div className="mt-2 text-xs">
                  <div className="font-semibold">{summary.total} tasks</div>
                  <div className="text-[11px] text-muted-foreground">{summary.completed} done</div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 card p-4">
          <h3 className="font-semibold mb-3">Tasks for {selectedDate ? format(selectedDate, 'dd MMM yyyy') : '—'}</h3>
          {!selectedDate && <div className="text-sm text-muted-foreground">Select a date to view tasks</div>}
          {selectedDate && (
            <div>
              {filteredCrops.map((plot) => {
                const key = selectedDate.toISOString().slice(0,10)
                const dayNum = daysBetween(plot.plantedDate, selectedDate)
                const tasks = getTasksForDay(plot.cropType, dayNum).tasks || []
                if (tasks.length === 0) return null
                const completedList = (taskCompletions && taskCompletions[plot.id] && taskCompletions[plot.id][key]) || []
                return (
                  <div key={plot.id} className="p-3 rounded border mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">{plot.name}</div>
                        <div className="text-xs text-muted-foreground">{plot.cropType}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">Day {dayNum}</div>
                    </div>
                    <ul className="space-y-2">
                      {tasks.map((t: any, idx: number) => {
                        const tid = `${plot.id}::${key}::${idx}`
                        const done = completedList.includes(tid)
                        return (
                          <li key={tid} className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{t.task}</div>
                              <div className="text-xs text-muted-foreground">{t.time ?? 'Anytime'}</div>
                            </div>
                            <div>
                              <input type="checkbox" checked={!!done} onChange={(e) => {
                                if (e.target.checked) markTaskComplete(plot.id, key, tid)
                                else unmarkTaskComplete(plot.id, key, tid)
                              }} />
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card p-4">
          <h4 className="font-semibold mb-2">30-Day Completion Heatmap</h4>
          <div className="grid grid-cols-10 gap-1 mb-3">
            {heatmap.map((cell) => (
              <div
                key={cell.key}
                title={`${format(cell.date, 'dd MMM')}: ${cell.completed}/${cell.total}`}
                className={`h-4 rounded ${heatColor(cell.ratio)}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-3">
            <span>Low</span>
            <span className="inline-block h-3 w-3 rounded bg-gray-200" />
            <span className="inline-block h-3 w-3 rounded bg-emerald-100" />
            <span className="inline-block h-3 w-3 rounded bg-emerald-300" />
            <span className="inline-block h-3 w-3 rounded bg-emerald-500" />
            <span className="inline-block h-3 w-3 rounded bg-emerald-700" />
            <span>High</span>
          </div>
          <div className="text-sm text-muted-foreground mb-2">Plots in view: {filteredCrops.length}</div>
          <div className="text-sm text-muted-foreground">Keyboard: use arrow keys on day cells, Enter/Space to select.</div>
        </div>
      </div>
    </div>
  )
}
