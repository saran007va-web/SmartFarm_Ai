import prisma from './database'
import marketService from './market'
import redisService from './cache'
import { io } from '../index'
import { Prisma } from '@prisma/client'

interface InsightPayload {
  userId: string
  farmId?: string
  planId?: string
  taskId?: string
  insightType: string
  title: string
  description: string
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  metadata?: Record<string, unknown>
}

interface CropRecommendation {
  cropName: string
  suitability: number
  expectedRevenue: number
  marketDemand: string
  bestSeason: string
  reasons: string[]
}

class AIInsightsService {
  private readonly HIGH_VALUE_CROPS = [
    'tomato', 'onion', 'potato', 'cotton', 'soybean', 'mustard', 'wheat', 'rice'
  ]

  async generateInsight(payload: InsightPayload): Promise<void> {
    const { userId, farmId, planId, taskId, insightType, title, description, severity = 'MEDIUM', metadata } = payload

    const insight = await prisma.aIInsight.create({
      data: {
        userId,
        farmId: farmId || null,
        planId: planId || null,
        taskId: taskId || null,
        insightType,
        title,
        description,
        severity,
        metadata: metadata as Prisma.InputJsonValue || undefined,
      },
    })

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'AI_INSIGHT',
        title: `AI Insight: ${title}`,
        message: description,
        data: { insightId: insight.id } as Prisma.InputJsonValue,
      },
    })

    // Push realtime notification
    if (io) {
      io.to(`user:${userId}`).emit('insight:new', {
        id: insight.id,
        type: insightType,
        title,
        description,
        severity,
        createdAt: insight.createdAt,
      })
    }
  }

  async generateMarketInsights(userId: string, farmId?: string): Promise<void> {
    const farm = farmId
      ? await prisma.farm.findUnique({ where: { id: farmId } })
      : null

    // Get active crop plans
    const cropPlans = await prisma.cropPlan.findMany({
      where: farmId ? { farmId, isActive: true } : { isActive: true },
      take: 5,
    })

    for (const plan of cropPlans) {
      const recommendations = await marketService.getRecommendations(plan.cropName, farm?.location || undefined)

      if (recommendations.length > 0) {
        await this.generateInsight({
          userId,
          planId: plan.id,
          insightType: 'market',
          title: `${plan.cropName} Market Analysis`,
          description: recommendations.join(' '),
          metadata: {
            cropName: plan.cropName,
            recommendations,
          },
        })
      }

      // Revenue projection
      if (plan.areaHa && plan.expectedYield) {
        const projection = await marketService.getRevenueProjection(
          plan.cropName,
          plan.areaHa,
          plan.expectedYield
        )

        await this.generateInsight({
          userId,
          planId: plan.id,
          insightType: 'revenue',
          title: `${plan.cropName} Revenue Projection`,
          description: `Expected revenue: ₹${Math.round(projection.expected).toLocaleString()}/ha. Range: ₹${Math.round(projection.pessimistic).toLocaleString()} - ₹${Math.round(projection.optimistic).toLocaleString()}`,
          metadata: { projection },
        })
      }
    }
  }

  async generateCropInsights(userId: string, farmId: string): Promise<void> {
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: { cropPlans: { where: { isActive: true } } },
    })

    if (!farm) return

    for (const plan of farm.cropPlans) {
      // Check crop phase and generate appropriate insights
      const daysUntilHarvest = plan.endDate
        ? Math.ceil((plan.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null

      if (daysUntilHarvest && daysUntilHarvest > 0 && daysUntilHarvest < 14) {
        await this.generateInsight({
          userId,
          farmId,
          planId: plan.id,
          insightType: 'crop',
          title: `Harvest Ready: ${plan.cropName}`,
          description: `${plan.cropName} will be ready for harvest in ${daysUntilHarvest} days. Consider arranging harvest labor and market contact.`,
          severity: 'HIGH',
          metadata: { daysUntilHarvest, cropPhase: plan.currentPhase },
        })
      }

      // Yield prediction
      if (plan.expectedYield && plan.areaHa) {
        const projection = await marketService.getRevenueProjection(
          plan.cropName,
          plan.areaHa,
          plan.expectedYield
        )

        await this.generateInsight({
          userId,
          farmId,
          planId: plan.id,
          insightType: 'yield',
          title: `${plan.cropName} Yield Prediction`,
          description: `Based on current planning, expected yield: ${plan.expectedYield * plan.areaHa} ${plan.yieldUnit || 'kg'}. Projected revenue: ₹${Math.round(projection.expected).toLocaleString()}`,
          metadata: { expectedYield: plan.expectedYield * plan.areaHa, projection },
        })
      }
    }
  }

  async generateTaskInsights(userId: string, farmId: string): Promise<void> {
    // Get overdue tasks
    const overdueTasks = await prisma.task.findMany({
      where: {
        farmId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lt: new Date() },
      },
      include: { plan: true },
    })

    for (const task of overdueTasks) {
      await this.generateInsight({
        userId,
        farmId,
        taskId: task.id,
        insightType: 'task',
        title: `Overdue Task: ${task.title}`,
        description: `Task "${task.title}" was due on ${task.dueDate?.toLocaleDateString()}. ${task.recoveryAction || 'Please address this task urgently.'}`,
        severity: task.priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        metadata: { taskId: task.id, dueDate: task.dueDate },
      })
    }

    // Get upcoming tasks for next 3 days
    const upcomingTasks = await prisma.task.findMany({
      where: {
        farmId,
        status: 'PENDING',
        scheduledDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 5,
    })

    if (upcomingTasks.length > 0) {
      const taskList = upcomingTasks.map(t => t.title).join(', ')
      await this.generateInsight({
        userId,
        farmId,
        insightType: 'task',
        title: 'Upcoming Tasks',
        description: `You have ${upcomingTasks.length} tasks scheduled in the next 3 days: ${taskList}`,
        severity: 'LOW',
        metadata: { taskCount: upcomingTasks.length },
      })
    }
  }

  async getCropRecommendations(
    soilType?: string,
    season?: string,
    areaHa?: number
  ): Promise<CropRecommendation[]> {
    const cacheKey = `ai:crop-recommendations:${soilType || 'default'}:${season || 'all'}`

    const cached = await redisService.getJSON<CropRecommendation[]>(cacheKey)
    if (cached) return cached

    const recommendations: CropRecommendation[] = []

    for (const crop of this.HIGH_VALUE_CROPS) {
      const prices = await marketService.getPricesByCrop(crop, 5)
      const avgPrice = prices.length > 0
        ? prices.reduce((sum, p) => sum + p.modalPrice, 0) / prices.length
        : 2000

      let suitability = 70

      // Adjust suitability based on soil type
      if (soilType) {
        const soilCrops: Record<string, string[]> = {
          'clay': ['rice', 'wheat', 'sugarcane'],
          'sandy': ['groundnut', 'cotton', 'maize'],
          'loamy': ['rice', 'wheat', 'cotton', 'tomato', 'onion'],
          'black': ['cotton', 'sugarcane', 'soybean'],
          'red': ['groundnut', 'maize', 'ragi'],
        }

        const suitableCrops = soilCrops[soilType.toLowerCase()] || []
        if (suitableCrops.includes(crop)) {
          suitability += 20
        } else {
          suitability -= 10
        }
      }

      recommendations.push({
        cropName: crop,
        suitability: Math.min(100, suitability),
        expectedRevenue: areaHa ? (avgPrice / 10) * areaHa * 5000 : avgPrice * 500,
        marketDemand: avgPrice > 3000 ? 'High' : 'Moderate',
        bestSeason: this.getBestSeason(crop),
        reasons: [
          avgPrice > 2500 ? 'Good market price' : 'Moderate price',
          suitability > 80 ? 'High soil suitability' : 'Moderate soil suitability',
        ],
      })
    }

    // Sort by expected revenue
    recommendations.sort((a, b) => b.expectedRevenue - a.expectedRevenue)

    await redisService.setJSON(cacheKey, recommendations, 86400)
    return recommendations
  }

  private getBestSeason(crop: string): string {
    const seasons: Record<string, string> = {
      rice: 'Kharif (June-Oct)',
      wheat: 'Rabi (Nov-Apr)',
      maize: 'Kharif/Rabi',
      cotton: 'Kharif (June-Oct)',
      sugarcane: 'Annual',
      tomato: 'Rabi (Oct-Mar)',
      onion: 'Rabi (Oct-Feb)',
      potato: 'Rabi (Oct-Mar)',
      soybean: 'Kharif (June-Oct)',
      mustard: 'Rabi (Nov-Mar)',
    }
    return seasons[crop.toLowerCase()] || 'Seasonal'
  }

  async getInsightsSummary(userId: string): Promise<{
    unread: number
    byType: Record<string, number>
    bySeverity: Record<string, number>
    latest: { id: string; title: string; createdAt: Date }[]
  }> {
    const [unreadCount, insights] = await Promise.all([
      prisma.aIInsight.count({
        where: { userId, isRead: false },
      }),
      prisma.aIInsight.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, title: true, createdAt: true, insightType: true, severity: true },
      }),
    ])

    const byType: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}

    for (const insight of insights) {
      byType[insight.insightType] = (byType[insight.insightType] || 0) + 1
      bySeverity[insight.severity] = (bySeverity[insight.severity] || 0) + 1
    }

    return {
      unread: unreadCount,
      byType,
      bySeverity,
      latest: insights,
    }
  }

  async markInsightAsRead(insightId: string, userId: string): Promise<void> {
    await prisma.aIInsight.updateMany({
      where: { id: insightId, userId },
      data: { isRead: true },
    })
  }

  async markAllInsightsAsRead(userId: string): Promise<void> {
    await prisma.aIInsight.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    })
  }

  async actionInsight(insightId: string, userId: string): Promise<void> {
    await prisma.aIInsight.updateMany({
      where: { id: insightId, userId },
      data: { isActioned: true, isRead: true },
    })
  }
}

export const aiInsightsService = new AIInsightsService()
export default aiInsightsService