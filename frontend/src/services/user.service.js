// ============================================================
// WayGo - Servicio de usuarios (frontend)
// ============================================================
import api from './api'

export const userService = {
  async getProfile() {
    const { data } = await api.get('/users/me/profile')
    return data.profile
  },

  async updateProfile(payload) {
    const { data } = await api.put('/users/me/profile', payload)
    return data.profile
  },

  async updatePhoto(file) {
    const form = new FormData()
    form.append('photo', file)
    const { data } = await api.post('/users/me/photo', form)
    return data.photoUrl
  },

  async changePassword(currentPassword, newPassword) {
    const { data } = await api.put('/users/me/password', { currentPassword, newPassword })
    return data
  },
}
