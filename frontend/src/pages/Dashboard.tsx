import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import {
  Sprout, Cloud, TrendingUp, CheckCircle, Package,
  TrendingDown, ArrowRight, MapPin, Calendar, Loader2,
} from 'lucide-react'

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

interface WeatherData {
  temperature: number
  humidity: number
  windSpeed: number
  uvIndex: number
  condition: string
  location: string
}

interface Task {
  id: string
  title: string
  farmName: string
  dueDate: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED'
}

interface MarketPrice {
  crop: string
  price: number
  unit: string
  marketName: string
  change: number
}

function KpiCard({
  label,
  value,
  trend,
  icon: Icon,
}: {
  label: string
  value: string | number
  trend?: number
  icon: React.ElementType
}) {
  const isPositive = trend && trend > 0

  return (
    <div className="card card-flat p-5">
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{
            width: 40,
            height: 40,
            background: 'var(--color-primary-light)',
          }}
        >
          <Icon size={20} style={{ color: 'var(--color-primary)' }} />
        </div>
        {trend !== undefined && (
          <div
            className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              isPositive ? 'badge-success' : 'badge-danger'
            }`}
          >
            {isPositive ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div
        className="text-2xl font-bold"
        style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-primary)' }}
      >
        {value}
      </div>
      <div className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </div>
    </div>
  )
}

function WeatherWidget({ data }: { data: WeatherData }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            <MapPin size={14} />
            {data.location}
          </div>
          <div
            className="text-4xl font-bold mt-1"
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            {Math.round(data.temperature)}°C
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {data.condition}
          </div>
        </div>
        <Cloud size={48} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Humidity</div>
          <div className="font-semibold">{data.humidity}%</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Wind</div>
          <div className="font-semibold">{data.windSpeed} km/h</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>UV Index</div>
          <div className="font-semibold">{data.uvIndex}</div>
        </div>
      </div>
    </div>
  )
}

function TaskItem({ task }: { task: Task }) {
  const priorityColors = {
    LOW: 'var(--color-success)',
    MEDIUM: 'var(--color-warning)',
    HIGH: 'var(--color-danger)',
  }

  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: priorityColors[task.priority] }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate" style={{ color: 'var(--color-text)' }}>
          {task.title}
        </div>
        <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          <span className="badge badge-neutral px-2 py-0.5">{task.farmName}</span>
          <span>{new Date(task.dueDate).toLocaleDateString()}</span>
        </div>
      </div>
      <span
        className={`badge ${
          task.status === 'COMPLETED' ? 'badge-success' :
          task.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-neutral'
        }`}
      >
        {task.status}
      </span>
    </div>
  )
}

function MarketRow({ item }: { item: MarketPrice }) {
  return (
    <tr>
      <td className="font-medium" style={{ color: 'var(--color-text)' }}>{item.crop}</td>
      <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>₹{item.price.toLocaleString()}</td>
      <td style={{ color: 'var(--color-text-muted)' }}>{item.unit}</td>
      <td style={{ color: 'var(--color-text-muted)' }}>{item.marketName}</td>
      <td>
        <span className={item.change >= 0 ? 'text-green-600' : 'text-red-500'}>
          {item.change >= 0 ? '+' : ''}{item.change}%
        </span>
      </td>
    </tr>
  )
}

export default function Dashboard() {
  const [weatherCoords, setWeatherCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Get user name
  const userName = localStorage.getItem('vaagai_user')
    ? JSON.parse(localStorage.getItem('vaagai_user')!).name
    : 'Farmer'

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: async () => {
      const res = await api.get<AnalyticsOverview>('/api/analytics/overview')
      return res.data
    },
  })

  // Fetch weather
  const { data: weather, isLoading: weatherLoading } = useQuery({
    queryKey: ['weather', weatherCoords?.lat, weatherCoords?.lng],
    queryFn: async () => {
      const res = await api.get<WeatherData>('/api/weather/current', {
        params: weatherCoords,
      })
      return res.data
    },
    enabled: !!weatherCoords,
  })

  // Fetch today's tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: async () => {
      const res = await api.get<Task[]>('/api/planning/tasks/today')
      return res.data
    },
  })

  // Fetch market prices
  const { data: market, isLoading: marketLoading } = useQuery({
    queryKey: ['market', 'prices', 5],
    queryFn: async () => {
      const res = await api.get<{ prices: MarketPrice[] }>('/api/market/prices', {
        params: { limit: 5 },
      })
      return res.data.prices
    },
  })

  // Get geolocation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setWeatherCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setWeatherCoords({ lat: 28.6139, lng: 77.209 }) // Default to Delhi
      )
    }
  }, [])

  return (
    <div className="page-container">
      {/* Greeting */}
      <div className="mb-6">
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'Sora, sans-serif', color: 'var(--color-text)' }}
        >
          {greeting()}, {userName?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>Here's what's happening on your farm today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {analyticsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card p-5">
                <div className="skeleton w-10 h-10 rounded-lg mb-3" />
                <div className="skeleton w-24 h-8 rounded mb-2" />
                <div className="skeleton w-16 h-4 rounded" />
              </div>
            ))}
          </>
        ) : (
          <>
            <KpiCard
              label="Area Planted"
              value={`${analytics?.areaPlanted || 0} ha`}
              trend={analytics?.trends.areaPlanted}
              icon={Sprout}
            />
            <KpiCard
              label="Est. Yield"
              value={`${analytics?.estimatedYield || 0} tons`}
              trend={analytics?.trends.estimatedYield}
              icon={Package}
            />
            <KpiCard
              label="Tasks Done"
              value={analytics?.tasksCompleted || 0}
              trend={analytics?.trends.tasksCompleted}
              icon={CheckCircle}
            />
            <KpiCard
              label="Revenue"
              value={`₹${(analytics?.revenueEstimate || 0).toLocaleString()}`}
              trend={analytics?.trends.revenueEstimate}
              icon={TrendingUp}
            />
          </>
        )}
      </div>

      {/* Weather & Tasks Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Weather */}
        <div>
          {weatherLoading ? (
            <div className="card p-5">
              <div className="skeleton w-32 h-6 rounded mb-4" />
              <div className="skeleton w-24 h-10 rounded mb-4" />
              <div className="grid grid-cols-3 gap-4">
                <div className="skeleton h-12 rounded" />
                <div className="skeleton h-12 rounded" />
                <div className="skeleton h-12 rounded" />
              </div>
            </div>
          ) : weather ? (
            <WeatherWidget data={weather} />
          ) : (
            <div className="card p-5 text-center" style={{ color: 'var(--color-text-muted)' }}>
              <Cloud size={32} className="mx-auto mb-2 opacity-50" />
              <p>Loading weather...</p>
            </div>
          )}
        </div>

        {/* Today's Tasks */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
              Today's Tasks
            </h3>
            <Link
              to="/planning"
              className="text-sm flex items-center gap-1"
              style={{ color: 'var(--color-primary)' }}
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {tasksLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="skeleton w-2 h-2 rounded-full" />
                  <div className="flex-1">
                    <div className="skeleton w-48 h-4 rounded mb-2" />
                    <div className="skeleton w-24 h-3 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div>
              {tasks.slice(0, 5).map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
              <Calendar size={32} className="mx-auto mb-2 opacity-50" />
              <p>No tasks for today</p>
            </div>
          )}
        </div>
      </div>

      {/* Market Prices */}
      <div className="card">
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h3 className="font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
            Market Prices
          </h3>
          <Link
            to="/market"
            className="text-sm flex items-center gap-1"
            style={{ color: 'var(--color-primary)' }}
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          {marketLoading ? (
            <table>
              <thead>
                <tr>
                  <th>Crop</th>
                  <th>Price</th>
                  <th>Unit</th>
                  <th>Market</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td><div className="skeleton w-20 h-4 rounded" /></td>
                    <td><div className="skeleton w-16 h-4 rounded" /></td>
                    <td><div className="skeleton w-12 h-4 rounded" /></td>
                    <td><div className="skeleton w-24 h-4 rounded" /></td>
                    <td><div className="skeleton w-12 h-4 rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : market && market.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Crop</th>
                  <th>Price</th>
                  <th>Unit</th>
                  <th>Market</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {market.map((item, i) => (
                  <MarketRow key={i} item={item} />
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
              <TrendingUp size={32} className="mx-auto mb-2 opacity-50" />
              <p>No market data available</p>
            </div>
          )}
        </div>
        <div className="px-5 py-3 text-xs" style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)' }}>
          Prices cached — updated 5 min ago
        </div>
      </div>
    </div>
  )
}