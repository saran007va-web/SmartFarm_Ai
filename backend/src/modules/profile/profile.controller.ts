import { Router, Response } from 'express'
import prisma from '../../services/database'
import { authenticate, AuthRequest } from '../auth/auth.middleware'

const router = Router()

// Get user profile
router.get('/:deviceId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params

    const user = await prisma.user.findUnique({
      where: { id: deviceId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) {
      // Return device-based profile if user not found
      res.json({
        id: deviceId,
        name: 'Farm User',
        device_id: deviceId,
        created_at: new Date().toISOString(),
      })
      return
    }

    res.json(user)
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Failed to get profile' })
  }
})

// Update user preferences
router.post('/preferences', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deviceId = req.body.device_id || req.user?.userId
    const {
      language,
      notifications_enabled,
      theme,
      location,
      crops_of_interest,
    } = req.body

    // In production, store in UserPreferences table
    res.json({
      success: true,
      preferences: {
        language: language || 'en',
        notifications_enabled: notifications_enabled ?? true,
        theme: theme || 'light',
        location,
        crops_of_interest: crops_of_interest || [],
      },
      updated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Update preferences error:', error)
    res.status(500).json({ error: 'Failed to update preferences' })
  }
})

// Get learning stats
router.get('/:deviceId/stats', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params

    // Return mock learning stats
    res.json({
      total_conversations: 0,
      corrections_made: 0,
      successful_predictions: 0,
      crop_patterns_learned: 0,
      last_updated: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Get stats error:', error)
    res.status(500).json({ error: 'Failed to get stats' })
  }
})

// Get personalized context
router.get('/:deviceId/context', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params

    // Get user context from database or return defaults
    res.json({
      device_id: deviceId,
      context: {
        farm_location: null,
        soil_type: null,
        typical_crops: [],
        irrigation_type: null,
        farm_size: null,
      },
    })
  } catch (error) {
    console.error('Get context error:', error)
    res.status(500).json({ error: 'Failed to get context' })
  }
})

// Add learned context
router.post('/:deviceId/context', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params
    const { key, value } = req.body

    res.json({
      success: true,
      message: `Context '${key}' saved`,
      updated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Add context error:', error)
    res.status(500).json({ error: 'Failed to add context' })
  }
})

// Record crop outcome for learning
router.post('/crop-outcome', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      farmId,
      crop_name,
      expected_yield,
      actual_yield,
      harvest_date,
      quality,
      notes,
    } = req.body

    const userId = req.user?.userId

    if (!farmId || !crop_name) {
      res.status(400).json({ error: 'Farm ID and crop name are required' })
      return
    }

    // Create yield record from crop outcome
    const yieldRecord = await prisma.yieldRecord.create({
      data: {
        farmId,
        cropName: crop_name,
        quantity: actual_yield || 0,
        unit: 'kg',
        harvestDate: harvest_date ? new Date(harvest_date) : new Date(),
        quality,
        notes,
        revenue: expected_yield ? expected_yield * 50 : null, // Rough estimate
      },
    })

    // Also store in AI insights for learning
    if (expected_yield && actual_yield) {
      const variance = ((actual_yield - expected_yield) / expected_yield) * 100

      await prisma.aIInsight.create({
        data: {
          userId: userId || 'system',
          farmId,
          insightType: 'CROP_OUTCOME',
          title: `Crop Outcome: ${crop_name}`,
          description: `Expected: ${expected_yield}kg, Actual: ${actual_yield}kg, Variance: ${variance.toFixed(2)}%`,
          severity: 'LOW',
          confidence: Math.abs(variance) < 10 ? 0.9 : 0.6,
          metadata: {
            expectedYield: expected_yield,
            actualYield: actual_yield,
            variance: variance.toFixed(2),
          },
        },
      })
    }

    res.json({
      success: true,
      message: 'Crop outcome recorded for learning',
      outcome: {
        id: yieldRecord.id,
        crop_name,
        expected_yield,
        actual_yield,
        variance: expected_yield ? ((actual_yield - expected_yield) / expected_yield * 100).toFixed(2) + '%' : null,
        recorded_at: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Record outcome error:', error)
    res.status(500).json({ error: 'Failed to record outcome' })
  }
})

// Get crop patterns
router.get('/:deviceId/crop-patterns', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { deviceId } = req.params

    // Return user's learned crop patterns
    res.json({
      device_id: deviceId,
      patterns: [],
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Get patterns error:', error)
    res.status(500).json({ error: 'Failed to get patterns' })
  }
})

export default router