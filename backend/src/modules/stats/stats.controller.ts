import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../auth/auth.middleware'
import prisma from '../../services/database'

const router = Router()

// Get dashboard stats
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get counts from database
    const farmCount = await prisma.farm.count()
    const cropPlanCount = await prisma.cropPlan.count()
    const taskCount = await prisma.task.count({ where: { status: 'PENDING' } })
    const aiInsightCount = await prisma.aIInsight.count({ where: { isRead: false } })

    res.json({
      farms: farmCount,
      active_plans: cropPlanCount,
      pending_tasks: taskCount,
      new_insights: aiInsightCount,
      total_yield: 0,
      revenue: 0,
    })
  } catch (error) {
    console.error('Get stats error:', error)
    res.status(500).json({ error: 'Failed to get stats' })
  }
})

// Get stats history
router.get('/history', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Return mock history data
    res.json({
      weekly_yields: [],
      monthly_revenue: [],
      last_updated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Get stats history error:', error)
    res.status(500).json({ error: 'Failed to get stats history' })
  }
})

// Get stats breakdown
router.get('/breakdown', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get yield breakdown by crop
    const yieldRecords = await prisma.yieldRecord.findMany({
      take: 50,
      orderBy: { harvestDate: 'desc' },
    })

    const breakdown: Record<string, { quantity: number; revenue: number }> = {}
    yieldRecords.forEach(record => {
      if (!breakdown[record.cropName]) {
        breakdown[record.cropName] = { quantity: 0, revenue: 0 }
      }
      breakdown[record.cropName].quantity += record.quantity
      breakdown[record.cropName].revenue += record.revenue || 0
    })

    res.json(breakdown)
  } catch (error) {
    console.error('Get breakdown error:', error)
    res.status(500).json({ error: 'Failed to get breakdown' })
  }
})

// Get weekly yields
router.get('/weekly-yields', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Return mock weekly data
    res.json({
      weeks: [
        { week: 1, yield: 0 },
        { week: 2, yield: 0 },
        { week: 3, yield: 0 },
        { week: 4, yield: 0 },
      ],
    })
  } catch (error) {
    console.error('Get weekly yields error:', error)
    res.status(500).json({ error: 'Failed to get weekly yields' })
  }
})

export default router