import config from '../config'

const GROQ_API_KEY = config.groqApi.key
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface LLMResponse {
  content: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

class LLMService {
  private model = 'llama-3.3-70b-versatile'

  private farmingContext = `You are SmartFarm AI, an intelligent farming assistant specialized in agriculture, crop management, irrigation, pest control, and market advice for farmers.

Your expertise includes:
- Crop selection and rotation
- Soil health and nutrient management
- Weather-based farming decisions
- Irrigation optimization
- Pest and disease identification
- Market prices and crop economics
- Sustainable farming practices

Always provide helpful, practical advice tailored to the farmer's location, soil type, climate, and available resources. Be concise but informative.`

  async generateResponse(
    userMessage: string,
    history: ChatMessage[] = [],
    language: string = 'en'
  ): Promise<LLMResponse> {
    try {
      const messages: ChatMessage[] = [
        { role: 'system', content: this.farmingContext },
        ...history.slice(-10),
        { role: 'user', content: userMessage },
      ]

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Groq API error:', response.status, errorText)
        // Include the response body in the thrown error for clearer diagnostics
        throw new Error(`Groq API error: ${response.status} ${errorText}`)
      }

      const data = await response.json() as {
        choices?: Array<{ message?: { content?: string } }>
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
      }
      const content = data.choices?.[0]?.message?.content || ''

      return {
        content,
        usage: data.usage,
      }
    } catch (error) {
      console.error('LLM generation error:', error)
      throw error
    }
  }

  async generateCropRecommendation(params: {
    soilType?: string
    climate?: string
    season?: string
    acreage?: number
    budget?: number
    marketDemand?: string
  }): Promise<{
    recommended_crop: string
    confidence: number
    reason: string
    alternatives: Array<{ crop: string; confidence: number }>
  }> {
    const prompt = `Based on the following farm conditions, recommend the best crop to grow:

${params.soilType ? `Soil Type: ${params.soilType}` : ''}
${params.climate ? `Climate: ${params.climate}` : ''}
${params.season ? `Season: ${params.season}` : ''}
${params.acreage ? `Acreage: ${params.acreage} hectares` : ''}
${params.budget ? `Budget: ₹${params.budget}` : ''}
${params.marketDemand ? `Market Demand: ${params.marketDemand}` : ''}

Provide your response in JSON format:
{
  "recommended_crop": "crop name",
  "confidence": "percentage (0-100)",
  "reason": "brief explanation",
  "alternatives": [{"crop": "crop name", "confidence": "percentage"}]
}`

    try {
      const response = await this.generateResponse(prompt, [], 'en')
      const content = response.content

      // Try to parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          recommended_crop: parsed.recommended_crop || 'Maize',
          confidence: parseInt(parsed.confidence) || 75,
          reason: parsed.reason || 'Based on your soil and climate conditions',
          alternatives: parsed.alternatives || [
            { crop: 'Wheat', confidence: 70 },
            { crop: 'Vegetables', confidence: 65 },
          ],
        }
      }

      // Fallback if JSON parsing fails
      return {
        recommended_crop: 'Maize',
        confidence: 75,
        reason: 'Maize adapts well to various soil types and climates',
        alternatives: [
          { crop: 'Wheat', confidence: 70 },
          { crop: 'Vegetables', confidence: 65 },
        ],
      }
    } catch (error) {
      console.error('Crop recommendation error:', error)
      // Return fallback
      return {
        recommended_crop: 'Maize',
        confidence: 75,
        reason: 'Based on your soil and climate conditions',
        alternatives: [
          { crop: 'Wheat', confidence: 70 },
          { crop: 'Vegetables', confidence: 65 },
        ],
      }
    }
  }
}

export const llmService = new LLMService()
export default llmService