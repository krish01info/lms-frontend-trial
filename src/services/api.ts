import axios from 'axios'

// In production: VITE_API_URL=https://your-backend.vercel.app/api/v1
// In local dev:  falls back to /api/v1 (proxied by Vite to localhost:5000)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // needed for httpOnly refresh-token cookie
})

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('learnflow_access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-logout on 401 (expired / invalid token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('learnflow_access_token')
      localStorage.removeItem('learnflow_auth')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
