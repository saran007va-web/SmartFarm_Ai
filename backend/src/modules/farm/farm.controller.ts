import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../../services/database'
import { authenticate, AuthRequest } from '../auth/auth.middleware'

const router = Router()

// Get user's default farm ID (first farm they own or manage)
async function getDefaultFarmId(userId: string): Promise<string | null> {
  const farmUser = await prisma.farmUser.findFirst({
    where: { userId, isActive: true },
    include: { farm: { where: { isActive: true } } },
    orderBy: { joinedAt: 'asc' },
  })
  return farmUser?.farm.id || null
}

// Validation schemas
const plotSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
  positionZ: z.number().optional(),
  sizeWidth: z.number().optional(),
  sizeDepth: z.number().optional(),
  growthStage: z.string().optional(),
  soilMoisture: z.number().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  nutrients: z.string().optional(),
  waterConsumption: z.number().optional(),
  healthScore: z.number().optional(),
  pestRisk: z.string().optional(),
  harvestDate: z.string().optional(),
  yieldEstimate: z.string().optional(),
  irrigationActive: z.boolean().optional(),
})

const updatePlotSchema = plotSchema.partial()

// Get farm state (all plots)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const farmId = await getDefaultFarmId(req.user!.userId)
    if (!farmId) {
      res.json({ plots: [] })
      return
    }

    const plots = await prisma.farmPlot.findMany({
      where: { farmId },
      orderBy: { createdAt: 'asc' },
    })

    // Convert to frontend format
    const formattedPlots = plots.map(plot => ({
      id: plot.id,
      name: plot.name,
      type: plot.type,
      position: [plot.positionX, plot.positionY, plot.positionZ],
      size: [plot.sizeWidth, plot.sizeDepth],
      data: {
        growthStage: plot.growthStage,
        soilMoisture: plot.soilMoisture,
        temperature: plot.temperature,
        humidity: plot.humidity,
        nutrients: plot.nutrients,
        waterConsumption: plot.waterConsumption,
        healthScore: plot.healthScore,
        pestRisk: plot.pestRisk,
        harvestDate: plot.harvestDate?.toISOString().split('T')[0],
        yieldEstimate: plot.yieldEstimate,
        irrigationActive: plot.irrigationActive,
      },
    }))

    res.json({ plots: formattedPlots })
  } catch (error) {
    console.error('Error fetching farm state:', error)
    res.status(500).json({ error: 'Failed to fetch farm state' })
  }
})

// Save entire farm state
router.post('/save', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const farmId = await getDefaultFarmId(req.user!.userId)
    if (!farmId) {
      res.status(400).json({ error: 'No farm found' })
      return
    }

    const { plots } = req.body

    if (!Array.isArray(plots)) {
      res.status(400).json({ error: 'Invalid plots data' })
      return
    }

    // Delete existing plots and create new ones
    await prisma.farmPlot.deleteMany({ where: { farmId } })

    const plotData = plots.map((plot: any) => ({
      farmId,
      name: plot.name,
      type: plot.type,
      positionX: plot.position?.[0] || 0,
      positionY: plot.position?.[1] || 0,
      positionZ: plot.position?.[2] || 0,
      sizeWidth: plot.size?.[0] || 5,
      sizeDepth: plot.size?.[1] || 5,
      growthStage: plot.data?.growthStage,
      soilMoisture: plot.data?.soilMoisture,
      temperature: plot.data?.temperature,
      humidity: plot.data?.humidity,
      nutrients: plot.data?.nutrients,
      waterConsumption: plot.data?.waterConsumption,
      healthScore: plot.data?.healthScore,
      pestRisk: plot.data?.pestRisk,
      harvestDate: plot.data?.harvestDate ? new Date(plot.data.harvestDate) : null,
      yieldEstimate: plot.data?.yieldEstimate,
      irrigationActive: plot.data?.irrigationActive || false,
    }))

    await prisma.farmPlot.createMany({ data: plotData })

    res.json({ success: true, message: 'Farm saved successfully' })
  } catch (error) {
    console.error('Error saving farm:', error)
    res.status(500).json({ error: 'Failed to save farm' })
  }
})

// Get all plots
router.get('/plots', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const farmId = await getDefaultFarmId(req.user!.userId)
    if (!farmId) {
      res.json({ plots: [] })
      return
    }

    const plots = await prisma.farmPlot.findMany({
      where: { farmId },
      orderBy: { createdAt: 'asc' },
    })

    res.json({ plots })
  } catch (error) {
    console.error('Error fetching plots:', error)
    res.status(500).json({ error: 'Failed to fetch plots' })
  }
})

// Create plot
router.post('/plots', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const farmId = await getDefaultFarmId(req.user!.userId)
    if (!farmId) {
      res.status(400).json({ error: 'No farm found' })
      return
    }

    const data = plotSchema.parse(req.body)

    const plot = await prisma.farmPlot.create({
      data: {
        farmId,
        ...data,
      },
    })

    res.json({ plot })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid data', details: error.errors })
      return
    }
    console.error('Error creating plot:', error)
    res.status(500).json({ error: 'Failed to create plot' })
  }
})

// Update plot
router.put('/plots/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const farmId = await getDefaultFarmId(req.user!.userId)
    if (!farmId) {
      res.status(400).json({ error: 'No farm found' })
      return
    }

    const data = updatePlotSchema.parse(req.body)

    const plot = await prisma.farmPlot.update({
      where: { id: req.params.id, farmId },
      data,
    })

    res.json({ plot })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid data', details: error.errors })
      return
    }
    console.error('Error updating plot:', error)
    res.status(500).json({ error: 'Failed to update plot' })
  }
})

// Delete plot
router.delete('/plots/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const farmId = await getDefaultFarmId(req.user!.userId)
    if (!farmId) {
      res.status(400).json({ error: 'No farm found' })
      return
    }

    await prisma.farmPlot.delete({
      where: { id: req.params.id, farmId },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting plot:', error)
    res.status(500).json({ error: 'Failed to delete plot' })
  }
})

export default router