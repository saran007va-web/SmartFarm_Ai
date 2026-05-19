import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../../services/database'
import redisService from '../../services/cache'

const router = Router()

const profitMarginSchema = z.object({
  crop: z.string().optional(),
  cropName: z.string().optional(),
  farmId: z.string().optional(),
  area: z.number().min(0).optional(),
  area_ha: z.number().min(0).optional(),
  seedCost: z.number().min(0).optional(),
  seed_cost: z.number().min(0).optional(),
  fertilizerCost: z.number().min(0).optional(),
  fertilizer_cost: z.number().min(0).optional(),
  pesticideCost: z.number().min(0).optional(),
  pesticide_cost: z.number().min(0).optional(),
  laborCost: z.number().min(0).optional(),
  labor_cost: z.number().min(0).optional(),
  irrigationCost: z.number().min(0).optional(),
  equipmentCost: z.number().min(0).optional(),
  otherCosts: z.number().min(0).optional(),
  expectedYield: z.number().min(0).optional(),
  expected_yield_kg: z.number().min(0).optional(),
  expectedPrice: z.number().min(0).optional(),
  price_per_kg: z.number().min(0).optional(),
  season: z.string().optional(),
})

// Calculate profit margin
router.post('/margin', async (req: Request, res: Response) => {
  try {
    const data = profitMarginSchema.parse(req.body)

    // Normalize field names (support both frontend and backend naming conventions)
    const cropName = data.crop || data.cropName || 'Unknown'
    const area = data.area || data.area_ha || 1
    const seedCost = data.seedCost || data.seed_cost || 0
    const fertilizerCost = data.fertilizerCost || data.fertilizer_cost || 0
    const pesticideCost = data.pesticideCost || data.pesticide_cost || 0
    const laborCost = data.laborCost || data.labor_cost || 0
    const expectedYield = data.expectedYield || data.expected_yield_kg || 0
    const expectedPrice = data.expectedPrice || data.price_per_kg || 0

    // Calculate total costs
    const totalCosts = seedCost + fertilizerCost + pesticideCost + laborCost

    // Calculate expected revenue
    const expectedRevenue = expectedYield * expectedPrice

    // Calculate profit
    const grossProfit = expectedRevenue - totalCosts
    const profitMargin = expectedRevenue > 0 ? (grossProfit / expectedRevenue) * 100 : 0

    // Determine profit status
    let status = 'neutral'
    if (profitMargin > 30) status = 'excellent'
    else if (profitMargin > 15) status = 'good'
    else if (profitMargin > 0) status = 'low'
    else if (profitMargin < 0) status = 'loss'

    // Calculate cost per hectare
    const costPerHectare = area > 0 ? totalCosts / area : 0

    // Estimate breakeven yield
    const breakevenYield = expectedPrice > 0 ? totalCosts / expectedPrice : 0

    // Get market prices for comparison
    let marketPrice = null
    if (cropName && cropName !== 'Unknown') {
      const cacheKey = `market:price:${cropName}`
      const cached = await redisService.get(cacheKey)
      if (cached) {
        marketPrice = JSON.parse(cached)
      } else {
        const latestPrice = await prisma.marketPriceHistory.findFirst({
          where: { cropName: cropName },
          orderBy: { recordedAt: 'desc' },
        })
        if (latestPrice) {
          marketPrice = latestPrice.pricePerKg
          await redisService.set(cacheKey, JSON.stringify(marketPrice), 3600)
        }
      }
    }

    // Calculate potential revenue with market price
    const potentialRevenue = marketPrice && expectedYield ? marketPrice * expectedYield : expectedRevenue

    const potentialProfit = potentialRevenue - totalCosts
    const potentialMargin = potentialRevenue > 0
      ? (potentialProfit / potentialRevenue) * 100
      : 0

    // Return format expected by frontend
    const result = {
      total_cost: totalCosts,
      total_revenue: expectedRevenue,
      gross_profit: grossProfit,
      profit_margin: Math.round(profitMargin * 100) / 100,
      profit_margin_pct: Math.round(profitMargin * 100) / 100,
      status,
      cost_per_hectare: Math.round(costPerHectare * 100) / 100,
      breakeven_yield: Math.round(breakevenYield * 100) / 100,
      market_price: marketPrice,
      potential_revenue: Math.round(potentialRevenue * 100) / 100,
      potential_profit: Math.round(potentialProfit * 100) / 100,
      potential_margin: Math.round(potentialMargin * 100) / 100,
      breakdown: {
        fertilizer_cost: fertilizerCost,
        pesticide_cost: pesticideCost,
        labor_cost: laborCost,
        seed_cost: seedCost,
      },
      recommendations: generateRecommendations(status, profitMargin, cropName),
    }

    res.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors })
      return
    }
    console.error('Profit margin error:', error)
    res.status(500).json({ error: 'Failed to calculate profit margin' })
  }
})

function generateRecommendations(status: string, margin: number, cropName?: string) {
  const recommendations = []

  if (status === 'excellent') {
    recommendations.push({
      type: 'positive',
      message: 'Excellent profit margin! Consider expanding this crop in the next season.',
    })
  }

  if (status === 'loss' || margin < 0) {
    recommendations.push({
      type: 'warning',
      message: 'Current costs exceed expected revenue. Review your cost structure.',
    })
    recommendations.push({
      type: 'action',
      message: 'Consider negotiating better rates for seeds and fertilizers.',
    })
  }

  if (status === 'low') {
    recommendations.push({
      type: 'info',
      message: 'Profit margin is low. Look for ways to reduce production costs.',
    })
    recommendations.push({
      type: 'action',
      message: 'Consider direct-from-manufacturer sourcing for inputs.',
    })
  }

  // Add crop-specific recommendations
  if (cropName) {
    recommendations.push({
      type: 'info',
      message: `Check market prices for ${cropName} to time your harvest for maximum profit.`,
    })
  }

  // Always add general recommendations
  recommendations.push({
    type: 'action',
    message: 'Track actual vs projected costs to improve future estimates.',
  })

  return recommendations
}

// Get economics summary for a farm
router.get('/summary/:farmId', async (req: Request, res: Response) => {
  try {
    const { farmId } = req.params
    const { year } = req.query

    const yearFilter = year ? parseInt(year as string) : new Date().getFullYear()
    const startDate = new Date(yearFilter, 0, 1)
    const endDate = new Date(yearFilter, 11, 31)

    // Get yield records with revenue
    const yieldRecords = await prisma.yieldRecord.findMany({
      where: {
        farmId,
        harvestDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    })

    // Calculate totals
    const totalRevenue = yieldRecords.reduce((sum, record) => sum + (record.revenue || 0), 0)
    const totalYield = yieldRecords.reduce((sum, record) => sum + record.quantity, 0)

    // Get task costs (labor, inputs, etc.)
    const tasks = await prisma.task.findMany({
      where: {
        farmId,
        completedDate: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
      },
    })

    // Estimate costs from tasks (simplified)
    const estimatedCosts = tasks.length * 500 // Rough estimate per task

    const profit = totalRevenue - estimatedCosts
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0

    res.json({
      year: yearFilter,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCosts: estimatedCosts,
      grossProfit: Math.round(profit * 100) / 100,
      profitMargin: Math.round(margin * 100) / 100,
      totalYield,
      yieldRecordsCount: yieldRecords.length,
      tasksCompleted: tasks.length,
    })
  } catch (error) {
    console.error('Economics summary error:', error)
    res.status(500).json({ error: 'Failed to fetch economics summary' })
  }
})

export default router