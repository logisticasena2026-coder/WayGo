// ============================================================
// WayGo - Servicio de solicitudes (frontend)
// ============================================================
import api from './api'

export const serviceService = {
  async create(payload) {
    const { data } = await api.post('/services', payload)
    return data.request
  },

  async update(id, payload) {
    const { data } = await api.put(`/services/${id}`, payload)
    return data.request
  },

  async publish(id) {
    const { data } = await api.post(`/services/${id}/publish`)
    return data.request
  },

  async withdraw(id, reason) {
    const { data } = await api.post(`/services/${id}/withdraw`, { reason })
    return data
  },

  async listMine(status) {
    const { data } = await api.get('/services/mine', { params: status ? { status } : {} })
    return data.requests
  },

  async get(id) {
    const { data } = await api.get(`/services/${id}`)
    return data.request
  },

  async listAvailable() {
    const { data } = await api.get('/services/available')
    return data.requests
  },

  async createOffer(requestId, payload) {
    const { data } = await api.post(`/services/${requestId}/offers`, payload)
    return data.offer
  },

  async acceptOffer(requestId, offerId) {
    const { data } = await api.post(`/services/${requestId}/offers/${offerId}/accept`)
    return data
  },
}
