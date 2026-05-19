import { Router, Response } from 'express'
import prisma from '../../services/database'
import { optionalAuth, AuthRequest } from '../auth/auth.middleware'
import llmService from '../../services/llm'

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
router.post('/crop', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      nitrogen, phosphorus, potassium,
      temperature, humidity, ph, rainfall,
      soil_type, climate, season, acreage, budget, market_demand,
    } = req.body

    // Determine soil type from NPK values if not provided directly
    let determinedSoilType = soil_type
    if (!determinedSoilType) {
      if (ph < 6) determinedSoilType = 'Acidic'
      else if (ph > 8) determinedSoilType = 'Alkaline'
      else if (nitrogen > 100 && phosphorus > 80) determinedSoilType = 'Fertile loam'
      else if (nitrogen < 40 && phosphorus < 30) determinedSoilType = 'Sandy'
      else determinedSoilType = 'Loamy'
    }

    // Determine season from temperature and rainfall
    let determinedSeason = season
    if (!determinedSeason) {
      if (rainfall > 150 && humidity > 70) determinedSeason = 'Kharif'
      else if (temperature < 25 && rainfall < 100) determinedSeason = 'Rabi'
      else determinedSeason = 'Zaid'
    }

    // Get LLM-based recommendation
    let llmResult
    try {
      llmResult = await llmService.generateCropRecommendation({
        soilType: determinedSoilType,
        climate: climate || (humidity > 70 ? 'Humid' : 'Dry'),
        season: determinedSeason,
        acreage: acreage || 5,
        budget: budget || 100000,
        marketDemand: market_demand || 'Moderate',
      })
    } catch (llmError) {
      console.warn('LLM recommendation failed, using fallback:', llmError)
    }

    // Build recommendations array
    const recommendations = []

    if (llmResult) {
      recommendations.push({
        crop: llmResult.recommended_crop,
        confidence: llmResult.confidence,
        expected_yield: (llmResult.recommended_crop.toLowerCase().includes('rice') ? 3500 : 4000) * (acreage || 5),
        expected_revenue: 50000 * (acreage || 5),
        duration_months: 4,
        risk_level: 'low',
        reason: llmResult.reason,
      })

      for (const alt of (llmResult.alternatives || []).slice(0, 3)) {
        recommendations.push({
          crop: alt.crop,
          confidence: alt.confidence,
          expected_yield: 3500 * (acreage || 5),
          expected_revenue: 45000 * (acreage || 5),
          duration_months: 4,
          risk_level: 'medium',
          reason: `Alternative crop with ${alt.confidence}% suitability`,
        })
      }
    } else {
      // Fallback recommendations
      if (determinedSoilType.toLowerCase().includes('clay') || determinedSoilType.toLowerCase().includes('fertile')) {
        recommendations.push({
          crop: 'Rice',
          confidence: 85,
          expected_yield: 3500 * (acreage || 5),
          expected_revenue: 52500 * (acreage || 5),
          duration_months: 6,
          risk_level: 'low',
          reason: 'Clay/fertile soil retains water well, ideal for rice cultivation',
        })
      }

      if (determinedSoilType.toLowerCase().includes('sandy') || determinedSoilType.toLowerCase().includes('acid')) {
        recommendations.push({
          crop: 'Groundnut',
          confidence: 78,
          expected_yield: 1800 * (acreage || 5),
          expected_revenue: 36000 * (acreage || 5),
          duration_months: 5,
          risk_level: 'medium',
          reason: 'Sandy/acidic soil is suitable for groundnut with good drainage',
        })
      }

      if (recommendations.length === 0) {
        recommendations.push({
          crop: 'Maize',
          confidence: 75,
          expected_yield: 4000 * (acreage || 5),
          expected_revenue: 48000 * (acreage || 5),
          duration_months: 4,
          risk_level: 'low',
          reason: 'Maize adapts well to various soil types and climates',
        })
      }

      recommendations.push({
        crop: 'Wheat',
        confidence: 72,
        expected_yield: 3000 * (acreage || 5),
        expected_revenue: 45000 * (acreage || 5),
        duration_months: 5,
        risk_level: 'low',
        reason: 'Good for Rabi season with moderate soil conditions',
      })
    }

    // Sort by confidence
    recommendations.sort((a, b) => b.confidence - a.confidence)

    // Return format expected by frontend
    res.json({
      recommended_crop: recommendations[0]?.crop || 'Maize',
      confidence: recommendations[0]?.confidence || 75,
      reason: recommendations[0]?.reason || 'Based on your soil and climate conditions',
      alternatives: recommendations.slice(1, 5).map(r => ({
        crop: r.crop,
        confidence: r.confidence,
      })),
      recommendations: recommendations.slice(0, 5),
      analysis: {
        soil_type: determinedSoilType,
        climate,
        season: determinedSeason,
        acreage: acreage || 5,
        nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall,
      },
    })
  } catch (error) {
    console.error('Crop prediction error:', error)
    res.status(500).json({ error: 'Failed to predict crop' })
  }
})

