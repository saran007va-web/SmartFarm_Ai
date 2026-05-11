import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { createServer } from 'http'
import { Server } from 'socket.io'

import config from './config'
import { prisma } from './services/database'
import redisService from './services/cache'

// Routes
import authRoutes from './modules/auth/auth.controller'
import farmsRoutes from './modules/farms/farms.controller'
import cropPlansRoutes from './modules/crop-plans/crop-plans.controller'
import uploadsRoutes from './modules/uploads/uploads.controller'

// Initialize Express
const app = express()
const httpServer = createServer(app)

// Socket.IO for realtime
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}))
app.use(compression())
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', async (req, res) => {
  const dbHealthy = await prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false)
  const redisHealthy = await redisService.isHealthy()

  res.json({
    status: dbHealthy && redisHealthy ? 'ok' : 'degraded',
    database: dbHealthy ? 'connected' : 'disconnected',
    redis: redisHealthy ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/farms', farmsRoutes)
app.use('/api/planning', cropPlansRoutes)
app.use('/api/uploads', uploadsRoutes)

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Join user's personal room
  socket.on('join', (userId: string) => {
    socket.join(`user:${userId}`)
    console.log(`User ${userId} joined their room`)
  })

  // Handle task completion events
  socket.on('task:completed', async (data) => {
    // Broadcast to relevant users
    io.to(`farm:${data.farmId}`).emit('task:updated', data)
  })

  // Handle market price updates
  socket.on('market:refresh', async () => {
    // Trigger market data refresh
    io.emit('market:updated')
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...')

  await prisma.$disconnect()
  await redisService.disconnect()

  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    console.log('Database connected')

    // Test Redis connection
    const redisOk = await redisService.isHealthy()
    if (redisOk) {
      console.log('Redis connected')
    } else {
      console.warn('Redis not available, continuing without cache')
    }

    httpServer.listen(config.server.port, () => {
      console.log(`
╔═══════════════════════════════════════════════════╗
║   Smart AI Farming Platform - Backend Server       ║
╠═══════════════════════════════════════════════════╣
║   Server running on port ${config.server.port}                      ║
║   Environment: ${config.server.nodeEnv}                          ║
║   Database: Connected                             ║
║   Redis: ${redisOk ? 'Connected' : 'Not Available'}                              ║
╚═══════════════════════════════════════════════════╝
      `)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

export { app, io }