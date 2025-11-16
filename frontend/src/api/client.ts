import axios from 'axios'

// Detectar si estamos en producción o desarrollo
const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')
const API_BASE_URL = isProduction 
  ? 'https://innovahack-mobicorp.onrender.com'
  : 'http://localhost:8001'

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Interceptor para agregar token y configurar headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    // Asegurar que el header Authorization siempre se establezca
    config.headers = config.headers || {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  
  // Solo establecer Content-Type si no es FormData (axios lo maneja automáticamente)
  if (!(config.data instanceof FormData)) {
    config.headers = config.headers || {}
    config.headers['Content-Type'] = 'application/json'
  }
  // Para FormData, no establecer Content-Type - axios lo hará automáticamente
  
  return config
})

// Interceptor de respuesta para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token')
      // Solo redirigir si no estamos ya en la página de login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

