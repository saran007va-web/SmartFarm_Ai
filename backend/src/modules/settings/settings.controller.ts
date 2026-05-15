import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../auth/auth.middleware'

const router = Router()

// Get settings
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({
      api_version: '1.0.0',
      features: {
        chat: true,
        voice_input: true,
        weather: true,
        market_prices: true,
        ai_insights: true,
        notifications: true,
      },
      preferences: {
        language: 'en',
        theme: 'light',
        notifications: true,
      },
    })
  } catch (error) {
    console.error('Get settings error:', error)
    res.status(500).json({ error: 'Failed to get settings' })
  }
})

// Reset RAG index
router.post('/reset-index', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // In production, reset the vector database index
    res.json({
      success: true,
      message: 'RAG index reset successfully',
    })
  } catch (error) {
    console.error('Reset index error:', error)
    res.status(500).json({ error: 'Failed to reset index' })
  }
})

// Clear chat history
router.post('/clear-history', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { device_id } = req.body

    // In production, clear chat history from database
    res.json({
      success: true,
      message: 'Chat history cleared successfully',
    })
  } catch (error) {
    console.error('Clear history error:', error)
    res.status(500).json({ error: 'Failed to clear history' })
  }
})

export default router