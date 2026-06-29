import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, UserRole } from '@/types'
import { roleDashboardPaths } from '@/constants/navigation'
import api from '@/services/api'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string, role?: UserRole) => Promise<void>
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>
  logout: () => void
  switchRole: (role: UserRole) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_KEY = 'learnflow_auth'
const TOKEN_KEY = 'learnflow_access_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY)
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem(AUTH_KEY)
        localStorage.removeItem(TOKEN_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string, role: UserRole = 'student') => {
    try {
      const { data } = await api.post('/auth/login', { email, password, role })
      const { user: userData, accessToken } = data
      setUser(userData)
      localStorage.setItem(AUTH_KEY, JSON.stringify(userData))
      localStorage.setItem(TOKEN_KEY, accessToken)
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Login failed. Please check your credentials.')
    }
  }

  const register = async (name: string, email: string, password: string, role: UserRole) => {
    try {
      const { data } = await api.post('/auth/register', { name, email, password, role })
      const { user: userData, accessToken } = data
      setUser(userData)
      localStorage.setItem(AUTH_KEY, JSON.stringify(userData))
      localStorage.setItem(TOKEN_KEY, accessToken)
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || 'Registration failed. Please try again.')
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // ignore errors on logout
    } finally {
      setUser(null)
      localStorage.removeItem(AUTH_KEY)
      localStorage.removeItem(TOKEN_KEY)
    }
  }

  const switchRole = (role: UserRole) => {
    // Role switching only works with mock users; with real backend this is a no-op
    console.warn('switchRole is a dev-only feature. Not supported with real backend.')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function getDashboardPath(role: UserRole) {
  return roleDashboardPaths[role]
}
