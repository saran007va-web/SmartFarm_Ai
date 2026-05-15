import { Request, Response, NextFunction } from 'express'
import redisService from '../services/cache'
import config from '../config'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export const rateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const identifier = req.ip || req.socket.remoteAddress || 'unknown'
    const windowMs = config.rateLimit.windowMs
    const maxRequests = config.rateLimit.maxRequests

    const key = `ratelimit:${identifier}`
    const allowed = await redisService.checkRateLimit(key, maxRequests, windowMs / 1000)

    if (!allowed) {
      res.status(429).json({
        error: 'Too many requests',
        message: 'Please try again later',
      })
      return
    }

    // Get remaining requests
    const current = await redisService.get(key)
    const remaining = current ? maxRequests - parseInt(current) : maxRequests - 1
    const resetAt = Date.now() + windowMs

    res.setHeader('X-RateLimit-Limit', maxRequests.toString())
    res.setHeader('X-RateLimit-Remaining', remaining.toString())
    res.setHeader('X-RateLimit-Reset', resetAt.toString())

    next()
  } catch (error) {
    // If Redis fails, allow the request
    console.error('Rate limit error:', error)
    next()
  }
}

export const authRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const identifier = req.ip || req.socket.remoteAddress || 'unknown'
    const key = `ratelimit:auth:${identifier}`

    // Stricter limits for auth endpoints
    const allowed = await redisService.checkRateLimit(key, 10, 900)

    if (!allowed) {
      res.status(429).json({
        error: 'Too many authentication attempts',
        message: 'Please try again in 15 minutes',
      })
      return
    }

    next()
  } catch (error) {
    console.error('Auth rate limit error:', error)
    next()
  }
}

export const marketRateLimiter = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const key = 'ratelimit:market:global'
    const allowed = await redisService.checkRateLimit(key, 60, 60)

    if (!allowed) {
      res.status(429).json({
        error: 'Market API rate limit exceeded',
        message: 'Please try again in 1 minute',
      })
      return
    }

    next()
  } catch (error) {
    console.error('Market rate limit error:', error)
    next()
  }
}