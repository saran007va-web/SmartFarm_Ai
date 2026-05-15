import axios from 'axios'

const DEFAULT_API_URL = '/api'

const normalizeApiBaseUrl = (value) => {
  if (!value) return DEFAULT_API_URL

  const trimmed = value.trim().replace(/\/+$/, '')

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
  }

  return trimmed
}

const api = axios.create({
  baseURL: normalizeApiBaseUrl(import.meta.env.VITE_API_URL),
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error?.response?.data?.detail
    if (detail) {
      error.message = detail
    } else if (error?.code === 'ECONNABORTED') {
      error.message = 'Request timed out. Please try again.'
    } else if (!error?.response) {
      error.message = 'Unable to reach the backend. Check the API URL and network connection.'
    }

    return Promise.reject(error)
  }
)

api.interceptors.request.use((config) => {
  if (import.meta.env.DEV) {
    const requestUrl = `${config.baseURL || ''}${config.url || ''}`
    console.log('[API request]', (config.method || 'get').toUpperCase(), requestUrl)
  }
  return config
})

export const getApiBaseUrl = () => api.defaults.baseURL
export const getBackendHealth = () => api.get('/health')

// ============================================
// AUTHENTICATION
// ============================================
export const login = (credentials) => api.post('/auth/login', credentials)
export const register = (userData) => api.post('/auth/register', userData)
export const getMe = () => api.get('/auth/me')
export const updateProfile = (data) => api.put('/auth/profile', data)
export const changePassword = (data) => api.post('/auth/change-password', data)
export const logout = () => api.post('/auth/logout')

// ============================================
// FARMS
// ============================================
export const getFarms = () => api.get('/farms')
export const getFarm = (id) => api.get(`/farms/${id}`)
export const createFarm = (data) => api.post('/farms', data)
export const updateFarm = (id, data) => api.put(`/farms/${id}`, data)
export const deleteFarm = (id) => api.delete(`/farms/${id}`)

export const getFarmProfiles = () => api.get('/farm/profile')
export const createFarmProfile = (data) => api.post('/farm/profile', data)
export const updateFarmProfile = (id, data) => api.put(`/farm/profile/${id}`, data)
export const deleteFarmProfile = (id) => api.delete(`/farm/profile/${id}`)

// ============================================
// CROP PLANNING
// ============================================
export const getCropPlans = (farmId, cropName, dateFrom, dateTo) => {
  const params = new URLSearchParams()
  if (farmId) params.append('farm_id', farmId)
  if (cropName) params.append('crop_name', cropName)
  if (dateFrom) params.append('date_from', dateFrom.toISOString())
  if (dateTo) params.append('date_to', dateTo.toISOString())
  return api.get(`/planning/crop-plans?${params}`)
}

export const createCropPlan = (data, farmId) => {
  let url = `/planning/crop-plans`
  if (farmId) url += `?farm_id=${farmId}`
  return api.post(url, data)
}

export const getCropPlan = (planId) =>
  api.get(`/planning/crop-plans/${planId}`)

export const updateCropPlan = (planId, data) =>
  api.put(`/planning/crop-plans/${planId}`, data)

export const deleteCropPlan = (planId) =>
  api.delete(`/planning/crop-plans/${planId}`)

export const createMaintenanceTask = (planId, data) =>
  api.post(`/planning/crop-plans/${planId}/tasks`, data)

export const getMaintenanceTasks = (planId) =>
  api.get(`/planning/crop-plans/${planId}/tasks`)

export const getTasksByDateRange = (dateFrom, dateTo) => {
  const params = new URLSearchParams()
  params.append('date_from', dateFrom.toISOString())
  params.append('date_to', dateTo.toISOString())
  return api.get(`/planning/tasks/by-date?${params}`)
}

export const getTodaysTasks = () =>
  api.get('/planning/tasks/today')

export const updateMaintenanceTask = (taskId, data) =>
  api.put(`/planning/tasks/${taskId}`, data)

export const deleteMaintenanceTask = (taskId) =>
  api.delete(`/planning/tasks/${taskId}`)

