import { Router, Response } from 'express'
import marketService from '../../services/market'
import redisService from '../../services/cache'
import { authenticate, AuthRequest } from '../auth/auth.middleware'

const router = Router()

// Transform market data to frontend format
function transformPriceData(prices: any[], filterState?: string, filterDistrict?: string) {
  return prices.map(p => ({
    crop: p.cropName || p.crop || 'Unknown',
    market_type: p.market || p.marketType || 'Wholesale',
    price_per_kg: p.modalPrice ? p.modalPrice / 10 : (p.pricePerKg || p.price_per_kg || 0),
    min_price: p.minPrice ? p.minPrice / 10 : 0,
    max_price: p.maxPrice ? p.maxPrice / 10 : 0,
    modal_price_raw: p.modalPrice || 0,
    date: p.arrivalDate || p.date || new Date().toISOString().split('T')[0],
    state: p.state || '',
    district: p.district || '',
    market: p.market || '',
    variety: p.variety || 'Standard',
  }))
}

// Get all market prices with location filtering
router.get('/prices', async (req, res: Response): Promise<void> => {
  try {
    const crop = req.query.crop as string
    const state = req.query.state as string
    const district = req.query.district as string
    const limit = parseInt(req.query.limit as string) || 50

    let prices

    if (crop && state) {
      prices = await marketService.getPricesByCropAndState(crop, state, district, limit)
    } else if (crop) {
      prices = await marketService.getPricesByCrop(crop, limit)
    } else if (state) {
      prices = await marketService.getPricesByState(state, limit)
    } else {
      prices = await marketService.getAllPrices()
    }

    // Filter by state/district if provided
    let filteredPrices = prices
    if (state) {
      filteredPrices = prices.filter(p => p.state?.toLowerCase() === state.toLowerCase())
    }
    if (district) {
      filteredPrices = filteredPrices.filter(p => p.district?.toLowerCase() === district.toLowerCase())
    }

    // Transform to frontend format
    const transformedPrices = transformPriceData(filteredPrices)

    // Calculate price stats
    const stats = {
      avgPrice: transformedPrices.length > 0
        ? transformedPrices.reduce((s, p) => s + p.price_per_kg, 0) / transformedPrices.length
        : 0,
      minPrice: transformedPrices.length > 0 ? Math.min(...transformedPrices.map(p => p.price_per_kg)) : 0,
      maxPrice: transformedPrices.length > 0 ? Math.max(...transformedPrices.map(p => p.price_per_kg)) : 0,
    }

    res.json({
      prices: transformedPrices,
      count: transformedPrices.length,
      stats,
      filters: { crop, state, district },
      source: prices.length > 0 ? 'agmarknet' : 'fallback',
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Market prices error:', error)
    res.status(500).json({ error: 'Failed to fetch market prices' })
  }
})

// Get prices for specific crop (with current and previous comparison)
router.get('/prices/:crop', async (req, res: Response): Promise<void> => {
  try {
    const crop = req.params.crop
    const limit = parseInt(req.query.limit as string) || 20

    const prices = await marketService.getPricesByCrop(crop, limit)
    const trend = await marketService.calculateTrend(crop)

    // Get previous prices for comparison (from 7 days ago)
    const previousPrices = await marketService.getHistoricalPrices(crop, 14)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    const currentPeriodPrices = previousPrices.filter(p => new Date(p.date) >= sevenDaysAgo)
    const previousPeriodPrices = previousPrices.filter(p => new Date(p.date) >= fourteenDaysAgo && new Date(p.date) < sevenDaysAgo)

    const currentAvg = currentPeriodPrices.length > 0
      ? currentPeriodPrices.reduce((s, p) => s + p.price, 0) / currentPeriodPrices.length
      : 0
    const previousAvg = previousPeriodPrices.length > 0
      ? previousPeriodPrices.reduce((s, p) => s + p.price, 0) / previousPeriodPrices.length
      : 0

    const priceChange = previousAvg > 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0

    // Transform to frontend format
    const transformedPrices = transformPriceData(prices)

    res.json({
      cropName: crop,
      prices: transformedPrices,
      trend,
      count: prices.length,
      comparison: {
        current: { avgPrice: currentAvg, period: 'last 7 days', dataPoints: currentPeriodPrices.length },
        previous: { avgPrice: previousAvg, period: '7-14 days ago', dataPoints: previousPeriodPrices.length },
        changePercent: Math.round(priceChange * 10) / 10,
        direction: priceChange > 2 ? 'up' : priceChange < -2 ? 'down' : 'stable',
      },
      lastUpdated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Market price error:', error)
    res.status(500).json({ error: 'Failed to fetch crop price' })
  }
})

// Get price history with statistics
router.get('/history/:crop', async (req, res: Response): Promise<void> => {
  try {
    const crop = req.params.crop
    const days = parseInt(req.query.days as string) || 30

    const history = await marketService.getHistoricalPrices(crop, days)

    // Calculate statistics
    const prices = history.map(h => h.price)
    const stats = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0,
      avg: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
      dataPoints: prices.length,
    }

    // Get current price for comparison
    const currentPrices = await marketService.getPricesByCrop(crop, 1)
    const currentPrice = currentPrices.length > 0 ? currentPrices[0].modalPrice / 10 : 0

    // Calculate price change from history
    let priceChange = 0
    if (prices.length >= 2) {
      priceChange = ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100
    }

    res.json({
      cropName: crop,
      history,
      statistics: stats,
      currentPrice,
      priceChange: Math.round(priceChange * 10) / 10,
      trend: priceChange > 5 ? 'up' : priceChange < -5 ? 'down' : 'stable',
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