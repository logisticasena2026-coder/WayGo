// ============================================================
// WayGo - Contexto de autenticacion
// Mantiene el usuario actual y expone login/logout
// ============================================================
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { authService } from '../services/auth.service'
import { setOnSessionExpired } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true) // restaurando sesion

  useEffect(() => {
    let mounted = true
    setOnSessionExpired(() => () => mounted && setUser(null))
    authService.restoreSession().then((u) => {
      if (mounted) {
        setUser(u)
        setLoading(false)
      }
    })
    return () => { mounted = false }
  }, [])

  const login = useCallback(async (email, password) => {
    const u = await authService.login(email, password)
    const full = await authService.me().catch(() => u)
    setUser(full)
    return full
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, isAuthenticated: !!user }),
    [user, loading, login, logout]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
