import { Router, Response } from 'express'
import prisma from '../../services/database'
import { authenticate, AuthRequest } from '../auth/auth.middleware'

const router = Router()

// Get all yield records
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const farmId = req.query.farm_id as string

    let where = {}
    if (farmId) {
      where = { farmId }
    }

    const records = await prisma.yieldRecord.findMany({
      where,
      orderBy: { harvestDate: 'desc' },
      take: 100,
    })

    res.json(records)
  } catch (error) {
    console.error('Get records error:', error)
    res.status(500).json({ error: 'Failed to get records' })
  }
})

// Get single yield record
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const record = await prisma.yieldRecord.findUnique({
      where: { id },
    })

    if (!record) {
      res.status(404).json({ error: 'Record not found' })
      return
    }

    res.json(record)
  } catch (error) {
    console.error('Get record error:', error)
    res.status(500).json({ error: 'Failed to get record' })
  }
})

// Create yield record
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      farm_id,
      crop_name,
      quantity,
      unit,
      revenue,
      harvest_date,
      quality,
      notes,
    } = req.body

    // Get user's first farm if not specified
    let farmId = farm_id
    if (!farmId) {
      const farms = await prisma.farm.findMany({ take: 1 })
      farmId = farms[0]?.id
    }

    if (!farmId) {
      res.status(400).json({ error: 'No farm found. Please create a farm first.' })
      return
    }

    const record = await prisma.yieldRecord.create({
      data: {
        farmId,
        cropName: crop_name,
        quantity: parseFloat(quantity),
        unit: unit || 'kg',
        revenue: revenue ? parseFloat(revenue) : null,
        harvestDate: new Date(harvest_date),
        quality,
        notes,
      },
    })

    res.status(201).json(record)
  } catch (error) {
    console.error('Create record error:', error)
    res.status(500).json({ error: 'Failed to create record' })
  }
})

// Update yield record
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const {
      crop_name,
      quantity,
      unit,
      revenue,
      harvest_date,
      quality,
      notes,
    } = req.body

    const record = await prisma.yieldRecord.update({
      where: { id },
      data: {
        cropName: crop_name,
        quantity: quantity ? parseFloat(quantity) : undefined,
        unit,
        revenue: revenue ? parseFloat(revenue) : undefined,
        harvestDate: harvest_date ? new Date(harvest_date) : undefined,
        quality,
        notes,
      },
    })

    res.json(record)
  } catch (error) {
    console.error('Update record error:', error)
    res.status(500).json({ error: 'Failed to update record' })
  }
})

// Delete yield record
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    await prisma.yieldRecord.delete({
      where: { id },
    })

    res.json({ message: 'Record deleted' })
  } catch (error) {
    console.error('Delete record error:', error)
    res.status(500).json({ error: 'Failed to delete record' })
  }
})

export default router