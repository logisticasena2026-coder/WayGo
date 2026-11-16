// ============================================================
// WayGo - Servicio de autenticacion (frontend)
// ============================================================
import api, { setAccessToken } from './api'

export const authService = {
  async register(payload) {
    const { data } = await api.post('/auth/register', payload)
    return data
  },

  async confirmEmail(token) {
    const { data } = await api.post('/auth/confirm-email', { token })
    return data
  },

  async resendConfirmation(email) {
    const { data } = await api.post('/auth/resend-confirmation', { email })
    return data
  },

  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    setAccessToken(data.accessToken)
    return data.user
  },

  async logout() {
    try {
      await api.post('/auth/logout')
    } finally {
      setAccessToken(null)
    }
  },

  /** Intenta restaurar la sesion con la cookie de refresh */
  async restoreSession() {
    try {
      const { data } = await api.post('/auth/refresh')
      setAccessToken(data.accessToken)
      const me = await api.get('/auth/me')
      return me.data.user
    } catch {
      setAccessToken(null)
      return null
    }
  },

  async me() {
    const { data } = await api.get('/auth/me')
    return data.user
  },

  async forgotPassword(email) {
    const { data } = await api.post('/auth/forgot-password', { email })
    return data
  },

  async resetPassword(token, password) {
    const { data } = await api.post('/auth/reset-password', { token, password })
    return data
  },
}
