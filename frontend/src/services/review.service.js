// ============================================================
// WayGo - Servicio de evaluaciones (frontend)
// ============================================================
import api from './api'

export const reviewService = {
  async create(payload) { const { data } = await api.post('/reviews', payload); return data.review },
  async listMine() { const { data } = await api.get('/reviews/mine'); return data },
  async driverSummary(id) { const { data } = await api.get(`/reviews/driver/${id}/summary`); return data.summary },
}
