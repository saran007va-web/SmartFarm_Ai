import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../../services/database'
import config from '../../config'
import redisService from '../../services/cache'

export interface AuthPayload {
  userId: string
  email: string
  role: string
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

class AuthService {
  // Hash password
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }

  // Verify password
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  // Generate JWT tokens
  generateTokens(user: { id: string; email: string; role: string }): TokenPair {
    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    })

    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
    })

    return { accessToken, refreshToken }
  }

  // Verify JWT token
  verifyToken(token: string): AuthPayload {
    return jwt.verify(token, config.jwt.secret) as AuthPayload
  }

  // Create user session
  async createSession(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    const sessionId = uuidv4()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    // Store in database
    await prisma.userSession.create({
      data: {
        id: sessionId,
        userId,
        token: uuidv4(),
        refreshToken: await this.hashPassword(refreshToken),
        expiresAt,
        ipAddress,
        userAgent,
      },
    })

    // Cache session in Redis
    await redisService.cacheSession(sessionId, { userId, createdAt: new Date() })

    return sessionId
  }

  // Refresh tokens
  async refreshTokens(refreshToken: string): Promise<TokenPair | null> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as { userId: string; type: string }

      if (decoded.type !== 'refresh') return null

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, role: true, isActive: true },
      })

      if (!user || !user.isActive) return null

      return this.generateTokens(user)
    } catch {
      return null
    }
  }

  // Revoke session
  async revokeSession(sessionId: string): Promise<void> {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    })

    await redisService.deleteSession(sessionId)
  }

  // Register user
  async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<{ user: any; tokens: TokenPair }> {
    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new Error('User already exists')
    }

    const passwordHash = await this.hashPassword(password)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: 'OWNER',
      },
    })

    const tokens = this.generateTokens(user)

    // Create initial session
    await this.createSession(user.id, tokens.refreshToken)

    return { user, tokens }
  }

  // Login
  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: any; tokens: TokenPair }> {
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      throw new Error('Invalid credentials')
    }

    const isValid = await this.verifyPassword(password, user.passwordHash)
    if (!isValid) {
      throw new Error('Invalid credentials')
    }

    if (!user.isActive) {
      throw new Error('Account is disabled')
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const tokens = this.generateTokens(user)

    // Create session
    await this.createSession(user.id, tokens.refreshToken, ipAddress, userAgent)

    return { user, tokens }
  }

  // Get user from token
  async getUserFromToken(token: string): Promise<any> {
    const payload = this.verifyToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    })

    return user
  }
}

export const authService = new AuthService()
export default authService