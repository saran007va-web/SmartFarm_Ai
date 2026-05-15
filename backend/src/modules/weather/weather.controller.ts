import { Router, Response } from 'express'
import axios from 'axios'
import redisService from '../../services/cache'
import config from '../../config'

const router = Router()

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1'

const getCoordinates = async (location: string) => {
  const cacheKey = `geocoding:${location.toLowerCase()}`
  const cached = await redisService.get(cacheKey)
  if (cached) return JSON.parse(cached)

  try {
    const geoRes = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    )
    if (geoRes.data.results?.[0]) {
      const { latitude, longitude, name, country } = geoRes.data.results[0]
      const result = { latitude, longitude, name: `${name}, ${country}` }
      await redisService.set(cacheKey, JSON.stringify(result), 86400)
      return result
    }
  } catch (e) {
    console.error('Geocoding error:', e)
  }
  return null
}

router.get('/current', async (req, res: Response): Promise<void> => {
  try {
    const location = (req.query.location as string) || 'Coimbatore'
    const cacheKey = `weather:current:${location.toLowerCase()}`

    const cached = await redisService.get(cacheKey)
    if (cached) {
      res.json(JSON.parse(cached))
      return
    }

    const coords = await getCoordinates(location)
    if (!coords) {
      res.status(404).json({ error: 'Location not found' })
      return
    }

    const weatherRes = await axios.get(`${OPEN_METEO_BASE}/forecast`, {
      params: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m',
        timezone: 'auto',
      },
    })

    const data = {
      location: coords.name,
      temperature: weatherRes.data.current.temperature_2m,
      humidity: weatherRes.data.current.relative_humidity_2m,
      feelsLike: weatherRes.data.current.apparent_temperature,
      precipitation: weatherRes.data.current.precipitation,
      weatherCode: weatherRes.data.current.weather_code,
      windSpeed: weatherRes.data.current.wind_speed_10m,
      updatedAt: new Date().toISOString(),
    }

    await redisService.set(cacheKey, JSON.stringify(data), 1800)
    res.json(data)
  } catch (error) {
    console.error('Weather current error:', error)
    res.status(500).json({ error: 'Failed to fetch weather data' })
  }
})

router.get('/forecast', async (req, res: Response): Promise<void> => {
  try {
    const location = (req.query.location as string) || 'Coimbatore'
    const days = Math.min(parseInt(req.query.days as string) || 7, 14)
    const cacheKey = `weather:forecast:${location.toLowerCase()}:${days}`

    const cached = await redisService.get(cacheKey)
    if (cached) {
      res.json(JSON.parse(cached))
      return
    }

    const coords = await getCoordinates(location)
    if (!coords) {
      res.status(404).json({ error: 'Location not found' })
      return
    }

    const forecastRes = await axios.get(`${OPEN_METEO_BASE}/forecast`, {
      params: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max',
        timezone: 'auto',
        forecast_days: days,
      },
    })

    const daily = forecastRes.data.daily
    const forecast = daily.time.map((date: string, i: number) => ({
      date,
      weatherCode: daily.weather_code[i],
      tempMax: daily.temperature_2m_max[i],
      tempMin: daily.temperature_2m_min[i],
      precipitation: daily.precipitation_sum[i],
      precipProbability: daily.precipitation_probability_max[i],
      windSpeed: daily.wind_speed_10m_max[i],
    }))

    const data = {
      location: coords.name,
      forecast,
      updatedAt: new Date().toISOString(),
    }

    await redisService.set(cacheKey, JSON.stringify(data), 1800)
    res.json(data)
  } catch (error) {
    console.error('Weather forecast error:', error)
    res.status(500).json({ error: 'Failed to fetch forecast data' })
  }
})

router.get('/locations', async (req, res: Response): Promise<void> => {
  try {
    const query = req.query.q as string
    if (!query || query.length < 2) {
      res.json({ locations: [] })
      return
    }

    const cacheKey = `geocoding:search:${query.toLowerCase()}`
    const cached = await redisService.get(cacheKey)
    if (cached) {
      res.json(JSON.parse(cached))
      return
    }

    const geoRes = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
    )

    const locations = geoRes.data.results?.map((r: any) => ({
      name: r.name,
      country: r.country,
      admin1: r.admin1,
      latitude: r.latitude,
      longitude: r.longitude,
    })) || []

    const data = { locations }
    await redisService.set(cacheKey, JSON.stringify(data), 86400)
    res.json(data)
  } catch (error) {
    console.error('Locations error:', error)
    res.status(500).json({ error: 'Failed to search locations' })
  }
})

export default router