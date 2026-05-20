import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import {
  Cloud, Sun, CloudRain, Wind, Droplets, Thermometer,
  Search, MapPin, Loader2, Sunrise, Sunset,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

interface WeatherCurrent {
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  uvIndex: number
  condition: string
  location: string
}

interface WeatherForecast {
  date: string
  minTemp: number
  maxTemp: number
  condition: string
  precipitation: number
}

interface WeatherLocation {
  name: string
  lat: number
  lng: number
  country?: string
}

const weatherCodeToCondition = (code?: number) => {
  if (typeof code !== 'number') return 'Clear'
  if ([0, 1].includes(code)) return 'Clear'
  if ([2, 3].includes(code)) return 'Cloudy'
  if ([45, 48].includes(code)) return 'Fog'
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow'
  if ([95, 96, 99].includes(code)) return 'Thunderstorm'
  return 'Clear'
}

const getWeatherIcon = (condition: string) => {
  const c = condition?.toLowerCase() || ''
  if (c.includes('rain') || c.includes('drizzle')) return <CloudRain size={24} />
  if (c.includes('cloud') || c.includes('overcast')) return <Cloud size={24} />
  return <Sun size={24} />
}

export default function Weather() {
  const [location, setLocation] = useState('Coimbatore')
  const [locationQuery, setLocationQuery] = useState('')
  const [showLocations, setShowLocations] = useState(false)

  // Get user's location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Use reverse geocoding to get location name
          // For now, just use coordinates as fallback
        },
        () => {}
      )
    }
  }, [])

  // Fetch current weather
  const { data: current, isLoading: currentLoading } = useQuery({
    queryKey: ['weather', 'current', location],
    queryFn: async () => {
      const res = await api.get('/api/weather/current', {
        params: { location },
      })
      const data = res.data
      return {
        temperature: data.temperature,
        feelsLike: data.feelsLike,
        humidity: data.humidity,
        windSpeed: data.windSpeed,
        uvIndex: 0,
        condition: weatherCodeToCondition(data.weatherCode),
        location: data.location,
      } as WeatherCurrent
    },
    enabled: !!location,
  })

  // Fetch forecast
  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ['weather', 'forecast', location],
    queryFn: async () => {
      const res = await api.get('/api/weather/forecast', {
        params: { location, days: 7 },
      })
      return (res.data.forecast || []).map((item: any) => ({
        date: item.date,
        minTemp: item.tempMin,
        maxTemp: item.tempMax,
        condition: weatherCodeToCondition(item.weatherCode),
        precipitation: item.precipitation || 0,
      })) as WeatherForecast[]
    },
    enabled: !!location,
  })

  // Search locations
  const { data: locations } = useQuery({
    queryKey: ['weather', 'locations', locationQuery],
    queryFn: async () => {
      const res = await api.get('/api/weather/locations', {
        params: { q: locationQuery },
      })
      return (res.data?.locations || []).map((loc: any) => ({
        name: loc.country ? `${loc.name}, ${loc.country}` : loc.name,
        lat: loc.latitude,
        lng: loc.longitude,
        country: loc.country,
      })) as WeatherLocation[]
    },
    enabled: locationQuery.length >= 2,
  })

  const selectLocation = (loc: WeatherLocation) => {
    setLocation(loc.name)
    setLocationQuery('')
    setShowLocations(false)
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Weather</h1>
          <p className="page-subtitle">Real-time weather forecasts</p>
        </div>
      </div>

      {/* Location Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search location..."
            value={locationQuery}
            onChange={(e) => {
              setLocationQuery(e.target.value)
              setShowLocations(true)
            }}
            onFocus={() => setShowLocations(true)}
          />
          {showLocations && locations && locations.length > 0 && (
            <div className="dropdown-menu w-full mt-1 max-h-48 overflow-auto">
              {locations.map((loc, i) => (
                <button
                  key={i}
                  type="button"
                  className="dropdown-item w-full text-left flex items-center gap-2"
                  onClick={() => selectLocation(loc)}
                >
                  <MapPin size={14} />
                  {loc.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Current Weather */}
      {currentLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4">
              <div className="skeleton h-4 w-20 rounded mb-2" />
              <div className="skeleton h-8 w-16 rounded" />
            </div>
          ))}
        </div>
      ) : current ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Main weather card */}
          <div className="card p-6 md:col-span-2">
            <div className="flex items-center gap-4">
              <div className="text-6xl">
                {getWeatherIcon(current.condition)}
              </div>
              <div>
                <p className="text-5xl font-bold">{Math.round(current.temperature)}°C</p>
                <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
                  {current.condition}
                </p>
                <p className="text-sm flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                  <MapPin size={14} />
                  {current.location}
                </p>
              </div>
            </div>
          </div>

          {/* Weather details */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Droplets size={16} className="text-blue-500" />
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Humidity</span>
            </div>
            <p className="text-2xl font-bold">{current.humidity}%</p>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wind size={16} className="text-gray-500" />
              <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Wind Speed</span>
            </div>
            <p className="text-2xl font-bold">{Math.round(current.windSpeed)} km/h</p>
          </div>
        </div>
      ) : (
        <div className="card p-6 mb-6 text-center">
          <Cloud size={48} className="mx-auto mb-4 opacity-50" />
          <p style={{ color: 'var(--color-text-muted)' }}>Weather data unavailable</p>
        </div>
      )}

      {/* Forecast */}
      <div className="card p-6">
        <h2 className="section-title mb-4">7-Day Forecast</h2>
        {forecastLoading ? (
          <div className="flex gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="skeleton h-24 w-20 rounded" />
            ))}
          </div>
        ) : forecast && forecast.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
            {forecast.map((day, i) => (
              <div key={i} className="text-center p-3 rounded-lg" style={{ background: 'var(--color-surface-2)' }}>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {i === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
                <div className="my-2 flex justify-center">
                  {getWeatherIcon(day.condition)}
                </div>
                <p className="font-bold">{Math.round(day.maxTemp)}°</p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{Math.round(day.minTemp)}°</p>
                {day.precipitation > 0 && (
                  <p className="text-xs text-blue-500 flex items-center justify-center gap-1">
                    <Droplets size={10} />
                    {day.precipitation}mm
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
            No forecast data available
          </p>
        )}
      </div>
    </div>
  )
}