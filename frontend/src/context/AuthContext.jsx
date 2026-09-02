import { createContext, useContext, useState, useMemo } from 'react'
import { getToken, setToken } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setTokenState] = useState(() => getToken())
  const [isLoading, setIsLoading] = useState(false)

  const login = async (email, password) => {
    setIsLoading(true)
    try {
      await Promise.resolve()
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email, password) => {
    setIsLoading(true)
    try {
      await Promise.resolve()
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setToken(null)
    setTokenState(null)
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout }),
    [user, token, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