// ============================================
// PREDICTION
// ============================================
export const getCropsList = () => api.get('/predict/crops/list')
export const predictCrop = (data) => api.post('/predict/crop', data)
export const predictYield = (data) => api.post('/predict/yield', data)

// ============================================
// STATS
// ============================================
export const getDashboardStats = () => api.get('/stats')
export const getStatsHistory = () => api.get('/stats/history')
export const getStatsBreakdown = () => api.get('/stats/breakdown')
export const getWeeklyYields = () => api.get('/stats/weekly-yields')

// Backwards compatible aliases
export const getStats = getDashboardStats
export const getRagStats = () => api.get('/rag/stats')
export const getSessions = () => api.get('/chat/sessions')
export const createSession = (name) => api.post('/chat/sessions', { name })
export const deleteSession = (sessionId) => api.delete(`/chat/sessions/${sessionId}`)
export const exportChat = (sessionId, format) => api.get(`/chat/export/${sessionId}?format=${format}`, { responseType: 'blob' })

export const queryDocuments = async (message, language = 'en', deviceId) => {
  const response = await api.post('/chat', {
    message,
    history: [],
    language,
    device_id: deviceId,
  })

  return {
    ...response,
    data: {
      answer: response.data?.reply || response.data?.response || '',
      sources: response.data?.sources || [],
    },
  }
}

export const getDocumentContent = async (docId) => {
  const response = await api.get(`/uploads/${docId}/download`)
  const downloadUrl = response.data?.downloadUrl

  if (!downloadUrl) {
    return { ...response, data: { content: '' } }
  }

  const fileResponse = await fetch(downloadUrl)
  const content = await fileResponse.text()
  return { ...response, data: { content } }
}

// ============================================
// SETTINGS
// ============================================
export const getSettings = () => api.get('/settings')
export const resetRagIndex = () => api.post('/settings/reset-index')
export const clearChatHistory = () => api.post('/settings/clear-history')

// ============================================
// CHAT
// ============================================
export const sendChat = (message, sessionId, history, language, deviceId) =>
  api.post('/chat', { message, session_id: sessionId, history, language, device_id: deviceId })

export const getChatHistory = (sessionId) =>
  api.get(`/chat/history/${sessionId}`)

export const getChatSessions = () => api.get('/chat/sessions')
export const createChatSession = (name) => api.post('/chat/sessions', { name })
export const deleteChatSession = (sessionId) => api.delete(`/chat/sessions/${sessionId}`)
export const renameChatSession = (sessionId, name) => api.patch(`/chat/sessions/${sessionId}`, { name })
export const exportChatHistory = (sessionId, format) => api.get(`/chat/export/${sessionId}?format=${format}`, { responseType: 'blob' })

// ============================================
// MARKET
// ============================================
export const getMarketPrices = () => api.get('/market/prices')
export const getMarketPricesCrop = (crop) => api.get(`/market/prices/${crop}`)
export const getMarketHistory = (crop) => api.get(`/market/history/${crop}`)
export const getMarketTrends = (crop) => api.get(`/market/trends/${crop}`)
export const getMarketRecommendations = (crop) => api.get(`/market/recommendations/${crop}`)
export const getMarketCrops = () => api.get('/market/crops')
export const getMarketStates = () => api.get('/market/states')
export const refreshMarketData = () => api.post('/market/refresh')

// ============================================
// WEATHER
// ============================================
export const getCurrentWeather = (location = 'coimbatore') => api.get(`/weather/current?location=${location}`)
export const getWeatherForecast = (location = 'coimbatore', days = 7) => api.get(`/weather/forecast?location=${location}&days=${days}`)
export const getWeatherLocations = () => api.get('/weather/locations')
export const setFarmLocation = (lat, lon, name = 'My Farm') => api.post(`/weather/farm-location?lat=${lat}&lon=${lon}&name=${name}`)

// ============================================
// IRRIGATION
// ============================================
export const getIrrigationAdvice = (data) => api.post('/irrigation/advice', data)
export const getIrrigationLogs = (params) => api.get('/irrigation/logs', { params })

// ============================================
// ECONOMICS
// ============================================
export const getProfitMargin = (data) => api.post('/economics/margin', data)

