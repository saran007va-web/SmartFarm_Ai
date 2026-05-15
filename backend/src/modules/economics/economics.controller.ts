import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../../services/database'
import redisService from '../../services/cache'

const router = Router()

const profitMarginSchema = z.object({
  cropName: z.string().optional(),
  farmId: z.string().optional(),
  area: z.number().min(0),
  seedCost: z.number().min(0).optional(),
  fertilizerCost: z.number().min(0).optional(),
  pesticideCost: z.number().min(0).optional(),
  laborCost: z.number().min(0).optional(),
  irrigationCost: z.number().min(0).optional(),
  equipmentCost: z.number().min(0).optional(),
  otherCosts: z.number().min(0).optional(),
  expectedYield: z.number().min(0).optional(),
  expectedPrice: z.number().min(0).optional(),
  season: z.string().optional(),
})

// Calculate profit margin
router.post('/margin', async (req: Request, res: Response) => {
  try {
    const data = profitMarginSchema.parse(req.body)

    // Calculate total costs
    const totalCosts =
      (data.seedCost || 0) +
      (data.fertilizerCost || 0) +
      (data.pesticideCost || 0) +
      (data.laborCost || 0) +
      (data.irrigationCost || 0) +
      (data.equipmentCost || 0) +
      (data.otherCosts || 0)

    // Calculate expected revenue
    const expectedRevenue = (data.expectedYield || 0) * (data.expectedPrice || 0)

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
    const costPerHectare = data.area > 0 ? totalCosts / data.area : 0

    // Estimate breakeven yield
    const breakevenYield = data.expectedPrice && data.expectedPrice > 0
      ? totalCosts / data.expectedPrice
      : 0

    // Get market prices for comparison
    let marketPrice = null
    if (data.cropName) {
      const cacheKey = `market:price:${data.cropName}`
      const cached = await redisService.get(cacheKey)
      if (cached) {
        marketPrice = JSON.parse(cached)
      } else {
        const latestPrice = await prisma.marketPriceHistory.findFirst({
          where: { cropName: data.cropName },
          orderBy: { recordedAt: 'desc' },
        })
        if (latestPrice) {
          marketPrice = latestPrice.pricePerKg
          await redisService.set(cacheKey, JSON.stringify(marketPrice), 3600)
        }
      }
    }

    // Calculate potential revenue with market price
    const potentialRevenue = marketPrice && data.expectedYield
      ? marketPrice * data.expectedYield
      : expectedRevenue

    const potentialProfit = potentialRevenue - totalCosts
    const potentialMargin = potentialRevenue > 0
      ? (potentialProfit / potentialRevenue) * 100
      : 0

    const result = {
      totalCosts,
      expectedRevenue,
      grossProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
      status,
      costPerHectare: Math.round(costPerHectare * 100) / 100,
      breakevenYield: Math.round(breakevenYield * 100) / 100,
      marketPrice,
      potentialRevenue: Math.round(potentialRevenue * 100) / 100,
      potentialProfit: Math.round(potentialProfit * 100) / 100,
      potentialMargin: Math.round(potentialMargin * 100) / 100,
      breakdown: {
        seeds: data.seedCost || 0,
        fertilizer: data.fertilizerCost || 0,
        pesticide: data.pesticideCost || 0,
        labor: data.laborCost || 0,
        irrigation: data.irrigationCost || 0,
        equipment: data.equipmentCost || 0,
        other: data.otherCosts || 0,
      },
      recommendations: generateRecommendations(status, profitMargin, data.cropName),
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