// Yield prediction endpoint
router.post('/yield', optionalAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      crop_name,
      area_hectares,
      fertilizer_kg,
      pesticide_kg,
      annual_rainfall_mm,
      crop,
      variety,
      area,
      soil_type,
      irrigation_method,
      fertilizer_used,
      pest_management,
      weather_conditions,
    } = req.body

    // Use frontend parameters or fall back to backend parameters
    const cropName = crop_name || crop || 'maize'
    const areaHa = parseFloat(area_hectares) || parseFloat(area) || 5
    const fertilizer = parseFloat(fertilizer_kg) || 0
    const pesticide = parseFloat(pesticide_kg) || 0
    const rainfall = parseFloat(annual_rainfall_mm) || 1500

    // Base yields (kg per hectare)
    const baseYields: Record<string, number> = {
      'rice': 3500,
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
      'chickpea': 1500,
      'kidneybeans': 1200,
      'pigeonpeas': 1200,
      'mungbean': 800,
      'blackgram': 800,
      'lentil': 1200,
      'pomegranate': 15000,
      'banana': 30000,
      'mango': 15000,
      'grapes': 20000,
      'watermelon': 25000,
      'muskmelon': 20000,
      'apple': 15000,
      'orange': 20000,
      'papaya': 40000,
      'coconut': 10000,
      'jute': 2500,
      'coffee': 1500,
    }

    const baseYield = baseYields[cropName?.toLowerCase()] || 3000

    // Calculate yield modifiers
    let yieldModifier = 1.0

    // Fertilizer impact
    if (fertilizer > 500) yieldModifier *= 1.2
    else if (fertilizer > 200) yieldModifier *= 1.1
    else if (fertilizer > 0) yieldModifier *= 1.05

    // Pesticide impact
    if (pesticide > 50) yieldModifier *= 1.15
    else if (pesticide > 10) yieldModifier *= 1.1
    else if (pesticide > 0) yieldModifier *= 1.05

    // Rainfall adjustment
    if (rainfall >= 1000 && rainfall <= 2000) yieldModifier *= 1.1
    else if (rainfall < 500) yieldModifier *= 0.85
    else if (rainfall > 3000) yieldModifier *= 0.9

    const predictedYieldKgPerHa = Math.round(baseYield * yieldModifier)
    const totalProduction = predictedYieldKgPerHa * areaHa

    // Return format expected by frontend
    res.json({
      predicted_yield_kg_per_ha: predictedYieldKgPerHa,
      total_production_kg: totalProduction,
      crop: cropName,
      area_hectares: areaHa,
      confidence: 75,
      note: fertilizer > 0 ? `With ${fertilizer}kg/ha fertilizer application` : 'Optimize fertilizer use for better yield',
      factors: {
        base_yield: baseYield,
        yield_modifier: yieldModifier,
        fertilizer_kg: fertilizer,
        pesticide_kg: pesticide,
        annual_rainfall_mm: rainfall,
      },
      tips: [
        fertilizer > 200 ? 'Good fertilizer usage for optimal yield' : 'Consider increasing fertilizer for better results',
        rainfall < 1000 ? 'Ensure adequate irrigation given low rainfall' : 'Rainfall conditions are favorable',
        'Monitor crop health regularly',
      ],
    })
  } catch (error) {
    console.error('Yield prediction error:', error)
    res.status(500).json({ error: 'Failed to predict yield' })
  }
})

export default router