import { Router, Response } from 'express'
import prisma from '../../services/database'
import aiInsightsService from '../../services/ai-insights'
import { authenticate, AuthRequest } from '../auth/auth.middleware'

const router = Router()

// Get insights summary
router.get('/summary', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const summary = await aiInsightsService.getInsightsSummary(req.user!.userId)
    res.json(summary)
  } catch (error) {
    console.error('Insights summary error:', error)
    res.status(500).json({ error: 'Failed to fetch insights summary' })
  }
})

// Get all insights
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, unread, limit = 20, offset = 0 } = req.query

    const where: Record<string, unknown> = { userId: req.user!.userId }
    if (type) where.insightType = type
    if (unread === 'true') where.isRead = false

    const insightsList = await prisma.aIInsight.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
    })

    const totalCount = await prisma.aIInsight.count({ where })

    res.json({
      insights: insightsList,
      total: totalCount,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    })
  } catch (error) {
    console.error('Get insights error:', error)
    res.status(500).json({ error: 'Failed to fetch insights' })
  }
})

// Mark insight as read
router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await aiInsightsService.markInsightAsRead(req.params.id, req.user!.userId)
    res.json({ success: true })
  } catch (error) {
    console.error('Mark read error:', error)
    res.status(500).json({ error: 'Failed to mark insight as read' })
  }
})

// Mark all insights as read
router.put('/read-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await aiInsightsService.markAllInsightsAsRead(req.user!.userId)
    res.json({ success: true })
  } catch (error) {
    console.error('Mark all read error:', error)
    res.status(500).json({ error: 'Failed to mark all insights as read' })
  }
})

// Action on insight
router.put('/:id/action', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await aiInsightsService.actionInsight(req.params.id, req.user!.userId)
    res.json({ success: true })
  } catch (error) {
    console.error('Action insight error:', error)
    res.status(500).json({ error: 'Failed to action insight' })
  }
})

// Get crop recommendations
router.get('/recommendations/crops', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { soilType, season, area } = req.query

    const recommendations = await aiInsightsService.getCropRecommendations(
      soilType as string | undefined,
      season as string | undefined,
      area ? parseFloat(area as string) : undefined
    )

    res.json({ recommendations })
  } catch (error) {
    console.error('Crop recommendations error:', error)
    res.status(500).json({ error: 'Failed to generate crop recommendations' })
  }
})

// Generate insights manually
router.post('/generate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { farmId, type } = req.body

    if (type === 'market' || !type) {
      await aiInsightsService.generateMarketInsights(req.user!.userId, farmId)
    }

    if (type === 'crop' || !type) {
      if (farmId) {
        await aiInsightsService.generateCropInsights(req.user!.userId, farmId)
      }
    }

    if (type === 'task' || !type) {
      if (farmId) {
        await aiInsightsService.generateTaskInsights(req.user!.userId, farmId)
      }
    }

    res.json({
      success: true,
      message: 'Insights generated successfully',
    })
  } catch (error) {
    console.error('Generate insights error:', error)
    res.status(500).json({ error: 'Failed to generate insights' })
  }
})

export default router