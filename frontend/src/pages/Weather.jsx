import { Cloud, Droplets, Sun, Wind, Thermometer, CloudRain, CloudSun, MapPin, RefreshCw, Calendar } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getCurrentWeather, getWeatherForecast } from '../services/api'

const WEATHER_ICONS = {
  0: Sun, // Clear sky
  1: Sun, // Mainly clear
  2: CloudSun, // Partly cloudy
  3: Cloud, // Overcast
  45: Cloud, // Fog
  48: Cloud, // Depositing rime fog
  51: CloudRain, // Light drizzle
  53: CloudRain, // Moderate drizzle
  55: CloudRain, // Dense drizzle
  61: CloudRain, // Slight rain
  63: CloudRain, // Moderate rain
  65: CloudRain, // Heavy rain
  71: Cloud, // Slight snow
  73: Cloud, // Moderate snow
  75: Cloud, // Heavy snow
  80: CloudRain, // Slight rain showers
  81: CloudRain, // Moderate rain showers
  82: CloudRain, // Violent rain showers
  95: CloudRain, // Thunderstorm
  96: CloudRain, // Thunderstorm with hail
}

function getWeatherIcon(code) {
  return WEATHER_ICONS[code] || Cloud
}

const STATE_LOCATIONS = {
  maharashtra: {
    name: 'Maharashtra',
    locations: [
      { key: 'mumbai', name: 'Mumbai', lat: 19.076, lon: 72.8777 },
      { key: 'pune', name: 'Pune', lat: 18.5204, lon: 73.8567 },
      { key: 'nagpur', name: 'Nagpur', lat: 21.1458, lon: 79.0882 },
      { key: 'nashik', name: 'Nashik', lat: 19.9975, lon: 73.7898 },
    ],
  },
  karnataka: {
    name: 'Karnataka',
    locations: [
      { key: 'bangalore', name: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
      { key: 'mysuru', name: 'Mysuru', lat: 12.2958, lon: 76.6394 },
      { key: 'hubli', name: 'Hubli-Dharwad', lat: 15.3647, lon: 75.124 },
      { key: 'mangalore', name: 'Mangaluru', lat: 12.9141, lon: 74.856 },
    ],
  },
  tamil_nadu: {
    name: 'Tamil Nadu',
    locations: [
      { key: 'chennai', name: 'Chennai', lat: 13.0827, lon: 80.2707 },
      { key: 'coimbatore', name: 'Coimbatore', lat: 11.0168, lon: 76.9558 },
      { key: 'madurai', name: 'Madurai', lat: 9.9252, lon: 78.1198 },
      { key: 'tiruchirappalli', name: 'Tiruchirappalli', lat: 10.7905, lon: 78.7047 },
    ],
  },
  telangana: {
    name: 'Telangana',
    locations: [
      { key: 'hyderabad', name: 'Hyderabad', lat: 17.385, lon: 78.4867 },
      { key: 'warangal', name: 'Warangal', lat: 17.9689, lon: 79.5941 },
      { key: 'nizamabad', name: 'Nizamabad', lat: 18.6725, lon: 78.0941 },
      { key: 'khammam', name: 'Khammam', lat: 17.2473, lon: 80.1514 },
    ],
  },
  uttar_pradesh: {
    name: 'Uttar Pradesh',
    locations: [
      { key: 'lucknow', name: 'Lucknow', lat: 26.8467, lon: 80.9462 },
      { key: 'kanpur', name: 'Kanpur', lat: 26.4499, lon: 80.3319 },
      { key: 'varanasi', name: 'Varanasi', lat: 25.3176, lon: 82.9739 },
      { key: 'agra', name: 'Agra', lat: 27.1767, lon: 78.0081 },
    ],
  },
  rajasthan: {
    name: 'Rajasthan',
    locations: [
      { key: 'jaipur', name: 'Jaipur', lat: 26.9124, lon: 75.7873 },
      { key: 'jodhpur', name: 'Jodhpur', lat: 26.2389, lon: 73.0243 },
      { key: 'udaipur', name: 'Udaipur', lat: 24.5854, lon: 73.7125 },
      { key: 'kota', name: 'Kota', lat: 25.2138, lon: 75.8648 },
    ],
  },
  gujarat: {
    name: 'Gujarat',
    locations: [
      { key: 'ahmedabad', name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
      { key: 'vadodara', name: 'Vadodara', lat: 22.3072, lon: 73.1812 },
      { key: 'surat', name: 'Surat', lat: 21.1702, lon: 72.8311 },
      { key: 'rajkot', name: 'Rajkot', lat: 22.3039, lon: 70.8022 },
    ],
  },
  west_bengal: {
    name: 'West Bengal',
    locations: [
      { key: 'kolkata', name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
      { key: 'siliguri', name: 'Siliguri', lat: 26.7271, lon: 88.3953 },
      { key: 'durgapur', name: 'Durgapur', lat: 23.5204, lon: 87.3119 },
      { key: 'howrah', name: 'Howrah', lat: 22.5958, lon: 88.2636 },
    ],
  },
  madhya_pradesh: {
    name: 'Madhya Pradesh',
    locations: [
      { key: 'bhopal', name: 'Bhopal', lat: 23.2599, lon: 77.4126 },
      { key: 'indore', name: 'Indore', lat: 22.7196, lon: 75.8577 },
      { key: 'gwalior', name: 'Gwalior', lat: 26.2183, lon: 78.1828 },
      { key: 'jabalpur', name: 'Jabalpur', lat: 23.1815, lon: 79.9864 },
    ],
  },
  bihar: {
    name: 'Bihar',
    locations: [
      { key: 'patna', name: 'Patna', lat: 25.5941, lon: 85.1376 },
      { key: 'gaya', name: 'Gaya', lat: 24.7914, lon: 85.0002 },
      { key: 'bhagalpur', name: 'Bhagalpur', lat: 25.2425, lon: 86.9842 },
      { key: 'muzaffarpur', name: 'Muzaffarpur', lat: 26.1209, lon: 85.3647 },
    ],
  },
  kerala: {
    name: 'Kerala',
    locations: [
      { key: 'kochi', name: 'Kochi', lat: 9.9312, lon: 76.2673 },
      { key: 'thiruvananthapuram', name: 'Thiruvananthapuram', lat: 8.5241, lon: 76.9366 },
      { key: 'kozhikode', name: 'Kozhikode', lat: 11.2588, lon: 75.7804 },
      { key: 'thrissur', name: 'Thrissur', lat: 10.5276, lon: 76.2144 },
    ],
  },
  andhra_pradesh: {
    name: 'Andhra Pradesh',
    locations: [
      { key: 'visakhapatnam', name: 'Visakhapatnam', lat: 17.6868, lon: 83.2185 },
      { key: 'vijayawada', name: 'Vijayawada', lat: 16.5062, lon: 80.648 },
      { key: 'guntur', name: 'Guntur', lat: 16.3067, lon: 80.4365 },
      { key: 'tirupati', name: 'Tirupati', lat: 13.6288, lon: 79.4192 },
    ],
  },
}

const DEFAULT_STATE = 'tamil_nadu'
const DEFAULT_LOCATION = 'coimbatore'

function buildLocationQuery(location) {
  return `${location.lat},${location.lon}`
}

export default function Weather() {
  const [weather, setWeather] = useState(null)
  const [forecast, setForecast] = useState([])
  const [selectedState, setSelectedState] = useState(DEFAULT_STATE)
  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_LOCATION)
  const [loading, setLoading] = useState(true)

  const selectedStateData = STATE_LOCATIONS[selectedState] || STATE_LOCATIONS[DEFAULT_STATE]
  const locationOptions = selectedStateData?.locations || []

  useEffect(() => {
    if (!locationOptions.length) return
    const firstLocation = locationOptions[0]
    if (!selectedLocation || !locationOptions.some((location) => location.key === selectedLocation)) {
      setSelectedLocation(firstLocation.key)
    }
  }, [selectedState, locationOptions, selectedLocation])

  useEffect(() => { loadWeather() }, [selectedLocation])

  const loadWeather = async () => {
    if (!selectedLocation || !locationOptions.length) return

    const currentLocation = locationOptions.find((location) => location.key === selectedLocation)
    if (!currentLocation) return

    setLoading(true)
    try {
      const [weatherResp, forecastResp] = await Promise.all([
        getCurrentWeather(buildLocationQuery(currentLocation)),
        getWeatherForecast(buildLocationQuery(currentLocation), 7)
      ])
      setWeather(weatherResp.data)
      setForecast(forecastResp.data.forecast || [])
    } catch (e) {
      console.error(e)
    } finally { setLoading(false) }
  }

  const getDayName = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="page-container">
        {/* Location Selector */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <MapPin size={18} style={{ color: 'var(--color-text-muted)' }} />
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="input select"
                style={{ minWidth: 180 }}
              >
                {Object.entries(STATE_LOCATIONS).map(([key, state]) => (
                  <option key={key} value={key}>{state.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                Sub-location
              </span>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="input select"
                style={{ minWidth: 220 }}
              >
                {locationOptions.map((loc) => (
                  <option key={loc.key} value={loc.key}>{loc.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={loadWeather} className="btn btn-ghost btn-icon" title="Refresh">
            <RefreshCw size={16} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
            ))}
          </div>
        ) : weather ? (
          <>
            {/* Current Weather */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Main Weather Card */}
              <div
                className="md:col-span-2 card relative overflow-hidden"
                style={{ padding: 28, borderColor: 'var(--color-border)', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.08))' }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>{weather.location}</p>
                    <p className="text-5xl font-extrabold" style={{ color: 'var(--color-text)' }}>{weather.temperature}°C</p>
                    <p className="text-lg mt-1" style={{ color: 'var(--color-text-secondary)' }}>{weather.weather_description}</p>
                  </div>
                  <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    {(() => {
                      const Icon = getWeatherIcon(weather.weather_code)
                      return <Icon size={48} style={{ color: 'var(--color-primary)' }} strokeWidth={1.5} />
                    })()}
                  </div>
                </div>
              </div>

              {/* Weather Details */}
              <div className="card" style={{ padding: 20, borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)' }}>
                    <Droplets size={18} style={{ color: '#3b82f6' }} />
                  </div>
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Humidity</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{weather.humidity}%</p>
              </div>

              <div className="card" style={{ padding: 20, borderColor: 'var(--color-border)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <Wind size={18} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Wind Speed</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{weather.wind_speed} km/h</p>
              </div>
            </div>

            {/* Agricultural Alert */}
            {weather.precipitation > 0 && (
              <div
                className="mb-8 p-4 rounded-xl flex items-center gap-3"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <Droplets size={20} style={{ color: '#3b82f6' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Precipitation Today</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{weather.precipitation}mm - Good for crops!</p>
                </div>
              </div>
            )}

            {/* 7-Day Forecast */}
            <div className="card" style={{ padding: 24, borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2 mb-5">
                <Calendar size={18} style={{ color: 'var(--color-text-muted)' }} />
                <h2 className="section-title">7-Day Forecast</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {forecast.map((day, i) => {
                  const Icon = getWeatherIcon(day.weather_code)
                  return (
                    <div
                      key={i}
                      className="text-center p-3 rounded-xl transition-all duration-150"
                      style={{
                        background: i === 0 ? 'rgba(16,185,129,0.1)' : 'var(--color-surface-2)',
                        border: '1px solid',
                        borderColor: i === 0 ? 'rgba(16,185,129,0.3)' : 'var(--color-border)',
                      }}
                    >
                      <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>{getDayName(day.date)}</p>
                      <div className="flex justify-center mb-2">
                        <Icon size={24} style={{ color: 'var(--color-primary)' }} strokeWidth={1.5} />
                      </div>
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>{day.temp_max}°</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{day.temp_min}°</p>
                      {day.precipitation_probability > 0 && (
                        <p className="text-xs mt-1" style={{ color: '#3b82f6' }}>{day.precipitation_probability}%</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Farming Tips based on weather */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {weather.humidity > 70 && (
                <div className="card p-4" style={{ borderColor: 'var(--color-border)', border: '1px solid' }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>High Humidity</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Watch for fungal diseases. Ensure proper ventilation in greenhouses.</p>
                </div>
              )}
              {weather.temperature > 35 && (
                <div className="card p-4" style={{ borderColor: 'var(--color-border)', border: '1px solid' }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>High Temperature</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Increase irrigation frequency. Provide shade for heat-sensitive crops.</p>
                </div>
              )}
              {weather.precipitation > 0 && weather.precipitation < 5 && (
                <div className="card p-4" style={{ borderColor: 'var(--color-border)', border: '1px solid' }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Light Rain</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Good for seedling establishment. Consider planting new crops.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Cloud size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto' }} />
            <p className="mt-4" style={{ color: 'var(--color-text-muted)' }}>Unable to load weather data</p>
          </div>
        )}
      </div>
    </div>
  )
}