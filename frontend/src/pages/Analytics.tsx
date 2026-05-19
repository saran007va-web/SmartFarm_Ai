import { useState } from 'react'
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
          <p className="page-subtitle">Explore yield trends and farm performance</p>
        </div>
        <div className="flex gap-2">
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
          <button className="btn btn-secondary">
            <Download size={16} />
            Export
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
    </div>
  )
}