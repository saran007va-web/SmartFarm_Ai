import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../../services/database'
import redisService from '../../services/cache'

const router = Router()

const irrigationAdviceSchema = z.object({
  farmId: z.string().optional(),
  soilMoisture: z.number().min(0).max(100).optional(),
  temperature: z.number().optional(),
  humidity: z.number().min(0).max(100).optional(),
  cropType: z.string().optional(),
  area: z.number().optional(),
  lastIrrigationDate: z.string().datetime().optional(),
})

// Get irrigation advice based on conditions
router.post('/advice', async (req: Request, res: Response) => {
  try {
    const data = irrigationAdviceSchema.parse(req.body)

    // Check cache first
    const cacheKey = `irrigation:advice:${JSON.stringify(data)}`
    const cached = await redisService.get(cacheKey)
    if (cached) {
      res.json(JSON.parse(cached))
      return
    }

    // Calculate irrigation recommendation
    let advice = {
      recommendation: 'moderate',
      duration: 30,
      frequency: 'daily',
      waterNeeded: 0,
      bestTime: '06:00 AM',
      notes: '',
    }

    // Soil moisture based recommendations
    if (data.soilMoisture !== undefined) {
      if (data.soilMoisture < 30) {
        advice = {
          ...advice,
          recommendation: 'urgent',
          duration: 45,
          frequency: 'twice_daily',
          waterNeeded: data.area ? data.area * 50 : 5000,
          bestTime: '06:00 AM and 06:00 PM',
          notes: 'Soil moisture is critically low. Immediate irrigation required.',
        }
      } else if (data.soilMoisture < 50) {
        advice = {
          ...advice,
          recommendation: 'needed',
          duration: 35,
          frequency: 'daily',
          waterNeeded: data.area ? data.area * 35 : 3500,
          bestTime: '06:00 AM',
          notes: 'Soil moisture is below optimal. Irrigation recommended.',
        }
      } else if (data.soilMoisture < 70) {
        advice = {
          ...advice,
          recommendation: 'moderate',
          duration: 25,
          frequency: 'every_other_day',
          waterNeeded: data.area ? data.area * 25 : 2500,
          bestTime: '07:00 AM',
          notes: 'Soil moisture is optimal. Maintain current watering schedule.',
        }
      } else {
        advice = {
          ...advice,
          recommendation: 'none',
          duration: 0,
          frequency: 'skip',
          waterNeeded: 0,
          bestTime: '',
          notes: 'Soil moisture is high. Skip irrigation to prevent waterlogging.',
        }
      }
    }

    // Temperature adjustments
    if (data.temperature !== undefined && data.temperature > 35) {
      advice.duration += 10
      advice.waterNeeded = (advice.waterNeeded || 0) * 1.2
      advice.notes += ' High temperature detected. Increased watering duration recommended.'
    }

    // Humidity adjustments
    if (data.humidity !== undefined && data.humidity < 40) {
      advice.waterNeeded = (advice.waterNeeded || 0) * 1.15
      advice.notes += ' Low humidity may increase evapotranspiration.'
    }

    // Crop-specific adjustments
    const cropWaterRequirements: Record<string, { multiplier: number; notes: string }> = {
      rice: { multiplier: 1.5, notes: 'Rice requires standing water. Maintain flood conditions.' },
      wheat: { multiplier: 1.0, notes: 'Wheat needs moderate irrigation at critical growth stages.' },
      cotton: { multiplier: 0.8, notes: 'Cotton is drought-tolerant but needs water at flowering.' },
      maize: { multiplier: 1.2, notes: 'Maize needs water at tasseling and grain fill stages.' },
      vegetables: { multiplier: 1.3, notes: 'Vegetables require consistent moisture for quality produce.' },
      fruits: { multiplier: 0.9, notes: 'Fruit trees need deep watering less frequently.' },
    }

    if (data.cropType && cropWaterRequirements[data.cropType.toLowerCase()]) {
      const cropInfo = cropWaterRequirements[data.cropType.toLowerCase()]
      advice.waterNeeded = (advice.waterNeeded || 0) * cropInfo.multiplier
      advice.notes += ` ${cropInfo.notes}`
    }

    // Cache the result for 30 minutes
    await redisService.set(cacheKey, JSON.stringify(advice), 1800)

    res.json(advice)
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors })
      return
    }
    console.error('Irrigation advice error:', error)
    res.status(500).json({ error: 'Failed to generate irrigation advice' })
  }
})

// Get irrigation logs
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const { farmId, startDate, endDate, limit = '50' } = req.query

    const where: Record<string, unknown> = {}

    if (farmId) where.farmId = farmId

    if (startDate || endDate) {
      where.scheduledDate = {}
      if (startDate) (where.scheduledDate as Record<string, unknown>).gte = new Date(startDate as string)
      if (endDate) (where.scheduledDate as Record<string, unknown>).lte = new Date(endDate as string)
    }

    const logs = await prisma.task.findMany({
      where,
      where: {
        taskType: 'WATERING',
      },
      orderBy: { scheduledDate: 'desc' },
      take: parseInt(limit as string),
      include: {
        farm: {
          select: { id: true, name: true },
        },
      },
    })

    res.json(logs)
  } catch (error) {
    console.error('Irrigation logs error:', error)
    res.status(500).json({ error: 'Failed to fetch irrigation logs' })
  }
})

// Log irrigation activity
router.post('/log', async (req: Request, res: Response) => {
  try {
    const { farmId, taskId, waterUsed, duration, notes } = req.body

    if (!farmId) {
      res.status(400).json({ error: 'Farm ID is required' })
      return
    }

    // Create or update task for irrigation
    const task = await prisma.task.upsert({
      where: { id: taskId || 'new' },
      create: {
        farmId,
        taskType: 'WATERING',
        title: 'Irrigation',
        description: notes || `Water used: ${waterUsed}L, Duration: ${duration}min`,
        scheduledDate: new Date(),
        status: 'COMPLETED',
        quantity: waterUsed,
        unit: 'L',
        completedDate: new Date(),
      },
      update: {
        quantity: waterUsed,
        unit: 'L',
        notes,
        status: 'COMPLETED',
        completedDate: new Date(),
      },
    })

    res.json(task)
  } catch (error) {
    console.error('Irrigation log error:', error)
    res.status(500).json({ error: 'Failed to log irrigation activity' })
  }
})

export default router