// ============================================
// CALENDAR
// ============================================
export const getCalendar = (location, month, year) => api.get('/calendar', { params: { location, month, year } })
export const getCalendarCropsList = () => api.get('/calendar/crops/list')

// ============================================
// YIELD RECORDS
// ============================================
export const getYieldRecords = (farmId) => api.get('/records', { params: farmId ? { farm_id: farmId } : {} })
export const createYieldRecord = (data) => api.post('/records', data)
export const updateYieldRecord = (id, data) => api.put(`/records/${id}`, data)
export const deleteYieldRecord = (id) => api.delete(`/records/${id}`)

// ============================================
// SENSORS
// ============================================
export const getSensorReadings = (params) => api.get('/sensors/readings', { params })
export const getWebhookUrl = () => api.get('/sensors/webhook-url')
export const sendSensorData = (data) => api.post('/sensors/data', data)
export const subscribeToSensors = (data) => api.post('/sensors/subscribe', data)

// ============================================
// UPLOADS
// ============================================
export const uploadDocument = (formData) =>
  api.post('/uploads/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const getDocuments = () => api.get('/uploads')
export const downloadDocument = (docId) => api.get(`/uploads/${docId}/download`, { responseType: 'blob' })
export const deleteDocument = (docId) => api.delete(`/uploads/${docId}`)

// ============================================
// TRANSLATION & LANGUAGE
// ============================================
export const translateText = (data) => api.post('/translate', data)
export const detectLanguage = (data) => api.post('/translate/detect-language', data)
export const getSupportedLanguages = () => api.get('/translate/languages')

// ============================================
// FEEDBACK & LEARNING
// ============================================
export const submitFeedback = (data) => api.post('/feedback', data)
export const submitCorrection = (data) => api.post('/feedback/correction', data)
export const updateUserPreferences = (data) => api.post('/profile/preferences', data)
export const getUserProfile = (deviceId) => api.get(`/profile/${deviceId}`)
export const getLearningStats = (deviceId) => api.get(`/profile/${deviceId}/stats`)
export const getPersonalizedContext = (deviceId) => api.get(`/profile/${deviceId}/context`)
export const addLearnedContext = (deviceId, key, value) => api.post(`/profile/${deviceId}/context?key=${key}&value=${value}`)
export const recordCropOutcome = (data) => api.post('/crop-outcome', data)
export const getCropPatterns = (deviceId) => api.get(`/profile/${deviceId}/crop-patterns`)

// ============================================
// AI INSIGHTS
// ============================================
export const getAISummary = () => api.get('/ai-insights/summary')
export const getAIInsights = () => api.get('/ai-insights')
export const markInsightRead = (id) => api.put(`/ai-insights/${id}/read`)
export const markAllInsightsRead = () => api.put('/ai-insights/read-all')
export const actionInsight = (id) => api.put(`/ai-insights/${id}/action`)
export const getCropRecommendations = () => api.get('/ai-insights/recommendations/crops')
export const generateAIInsights = (data) => api.post('/ai-insights/generate', data)

// ============================================
// NOTIFICATIONS
// ============================================
export const getNotifications = () => api.get('/notifications')
export const getUnreadCount = () => api.get('/notifications/unread-count')
export const markNotificationRead = (id) => api.put(`/notifications/${id}/read`)
export const markAllNotificationsRead = () => api.put('/notifications/read-all')
export const archiveNotification = (id) => api.put(`/notifications/${id}/archive`)
export const deleteNotification = (id) => api.delete(`/notifications/${id}`)

// ============================================
// AUTOSAVE
// ============================================
export const autosaveDraft = (data) => api.post('/autosave', data)
export const getAutosaveDraft = (entityType, entityId) => api.get('/autosave', { params: { entity_type: entityType, entity_id: entityId } })
export const deleteAutosaveDraft = (entityType, entityId) => api.delete('/autosave', { params: { entity_type: entityType, entity_id: entityId } })
export const getAllAutosaveDrafts = () => api.get('/autosave/all')
export const clearAllAutosaveDrafts = () => api.delete('/autosave/all')

export default api