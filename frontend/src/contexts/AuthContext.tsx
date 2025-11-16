import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

// Detectar si estamos en producción o desarrollo
const isProduction = window.location.hostname !== 'localhost' && !window.location.hostname.includes('127.0.0.1')
const API_BASE_URL = isProduction 
  ? 'https://innovahack-mobicorp.onrender.com'
  : 'http://localhost:8001'

interface User {
  id: number
  email: string
  full_name: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, full_name: string, role?: string) => Promise<void>
  logout: () => void
  token: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
      fetchUser(storedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async (authToken: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      if (response.data) {
        setUser(response.data)
      }
    } catch (error) {
      console.error('Error al obtener usuario:', error)
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const formData = new FormData()
      formData.append('username', email)
      formData.append('password', password)

      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      const { access_token } = response.data

      if (!access_token) {
        throw new Error('No se recibió el token de acceso')
      }

      localStorage.setItem('token', access_token)
      setToken(access_token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      await fetchUser(access_token)
    } catch (error: any) {
      console.error('Error en login:', error)
      if (error.response) {
        throw new Error(error.response.data?.detail || 'Error al iniciar sesión')
      } else if (error.request) {
        throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.')
      } else {
        throw new Error(error.message || 'Error al iniciar sesión')
      }
    }
  }

  const register = async (email: string, password: string, full_name: string, role: string = 'sales') => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        email,
        password,
        full_name,
        role
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.data) {
        throw new Error('No se recibió respuesta del servidor')
      }
      
      // Después de registrar, iniciar sesión automáticamente
      await login(email, password)
    } catch (error: any) {
      console.error('Error en register:', error)
      if (error.response) {
        throw new Error(error.response.data?.detail || 'Error al registrar usuario')
      } else if (error.request) {
        throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté corriendo.')
      } else {
        throw new Error(error.message || 'Error al registrar usuario')
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

