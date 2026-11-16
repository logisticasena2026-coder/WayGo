// ============================================================
// WayGo - Servicio de contratos (frontend)
// ============================================================
import api from './api'

export const contractService = {
  async create(payload) { const { data } = await api.post('/contracts', payload); return data.contract },
  async list(params) { const { data } = await api.get('/contracts', { params }); return data.contracts },
  async get(id) { const { data } = await api.get(`/contracts/${id}`); return data.contract },
  async assign(id, driverId) { const { data } = await api.put(`/contracts/${id}/assign`, { driverId }); return data },
  async setStatus(id, status) { const { data } = await api.put(`/contracts/${id}/status`, { status }); return data },
  async generate(id) { const { data } = await api.post(`/contracts/${id}/generate`); return data },
}
