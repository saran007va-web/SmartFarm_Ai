import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vaagai_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('vaagai_token')
      localStorage.removeItem('vaagai_user_id')
      window.location.href = '/login'
    }
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 30
      console.log(`Rate limited. Retrying in ${retryAfter} seconds`)
    }
    return Promise.reject(error)
  }
)

export default api