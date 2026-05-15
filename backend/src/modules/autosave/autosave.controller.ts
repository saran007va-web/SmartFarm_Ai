import { Router, Response } from 'express'
import { z } from 'zod'
import autosaveService from '../../services/autosave'
import { authenticate, AuthRequest } from '../auth/auth.middleware'

const router = Router()

const autosaveSchema = z.object({
  entityType: z.enum(['crop_plan', 'task', 'farm', 'yield_record']),
  entityId: z.string().optional(),
  data: z.record(z.unknown()),
  isPartial: z.boolean().optional(),
})

// Save draft
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payload = autosaveSchema.parse(req.body)

    await autosaveService.saveDraft({
      userId: req.user!.userId,
      entityType: payload.entityType,
      entityId: payload.entityId,
      data: payload.data,
      isPartial: payload.isPartial,
    })

    res.json({ success: true, savedAt: new Date().toISOString() })
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors })
      return
    }
    console.error('Autosave error:', error)
    res.status(500).json({ error: 'Failed to save draft' })
  }
})

// Get draft
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.query

    if (!entityType) {
      res.status(400).json({ error: 'entityType is required' })
      return
    }

    const draft = await autosaveService.getDraft(
      req.user!.userId,
      entityType as string,
      entityId as string | undefined
    )

    if (!draft) {
      res.status(404).json({ error: 'Draft not found' })
      return
    }

    res.json(draft)
  } catch (error) {
    console.error('Get draft error:', error)
    res.status(500).json({ error: 'Failed to get draft' })
  }
})

// Delete draft
router.delete('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.query

    if (!entityType) {
      res.status(400).json({ error: 'entityType is required' })
      return
    }

    await autosaveService.deleteDraft(
      req.user!.userId,
      entityType as string,
      entityId as string | undefined
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Delete draft error:', error)
    res.status(500).json({ error: 'Failed to delete draft' })
  }
})

// Get all drafts for user
router.get('/all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const drafts = await autosaveService.recoverOfflineDrafts(req.user!.userId)
    res.json({ drafts })
  } catch (error) {
    console.error('Get all drafts error:', error)
    res.status(500).json({ error: 'Failed to get drafts' })
  }
})

// Clear all drafts
router.delete('/all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await autosaveService.clearAllUserDrafts(req.user!.userId)
    res.json({ success: true })
  } catch (error) {
    console.error('Clear all drafts error:', error)
    res.status(500).json({ error: 'Failed to clear drafts' })
  }
})

export default router