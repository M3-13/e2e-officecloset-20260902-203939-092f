import {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from 'react'
import { api, getToken, setToken } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setTokenState] = useState(() => getToken())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      const stored = getToken()
      if (!stored) {
        setTokenState(null)
        setIsLoading(false)
        return
      }

      try {
        const me = await api.get('/auth/me')
        if (!cancelled) {
          setUser(me)
          setTokenState(stored)
        }
      } catch {
        setToken(null)
        setTokenState(null)
        setUser(null)
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadUser()

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password })
    setToken(data.access_token)
    setTokenState(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (email, password) => {
    const data = await api.post('/auth/register', { email, password })
    setToken(data.access_token)
    setTokenState(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Best effort: the server may be unreachable, but the local session
      // must still be cleared so the user ends up logged out.
    } finally {
      setToken(null)
      setTokenState(null)
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, token, isLoading, login, register, logout }),
    [user, token, isLoading, login, register, logout],
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
