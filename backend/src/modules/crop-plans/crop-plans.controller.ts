import { Router, Response } from 'express'
import { z } from 'zod'
import prisma from '../../services/database'
import { authenticate, AuthRequest } from '../auth/auth.middleware'
import redisService from '../../services/cache'

const router = Router()

// Validation schemas
const createCropPlanSchema = z.object({
  farmId: z.string(),
  cropName: z.string().min(1),
  variety: z.string().optional(),
  areaHa: z.number().optional(),
  expectedYield: z.number().optional(),
  yieldUnit: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  notes: z.string().optional(),
})

const createTaskSchema = z.object({
  planId: z.string(),
  taskType: z.enum(['WATERING', 'FERTILIZER', 'PESTICIDE', 'WEEDING', 'PRUNING', 'HARVESTING', 'OTHER']),
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledDate: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
})

// CROP PLANS

// Get all crop plans
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { farmId, cropName, dateFrom, dateTo } = req.query

    const where: any = {
      farm: {
        users: { some: { userId: req.user!.userId, isActive: true } },
      },
      isActive: true,
    }

    if (farmId) where.farmId = farmId
    if (cropName) where.cropName = { contains: cropName as string, mode: 'insensitive' }
    if (dateFrom || dateTo) {
      where.startDate = {}
      if (dateFrom) where.startDate.gte = new Date(dateFrom as string)
      if (dateTo) where.endDate = { lte: new Date(dateTo as string) }
    }

    const plans = await prisma.cropPlan.findMany({
      where,
      include: {
        farm: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { startDate: 'asc' },
    })

    res.json({ plans })
  } catch (error) {
    console.error('Error fetching crop plans:', error)
    res.status(500).json({ error: 'Failed to fetch crop plans' })
  }
})

// Get single crop plan with tasks
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const plan = await prisma.cropPlan.findFirst({
      where: {
        id: req.params.id,
        farm: { users: { some: { userId: req.user!.userId, isActive: true } } },
      },
      include: {
        farm: { select: { id: true, name: true } },
        tasks: { orderBy: { scheduledDate: 'asc' } },
      },
    })

    if (!plan) {
      res.status(404).json({ error: 'Crop plan not found' })
      return
    }

    res.json({ plan })
  } catch (error) {
    console.error('Error fetching crop plan:', error)
    res.status(500).json({ error: 'Failed to fetch crop plan' })
  }
})

// Create crop plan with auto-generated tasks
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createCropPlanSchema.parse(req.body)
    const { generateTasks = true } = req.body

    // Verify farm access
    const farmAccess = await prisma.farmUser.findFirst({
      where: { farmId: data.farmId, userId: req.user!.userId, role: { in: ['OWNER', 'MANAGER'] }, isActive: true },
    })

    if (!farmAccess) {
      res.status(403).json({ error: 'Not authorized to create crop plans for this farm' })
      return
    }

    const plan = await prisma.cropPlan.create({
      data: {
        farmId: data.farmId,
        cropName: data.cropName,
        variety: data.variety,
        areaHa: data.areaHa,
        expectedYield: data.expectedYield,
        yieldUnit: data.yieldUnit,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        notes: data.notes,
      },
    })

    // Clear autosave draft if exists
    await prisma.autosaveDraft.deleteMany({
      where: { userId: req.user!.userId, entityType: 'cropPlan', entityId: plan.id },
    })

    res.status(201).json({ plan })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors })
      return
    }
    console.error('Error creating crop plan:', error)
    res.status(500).json({ error: 'Failed to create crop plan' })
  }
})

// Update crop plan
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createCropPlanSchema.partial().parse(req.body)

    const plan = await prisma.cropPlan.findFirst({
      where: {
        id: req.params.id,
        farm: { users: { some: { userId: req.user!.userId, role: { in: ['OWNER', 'MANAGER'] }, isActive: true } } },
      },
    })

    if (!plan) {
      res.status(403).json({ error: 'Not authorized to update this crop plan' })
      return
    }

    const updated = await prisma.cropPlan.update({
      where: { id: req.params.id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    })

    res.json({ plan: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors })
      return
    }
    console.error('Error updating crop plan:', error)
    res.status(500).json({ error: 'Failed to update crop plan' })
  }
})

