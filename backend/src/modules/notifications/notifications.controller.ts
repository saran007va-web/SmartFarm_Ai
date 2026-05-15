import { Router, Response } from 'express'
import prisma from '../../services/database'
import { authenticate, AuthRequest } from '../auth/auth.middleware'
import { io } from '../../index'

const router = Router()

// Get all notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { unread, type, limit = 20, offset = 0 } = req.query

    const where: Record<string, unknown> = { userId: req.user!.userId, isArchived: false }
    if (unread === 'true') where.isRead = false
    if (type) where.type = type

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        task: { select: { id: true, title: true } },
      },
    })

    const total = await prisma.notification.count({ where })
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.userId, isRead: false, isArchived: false },
    })

    res.json({
      notifications,
      total,
      unread: unreadCount,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    res.status(500).json({ error: 'Failed to fetch notifications' })
  }
})

// Get unread count
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.userId, isRead: false, isArchived: false },
    })

    res.json({ count })
  } catch (error) {
    console.error('Unread count error:', error)
    res.status(500).json({ error: 'Failed to get unread count' })
  }
})

// Mark notification as read
router.put('/:id/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { isRead: true, readAt: new Date() },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Mark read error:', error)
    res.status(500).json({ error: 'Failed to mark notification as read' })
  }
})

// Mark all as read
router.put('/read-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Mark all read error:', error)
    res.status(500).json({ error: 'Failed to mark all as read' })
  }
})

// Archive notification
router.put('/:id/archive', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { isArchived: true },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Archive error:', error)
    res.status(500).json({ error: 'Failed to archive notification' })
  }
})

// Delete notification
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId },
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    res.status(500).json({ error: 'Failed to delete notification' })
  }
})

// Create notification (internal use)
router.post('/', async (req, res: Response): Promise<void> => {
  try {
    const { userId, type, title, message, data, taskId } = req.body

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type || 'SYSTEM',
        title,
        message,
        data,
        taskId,
      },
    })

    // Push realtime notification
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notification)
    }

    res.status(201).json(notification)
  } catch (error) {
    console.error('Create notification error:', error)
    res.status(500).json({ error: 'Failed to create notification' })
  }
})

export default router