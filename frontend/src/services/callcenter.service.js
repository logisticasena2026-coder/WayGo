// ============================================================
// WayGo - Servicio de call center (frontend)
// ============================================================
import api from './api'

export const callCenterService = {
  async dashboard() { const { data } = await api.get('/call-center/dashboard'); return data },
  async map() { const { data } = await api.get('/call-center/map'); return data },
  async driverDetail(id) { const { data } = await api.get(`/call-center/drivers/${id}`); return data.driver },
  async requestDetail(id) { const { data } = await api.get(`/call-center/requests/${id}`); return data.request },
  async assign(requestId, driverId, price) { const { data } = await api.post('/call-center/assign', { requestId, driverId, price }); return data },
  async cancelRequest(id, reason) { const { data } = await api.post(`/call-center/requests/${id}/cancel`, { reason }); return data },
  async listTickets(params) { const { data } = await api.get('/call-center/tickets', { params }); return data },
  async updateTicket(id, payload) { const { data } = await api.put(`/call-center/tickets/${id}`, payload); return data },
  async createTicket(payload) { const { data } = await api.post('/call-center/tickets', payload); return data },
}