// Delete crop plan
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const plan = await prisma.cropPlan.findFirst({
      where: {
        id: req.params.id,
        farm: { users: { some: { userId: req.user!.userId, role: { in: ['OWNER', 'MANAGER'] }, isActive: true } } },
      },
    })

    if (!plan) {
      res.status(403).json({ error: 'Not authorized to delete this crop plan' })
      return
    }

    await prisma.cropPlan.update({
      where: { id: req.params.id },
      data: { isActive: false },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting crop plan:', error)
    res.status(500).json({ error: 'Failed to delete crop plan' })
  }
})

// TASKS

// Get tasks by date range
router.get('/tasks/by-date', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo } = req.query

    const tasks = await prisma.task.findMany({
      where: {
        farm: { users: { some: { userId: req.user!.userId, isActive: true } } },
        scheduledDate: {
          gte: new Date(dateFrom as string),
          lte: new Date(dateTo as string),
        },
      },
      include: {
        plan: { select: { cropName: true } },
        farm: { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    })

    res.json({ tasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

// Get today's tasks
router.get('/tasks/today', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const tasks = await prisma.task.findMany({
      where: {
        farm: { users: { some: { userId: req.user!.userId, isActive: true } } },
        scheduledDate: { gte: today, lt: tomorrow },
      },
      include: {
        plan: { select: { cropName: true } },
        farm: { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: 'asc' },
    })

    res.json({ tasks })
  } catch (error) {
    console.error('Error fetching today\'s tasks:', error)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

// Get tasks for plan
router.get('/:id/tasks', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tasks = await prisma.task.findMany({
      where: { planId: req.params.id },
      orderBy: { scheduledDate: 'asc' },
    })

    res.json({ tasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

// Create task
router.post('/tasks', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createTaskSchema.parse(req.body)

    const task = await prisma.task.create({
      data: {
        planId: data.planId,
        farmId: (await prisma.cropPlan.findUnique({ where: { id: data.planId } }))?.farmId || '',
        taskType: data.taskType,
        title: data.title,
        description: data.description,
        scheduledDate: new Date(data.scheduledDate),
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        priority: data.priority || 'MEDIUM',
        quantity: data.quantity,
        unit: data.unit,
        isAutoGenerated: false,
      },
    })

    res.status(201).json({ task })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors })
      return
    }
    console.error('Error creating task:', error)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// Update task
router.put('/tasks/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = createTaskSchema.partial().parse(req.body)

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
    })

    // If marked completed, record completion time
    if (req.body.status === 'COMPLETED') {
      await prisma.task.update({
        where: { id: req.params.id },
        data: { completedAt: new Date() },
      })
    }

    res.json({ task })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors })
      return
    }
    console.error('Error updating task:', error)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

// Delete task
router.delete('/tasks/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

// AUTOSAVE ENDPOINTS

// Save draft (autosave)
router.post('/autosave', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, data, isPartial = true } = req.body

    const draft = await prisma.autosaveDraft.upsert({
      where: {
        userId_entityType_entityId: {
          userId: req.user!.userId,
          entityType,
          entityId,
        },
      },
      create: {
        userId: req.user!.userId,
        entityType,
        entityId,
        data,
        isPartial,
      },
      update: {
        data,
        isPartial,
      },
    })

    // Also cache in Redis for faster access
    await redisService.setJSON(`autosave:${req.user!.userId}:${entityType}:${entityId}`, data, 300)

    res.json({ success: true, draft })
  } catch (error) {
    console.error('Error saving draft:', error)
    res.status(500).json({ error: 'Failed to save draft' })
  }
})

// Load draft
router.get('/autosave/:entityType/:entityId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.params

    // Try Redis first
    const cached = await redisService.getJSON(`autosave:${req.user!.userId}:${entityType}:${entityId}`)
    if (cached) {
      res.json({ data: cached, source: 'cache' })
      return
    }

    const draft = await prisma.autosaveDraft.findUnique({
      where: {
        userId_entityType_entityId: {
          userId: req.user!.userId,
          entityType,
          entityId,
        },
      },
    })

    if (!draft) {
      res.json({ data: null })
      return
    }

    res.json({ data: draft.data, isPartial: draft.isPartial })
  } catch (error) {
    console.error('Error loading draft:', error)
    res.status(500).json({ error: 'Failed to load draft' })
  }
})

// Clear draft
router.delete('/autosave/:entityType/:entityId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.params

    await prisma.autosaveDraft.deleteMany({
      where: { userId: req.user!.userId, entityType, entityId },
    })

    await redisService.del(`autosave:${req.user!.userId}:${entityType}:${entityId}`)

    res.json({ success: true })
  } catch (error) {
    console.error('Error clearing draft:', error)
    res.status(500).json({ error: 'Failed to clear draft' })
  }
})

export default router