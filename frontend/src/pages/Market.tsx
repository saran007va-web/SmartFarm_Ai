import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import {
  TrendingUp, TrendingDown, Search, Filter,
  RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface MarketPrice {
  id?: string
  crop: string
  price: number
  unit: string
  marketName: string
  date: string
  change?: number
}

interface MarketPricesResponse {
  prices: MarketPrice[]
  total: number
}

const CROP_OPTIONS = ['Rice', 'Wheat', 'Corn', 'Cotton', 'Sugarcane', 'Potato', 'Onion', 'Tomato']

export default function Market() {
  const [selectedCrop, setSelectedCrop] = useState<string>('')
  const [expandedCrop, setExpandedCrop] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['market', 'prices', 1, 20, selectedCrop],
    queryFn: async () => {
      const res = await api.get<MarketPricesResponse>('/api/market/prices', {
        params: { page: 1, limit: 20, crop: selectedCrop || undefined },
      })
      return res.data
    },
  })

  // Fetch price history for expanded crop
  const { data: priceHistory } = useQuery({
    queryKey: ['market', 'history', expandedCrop],
    queryFn: async () => {
      const res = await api.get<{ crop: string; history: MarketPrice[] }>(`/api/market/prices/${expandedCrop}`)
      return res.data.history
    },
    enabled: !!expandedCrop,
  })

  const prices = data?.prices || []

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Market Prices</h1>
          <p className="page-subtitle">Live crop price trends across markets</p>
        </div>
        <button className="btn btn-secondary" onClick={() => refetch()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search crops..."
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
          />
        </div>
        <select
          className="input select w-auto"
          value={selectedCrop}
          onChange={(e) => setSelectedCrop(e.target.value)}
        >
          <option value="">All Crops</option>
          {CROP_OPTIONS.map((crop) => (
            <option key={crop} value={crop}>{crop}</option>
          ))}
        </select>
      </div>

      {/* Price Table */}
      <div className="card">
        <div className="table-container" style={{ border: 'none' }}>
          {isLoading ? (
            <table>
              <thead>
                <tr>
                  <th>Crop</th>
                  <th>Market</th>
                  <th>Price</th>
                  <th>Unit</th>
                  <th>Date</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(10)].map((_, i) => (
                  <tr key={i}>
                    <td><div className="skeleton w-20 h-4 rounded" /></td>
                    <td><div className="skeleton w-32 h-4 rounded" /></td>
                    <td><div className="skeleton w-16 h-4 rounded" /></td>
                    <td><div className="skeleton w-12 h-4 rounded" /></td>
                    <td><div className="skeleton w-20 h-4 rounded" /></td>
                    <td><div className="skeleton w-12 h-4 rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : prices.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Crop</th>
                  <th>Market</th>
                  <th>Price</th>
                  <th>Unit</th>
                  <th>Date</th>
                  <th>Change</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((item, i) => (
                  <>
                    <tr
                      key={i}
                      className="cursor-pointer"
                      onClick={() => setExpandedCrop(expandedCrop === item.crop ? null : item.crop)}
                    >
                      <td className="font-medium" style={{ color: 'var(--color-text)' }}>
                        {expandedCrop === item.crop ? (
                          <ChevronUp size={16} className="inline mr-1" />
                        ) : (
                          <ChevronDown size={16} className="inline mr-1" />
                        )}
                        {item.crop}
                      </td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{item.marketName}</td>
                      <td style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                        ₹{item.price.toLocaleString()}
                      </td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{item.unit}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td>
                        {item.change !== undefined && (
                          <span className={item.change >= 0 ? 'text-green-600' : 'text-red-500'}>
                            {item.change >= 0 ? (
                              <TrendingUp size={14} className="inline mr-1" />
                            ) : (
                              <TrendingDown size={14} className="inline mr-1" />
                            )}
                            {Math.abs(item.change)}%
                          </span>
                        )}
                      </td>
                    </tr>
                    {expandedCrop === item.crop && priceHistory && priceHistory.length > 0 && (
                      <tr key={`${i}-chart`}>
                        <td colSpan={6} className="p-4" style={{ background: 'var(--color-surface-2)' }}>
                          <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={priceHistory}>
                                <XAxis
                                  dataKey="date"
                                  tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                  stroke="var(--color-text-muted)"
                                  fontSize={12}
                                />
                                <YAxis
                                  stroke="var(--color-text-muted)"
                                  fontSize={12}
                                  tickFormatter={(v) => `₹${v}`}
                                />
                                <Tooltip
                                  contentStyle={{
                                    background: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                  }}
                                  labelFormatter={(d) => new Date(d).toLocaleDateString()}
                                  formatter={(v: number) => [`₹${v}`, 'Price']}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="price"
                                  stroke="var(--color-primary)"
                                  strokeWidth={2}
                                  dot={false}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center" style={{ color: 'var(--color-text-muted)' }}>
              <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
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