import { Router, Response } from 'express'
import marketService from '../../services/market'
import redisService from '../../services/cache'
import { authenticate, AuthRequest } from '../auth/auth.middleware'

const router = Router()

// Get all market prices (cached)
router.get('/prices', async (req, res: Response): Promise<void> => {
  try {
    const crop = req.query.crop as string
    const state = req.query.state as string
    const limit = parseInt(req.query.limit as string) || 20

    let prices

    if (crop) {
      prices = await marketService.getPricesByCrop(crop, limit)
    } else if (state) {
      prices = await marketService.getPricesByState(state, limit)
    } else {
      prices = await marketService.getAllPrices()
    }

    res.json({
      prices,
      count: prices.length,
      source: prices.length > 0 ? 'agmarknet' : 'fallback',
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Market prices error:', error)
    res.status(500).json({ error: 'Failed to fetch market prices' })
  }
})

// Get prices for specific crop
router.get('/prices/:crop', async (req, res: Response): Promise<void> => {
  try {
    const crop = req.params.crop
    const limit = parseInt(req.query.limit as string) || 20

    const prices = await marketService.getPricesByCrop(crop, limit)
    const trend = await marketService.calculateTrend(crop)

    res.json({
      cropName: crop,
      prices,
      trend,
      count: prices.length,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Market price error:', error)
    res.status(500).json({ error: 'Failed to fetch crop price' })
  }
})

// Get price history
router.get('/history/:crop', async (req, res: Response): Promise<void> => {
  try {
    const crop = req.params.crop
    const days = parseInt(req.query.days as string) || 30

    const history = await marketService.getHistoricalPrices(crop, days)

    // Calculate statistics
    const prices = history.map(h => h.price)
    const stats = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      dataPoints: prices.length,
    }

    res.json({
      cropName: crop,
      history,
      statistics: stats,
      period: `${days} days`,
    })
  } catch (error) {
    console.error('Price history error:', error)
    res.status(500).json({ error: 'Failed to fetch price history' })
  }
})

// Get price trends
router.get('/trends/:crop', async (req, res: Response): Promise<void> => {
  try {
    const crop = req.params.crop
    const days = parseInt(req.query.days as string) || 7

    const trend = await marketService.calculateTrend(crop, days)
    const history = await marketService.getHistoricalPrices(crop, days)

    // Calculate percentage change
    let percentChange = 0
    if (history.length >= 2) {
      const first = history[0].price
      const last = history[history.length - 1].price
      percentChange = ((last - first) / first) * 100
    }

    res.json({
      cropName: crop,
      trend,
      percentChange: Math.round(percentChange * 10) / 10,
      days,
      dataPoints: history.length,
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Price trends error:', error)
    res.status(500).json({ error: 'Failed to fetch price trends' })
  }
})

// Get AI recommendations for a crop
router.get('/recommendations/:crop', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const crop = req.params.crop
    const farmLocation = req.query.location as string | undefined

    const recommendations = await marketService.getRecommendations(crop, farmLocation)
    const trend = await marketService.calculateTrend(crop)

    res.json({
      cropName: crop,
      recommendations,
      trend,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Recommendations error:', error)
    res.status(500).json({ error: 'Failed to generate recommendations' })
  }
})

// Get revenue projection
router.get('/revenue', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { crop, area, yield: cropYield } = req.query

    if (!crop || !area || !cropYield) {
      res.status(400).json({ error: 'Missing required parameters: crop, area, yield' })
      return
    }

    const projection = await marketService.getRevenueProjection(
      crop as string,
      parseFloat(area as string),
      parseFloat(cropYield as string)
    )

    res.json({
      cropName: crop,
      areaHa: parseFloat(area as string),
      expectedYieldKgHa: parseFloat(cropYield as string),
      projection: {
        optimistic: Math.round(projection.optimistic),
        expected: Math.round(projection.expected),
        pessimistic: Math.round(projection.pessimistic),
        currency: 'INR',
      },
    })
  } catch (error) {
    console.error('Revenue projection error:', error)
    res.status(500).json({ error: 'Failed to calculate revenue projection' })
  }
})

// Get supported crops list
router.get('/crops', async (req, res: Response): Promise<void> => {
  try {
    const cacheKey = 'market:supported-crops'

    const cached = await redisService.getJSON<string[]>(cacheKey)
    if (cached) {
      res.json({ crops: cached })
      return
    }

    const crops = [
      { name: 'Rice', category: 'Cereals' },
      { name: 'Wheat', category: 'Cereals' },
      { name: 'Corn', category: 'Cereals' },
      { name: 'Cotton', category: 'Fiber' },
      { name: 'Sugarcane', category: 'Commercial' },
      { name: 'Tomato', category: 'Vegetables' },
      { name: 'Onion', category: 'Vegetables' },
      { name: 'Potato', category: 'Vegetables' },
      { name: 'Brinjal', category: 'Vegetables' },
      { name: 'Okra', category: 'Vegetables' },
      { name: 'Banana', category: 'Fruits' },
      { name: 'Mango', category: 'Fruits' },
      { name: 'Groundnut', category: 'Oilseeds' },
      { name: 'Soybean', category: 'Oilseeds' },
      { name: 'Mustard', category: 'Oilseeds' },
      { name: 'Coconut', category: 'Oilseeds' },
    ]

    await redisService.setJSON(cacheKey, crops, 86400)
    res.json({ crops })
  } catch (error) {
    console.error('Crops list error:', error)
    res.status(500).json({ error: 'Failed to fetch crops list' })
  }
})

// Get states list
router.get('/states', async (req, res: Response): Promise<void> => {
  try {
    const states = [
      'Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Gujarat', 'Haryana',
      'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
      'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu',
      'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    ]

    res.json({ states })
  } catch (error) {
    console.error('States list error:', error)
    res.status(500).json({ error: 'Failed to fetch states list' })
  }
})

// Refresh market data (admin/triggered)
router.post('/refresh', async (req, res: Response): Promise<void> => {
  try {
    // In production, this should be restricted to admin users
    await marketService.refreshMarketData()

    res.json({
      success: true,
      message: 'Market data refresh initiated',
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Market refresh error:', error)
    res.status(500).json({ error: 'Failed to refresh market data' })
  }
})

export default router