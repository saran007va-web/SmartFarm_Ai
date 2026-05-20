import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarDays, CloudRain, Droplets, MapPin, Sprout, ThermometerSun, TrendingUp, Wind } from 'lucide-react'
import api from '../lib/api'
import { CROP_TYPES, useFarmStore } from '../components/farm3d/farmStore'

interface ForecastDay {
  date: string
  weatherCode: number
  tempMax: number
  tempMin: number
  precipitation: number
  precipProbability: number
  windSpeed: number
}

function getSeason(month: number) {
  if ([11, 0, 1].includes(month)) return 'Winter'
  if ([2, 3, 4].includes(month)) return 'Summer'
  if ([5, 6, 7, 8].includes(month)) return 'Monsoon'
  return 'Post-monsoon'
}

function getWeatherLabel(code?: number) {
  if (typeof code !== 'number') return 'Clear'
  if ([0, 1].includes(code)) return 'Clear'
  if ([2, 3].includes(code)) return 'Cloudy'
  if ([45, 48].includes(code)) return 'Fog'
  if ([51, 53, 55, 56, 57].includes(code)) return 'Drizzle'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Rain'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Snow'
  if ([95, 96, 99].includes(code)) return 'Storm'
  return 'Clear'
}

function scoreCrop(cropKey: string, season: string, avgTemp: number, avgRain: number) {
  const crop = CROP_TYPES[cropKey]
  let score = 50

  if (!crop) return score

  if (season === 'Monsoon') {
    if (crop.waterNeeds === 'high') score += 18
    if (['rice', 'sugarcane', 'vegetables', 'corn'].includes(cropKey)) score += 20
  }

  if (season === 'Winter') {
    if (['wheat', 'potato', 'onion', 'cotton'].includes(cropKey)) score += 22
  }

  if (season === 'Summer') {
    if (['cotton', 'sugarcane', 'groundnut', 'chili'].includes(cropKey)) score += 18
  }

  if (season === 'Post-monsoon') {
    if (['wheat', 'vegetables', 'tomato', 'potato'].includes(cropKey)) score += 18
  }

  const tempMid = (crop.optimalTemp.min + crop.optimalTemp.max) / 2
  const tempGap = Math.abs(avgTemp - tempMid)
  score += Math.max(0, 20 - tempGap * 3)

  if (avgRain > 5 && crop.waterNeeds === 'high') score += 8
  if (avgRain < 2 && crop.waterNeeds === 'low') score += 8
  if (avgRain > 8 && crop.waterNeeds === 'low') score -= 6

  return Math.max(0, Math.min(100, Math.round(score)))
}

