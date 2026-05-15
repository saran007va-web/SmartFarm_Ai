import { Router, Response } from 'express'
import prisma from '../../services/database'
import { authenticate, AuthRequest } from '../auth/auth.middleware'

const router = Router()

// Get list of supported crops for prediction
router.get('/crops/list', async (req, res: Response): Promise<void> => {
  res.json({
    crops: [
      { id: 'paddy', name: 'Paddy/Rice', category: 'cereal' },
      { id: 'wheat', name: 'Wheat', category: 'cereal' },
      { id: 'maize', name: 'Maize', category: 'cereal' },
      { id: 'cotton', name: 'Cotton', category: 'fiber' },
      { id: 'sugarcane', name: 'Sugarcane', category: 'commercial' },
      { id: 'groundnut', name: 'Groundnut', category: 'oilseed' },
      { id: 'soybean', name: 'Soybean', category: 'oilseed' },
      { id: 'mustard', name: 'Mustard', category: 'oilseed' },
      { id: 'potato', name: 'Potato', category: 'vegetable' },
      { id: 'onion', name: 'Onion', category: 'vegetable' },
      { id: 'tomato', name: 'Tomato', category: 'vegetable' },
      { id: 'chilli', name: 'Chilli', category: 'vegetable' },
      { id: 'ginger', name: 'Ginger', category: 'spice' },
      { id: 'turmeric', name: 'Turmeric', category: 'spice' },
      { id: 'blackpepper', name: 'Black Pepper', category: 'spice' },
    ],
  })
})

// Crop prediction endpoint
router.post('/crop', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      soil_type,
      climate,
      season,
      acreage,
      budget,
      market_demand,
    } = req.body

    // Simple rule-based crop recommendation
    const recommendations: Array<{
      crop: string
      confidence: number
      expected_yield: number
      expected_revenue: number
      duration_months: number
      risk_level: string
      reason: string
    }> = []

    // Analyze based on soil type
    if (soil_type?.toLowerCase().includes('clay')) {
      recommendations.push({
        crop: 'Paddy/Rice',
        confidence: 85,
        expected_yield: acreage * 3.5,
        expected_revenue: acreage * 52500,
        duration_months: 6,
        risk_level: 'low',
        reason: 'Clay soil retains water well, ideal for paddy cultivation',
      })
    }

    if (soil_type?.toLowerCase().includes('sandy')) {
      recommendations.push({
        crop: 'Groundnut',
        confidence: 78,
        expected_yield: acreage * 1.8,
        expected_revenue: acreage * 36000,
        duration_months: 5,
        risk_level: 'medium',
        reason: 'Sandy soil is suitable for groundnut with good drainage',
      })
    }

    // Add defaults if no specific match
    if (recommendations.length === 0) {
      recommendations.push(
        {
          crop: 'Maize',
          confidence: 75,
          expected_yield: acreage * 4,
          expected_revenue: acreage * 48000,
          duration_months: 4,
          risk_level: 'low',
          reason: 'Maize adapts well to various soil types',
        },
        {
          crop: 'Vegetables (Tomato/Chilli)',
          confidence: 70,
          expected_yield: acreage * 10,
          expected_revenue: acreage * 100000,
          duration_months: 3,
          risk_level: 'medium',
          reason: 'High-value crops with quick returns',
        }
      )
    }

    // Adjust based on season
    if (season?.toLowerCase() === 'rabi') {
      recommendations.push({
        crop: 'Wheat',
        confidence: 80,
        expected_yield: acreage * 3,
        expected_revenue: acreage * 45000,
        duration_months: 5,
        risk_level: 'low',
        reason: 'Rabi season is ideal for wheat cultivation',
      })
    }

    // Sort by confidence
    recommendations.sort((a, b) => b.confidence - a.confidence)

    res.json({
      recommendations: recommendations.slice(0, 5),
      analysis: {
        soil_type,
        climate,
        season,
        acreage,
      },
    })
  } catch (error) {
    console.error('Crop prediction error:', error)
    res.status(500).json({ error: 'Failed to predict crop' })
  }
})

// Yield prediction endpoint
router.post('/yield', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      crop,
      variety,
      area,
      soil_type,
      irrigation_method,
      fertilizer_used,
      pest_management,
      weather_conditions,
    } = req.body

    // Base yields (kg per hectare)
    const baseYields: Record<string, number> = {
      'paddy': 3500,
      'wheat': 3000,
      'maize': 4000,
      'cotton': 1800,
      'sugarcane': 70000,
      'groundnut': 1800,
      'soybean': 1500,
      'potato': 25000,
      'onion': 20000,
      'tomato': 40000,
    }

    const baseYield = baseYields[crop?.toLowerCase()] || 3000

    // Calculate yield modifiers
    let yieldModifier = 1.0

    // Irrigation method
    if (irrigation_method === 'drip') yieldModifier *= 1.25
    else if (irrigation_method === 'sprinkler') yieldModifier *= 1.15

    // Fertilizer
    if (fertilizer_used === 'organic') yieldModifier *= 1.1
    else if (fertilizer_used === 'both') yieldModifier *= 1.2

    // Pest management
    if (pest_management === 'ipm') yieldModifier *= 1.15

    // Weather adjustment
    if (weather_conditions?.favorable) yieldModifier *= 1.1
    else if (weather_conditions?.unfavorable) yieldModifier *= 0.85

    const areaHa = parseFloat(area) || 1
    const predictedYield = baseYield * areaHa * yieldModifier

    res.json({
      crop,
      variety,
      predicted_yield: Math.round(predictedYield),
      unit: 'kg',
      confidence: 75,
      factors: {
        base_yield: baseYield,
        irrigation_method,
        fertilizer_used,
        pest_management,
        yield_modifier: yieldModifier,
      },
      tips: [
        'Use drip irrigation for 25% yield increase',
        'Apply integrated pest management',
        'Monitor weather forecasts regularly',
      ],
    })
  } catch (error) {
    console.error('Yield prediction error:', error)
    res.status(500).json({ error: 'Failed to predict yield' })
  }
})

export default router