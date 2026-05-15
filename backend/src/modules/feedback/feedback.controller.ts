import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../auth/auth.middleware'

const router = Router()

// Submit feedback
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, rating, message, context } = req.body
    const userId = req.user?.userId

    // In production, store in feedback table
    console.log('Feedback received:', { type, rating, message, userId, context })

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback_id: `fb_${Date.now()}`,
    })
  } catch (error) {
    console.error('Feedback error:', error)
    res.status(500).json({ error: 'Failed to submit feedback' })
  }
})

// Submit correction (for AI learning)
router.post('/correction', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { original_response, corrected_response, reason, context } = req.body
    const userId = req.user?.userId

    // In production, store corrections for model improvement
    console.log('Correction received:', { original_response, corrected_response, reason, userId })

    res.json({
      success: true,
      message: 'Correction recorded for learning',
      correction_id: `corr_${Date.now()}`,
    })
  } catch (error) {
    console.error('Correction error:', error)
    res.status(500).json({ error: 'Failed to submit correction' })
  }
})

export default router