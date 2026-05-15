import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { createServer } from 'http'
import { Server } from 'socket.io'

import config from './config'
import prisma from './services/database'
import redisService from './services/cache'
import queueService from './services/queue'

// Routes
import authRoutes from './modules/auth/auth.controller'
import farmsRoutes from './modules/farms/farms.controller'
import cropPlansRoutes from './modules/crop-plans/crop-plans.controller'
import uploadsRoutes from './modules/uploads/uploads.controller'
import weatherRoutes from './modules/weather/weather.controller'
import marketRoutes from './modules/market/market.controller'
import aiInsightsRoutes from './modules/ai-insights/ai-insights.controller'
import notificationsRoutes from './modules/notifications/notifications.controller'
import autosaveRoutes from './modules/autosave/autosave.controller'
import chatRoutes from './modules/chat/chat.controller'
import recordsRoutes from './modules/records/records.controller'
import translateRoutes from './modules/translate/translate.controller'
import sensorsRoutes from './modules/sensors/sensors.controller'
import predictRoutes from './modules/predict/predict.controller'
import profileRoutes from './modules/profile/profile.controller'
import feedbackRoutes from './modules/feedback/feedback.controller'
import settingsRoutes from './modules/settings/settings.controller'
import calendarRoutes from './modules/calendar/calendar.controller'
import statsRoutes from './modules/stats/stats.controller'
import irrigationRoutes from './modules/irrigation/irrigation.controller'
import economicsRoutes from './modules/economics/economics.controller'
import farmRoutes from './modules/farm/farm.controller'

// Initialize Express
const app = express()
const httpServer = createServer(app)

// Socket.IO for realtime
export const io = new Server(httpServer, {
  cors: {
    origin: config.server.nodeEnv === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',') || '*'
      : '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}))
app.use(compression())
app.use(cors({
  origin: config.server.nodeEnv === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || false
    : true,
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

const handleHealthCheck = async (req: express.Request, res: express.Response) => {
  try {
    const dbHealthy = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false)
    const redisHealthy = await redisService.isHealthy()

    res.json({
      status: dbHealthy && redisHealthy ? 'ok' : 'degraded',
      database: dbHealthy ? 'connected' : 'disconnected',
      redis: redisHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Service unavailable',
    })
  }
}

// Health check
app.get('/health', handleHealthCheck)
app.get('/api/health', handleHealthCheck)

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/farms', farmsRoutes)
app.use('/api/farm/profile', farmsRoutes)
app.use('/api/planning', cropPlansRoutes)
app.use('/api/uploads', uploadsRoutes)
app.use('/api/weather', weatherRoutes)
app.use('/api/market', marketRoutes)
app.use('/api/ai-insights', aiInsightsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/autosave', autosaveRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/records', recordsRoutes)
app.use('/api/translate', translateRoutes)
app.use('/api/sensors', sensorsRoutes)
app.use('/api/predict', predictRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/feedback', feedbackRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/irrigation', irrigationRoutes)
app.use('/api/economics', economicsRoutes)
app.use('/api/farm', farmRoutes)
app.use('/api/crop-outcome', profileRoutes)

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Smart AI Farming Platform API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      farms: '/api/farms',
      planning: '/api/planning',
      uploads: '/api/uploads',
      weather: '/api/weather',
      market: '/api/market',
      aiInsights: '/api/ai-insights',
      notifications: '/api/notifications',
      autosave: '/api/autosave',
    },
  })
})

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err)

  // Rate limit errors
  if (err.message?.includes('rate limit')) {
    res.status(429).json({ error: 'Too many requests' })
    return
  }

  res.status(500).json({ error: 'Internal server error' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Join user's personal room
  socket.on('join', (userId: string) => {
    socket.join(`user:${userId}`)
    console.log(`User ${userId} joined their room`)
  })

  // Join farm room
  socket.on('join-farm', (farmId: string) => {
    socket.join(`farm:${farmId}`)
    console.log(`Client joined farm room: ${farmId}`)
  })

  // Leave farm room
  socket.on('leave-farm', (farmId: string) => {
    socket.leave(`farm:${farmId}`)
  })

  // Handle task completion events
  socket.on('task:completed', (data: { farmId: string; taskId: string }) => {
    io.to(`farm:${data.farmId}`).emit('task:updated', {
      taskId: data.taskId,
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
    })
  })

  // Handle task update events
  socket.on('task:updated', (data: { farmId: string; taskId: string }) => {
    io.to(`farm:${data.farmId}`).emit('task:updated', data)
  })

  // Handle market price updates subscription
  socket.on('market:subscribe', () => {
    socket.join('market:updates')
  })

  socket.on('market:unsubscribe', () => {
    socket.leave('market:updates')
  })

  // Handle crop plan updates
  socket.on('cropplan:updated', (data: { farmId: string }) => {
    io.to(`farm:${data.farmId}`).emit('cropplan:updated', data)
  })

  // Handle realtime typing indicator
  socket.on('typing:start', (data: { farmId: string; userId: string }) => {
    socket.to(`farm:${data.farmId}`).emit('typing:start', data)
  })

  socket.on('typing:stop', (data: { farmId: string; userId: string }) => {
    socket.to(`farm:${data.farmId}`).emit('typing:stop', data)
  })

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`)
  })
})

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...')

  try {
    await queueService.closeQueues()
  } catch (error) {
    console.error('Error closing queues:', error)
  }

  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error disconnecting database:', error)
  }

  try {
    await redisService.disconnect()
  } catch (error) {
    console.error('Error disconnecting Redis:', error)
  }

  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

// Start server
const startServer = async () => {
  let dbConnected = false

  try {
    // Test database connection, but do not block startup if the remote DB is unreachable.
    await prisma.$queryRaw`SELECT 1`
    dbConnected = true
    console.log('Database connected')
  } catch (error) {
    console.warn('Database not available, continuing in degraded mode')
    console.warn(error)
  }

  try {
    // Test Redis connection
    const redisOk = await redisService.isHealthy()
    if (redisOk) {
      console.log('Redis connected')
    } else {
      console.warn('Redis not available, continuing without cache')
    }

    httpServer.listen(config.server.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║   Smart AI Farming Platform - Backend Server             ║
╠═══════════════════════════════════════════════════════════╣
║   Server running on port ${config.server.port}                             ║
║   Environment: ${config.server.nodeEnv.padEnd(36)}║
║   Database: ${dbConnected ? 'Connected'.padEnd(36) : 'Not Available'.padEnd(36)}║
║   Redis: ${redisOk ? 'Connected'.padEnd(36) : 'Not Available'.padEnd(36)}║
║   WebSocket: Enabled                                     ║
╚═══════════════════════════════════════════════════════════╝
      `)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

export { app }