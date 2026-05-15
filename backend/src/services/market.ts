import axios from 'axios'
import prisma from './database'
import redisService from './cache'

const AGMARKNET_API = 'https://api.data.gov.in/api/v4'
const DATA_GOV_API = 'https://api.data.gov.in/api/v3'

// Commodity normalization mapping
const COMMODITY_NORMALIZERS: Record<string, string> = {
  'paddy(dhan)(common)': 'Rice',
  'paddy(dhan)(pusa)': 'Rice',
  'paddy': 'Rice',
  'rice(plain)': 'Rice',
  'rice(raw)': 'Rice',
  'maize': 'Corn',
  'makka': 'Corn',
  'tomato(local)': 'Tomato',
  'tomato(hybrid)': 'Tomato',
  'tomato': 'Tomato',
  'onion(local)': 'Onion',
  'onion': 'Onion',
  'potato(local)': 'Potato',
  'potato': 'Potato',
  'wheat(husked)': 'Wheat',
  'wheat': 'Wheat',
  'cotton(kapas)': 'Cotton',
  'cotton': 'Cotton',
  'sugarcane': 'Sugarcane',
  'groundnut': 'Groundnut',
  'groundnut(with shell)': 'Groundnut',
  'copra': 'Coconut',
  'coconut': 'Coconut',
  'banana': 'Banana',
  'jowar(sorghum)': 'Sorghum',
  'bajra': 'Pearl Millet',
  'ragi': 'Finger Millet',
  'horsegram': 'Horse Gram',
  'blackgram(urdbean)': 'Black Gram',
  'greengram(moongbean)': 'Green Gram',
  'redgram(arhar/tur)': 'Pigeon Pea',
  'chickpeas(gram)': 'Chickpeas',
  'soybean': 'Soybean',
  'mustard': 'Mustard',
  'sunflower': 'Sunflower',
  'brinjal': 'Brinjal',
  'okra': 'Okra',
  'cabbage': 'Cabbage',
  'cauliflower': 'Cauliflower',
  'carrot': 'Carrot',
  'spinach': 'Spinach',
  'mango': 'Mango',
  'orange': 'Orange',
  'apple': 'Apple',
  'potato(madras)': 'Potato',
}

interface MarketPrice {
  state: string
  district: string
  market: string
  commodity: string
  variety: string
  min_price: number
  max_price: number
  modal_price: number
  arrival_date: string
}

interface NormalizedPrice {
  cropName: string
  state: string
  district: string
  market: string
  variety: string
  minPrice: number
  maxPrice: number
  modalPrice: number
  arrivalDate: string
}

class MarketService {
  private apiKey: string

  constructor() {
    this.apiKey = process.env.AGMARKNET_API_KEY || ''
  }

  normalizeCropName(rawName: string): string {
    const normalized = COMMODITY_NORMALIZERS[rawName.toLowerCase()]
    return normalized || this.capitalizeWords(rawName)
  }

