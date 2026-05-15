import { Router, Response } from 'express'

const router = Router()

// Simple language detection based on character ranges
function detectLanguage(text: string): string {
  // Check for Hindi Devanagari script
  if (/[ऀ-ॿ]/.test(text)) return 'hi'

  // Check for Bengali script
  if (/[ঀ-৿]/.test(text)) return 'bn'

  // Check for Tamil script
  if (/[஀-௿]/.test(text)) return 'ta'

  // Check for Telugu script
  if (/[ఀ-౿]/.test(text)) return 'te'

  // Check for Marathi script
  if (/[ऀ-ॿ]/.test(text)) return 'mr'

  // Default to English
  return 'en'
}

// Simple word-based language detection
function detectLanguageByWords(text: string): string {
  const words = text.toLowerCase().split(/\s+/)

  // Common Hindi words
  const hindiWords = ['kisan', 'kheti', 'fasal', 'pani', 'khet', 'bagvan', 'upaj', 'bij']
  // Common Tamil words
  const tamilWords = ['veetu', 'velai', 'pal', 'vari', 'thin', 'ney', 'sathu']
  // Common Telugu words
  const teluguWords = ['pantalu', 'vellu', 'puvvu', 'krushi', 'jeeth']
  // Common Bengali words
  const bengaliWords = ['kishan', 'jomi', 'dhan', 'chashi']
  // Common Marathi words
  const marathiWords = ['shet', 'shetkari', 'piklu', 'bagayat']

  const hindiCount = words.filter(w => hindiWords.includes(w)).length
  const tamilCount = words.filter(w => tamilWords.includes(w)).length
  const teluguCount = words.filter(w => teluguWords.includes(w)).length
  const bengaliCount = words.filter(w => bengaliWords.includes(w)).length
  const marathiCount = words.filter(w => marathiWords.includes(w)).length

  const counts = [
    { lang: 'hi', count: hindiCount },
    { lang: 'ta', count: tamilCount },
    { lang: 'te', count: teluguCount },
    { lang: 'bn', count: bengaliCount },
    { lang: 'mr', count: marathiCount },
  ]

  const maxCount = counts.reduce((a, b) => (a.count > b.count ? a : b))
  return maxCount.count > 0 ? maxCount.lang : detectLanguage(text)
}

// Language detection endpoint
router.post('/detect-language', async (req, res: Response): Promise<void> => {
  try {
    const { text } = req.body

    if (!text) {
      res.status(400).json({ error: 'Text is required' })
      return
    }

    const detectedLang = detectLanguageByWords(text)

    res.json({
      language: detectedLang,
      confidence: 0.85,
    })
  } catch (error) {
    console.error('Detect language error:', error)
    res.status(500).json({ error: 'Failed to detect language' })
  }
})

// Get supported languages
router.get('/languages', async (req, res: Response): Promise<void> => {
  res.json({
    languages: [
      { code: 'en', name: 'English', nativeName: 'English' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
      { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
      { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
      { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
      { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
    ],
  })
})

// Simple translation (placeholder - in production use a proper translation API)
const translations: Record<string, Record<string, string>> = {
  en: {
    hello: 'Hello',
    welcome: 'Welcome to AgriTech',
    dashboard: 'Dashboard',
    farms: 'My Farms',
    crops: 'Crops',
    weather: 'Weather',
    market: 'Market Prices',
  },
  hi: {
    hello: 'नमस्ते',
    welcome: 'एग्रीटेक में आपका स्वागत है',
    dashboard: 'डैशबोर्ड',
    farms: 'मेरे खेत',
    crops: 'फसलें',
    weather: 'मौसम',
    market: 'बाज़ार भाव',
  },
  bn: {
    hello: 'নমস্কার',
    welcome: 'এগ্রিটেকে আপনাকে স্বাগতম',
    dashboard: 'ড্যাশবোর্ড',
    farms: 'আমার খামার',
    crops: 'শস্য',
    weather: 'আবহাওয়া',
    market: 'বাজার দাম',
  },
  ta: {
    hello: 'வணக்கம்',
    welcome: 'அக்ரிடெக்கு வரவேற்கிறோம்',
    dashboard: 'டैशबोर्ड',
    farms: 'என் விளைநிலம்',
    crops: 'பயிர்கள்',
    weather: 'வானிலை',
    market: 'சந்தை விலைகள்',
  },
  te: {
    hello: 'నమస్కారం',
    welcome: 'అగ్రిటెక్‌కు స్వాగతం',
    dashboard: 'डैशबोर्ड',
    farms: 'నా పశు ఫారమ్',
    crops: 'పంటలు',
    weather: 'వాతావరణం',
    market: 'మార్కెట్ ధరలు',
  },
  mr: {
    hello: 'नमस्कार',
    welcome: 'एग्रीटेकमध्ये आपले स्वागत आहे',
    dashboard: 'डॅशबोर्ड',
    farms: 'माझे शेत',
    crops: 'पिके',
    weather: 'हवामान',
    market: 'बाजार भाव',
  },
}

// Translation endpoint
router.post('/', async (req, res: Response): Promise<void> => {
  try {
    const { text, source_language, target_language } = req.body

    if (!text) {
      res.status(400).json({ error: 'Text is required' })
      return
    }

    const sourceLang = source_language || detectLanguageByWords(text)
    const targetLang = target_language || 'en'

    // If same language, return original text
    if (sourceLang === targetLang) {
      res.json({
        original_text: text,
        translated_text: text,
        source_language: sourceLang,
        target_language: targetLang,
      })
      return
    }

    // Check if we have direct translation
    const sourceTranslations = translations[sourceLang]
    const targetTranslations = translations[targetLang]

    // Simple word replacement for known translations
    let translatedText = text
    if (sourceTranslations && targetTranslations) {
      for (const [key, value] of Object.entries(sourceTranslations)) {
        if (targetTranslations[key]) {
          translatedText = translatedText.replace(new RegExp(value, 'gi'), targetTranslations[key])
        }
      }
    }

    res.json({
      original_text: text,
      translated_text: translatedText,
      source_language: sourceLang,
      target_language: targetLang,
    })
  } catch (error) {
    console.error('Translation error:', error)
    res.status(500).json({ error: 'Failed to translate' })
  }
})

export default router