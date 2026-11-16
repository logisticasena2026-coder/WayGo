// ============================================================
// WayGo - Servicio de vehiculos (frontend)
// ============================================================
import api from './api'

export const vehicleService = {
  async list() {
    const { data } = await api.get('/vehicles')
    return data.vehicles
  },

  async create(payload) {
    const { data } = await api.post('/vehicles', payload)
    return data.vehicle
  },

  async update(id, payload) {
    const { data } = await api.put(`/vehicles/${id}`, payload)
    return data.vehicle
  },

  async deactivate(id) {
    const { data } = await api.delete(`/vehicles/${id}`)
    return data
  },

  async setPrimary(id) {
    const { data } = await api.put(`/vehicles/${id}/primary`)
    return data.vehicle
  },

  async updatePhoto(id, file) {
    const form = new FormData()
    form.append('photo', file)
    const { data } = await api.post(`/vehicles/${id}/photo`, form)
    return data.photoUrl
  },

  async uploadDocument(id, type, file, expiresAt) {
    const form = new FormData()
    form.append('type', type)
    form.append('file', file)
    if (expiresAt) form.append('expiresAt', expiresAt)
    const { data } = await api.post(`/vehicles/${id}/documents`, form)
    return data.document
  },

  async deleteDocument(id, docId) {
    const { data } = await api.delete(`/vehicles/${id}/documents/${docId}`)
    return data
  },
}
