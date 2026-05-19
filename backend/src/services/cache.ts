import Redis from 'ioredis'
import config from '../config'

class RedisService {
  private client: Redis | null
  private subscriber: Redis | null

  private markRedisUnavailable(reason: unknown): void {
    const nodeErr = reason as NodeJS.ErrnoException & { errors?: Array<{ code?: string }> }
    const isConnectionRefused =
      nodeErr?.code === 'ECONNREFUSED' ||
      nodeErr?.message?.includes('ECONNREFUSED') ||
      nodeErr?.errors?.some((error) => error.code === 'ECONNREFUSED') ||
      false

    if (isConnectionRefused) {
      console.warn('Redis not available, continuing without cache')
      this.client = null
      this.subscriber = null
    } else {
      console.error('Redis Client Error:', reason)
    }
  }

  constructor() {
    if (!config.redis.host) {
      this.client = null
      this.subscriber = null
      console.log('Redis not configured, running without cache')
      return
    }

    try {
      const redisOptions = {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db,
        retryStrategy: (times: number) => {
          if (times > 3) return null // Stop retrying after 3 attempts
          const delay = Math.min(times * 50, 2000)
          return delay
        },
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: true,
      }

      this.client = new Redis(redisOptions)
      this.subscriber = new Redis(redisOptions)

      this.client.on('error', (err) => {
        this.markRedisUnavailable(err)
      })

      this.subscriber.on('error', (err) => {
        this.markRedisUnavailable(err)
      })

      this.client.on('connect', () => {
        console.log('Redis connected successfully')
      })

      this.subscriber.on('connect', () => {
        console.log('Redis subscriber connected successfully')
      })

      // Try to connect once
      this.client.connect().catch(() => {
        this.client = null
        this.subscriber = null
      })

      this.subscriber.connect().catch(() => {
        this.client = null
        this.subscriber = null
      })
    } catch (err) {
      console.warn('Failed to initialize Redis, running without cache')
      this.client = null
      this.subscriber = null
    }
  }

  // Generic cache operations
  async get(key: string): Promise<string | null> {
    if (!this.client) return null
    return this.client.get(key)
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.client) return
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value)
    } else {
      await this.client.set(key, value)
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return
    await this.client.del(key)
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.client) return
    const keys = await this.client.keys(pattern)
    if (keys.length > 0) {
      await this.client.del(...keys)
    }
  }

  // JSON cache operations
  async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key)
    return value ? JSON.parse(value) : null
  }

  async setJSON<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds)
  }

  // Weather cache (1 hour TTL)
  async cacheWeather(location: string, data: unknown): Promise<void> {
    await this.setJSON(`weather:${location}`, data, 3600)
  }

  async getCachedWeather(location: string): Promise<unknown | null> {
    return this.getJSON(`weather:${location}`)
  }

  // Market price cache (15 min TTL)
  async cacheMarketPrices(data: unknown): Promise<void> {
    await this.setJSON('market:prices', data, 900)
  }

  async getCachedMarketPrices(): Promise<unknown | null> {
    return this.getJSON('market:prices')
  }

  // Session cache
  async cacheSession(sessionId: string, data: unknown, ttlSeconds: number = 86400): Promise<void> {
    await this.setJSON(`session:${sessionId}`, data, ttlSeconds)
  }

  async getCachedSession(sessionId: string): Promise<unknown | null> {
    return this.getJSON(`session:${sessionId}`)
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`)
  }

  // Rate limiting
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
    if (!this.client) return true
    const current = await this.client.incr(key)
    if (current === 1) {
      await this.client.expire(key, windowSeconds)
    }
    return current <= limit
  }

  // Pub/Sub for realtime
  async publish(channel: string, message: unknown): Promise<void> {
    if (!this.client) return
    await this.client.publish(channel, JSON.stringify(message))
  }

  subscribe(channel: string, callback: (message: string) => void): void {
    if (!this.subscriber) return
    this.subscriber.subscribe(channel)
    this.subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        callback(message)
      }
    })
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    if (!this.client) return false
    try {
      const result = await this.client.ping()
      return result === 'PONG'
    } catch {
      return false
    }
  }

  // Close connections
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit()
    }
    if (this.subscriber) {
      await this.subscriber.quit()
    }
  }
}

export const redisService = new RedisService()
export default redisService