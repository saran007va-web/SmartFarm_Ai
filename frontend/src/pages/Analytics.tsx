import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import {
  BarChart3, Download, Calendar, TrendingUp, Sprout,
  Loader2,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useFarmStore, CROP_TYPES } from '../components/farm3d/farmStore'
import { getTasksForDay } from '../lib/cropDatabase'
import { format } from 'date-fns'

interface AnalyticsOverview {
  areaPlanted: number
  estimatedYield: number
  tasksCompleted: number
  revenueEstimate: number
  trends: {
    areaPlanted: number
    estimatedYield: number
    tasksCompleted: number
    revenueEstimate: number
  }
}

interface TimeSeriesData {
  date: string
  value: number
}

const COLORS = ['#2d7a2d', '#52a852', '#a8dba8', '#d6f0d6', '#fbbf24']

export default function Analytics() {
  const [dateRange, setDateRange] = useState('30d')

  const { crops, taskCompletions, markTaskComplete, unmarkTaskComplete } = useFarmStore()

  const todayStr = format(new Date(), 'yyyy-MM-dd')

  function daysBetween(start: string, end: Date = new Date()) {
    try {
      const s = new Date(start)
      const diff = Math.ceil((+end - +s) / (1000 * 60 * 60 * 24))
      return diff
    } catch (e) {
      return 0
    }
  }

  const [activePlot, setActivePlot] = useState<string | null>(crops[0]?.id ?? null)
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false)

  // Compute per-plot today's completion ratio
  const plotSummaries = useMemo(() => {
    return crops.map((plot) => {
      const daysSince = Math.max(1, daysBetween(plot.plantedDate))
      const { tasks } = getTasksForDay(plot.cropType, daysSince)
      const total = tasks.length
      const completed = (taskCompletions && taskCompletions[plot.id] && taskCompletions[plot.id][todayStr]) || []
      const completedCount = tasks.map((_, idx) => `${plot.id}::${todayStr}::${idx}`).filter(id => completed.includes(id)).length
      const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0
      const cropMeta = CROP_TYPES[plot.cropType] || null
      const totalDays = cropMeta ? cropMeta.daysToHarvest || cropMeta.totalDays || 0 : 0
      const daysToHarvest = plot.expectedHarvest ? Math.max(0, daysBetween(format(new Date(), 'yyyy-MM-dd'), new Date(plot.expectedHarvest))) : Math.max(0, totalDays - daysSince)
      return { plot, total, completedCount, completionRate, daysToHarvest, daysSince }
    })
  }, [crops, taskCompletions, todayStr])

  function exportCSV() {
    const rows: string[] = []
    rows.push(['plotId', 'plotName', 'cropType', 'date', 'taskTime', 'task', 'status', 'daysToHarvest'].join(','))
    crops.forEach((plot) => {
      const daysSince = Math.max(1, daysBetween(plot.plantedDate))
      const { tasks } = getTasksForDay(plot.cropType, daysSince)
      const completed = (taskCompletions && taskCompletions[plot.id] && taskCompletions[plot.id][todayStr]) || []
      tasks.forEach((t: any, idx: number) => {
        const tid = `${plot.id}::${todayStr}::${idx}`
        const status = completed.includes(tid) ? 'completed' : 'incomplete'
        const daysToHarvest = plot.expectedHarvest ? Math.max(0, daysBetween(format(new Date(), 'yyyy-MM-dd'), new Date(plot.expectedHarvest))) : ''
        // Escape commas in task text
        const safeTask = (t.task || '').replace(/"/g, '""')
        rows.push([plot.id, plot.name.replace(/,/g, ''), plot.cropType, todayStr, t.time || '', `"${safeTask}"`, status, String(daysToHarvest)].join(','))
      })
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics_tasks_${todayStr}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (!activePlot && crops.length > 0) setActivePlot(crops[0].id)
  }, [crops])

  // Fetch overview
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview', dateRange],
    queryFn: async () => {
      const res = await api.get<AnalyticsOverview>('/api/analytics/overview', {
        params: { from: dateRange },
      })
      return res.data
    },
  })

  // Fetch yield time series
  const { data: yieldData } = useQuery({
    queryKey: ['analytics', 'yield', dateRange],
    queryFn: async () => {
      const res = await api.get<TimeSeriesData[]>('/api/analytics/time-series', {
        params: { metric: 'yield', from: dateRange },
      })
      return res.data
    },
  })

  // Fetch tasks time series
  const { data: tasksData } = useQuery({
    queryKey: ['analytics', 'tasks', dateRange],
    queryFn: async () => {
      const res = await api.get<TimeSeriesData[]>('/api/analytics/time-series', {
        params: { metric: 'tasks', from: dateRange },
      })
      return res.data
    },
  })

  // Mock crop distribution data
  const cropDistribution = [
    { name: 'Rice', value: 35 },
    { name: 'Wheat', value: 25 },
    { name: 'Corn', value: 20 },
    { name: 'Vegetables', value: 15 },
    { name: 'Other', value: 5 },
  ]

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Explore yield trends, tasks and per-plot performance</p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            className="input select w-auto"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>

          <select className="input select w-auto" value={selectedPlot} onChange={(e) => setSelectedPlot(e.target.value || 'all')}>
            <option value="all">All plots</option>
            {crops.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showOnlyIncomplete} onChange={(e) => setShowOnlyIncomplete(e.target.checked)} />
            <span className="text-sm">Show only incomplete tasks</span>
          </label>

          <button className="btn btn-secondary" onClick={exportCSV}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {overviewLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="card p-5">
              <div className="skeleton w-10 h-10 rounded-lg mb-3" />
              <div className="skeleton w-24 h-8 rounded mb-2" />
              <div className="skeleton w-16 h-4 rounded" />
            </div>
          ))
        ) : (
          <>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
                <Sprout size={16} />
                Area Planted
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-primary)' }}>
                {overview?.areaPlanted || 0} ha
              </div>
              <div className={`text-sm ${(overview?.trends.areaPlanted || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {(overview?.trends.areaPlanted || 0) >= 0 ? '↑' : '↓'} {Math.abs(overview?.trends.areaPlanted || 0)}%
              </div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
                <TrendingUp size={16} />
                Est. Yield
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-primary)' }}>
                {overview?.estimatedYield || 0} tons
              </div>
              <div className={`text-sm ${(overview?.trends.estimatedYield || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {(overview?.trends.estimatedYield || 0) >= 0 ? '↑' : '↓'} {Math.abs(overview?.trends.estimatedYield || 0)}%
              </div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
                <BarChart3 size={16} />
                Tasks Completed
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-primary)' }}>
                {overview?.tasksCompleted || 0}
              </div>
              <div className={`text-sm ${(overview?.trends.tasksCompleted || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {(overview?.trends.tasksCompleted || 0) >= 0 ? '↑' : '↓'} {Math.abs(overview?.trends.tasksCompleted || 0)}%
              </div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
                ₹ Revenue
              </div>
              <div className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-primary)' }}>
                ₹{(overview?.revenueEstimate || 0).toLocaleString()}
              </div>
              <div className={`text-sm ${(overview?.trends.revenueEstimate || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {(overview?.trends.revenueEstimate || 0) >= 0 ? '↑' : '↓'} {Math.abs(overview?.trends.revenueEstimate || 0)}%
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Yield over time */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Yield Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yieldData || []}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                  labelFormatter={(d) => new Date(d).toLocaleDateString()}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tasks completed vs planned */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Tasks Completed vs Planned</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tasksData || []}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
                <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue trend */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Revenue Estimate Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yieldData || []}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  stroke="var(--color-text-muted)"
                  fontSize={12}
                />
                <YAxis stroke="var(--color-text-muted)" fontSize={12} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                  formatter={(v: number) => [`₹${v}`, 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#d97706"
                  fill="var(--color-accent-light)"
                  fillOpacity={0.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Crop distribution */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Crop Distribution</h3>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cropDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {cropDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                  }}
                  formatter={(v: number) => [`${v}%`, 'Share']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Plots & Daily Activities - redesigned */}
      <div className="mt-6">
        <h3 className="section-title mb-4">Plots & Daily Activities</h3>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Plot list */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Plots</div>
              <div className="text-xs text-muted-foreground">{crops.length} plots</div>
            </div>
            {plotSummaries.map((s) => (
              <button key={s.plot.id} onClick={() => setActivePlot(s.plot.id)} className={`w-full text-left p-3 rounded-lg border ${activePlot === s.plot.id ? 'border-emerald-500 bg-emerald-50' : 'border-border bg-transparent'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.plot.name}</div>
                    <div className="text-xs text-muted-foreground">{s.plot.cropType} • Day {s.daysSince}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{s.daysToHarvest}d</div>
                    <div className="text-xs text-muted-foreground">to harvest</div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="h-2 bg-gray-200 rounded overflow-hidden">
                    <div className="h-2 bg-emerald-500" style={{ width: `${s.completionRate}%` }} />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">{s.completedCount}/{s.total} tasks today • {s.completionRate}%</div>
                </div>
              </button>
            ))}
          </div>

          {/* Right: Selected plot details */}
          <div className="lg:col-span-2">
            {activePlot ? (() => {
              const sel = plotSummaries.find(p => p.plot.id === activePlot)
              if (!sel) return <div className="card p-5">Select a plot to view analytics</div>
              const { plot, total, completedCount, completionRate, daysToHarvest, daysSince } = sel

              // build last 14 days completion series for this plot
              const daysBack = 14
              const series = [] as { date: string, completed: number, total: number }[]
              for (let i = daysBack - 1; i >= 0; i--) {
                const d = new Date()
                d.setDate(d.getDate() - i)
                const key = d.toISOString().slice(0,10)
                const dayCompleted = (taskCompletions && taskCompletions[plot.id] && taskCompletions[plot.id][key]) || []
                // count completed tasks for that day
                const tasksForDay = getTasksForDay(plot.cropType, Math.max(1, daysBetween(plot.plantedDate, new Date(key))))
                series.push({ date: key, completed: dayCompleted.length, total: tasksForDay.tasks.length })
              }

              return (
                <div className="card p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="text-lg font-semibold">{plot.name}</div>
                      <div className="text-sm text-muted-foreground">{plot.cropType} • Planted {plot.plantedDate} • Day {daysSince}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Days to harvest</div>
                      <div className="text-2xl font-bold">{daysToHarvest}d</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="p-3 rounded-lg border">
                      <div className="text-xs text-muted-foreground">Today's tasks completed</div>
                      <div className="text-xl font-semibold mt-2">{completedCount}/{total}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">Completion rate: {completionRate}%</div>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="text-xs text-muted-foreground">Health</div>
                      <div className="text-xl font-semibold mt-2">{plot.health}%</div>
                      <div className="text-[11px] text-muted-foreground mt-1">Avg. health of plants</div>
                    </div>
                    <div className="p-3 rounded-lg border">
                      <div className="text-xs text-muted-foreground">Irrigation</div>
                      <div className="text-xl font-semibold mt-2">{plot.irrigationEnabled ? 'Enabled' : 'Disabled'}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">Smart irrigation status</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Completion (last 14 days)</h4>
                    <div className="h-28">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={series.map(s => ({ date: s.date, value: s.completed }))}>
                          <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} stroke="var(--color-text-muted)" fontSize={11} />
                          <YAxis stroke="var(--color-text-muted)" fontSize={11} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#10B981" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Today's Tasks</h4>
                    {total === 0 && <div className="text-sm text-muted-foreground">No tasks scheduled for today.</div>}
                    <ul className="space-y-2">
                      {getTasksForDay(plot.cropType, Math.max(1, daysBetween(plot.plantedDate))).tasks.map((t: any, idx: number) => {
                        const taskId = `${plot.id}::${todayStr}::${idx}`
                        const completedForToday = (taskCompletions && taskCompletions[plot.id] && taskCompletions[plot.id][todayStr]) || []
                        const complete = completedForToday.includes(taskId)
                        return (
                          <li key={taskId} className="flex items-center justify-between p-3 rounded-md border">
                            <div>
                              <div className="font-medium">{t.task}</div>
                              <div className="text-xs text-muted-foreground">{t.time ?? 'Anytime'} • {t.frequency}</div>
                            </div>
                            <div>
                              <input type="checkbox" checked={!!complete} onChange={(e) => {
                                if (e.target.checked) markTaskComplete(plot.id, todayStr, taskId)
                                else unmarkTaskComplete(plot.id, todayStr, taskId)
                              }} />
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              )
            })() : (
              <div className="card p-5">No plot selected</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}