export default function Recommendations() {
  const navigate = useNavigate()
  const { farmName, location, crops, selectedCrop } = useFarmStore()
  const [forecast, setForecast] = useState<ForecastDay[]>([])
  const [loadingForecast, setLoadingForecast] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadForecast = async () => {
      try {
        setLoadingForecast(true)
        const res = await api.get('/api/weather/forecast', {
          params: { location: location.name.split(',')[0], days: 7 },
        })
        setForecast((res.data.forecast || []) as ForecastDay[])
      } catch {
        setError('Unable to load the current forecast right now.')
      } finally {
        setLoadingForecast(false)
      }
    }

    loadForecast()
  }, [location.name])

  const summary = useMemo(() => {
    const avgTemp = forecast.length ? forecast.reduce((sum, day) => sum + day.tempMax, 0) / forecast.length : 0
    const avgRain = forecast.length ? forecast.reduce((sum, day) => sum + day.precipitation, 0) / forecast.length : 0
    const season = getSeason(new Date().getMonth())
    const ranked = Object.entries(CROP_TYPES)
      .map(([key, crop]) => ({
        key,
        crop,
        score: scoreCrop(key, season, avgTemp || 28, avgRain),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    return { avgTemp, avgRain, season, ranked }
  }, [forecast])

  const selectedPlot = crops.find((crop) => crop.id === selectedCrop) || crops[0]

  return (
    <div className="page-container">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Crop Recommendations</h1>
          <p className="page-subtitle">Season-aware crop choices using upcoming weather and your farm plots</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-secondary" onClick={() => navigate('/plot-details')}>
            View Plot Details
            <ArrowRight size={16} />
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/farm')}>
            Open 3D Farm
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning mb-6">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="card p-5" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <Sprout size={16} /> Farm
          </div>
          <p className="text-2xl font-bold">{farmName}</p>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2"><MapPin size={14} /> {location.name}</p>
        </div>
        <div className="card p-5" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <CalendarDays size={16} /> Season
          </div>
          <p className="text-2xl font-bold">{summary.season}</p>
          <p className="mt-1 text-sm text-muted-foreground">Average forecast temp: {summary.avgTemp ? summary.avgTemp.toFixed(1) : '--'}°C</p>
        </div>
        <div className="card p-5" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <CloudRain size={16} /> Weather trend
          </div>
          <p className="text-2xl font-bold">{summary.avgRain ? summary.avgRain.toFixed(1) : '--'} mm</p>
          <p className="mt-1 text-sm text-muted-foreground">Expected average precipitation in the next 7 days</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card p-6" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-emerald-500" />
            <div>
              <h2 className="section-title">Best Crops for This Period</h2>
              <p className="section-subtitle">Ranked by season, temperature and rainfall fit</p>
            </div>
          </div>

          <div className="space-y-3">
            {summary.ranked.map(({ key, crop, score }, index) => (
              <div key={key} className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold capitalize text-base" style={{ color: 'var(--color-text)' }}>
                      #{index + 1} {crop.name}
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      Water need: {crop.waterNeeds} · Optimal temp: {crop.optimalTemp.min} - {crop.optimalTemp.max}°C
                    </p>
                  </div>
                  <span className="badge badge-success">{score}% fit</span>
                </div>
                <p className="text-sm mt-3" style={{ color: 'var(--color-text-secondary)' }}>
                  {summary.season === 'Monsoon' && ['rice', 'sugarcane', 'vegetables', 'corn'].includes(key) && 'Strong fit for wet and humid conditions.'}
                  {summary.season === 'Winter' && ['wheat', 'potato', 'onion', 'cotton'].includes(key) && 'Suitable for cooler, stable weather.'}
                  {summary.season === 'Summer' && ['cotton', 'sugarcane', 'groundnut', 'chili'].includes(key) && 'Handles warm conditions with better resilience.'}
                  {summary.season === 'Post-monsoon' && ['wheat', 'vegetables', 'tomato', 'potato'].includes(key) && 'Balanced choice for drying soil and mild weather.'}
                  {!['Monsoon', 'Winter', 'Summer', 'Post-monsoon'].some((seasonLabel) => seasonLabel === summary.season) && 'General-purpose crop recommendation.'}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-5">
            <ThermometerSun size={18} className="text-amber-500" />
            <div>
              <h2 className="section-title">Upcoming Weather</h2>
              <p className="section-subtitle">Future weather result for your farm location</p>
            </div>
          </div>

          {loadingForecast ? (
            <p className="text-sm text-muted-foreground">Loading forecast...</p>
          ) : (
            <div className="space-y-2">
              {forecast.map((day) => (
                <div key={day.date} className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
                  <div>
                    <p className="font-medium">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                    <p className="text-xs text-muted-foreground">{getWeatherLabel(day.weatherCode)}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{day.tempMin.toFixed(1)}° - {day.tempMax.toFixed(1)}°</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      <Droplets size={12} /> {day.precipitation.toFixed(1)} mm · <Wind size={12} /> {day.windSpeed.toFixed(1)} km/h
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 rounded-2xl p-4" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
            <p className="text-sm font-semibold mb-1">Plot summary</p>
            <p className="text-sm text-muted-foreground">
              Selected plot: {selectedPlot?.name || 'No plot selected yet'}.
              {selectedPlot ? ` Size ${selectedPlot.width} x ${selectedPlot.depth} at position (${selectedPlot.x}, ${selectedPlot.z}).` : ' Open the 3D farm and select a plot to see its exact 3D details here.'}
            </p>
            <button className="btn btn-secondary mt-4" onClick={() => navigate('/plot-details')}>
              Open Plot Details
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
