import { Router, Response } from 'express'
import prisma from '../../services/database'
import { authenticate, AuthRequest } from '../auth/auth.middleware'

const router = Router()

// Chat Session model for database
interface ChatSession {
  id: string
  name: string
  deviceId: string
  createdAt: Date
  updatedAt: Date
}

interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant'
  content: string
  language?: string
  createdAt: Date
}

// Create chat session
router.post('/sessions', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body
    const deviceId = req.body.device_id || req.user?.userId

    const session = await prisma.$executeRaw`
      INSERT INTO "chat_sessions" (id, name, device_id, "created_at", "updated_at")
      VALUES (gen_random_uuid(), ${name || 'New Chat'}, ${deviceId}, NOW(), NOW())
      RETURNING *
    `

    res.status(201).json({ message: 'Session created' })
  } catch (error) {
    console.error('Create session error:', error)
    res.status(500).json({ error: 'Failed to create session' })
  }
})

// Get all chat sessions
router.get('/sessions', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deviceId = req.query.device_id as string || req.user?.userId

    const sessions = await prisma.$queryRaw<ChatSession[]>`
      SELECT * FROM "chat_sessions"
      WHERE device_id = ${deviceId}
      ORDER BY "updated_at" DESC
      LIMIT 50
    `

    res.json(sessions || [])
  } catch (error) {
    console.error('Get sessions error:', error)
    res.status(500).json({ error: 'Failed to get sessions' })
  }
})

// Delete chat session
router.delete('/sessions/:sessionId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params

    await prisma.$executeRaw`
      DELETE FROM "chat_messages" WHERE session_id = ${sessionId}
    `
    await prisma.$executeRaw`
      DELETE FROM "chat_sessions" WHERE id = ${sessionId}
    `

    res.json({ message: 'Session deleted' })
  } catch (error) {
    console.error('Delete session error:', error)
    res.status(500).json({ error: 'Failed to delete session' })
  }
})

// Rename chat session
router.patch('/sessions/:sessionId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params
    const { name } = req.body

    await prisma.$executeRaw`
      UPDATE "chat_sessions"
      SET name = ${name}, "updated_at" = NOW()
      WHERE id = ${sessionId}
    `

    res.json({ message: 'Session renamed' })
  } catch (error) {
    console.error('Rename session error:', error)
    res.status(500).json({ error: 'Failed to rename session' })
  }
})

// Get chat history
router.get('/history/:sessionId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params
    const limit = parseInt(req.query.limit as string) || 100

    const messages = await prisma.$queryRaw<ChatMessage[]>`
      SELECT * FROM "chat_messages"
      WHERE session_id = ${sessionId}
      ORDER BY "created_at" ASC
      LIMIT ${limit}
    `

    res.json(messages || [])
  } catch (error) {
    console.error('Get history error:', error)
    res.status(500).json({ error: 'Failed to get chat history' })
  }
})

// Send chat message
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { message, session_id, history, language, device_id } = req.body

    // Create or update session
    let sessionId = session_id
    if (!sessionId) {
      const newSession = await prisma.$queryRaw<[{ id: string }]>`
        INSERT INTO "chat_sessions" (id, name, device_id, "created_at", "updated_at")
        VALUES (gen_random_uuid(), ${message.substring(0, 50)}, ${device_id || req.user?.userId}, NOW(), NOW())
        RETURNING id
      `
      sessionId = newSession[0]?.id
    }

    // Save user message
    await prisma.$executeRaw`
      INSERT INTO "chat_messages" (id, session_id, role, content, language, "created_at")
      VALUES (gen_random_uuid(), ${sessionId}, 'user', ${message}, ${language || 'en'}, NOW())
    `

    // Generate AI response (simple rule-based for now)
    const aiResponse = generateAIResponse(message, history || [])

    // Save assistant message
    await prisma.$executeRaw`
      INSERT INTO "chat_messages" (id, session_id, role, content, language, "created_at")
      VALUES (gen_random_uuid(), ${sessionId}, 'assistant', ${aiResponse}, ${language || 'en'}, NOW())
    `

    // Update session timestamp
    await prisma.$executeRaw`
      UPDATE "chat_sessions" SET "updated_at" = NOW() WHERE id = ${sessionId}
    `

    res.json({
      response: aiResponse,
      session_id: sessionId,
    })
  } catch (error) {
    console.error('Chat error:', error)
    res.status(500).json({ error: 'Failed to process message' })
  }
})

// Simple AI response generator (placeholder for real AI integration)
function generateAIResponse(message: string, history: any[]): string {
  const lowerMessage = message.toLowerCase()

  // Farming-related responses
  if (lowerMessage.includes('crop') || lowerMessage.includes('plant')) {
    return "For crop recommendations, I analyze soil type, climate, and market prices. Would you like me to suggest the best crops for your farm?"
  }

  if (lowerMessage.includes('weather') || lowerMessage.includes('rain')) {
    return "I can help you track weather patterns and forecast. Check the Weather page for detailed forecasts in your area."
  }

  if (lowerMessage.includes('price') || lowerMessage.includes('market')) {
    return "Market prices vary by region and season. Visit the Market page to see current prices for your crops."
  }

  if (lowerMessage.includes('water') || lowerMessage.includes('irrigation')) {
    return "Proper irrigation is crucial for crop yield. I can help you optimize your watering schedule based on weather and soil moisture."
  }

  if (lowerMessage.includes('fertilizer') || lowerMessage.includes('nutrient')) {
    return "Fertilizer requirements depend on soil test results and crop needs. Would you like guidance on nutrient management?"
  }

  if (lowerMessage.includes('pest') || lowerMessage.includes('disease')) {
    return "For pest and disease management, I recommend integrated pest management (IPM). Would you like specific recommendations?"
  }

  // Default farming assistant response
  return "I'm your smart farming assistant. I can help you with crop planning, weather tracking, market prices, irrigation advice, and more. What would you like to know?"
}

// Export chat history
router.get('/export/:sessionId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params
    const format = req.query.format || 'json'

    const messages = await prisma.$queryRaw<ChatMessage[]>`
      SELECT * FROM "chat_messages"
      WHERE session_id = ${sessionId}
      ORDER BY "created_at" ASC
    `

    const session = await prisma.$queryRaw<[{ name: string }]>`
      SELECT name FROM "chat_sessions" WHERE id = ${sessionId}
    `

    if (format === 'text') {
      const text = messages.map(m =>
        `${m.role === 'user' ? 'You' : 'Assistant'}: ${m.content}`
      ).join('\n\n')
      res.setHeader('Content-Type', 'text/plain')
      res.send(text)
    } else {
      res.json({
        session: session[0]?.name || 'Chat',
        messages: messages || [],
        exportedAt: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error('Export error:', error)
    res.status(500).json({ error: 'Failed to export chat' })
  }
})

export default router