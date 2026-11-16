// ============================================================
// WayGo - Servicio de asignaciones/segimiento (frontend)
// ============================================================
import api from './api'

export const assignmentService = {
  async active() { const { data } = await api.get('/assignments/active'); return data.assignment },
  async activeAsCustomer() { const { data } = await api.get('/assignments/active-as-customer'); return data.assignment },
  async arrive(id) { const { data } = await api.post(`/assignments/${id}/arrive`); return data },
  async start(id) { const { data } = await api.post(`/assignments/${id}/start`); return data },
  async complete(id, actualKm) { const { data } = await api.post(`/assignments/${id}/complete`, { actualKm }); return data },
}
