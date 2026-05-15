import { Router, Response } from 'express'
import prisma from '../../services/database'
import { authenticate, AuthRequest } from '../auth/auth.middleware'
import { io } from '../../index'
import crypto from 'crypto'

const router = Router()

// Generate webhook URL for sensor data
router.get('/webhook-url', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId
    const webhookToken = crypto.randomBytes(32).toString('hex')

    // Store the webhook token (in production, use a dedicated table)
    res.json({
      webhook_url: `/api/sensors/data?token=${webhookToken}`,
      token: webhookToken,
      instructions: 'Send POST requests to this URL with sensor data in JSON format',
    })
  } catch (error) {
    console.error('Get webhook URL error:', error)
    res.status(500).json({ error: 'Failed to generate webhook URL' })
  }
})

// Receive sensor data (webhook endpoint)
router.post('/data', async (req, res: Response): Promise<void> => {
  try {
    const { token, sensor_id, temperature, humidity, soil_moisture, light, timestamp } = req.body

    // Validate token (simplified - in production use proper auth)
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const sensorData = {
      sensorId: sensor_id || 'sensor-001',
      temperature: parseFloat(temperature) || 0,
      humidity: parseFloat(humidity) || 0,
      soilMoisture: parseFloat(soil_moisture) || 0,
      light: parseFloat(light) || 0,
      timestamp: timestamp || new Date().toISOString(),
    }

    // Broadcast to connected clients
    io.emit('sensor:data', sensorData)

    // Store in database (create table if needed)
    console.log('Sensor data received:', sensorData)

    res.json({
      success: true,
      received_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Sensor data error:', error)
    res.status(500).json({ error: 'Failed to process sensor data' })
  }
})

// Get sensor readings
router.get('/readings', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { farm_id, sensor_id, from, to } = req.query

    // In production, query from a sensor_readings table
    // For now, return mock data structure
    const readings = [
      {
        sensorId: sensor_id || 'sensor-001',
        type: 'temperature',
        value: 28.5,
        unit: '°C',
        timestamp: new Date().toISOString(),
      },
      {
        sensorId: sensor_id || 'sensor-001',
        type: 'humidity',
        value: 65,
        unit: '%',
        timestamp: new Date().toISOString(),
      },
      {
        sensorId: sensor_id || 'sensor-001',
        type: 'soil_moisture',
        value: 42,
        unit: '%',
        timestamp: new Date().toISOString(),
      },
      {
        sensorId: sensor_id || 'sensor-001',
        type: 'light',
        value: 850,
        unit: 'lux',
        timestamp: new Date().toISOString(),
      },
    ]

    res.json(readings)
  } catch (error) {
    console.error('Get readings error:', error)
    res.status(500).json({ error: 'Failed to get readings' })
  }
})

// Subscribe to sensor updates via WebSocket
router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { farm_id, sensor_ids } = req.body

    // Join sensor room for real-time updates
    res.json({
      success: true,
      message: 'Subscribed to sensor updates',
      channels: sensor_ids || ['all'],
    })
  } catch (error) {
    console.error('Subscribe error:', error)
    res.status(500).json({ error: 'Failed to subscribe' })
  }
})

export default router