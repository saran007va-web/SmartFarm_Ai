import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import {
  AlertCircle,
  IndianRupee,
  MapPin,
  Minus,
  RefreshCw,
  Search,
  ShoppingBasket,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { INDIA } from '../lib/indiaData'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'

interface MarketPrice {
  crop: string
  market_type: string
  price_per_kg: number
  min_price: number
  max_price: number
  modal_price_raw: number
  date: string
  state: string
  district: string
  market: string
  variety: string
}

interface MarketPricesResponse {
  prices: MarketPrice[]
  count: number
  stats: {
    avgPrice: number
    minPrice: number
    maxPrice: number
  }
  lastUpdated: string
}

interface PriceHistoryPoint {
  date: string | Date
  price: number
}

const POPULAR_CROPS = ['Tomato', 'Onion', 'Potato', 'Rice', 'Wheat', 'Maize', 'Sugarcane', 'Cotton', 'Soybean', 'Groundnut']

const formatPrice = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`

const getTrend = (current: number, previous: number) => {
  if (previous <= 0 || current === previous) return 'stable'
  return current > previous ? 'up' : 'down'
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp size={15} className="text-red-500" />
  if (trend === 'down') return <TrendingDown size={15} className="text-green-600" />
  return <Minus size={15} className="text-gray-400" />
}

function StatCard({ label, value, sublabel, tone }: { label: string; value: string | number; sublabel?: string; tone: 'blue' | 'green' | 'amber' | 'red' }) {
  const toneClasses: Record<typeof tone, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  }

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {sublabel ? <p className="text-xs mt-1 opacity-60">{sublabel}</p> : null}
    </div>
  )
}

export default function Market() {
  const [cropQuery, setCropQuery] = useState('Tomato')
  const [stateFilter, setStateFilter] = useState('')
  const [expandedCrop, setExpandedCrop] = useState<string | null>('Tomato')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['market', 'prices', cropQuery, stateFilter],
    queryFn: async () => {
      const res = await api.get<MarketPricesResponse>('/api/market/prices', {
        params: {
          crop: cropQuery || undefined,
          state: stateFilter || undefined,
          limit: 100,
        },
      })
      return res.data
    },
  })

  const { data: historyData } = useQuery({
    queryKey: ['market', 'history', expandedCrop],
    queryFn: async () => {
      const res = await api.get<{ history: PriceHistoryPoint[] }>(`/api/market/history/${expandedCrop}`, {
        params: { days: 14 },
      })
      return res.data.history
    },
    enabled: !!expandedCrop,
  })

  useEffect(() => {
    if (!data) return
    setLastRefresh(new Date())
  }, [data])

  useEffect(() => {
    const interval = window.setInterval(() => {
      refetch()
    }, 5 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [refetch])

  const prices = data?.prices ?? []
  const groupedMarkets = useMemo(() => {
    const map = new Map<string, MarketPrice[]>()
    prices.forEach((price) => {
      const key = `${price.market} (${price.district || 'Unknown district'}, ${price.state || 'Unknown state'})`
      const list = map.get(key) ?? []
      list.push(price)
      map.set(key, list)
    })

    return Array.from(map.entries())
      .map(([key, entries]) => {
        const current = entries[0]
        const sortedHistory = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        const previous = sortedHistory.length > 1 ? sortedHistory[sortedHistory.length - 2].price_per_kg : current.price_per_kg
        const avgModal = Math.round(entries.reduce((sum, entry) => sum + entry.price_per_kg, 0) / entries.length)

        return {
          key,
          market: current.market,
          state: current.state,
          district: current.district,
          commodity: current.crop,
          min: Math.round(Math.min(...entries.map((entry) => entry.min_price || entry.price_per_kg))),
          modal: avgModal,
          max: Math.round(Math.max(...entries.map((entry) => entry.max_price || entry.price_per_kg))),
          trend: getTrend(avgModal, Math.round(previous)),
          latestDate: entries[0].date,
        }
      })
      .sort((a, b) => a.modal - b.modal)
  }, [prices])

  const chartData = useMemo(() => {
    if (!historyData) return []
    return historyData
      .map((item) => ({
        date: new Date(item.date).toISOString(),
        price: Number(item.price),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [historyData])

  const modalPrices = prices.map((item) => item.price_per_kg).filter((value) => value > 0)
  const averageModal = modalPrices.length ? Math.round(modalPrices.reduce((sum, value) => sum + value, 0) / modalPrices.length) : 0
  const lowestModal = modalPrices.length ? Math.round(Math.min(...modalPrices)) : 0
  const highestModal = modalPrices.length ? Math.round(Math.max(...modalPrices)) : 0

  return (
    <div className="page-container">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h1 className="page-title">Market Prices</h1>
          <p className="page-subtitle">Live crop price trends across markets</p>
        </div>
        <button className="btn btn-secondary" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="card p-5 mb-6" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1 min-w-0">
            <label className="label">Crop / Commodity</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={cropQuery}
                onChange={(e) => setCropQuery(e.target.value)}
                className="input pl-9"
                placeholder="Tomato, Onion, Rice..."
                list="popular-crops"
              />
              <datalist id="popular-crops">
                {POPULAR_CROPS.map((crop) => (
                  <option key={crop} value={crop} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex-1 min-w-0 relative">
            <label className="label">State filter</label>
            <input
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="input rounded-md"
              placeholder="Tamil Nadu, Karnataka..."
              aria-autocomplete="list"
              aria-expanded={stateFilter.length > 0}
              aria-controls="state-suggestions"
            />
            {stateFilter.length > 0 && (
              <div id="state-suggestions" className="absolute z-30 left-0 right-0 mt-1 bg-white border border-border rounded-md shadow-sm max-h-56 overflow-auto">
                {Object.keys(INDIA)
                  .filter((s) => s.toLowerCase().startsWith(stateFilter.toLowerCase()))
                  .slice(0, 8)
                  .map((s) => (
                    <div
                      key={s}
                      className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                      onMouseDown={() => {
                        setStateFilter(s)
                        refetch()
                      }}
                    >
                      {s}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <button className="btn btn-primary" onClick={() => refetch()}>
            Search
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {POPULAR_CROPS.map((crop) => (
            <button
              key={crop}
              type="button"
              onClick={() => {
                setCropQuery(crop)
                setExpandedCrop(crop)
              }}
              className={`rounded-lg border px-3 py-1 text-xs transition-colors ${cropQuery.toLowerCase() === crop.toLowerCase()
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-600'
                }`}
            >
              {crop}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 mb-6 text-red-700">
          <AlertCircle size={16} />
          <span>Failed to load market prices.</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : null}

      {prices.length > 0 ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Avg Modal Price" value={formatPrice(averageModal)} sublabel={`${cropQuery} across all markets`} tone="blue" />
            <StatCard label="Lowest Price" value={formatPrice(lowestModal)} sublabel="Cheapest market" tone="green" />
            <StatCard label="Highest Price" value={formatPrice(highestModal)} sublabel="Highest recorded" tone="red" />
            <StatCard label="Total Markets" value={groupedMarkets.length} sublabel={lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString('en-IN')}` : 'Live data'} tone="amber" />
          </div>

          {chartData.length > 1 ? (
            <div className="card p-5 mb-6" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="section-title mb-4 flex items-center gap-2">
                <IndianRupee size={18} className="text-emerald-500" />
                Price Trend - {expandedCrop || cropQuery} (per kg)
              </h2>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      stroke="var(--color-text-muted)"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="var(--color-text-muted)"
                      fontSize={12}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                      }}
                      labelFormatter={(date) => new Date(date).toLocaleDateString('en-IN')}
                      formatter={(value: number) => [`₹${value}`, 'Price']}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="price" stroke="var(--color-primary)" strokeWidth={2.5} dot={false} name="Modal price" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">Markets ({groupedMarkets.length})</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin size={14} /> Price per kg (₹)</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupedMarkets.map((market) => (
              <button
                key={market.key}
                type="button"
                onClick={() => setExpandedCrop(market.commodity)}
                className="text-left rounded-2xl border p-4 transition-all hover:shadow-md"
                style={{
                  borderColor: expandedCrop === market.commodity ? 'rgba(16,185,129,0.45)' : 'var(--color-border)',
                  background: expandedCrop === market.commodity ? 'rgba(16,185,129,0.06)' : 'var(--color-surface-2)',
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-base">{market.market}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin size={11} />
                      {market.district || 'Unknown district'}, {market.state || 'Unknown state'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                    <TrendIcon trend={market.trend} />
                    {market.trend}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Min</p>
                    <p className="font-semibold text-green-600 text-sm">{formatPrice(market.min)}</p>
                  </div>
                  <div className="border-x border-border">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Modal</p>
                    <p className="font-semibold text-blue-600 text-sm">{formatPrice(market.modal)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Max</p>
                    <p className="font-semibold text-red-500 text-sm">{formatPrice(market.max)}</p>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground mt-3">
                  Latest: {new Date(market.latestDate).toLocaleDateString('en-IN')}
                </p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border p-12 text-center" style={{ borderColor: 'var(--color-border)' }}>
          <ShoppingBasket size={42} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-semibold mb-1">No market data available</p>
          <p className="text-sm text-muted-foreground">Try another crop or state filter.</p>
        </div>
      )}
    </div>
  )
}