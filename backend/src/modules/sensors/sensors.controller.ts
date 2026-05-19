import { Router, Response } from 'express'
import prisma from '../../services/database'
import { optionalAuth, authenticate, AuthRequest } from '../auth/auth.middleware'
import { io } from '../../index'
import crypto from 'crypto'

const router = Router()

// Generate webhook URL for sensor data
router.get('/webhook-url', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const webhookToken = crypto.randomBytes(32).toString('hex')
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3002'

    res.json({
      webhook_url: `${baseUrl}/api/sensors/data?token=${webhookToken}`,
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
    const {
      token, sensor_id, sensor_type, value, unit,
      temperature, humidity, soil_moisture, light,
      farm_id, timestamp
    } = req.body

    // Handle different payload formats
    let sensorData
    if (sensor_type !== undefined && value !== undefined) {
      // Frontend format
      sensorData = {
        id: crypto.randomUUID(),
        sensor_id: sensor_id || 'sensor-001',
        sensor_type: sensor_type,
        value: parseFloat(value) || 0,
        unit: unit || '',
        farm_id: farm_id || null,
        timestamp: timestamp || new Date().toISOString(),
      }
    } else {
      // IoT device format
      sensorData = {
        id: crypto.randomUUID(),
        sensor_id: sensor_id || 'sensor-001',
        sensor_type: 'temperature',
        temperature: parseFloat(temperature) || 0,
        humidity: parseFloat(humidity) || 0,
        soil_moisture: parseFloat(soil_moisture) || 0,
        light: parseFloat(light) || 0,
        farm_id: farm_id || null,
        timestamp: timestamp || new Date().toISOString(),
      }
    }

    // Broadcast to connected clients
    io.emit('sensor:data', sensorData)

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
router.get('/readings', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { sensor_type, farm_id, limit = 50 } = req.query

    // Return mock readings in format expected by frontend
    const readings = [
      {
        id: crypto.randomUUID(),
        sensor_type: 'soil_moisture',
        value: 45,
        unit: '%',
        timestamp: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        sensor_type: 'temperature',
        value: 28.5,
        unit: '°C',
        timestamp: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        sensor_type: 'humidity',
        value: 65,
        unit: '%',
        timestamp: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        sensor_type: 'rainfall',
        value: 0,
        unit: 'mm',
        timestamp: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        sensor_type: 'soil_ph',
        value: 6.5,
        unit: 'pH',
        timestamp: new Date().toISOString(),
      },
    ]

    // Filter by sensor_type if provided
    let filteredReadings = readings
    if (sensor_type) {
      filteredReadings = readings.filter(r => r.sensor_type === sensor_type)
    }

    res.json({ readings: filteredReadings })
  } catch (error) {
    console.error('Get readings error:', error)
    res.status(500).json({ error: 'Failed to get readings' })
  }
})

// Subscribe to sensor updates via WebSocket
router.post('/subscribe', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { farm_id, sensor_ids } = req.body

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