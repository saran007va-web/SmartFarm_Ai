import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../auth/auth.middleware'
import prisma from '../../services/database'

const router = Router()

// Get calendar events/tasks
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { location, month, year } = req.query

    // Get tasks from database
    const startDate = new Date(parseInt(year as string) || new Date().getFullYear(),
      parseInt(month as string) || new Date().getMonth(), 1)
    const endDate = new Date(parseInt(year as string) || new Date().getFullYear(),
      parseInt(month as string) || new Date().getMonth() + 1, 0)

    const tasks = await prisma.task.findMany({
      where: {
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 100,
    })

    res.json({
      tasks,
      month: parseInt(month as string) || new Date().getMonth() + 1,
      year: parseInt(year as string) || new Date().getFullYear(),
    })
  } catch (error) {
    console.error('Get calendar error:', error)
    res.status(500).json({ error: 'Failed to get calendar' })
  }
})

// Get list of crops for calendar
router.get('/crops/list', async (req, res: Response): Promise<void> => {
  res.json({
    crops: [
      { id: 'paddy', name: 'Paddy', sowing_month: 6, harvest_month: 11 },
      { id: 'wheat', name: 'Wheat', sowing_month: 11, harvest_month: 4 },
      { id: 'maize', name: 'Maize', sowing_month: 6, harvest_month: 9 },
      { id: 'cotton', name: 'Cotton', sowing_month: 4, harvest_month: 11 },
      { id: 'sugarcane', name: 'Sugarcane', sowing_month: 1, harvest_month: 12 },
      { id: 'groundnut', name: 'Groundnut', sowing_month: 6, harvest_month: 10 },
      { id: 'tomato', name: 'Tomato', sowing_month: 1, harvest_month: 12 },
      { id: 'onion', name: 'Onion', sowing_month: 9, harvest_month: 3 },
    ],
  })
})

export default router