  private capitalizeWords(str: string): string {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  async fetchAgmarknetPrices(
    commodity?: string,
    state?: string,
    district?: string
  ): Promise<NormalizedPrice[]> {
    if (!this.apiKey) {
      console.warn('AGMARKNET_API_KEY not configured')
      return []
    }

    try {
      const params: Record<string, string> = {
        api_key: this.apiKey,
        format: 'json',
      }

      if (commodity) params.commodity_uri = `commodities/${commodity}`
      if (state) params.state = state
      if (district) params.district = district

      const response = await axios.get(`${AGMARKNET_API}/marketwise/mandi`, {
        params,
        timeout: 10000,
      })

      const records = response.data.records || []
      return records.map((record: any) => ({
        cropName: this.normalizeCropName(record.commodity || record.commodity_name),
        state: record.state || record.state_name,
        district: record.district || record.district_name,
        market: record.market || record.market_name,
        variety: record.variety || 'Standard',
        minPrice: parseFloat(record.min_price || record.min_price_per_quintal || '0'),
        maxPrice: parseFloat(record.max_price || record.max_price_per_quintal || '0'),
        modalPrice: parseFloat(record.modal_price || record.modal_price_per_quintal || '0'),
        arrivalDate: record.arrival_date || record.arrival_date_to,
      }))
    } catch (error) {
      console.error('AGMARKNET API error:', error)
      return []
    }
  }

  async fetchDataGovPrices(commodity?: string): Promise<NormalizedPrice[]> {
    if (!this.apiKey) return []

    try {
      const params: Record<string, string> = {
        api_key: this.apiKey,
        format: 'json',
        page: '1',
        per_page: '100',
      }

      if (commodity) params.filters = JSON.stringify({ commodity })

      const response = await axios.get(`${DATA_GOV_API}/pricesearch/mandi`, {
        params,
        timeout: 10000,
      })

      const records = response.data.records || []
      return records.map((record: any) => ({
        cropName: this.normalizeCropName(record.commodity),
        state: record.state,
        district: record.district,
        market: record.market,
        variety: record.variety || 'Standard',
        minPrice: parseFloat(record.min_price),
        maxPrice: parseFloat(record.max_price),
        modalPrice: parseFloat(record.modal_price),
        arrivalDate: record.arrival_date,
      }))
    } catch (error) {
      console.error('data.gov.in API error:', error)
      return []
    }
  }

  async getPricesByCrop(cropName: string, limit: number = 20): Promise<NormalizedPrice[]> {
    const cacheKey = `market:prices:${cropName.toLowerCase()}`

    const cached = await redisService.getJSON<NormalizedPrice[]>(cacheKey)
    if (cached && cached.length > 0) {
      return cached.slice(0, limit)
    }

    // Try AGMARKNET first
    let prices = await this.fetchAgmarknetPrices(cropName.toLowerCase())

    // Fallback to data.gov.in
    if (prices.length === 0) {
      prices = await this.fetchDataGovPrices(cropName)
    }

    // Use mock data if both fail
    if (prices.length === 0) {
      prices = this.getMockPrices(cropName)
    }

    // Cache for 15 minutes
    if (prices.length > 0) {
      await redisService.setJSON(cacheKey, prices, 900)
    }

    return prices.slice(0, limit)
  }

  async getPricesByState(state: string, limit: number = 50): Promise<NormalizedPrice[]> {
    const cacheKey = `market:prices:state:${state.toLowerCase()}`

    const cached = await redisService.getJSON<NormalizedPrice[]>(cacheKey)
    if (cached && cached.length > 0) {
      return cached.slice(0, limit)
    }

    let prices = await this.fetchAgmarknetPrices(undefined, state)

    if (prices.length === 0) {
      prices = this.getMockPricesByState(state)
    }

    if (prices.length > 0) {
      await redisService.setJSON(cacheKey, prices, 900)
    }

    return prices.slice(0, limit)
  }

  async getAllPrices(): Promise<NormalizedPrice[]> {
    const cacheKey = 'market:prices:all'

    const cached = await redisService.getJSON<NormalizedPrice[]>(cacheKey)
    if (cached && cached.length > 0) {
      return cached
    }

    // Fetch for common crops
    const crops = ['rice', 'wheat', 'tomato', 'onion', 'potato', 'maize', 'cotton', 'sugarcane']
    const results: NormalizedPrice[] = []

    for (const crop of crops) {
      const prices = await this.fetchAgmarknetPrices(crop)
      results.push(...prices)
    }

    // Add mock data if needed
    if (results.length === 0) {
      crops.forEach(crop => {
        results.push(...this.getMockPrices(crop))
      })
    }

    await redisService.setJSON(cacheKey, results, 900)
    return results
  }

  async savePriceHistory(prices: NormalizedPrice[]): Promise<void> {
    if (prices.length === 0) return

    const records = prices.map(price => ({
      cropName: price.cropName,
      marketType: price.market,
      market: price.market,
      pricePerKg: price.modalPrice / 10, // Convert from per quintal to per kg
      recordedAt: new Date(price.arrivalDate || new Date()),
      trend: 'stable',
    }))

    // Bulk insert with upsert
    for (const record of records) {
      try {
        await prisma.marketPriceHistory.create({
          data: {
            ...record,
            farmId: null,
          },
        })
      } catch (error) {
        console.error('Error saving price history:', error)
      }
    }
  }

  async getHistoricalPrices(
    cropName: string,
    days: number = 30
  ): Promise<{ date: Date; price: number }[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const prices = await prisma.marketPriceHistory.findMany({
      where: {
        cropName: { equals: cropName, mode: 'insensitive' },
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'asc' },
      select: { recordedAt: true, pricePerKg: true },
    })

    return prices.map(p => ({ date: p.recordedAt, price: p.pricePerKg }))
  }

  async calculateTrend(cropName: string, days: number = 7): Promise<string> {
    const prices = await this.getHistoricalPrices(cropName, days)

    if (prices.length < 2) return 'stable'

    const firstPrice = prices[0].price
    const lastPrice = prices[prices.length - 1].price
    const change = ((lastPrice - firstPrice) / firstPrice) * 100

    if (change > 5) return 'up'
    if (change < -5) return 'down'
    return 'stable'
  }

  async getRecommendations(cropName: string, farmLocation?: string): Promise<string[]> {
    const recommendations: string[] = []
    const prices = await this.getPricesByCrop(cropName, 10)

    if (prices.length === 0) {
      recommendations.push('Market data currently unavailable. Consider checking local mandi.')
      return recommendations
    }

    // Calculate average price
    const avgPrice = prices.reduce((sum, p) => sum + p.modalPrice, 0) / prices.length

    // Get recent trend
    const trend = await this.calculateTrend(cropName)

    if (trend === 'up') {
      recommendations.push(`Prices trending upward. Consider holding for better rates.`)
    } else if (trend === 'down') {
      recommendations.push(`Prices trending down. Consider selling soon to avoid further loss.`)
    } else {
      recommendations.push(`Prices stable. Current时机 is suitable for sale.`)
    }

    // Find best market
    const sortedByPrice = [...prices].sort((a, b) => b.modalPrice - a.modalPrice)
    if (sortedByPrice.length > 0) {
      const best = sortedByPrice[0]
      recommendations.push(
        `Best price at ${best.market}, ${best.district}: ₹${best.modalPrice}/quintal`
      )
    }

    // Compare with average
    const currentPrice = prices[0]?.modalPrice || 0
    if (currentPrice > avgPrice * 1.1) {
      recommendations.push('Current price is above average - good time to sell!')
    } else if (currentPrice < avgPrice * 0.9) {
      recommendations.push('Current price below average - consider waiting.')
    }

    return recommendations
  }

  async getRevenueProjection(
    cropName: string,
    areaHa: number,
    expectedYieldKgHa: number
  ): Promise<{ optimistic: number; expected: number; pessimistic: number }> {
    const prices = await this.getPricesByCrop(cropName, 20)

    if (prices.length === 0) {
      // Return default projection
      return {
        optimistic: areaHa * expectedYieldKgHa * 25,
        expected: areaHa * expectedYieldKgHa * 20,
        pessimistic: areaHa * expectedYieldKgHa * 15,
      }
    }

    const modalPrices = prices.map(p => p.modalPrice)
    const avgPrice = modalPrices.reduce((a, b) => a + b, 0) / modalPrices.length
    const maxPrice = Math.max(...modalPrices)
    const minPrice = Math.min(...modalPrices)

    const totalYield = areaHa * expectedYieldKgHa

    return {
      optimistic: (maxPrice / 10) * totalYield,
      expected: (avgPrice / 10) * totalYield,
      pessimistic: (minPrice / 10) * totalYield,
    }
  }

  private getMockPrices(crop: string): NormalizedPrice[] {
    const basePrice = {
      rice: 2100, wheat: 2150, maize: 1850, cotton: 6200, sugarcane: 350,
      tomato: 1500, onion: 1200, potato: 1100, brinjal: 1400, okra: 1800,
    }[crop.toLowerCase()] || 2000

    const states = ['Tamil Nadu', 'Karnataka', 'Maharashtra', 'Madhya Pradesh', 'Punjab']
    const districts: Record<string, string[]> = {
      'Tamil Nadu': ['Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Erode'],
      'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum'],
      'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
      'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain'],
      'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda'],
    }

    const result: NormalizedPrice[] = []
    const state = states[Math.floor(Math.random() * states.length)]
    const stateDistricts = districts[state] || ['District1']

    for (const district of stateDistricts.slice(0, 3)) {
      const variation = (Math.random() - 0.5) * 0.3
      const modalPrice = basePrice * (1 + variation)

      result.push({
        cropName: this.normalizeCropName(crop),
        state,
        district,
        market: `${district} Mandi`,
        variety: 'Hybrid',
        minPrice: modalPrice * 0.85,
        maxPrice: modalPrice * 1.15,
        modalPrice: Math.round(modalPrice),
        arrivalDate: new Date().toISOString().split('T')[0],
      })
    }

    return result
  }

  private getMockPricesByState(state: string): NormalizedPrice[] {
    const crops = ['rice', 'wheat', 'tomato', 'onion', 'potato']
    const result: NormalizedPrice[] = []

    for (const crop of crops) {
      result.push(...this.getMockPrices(crop).map(p => ({ ...p, state })))
    }

    return result
  }

  async refreshMarketData(): Promise<void> {
    console.log('Refreshing market data...')

    const crops = [
      'rice', 'wheat', 'maize', 'cotton', 'sugarcane',
      'tomato', 'onion', 'potato', 'brinjal', 'okra',
      'banana', 'mango', 'groundnut', 'soybean', 'mustard',
    ]

    for (const crop of crops) {
      const prices = await this.fetchAgmarknetPrices(crop)
      if (prices.length > 0) {
        await this.savePriceHistory(prices)
      }
      // Rate limit delay
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('Market data refresh complete')
  }
}

export const marketService = new MarketService()
export default marketService