import { Queue, Worker, Job } from 'bullmq'
import IORedis from 'ioredis'
import config from '../config'
import marketService from './market'
import aiInsightsService from './ai-insights'

const hasRedis = Boolean(config.redis.host)
const connection = hasRedis
  ? new IORedis(config.redis.port, config.redis.host, {
      password: config.redis.password,
      maxRetriesPerRequest: null,
    })
  : null

const noopQueue = {
  add: async () => undefined,
  close: async () => undefined,
} as unknown as Queue

export const marketQueue: Queue = hasRedis
  ? new Queue('market-refresh', {
      connection: connection!,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 10,
        removeOnFail: 50,
      },
    })
  : noopQueue

export const insightsQueue: Queue = hasRedis
  ? new Queue('ai-insights', {
      connection: connection!,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 20,
        removeOnFail: 100,
      },
    })
  : noopQueue

export const notificationsQueue: Queue = hasRedis
  ? new Queue('notifications', {
      connection: connection!,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 500 },
        removeOnComplete: 50,
        removeOnFail: 200,
      },
    })
  : noopQueue

export const cleanupQueue: Queue = hasRedis
  ? new Queue('cleanup', {
      connection: connection!,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: true,
      },
    })
  : noopQueue

let marketRefreshWorker: Worker | null = null
let insightsWorker: Worker | null = null
let notificationWorker: Worker | null = null
let cleanupWorker: Worker | null = null

if (hasRedis) {
  marketRefreshWorker = new Worker(
    'market-refresh',
    async (job: Job) => {
      console.log(`Processing market refresh job ${job.id}`)
      await marketService.refreshMarketData()
      return { success: true, timestamp: new Date().toISOString() }
    },
    { connection: connection! }
  )

  marketRefreshWorker.on('completed', (job) => {
    console.log(`Market refresh job ${job.id} completed`)
  })

  marketRefreshWorker.on('failed', (job, err) => {
    console.error(`Market refresh job ${job?.id} failed:`, err.message)
  })

  insightsWorker = new Worker(
    'ai-insights',
    async (job: Job) => {
      const { userId, farmId, type } = job.data
      console.log(`Processing insights job ${job.id} for user ${userId}`)

      if (type === 'market' || !type) {
        await aiInsightsService.generateMarketInsights(userId, farmId)
      }

      if (type === 'crop' && farmId) {
        await aiInsightsService.generateCropInsights(userId, farmId)
      }

      if (type === 'task' && farmId) {
        await aiInsightsService.generateTaskInsights(userId, farmId)
      }

      return { success: true }
    },
    { connection: connection! }
  )

  insightsWorker.on('completed', (job) => {
    console.log(`Insights job ${job.id} completed`)
  })

  insightsWorker.on('failed', (job, err) => {
    console.error(`Insights job ${job?.id} failed:`, err.message)
  })

  notificationWorker = new Worker(
    'notifications',
    async (job: Job) => {
      const { type } = job.data
      console.log(`Processing notification job ${job.id}`)

      switch (type) {
        case 'task_reminder':
          break
        case 'price_alert':
          break
        case 'weather_alert':
          break
        default:
          console.log('Unknown notification type:', type)
      }

      return { success: true }
    },
    { connection: connection! }
  )

  notificationWorker.on('completed', (job) => {
    console.log(`Notification job ${job.id} completed`)
  })

  notificationWorker.on('failed', (job, err) => {
    console.error(`Notification job ${job?.id} failed:`, err.message)
  })

  cleanupWorker = new Worker(
    'cleanup',
    async (job: Job) => {
      const { type } = job.data
      console.log(`Processing cleanup job ${job.id}: ${type}`)

      switch (type) {
        case 'weather_history':
          break
        case 'market_history':
          break
        case 'autosave_drafts':
          break
        default:
          console.log('Unknown cleanup type:', type)
      }

      return { success: true }
    },
    { connection: connection! }
  )

  cleanupWorker.on('completed', (job) => {
    console.log(`Cleanup job ${job.id} completed`)
  })

  cleanupWorker.on('failed', (job, err) => {
    console.error(`Cleanup job ${job?.id} failed:`, err.message)
  })
}

export const queueService = {
  async scheduleMarketRefresh(delayMs: number = 0): Promise<void> {
    await marketQueue.add('refresh', {}, { delay: delayMs })
  },

  async scheduleInsightsGeneration(
    userId: string,
    farmId?: string,
    type?: 'market' | 'crop' | 'task',
    delayMs: number = 0
  ): Promise<void> {
    await insightsQueue.add('generate', { userId, farmId, type }, { delay: delayMs })
  },

  async sendNotification(
    type: string,
    data: Record<string, unknown>,
    delayMs: number = 0
  ): Promise<void> {
    await notificationsQueue.add('send', { type, data }, { delay: delayMs })
  },

  async scheduleCleanup(
    type: string,
    olderThanDays: number = 90,
    delayMs: number = 0
  ): Promise<void> {
    await cleanupQueue.add('cleanup', { type, olderThanDays }, { delay: delayMs })
  },

  async closeQueues(): Promise<void> {
    await Promise.all([
      marketQueue.close(),
      insightsQueue.close(),
      notificationsQueue.close(),
      cleanupQueue.close(),
    ])

    await Promise.all([
      marketRefreshWorker?.close(),
      insightsWorker?.close(),
      notificationWorker?.close(),
      cleanupWorker?.close(),
    ].filter(Boolean) as Promise<void>[])
  },
}

export default queueService
