// ============================================================
// WayGo - Servicio de conductores (frontend)
// ============================================================
import api from './api'

export const driverService = {
  async getProfile() {
    const { data } = await api.get('/drivers/me')
    return data.driver
  },

  async updateLicense(license) {
    const { data } = await api.put('/drivers/me/license', license)
    return data.driver
  },

  async uploadDocument(type, file, expiresAt) {
    const form = new FormData()
    form.append('type', type)
    form.append('file', file)
    if (expiresAt) form.append('expiresAt', expiresAt)
    const { data } = await api.post('/drivers/me/documents', form)
    return data.document
  },

  async deleteDocument(id) {
    const { data } = await api.delete(`/drivers/me/documents/${id}`)
    return data
  },

  async setStatus(status) {
    const { data } = await api.put('/drivers/me/status', { status })
    return data
  },

  async setLocationConsent(consent) {
    const { data } = await api.put('/drivers/me/location-consent', { consent })
    return data
  },

  async updateLocation(lat, lng) {
    const { data } = await api.put('/drivers/me/location', { lat, lng })
    return data
  },
}
