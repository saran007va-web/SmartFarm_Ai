import { Router, Request, Response } from 'express'
import { z } from 'zod'
import prisma from '../../services/database'
import { authenticate, optionalAuth, AuthRequest } from '../auth/auth.middleware'

const router = Router()

// Validation schemas
const createFarmSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  soilType: z.string().optional(),
  acreage: z.number().optional(),
})

const updateFarmSchema = createFarmSchema.partial()

// Get all farms for user
router.get('/', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.json({ farms: [] })
      return
    }

    const farms = await prisma.farm.findMany({
      where: {
        users: {
          some: { userId: req.user!.userId, isActive: true },
        },
        isActive: true,
      },
      include: {
        users: {
          where: { userId: req.user!.userId },
          select: { role: true },
        },
        _count: {
          select: { cropPlans: true, tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json({ farms })
  } catch (error) {
    console.error('Error fetching farms:', error)
    res.status(500).json({ error: 'Failed to fetch farms' })
  }
})

// Get single farm
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(404).json({ error: 'Farm not found' })
      return
    }

    const farm = await prisma.farm.findFirst({
      where: {
        id: req.params.id,
        users: { some: { userId: req.user!.userId, isActive: true } },
      },
      include: {
        users: {
          include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        },
        cropPlans: { where: { isActive: true }, take: 5, orderBy: { createdAt: 'desc' } },
        _count: { select: { cropPlans: true, tasks: true, yieldRecords: true } },
      },
    })

    if (!farm) {
      res.status(404).json({ error: 'Farm not found' })
      return
    }

    res.json({ farm })
  } catch (error) {
    console.error('Error fetching farm:', error)
    res.status(500).json({ error: 'Failed to fetch farm' })
  }
})

// Create farm
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createFarmSchema.parse(req.body)

    const farm = await prisma.farm.create({
      data: {
        ...data,
        users: {
          create: {
            userId: req.user!.userId,
            role: 'OWNER',
            isActive: true,
          },
        },
      },
      include: { users: true },
    })

    res.status(201).json({ farm })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors })
      return
    }
    console.error('Error creating farm:', error)
    res.status(500).json({ error: 'Failed to create farm' })
  }
})

// Update farm
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = updateFarmSchema.parse(req.body)

    // Check ownership
    const membership = await prisma.farmUser.findFirst({
      where: {
        farmId: req.params.id,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'MANAGER'] },
        isActive: true,
      },
    })

    if (!membership) {
      res.status(403).json({ error: 'Not authorized to update this farm' })
      return
    }

    const farm = await prisma.farm.update({
      where: { id: req.params.id },
      data,
    })

    res.json({ farm })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors })
      return
    }
    console.error('Error updating farm:', error)
    res.status(500).json({ error: 'Failed to update farm' })
  }
})

// Delete farm
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Only owner can delete
    const membership = await prisma.farmUser.findFirst({
      where: {
        farmId: req.params.id,
        userId: req.user!.userId,
        role: 'OWNER',
        isActive: true,
      },
    })

    if (!membership) {
      res.status(403).json({ error: 'Only owner can delete this farm' })
      return
    }

    await prisma.farm.update({
      where: { id: req.params.id },
      data: { isActive: false },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting farm:', error)
    res.status(500).json({ error: 'Failed to delete farm' })
  }
})

// Add user to farm
router.post('/:id/users', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, role } = req.body

    // Check ownership
    const membership = await prisma.farmUser.findFirst({
      where: {
        farmId: req.params.id,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'MANAGER'] },
        isActive: true,
      },
    })

    if (!membership) {
      res.status(403).json({ error: 'Not authorized to add users' })
      return
    }

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    // Add user to farm
    const farmUser = await prisma.farmUser.upsert({
      where: { userId_farmId: { userId: user.id, farmId: req.params.id } },
      create: { userId: user.id, farmId: req.params.id, role: role || 'VIEWER' },
      update: { role: role || 'VIEWER', isActive: true },
    })

    res.json({ farmUser })
  } catch (error) {
    console.error('Error adding user to farm:', error)
    res.status(500).json({ error: 'Failed to add user' })
  }
})

// Remove user from farm
router.delete('/:id/users/:userId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Check ownership
    const membership = await prisma.farmUser.findFirst({
      where: {
        farmId: req.params.id,
        userId: req.user!.userId,
        role: 'OWNER',
        isActive: true,
      },
    })

    if (!membership) {
      res.status(403).json({ error: 'Not authorized to remove users' })
      return
    }

    await prisma.farmUser.update({
      where: { userId_farmId: { userId: req.params.userId, farmId: req.params.id } },
      data: { isActive: false },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error removing user from farm:', error)
    res.status(500).json({ error: 'Failed to remove user' })
  }
})

export default router