import prisma from './database'
import redisService from './cache'
import { io } from '../index'
import { Prisma } from '@prisma/client'

interface AutosavePayload {
  userId: string
  entityType: 'crop_plan' | 'task' | 'farm' | 'yield_record'
  entityId?: string
  data: Record<string, unknown>
  isPartial?: boolean
}

class AutosaveService {
  private readonly DEBOUNCE_MS = 2000
  private readonly MAX_RETRIES = 3

  async saveDraft(payload: AutosavePayload): Promise<void> {
    const { userId, entityType, entityId, data, isPartial = true } = payload

    // Save to Redis for quick access
    const redisKey = `autosave:${userId}:${entityType}:${entityId || 'new'}`
    await redisService.setJSON(redisKey, {
      data,
      isPartial,
      updatedAt: new Date().toISOString(),
    }, 3600)

    // Also save to database for persistence
    await prisma.autosaveDraft.upsert({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType,
          entityId: entityId || '',
        },
      },
      create: {
        userId,
        entityType,
        entityId: entityId || '',
        data: data as Prisma.InputJsonValue,
        isPartial,
      },
      update: {
        data: data as Prisma.InputJsonValue,
        isPartial,
        updatedAt: new Date(),
      },
    })

    // Notify realtime subscribers
    if (io) {
      io.to(`user:${userId}`).emit('autosave:saved', {
        entityType,
        entityId,
        timestamp: new Date().toISOString(),
      })
    }
  }

  async getDraft(
    userId: string,
    entityType: string,
    entityId?: string
  ): Promise<{ data: Record<string, unknown>; isPartial: boolean; updatedAt: string } | null> {
    const redisKey = `autosave:${userId}:${entityType}:${entityId || 'new'}`

    const cached = await redisService.getJSON<{
      data: Record<string, unknown>
      isPartial: boolean
      updatedAt: string
    }>(redisKey)

    if (cached) return cached

    // Fallback to database
    const draft = await prisma.autosaveDraft.findFirst({
      where: {
        userId,
        entityType,
        entityId: entityId || undefined,
      },
    })

    if (!draft) return null

    // Cache in Redis
    await redisService.setJSON(redisKey, {
      data: draft.data as Record<string, unknown>,
      isPartial: draft.isPartial,
      updatedAt: draft.updatedAt.toISOString(),
    }, 3600)

    return {
      data: draft.data as Record<string, unknown>,
      isPartial: draft.isPartial,
      updatedAt: draft.updatedAt.toISOString(),
    }
  }

  async deleteDraft(userId: string, entityType: string, entityId?: string): Promise<void> {
    const redisKey = `autosave:${userId}:${entityType}:${entityId || 'new'}`

    await redisService.del(redisKey)

    await prisma.autosaveDraft.deleteMany({
      where: {
        userId,
        entityType,
        entityId: entityId || undefined,
      },
    })
  }

  async clearAllUserDrafts(userId: string): Promise<void> {
    await redisService.delPattern(`autosave:${userId}:*`)

    await prisma.autosaveDraft.deleteMany({
      where: { userId },
    })
  }

  async recoverOfflineDrafts(userId: string): Promise<Record<string, unknown>> {
    const drafts = await prisma.autosaveDraft.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    })

    const recovered: Record<string, unknown> = {}

    for (const draft of drafts) {
      recovered[`${draft.entityType}:${draft.entityId || 'new'}`] = {
        data: draft.data as Record<string, unknown>,
        isPartial: draft.isPartial,
        updatedAt: draft.updatedAt.toISOString(),
      }
    }

    return recovered
  }

  // Debounced autosave for frontend
  scheduleAutosave(payload: AutosavePayload): () => void {
    let timeoutId: NodeJS.Timeout | null = null

    const executeSave = async () => {
      let retries = 0

      while (retries < this.MAX_RETRIES) {
        try {
          await this.saveDraft(payload)
          return
        } catch (error) {
          retries++
          await new Promise(resolve => setTimeout(resolve, 500 * retries))
        }
      }

      console.error(`Autosave failed after ${this.MAX_RETRIES} retries`)
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      timeoutId = setTimeout(executeSave, this.DEBOUNCE_MS)
    }
  }
}

export const autosaveService = new AutosaveService()
export default autosaveService