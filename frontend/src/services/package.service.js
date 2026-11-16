// ============================================================
// WayGo - Servicio de paquetes (frontend)
// ============================================================
import api from './api'

export const packageService = {
  async create(payload) { const { data } = await api.post('/packages', payload); return data },
  async listMine() { const { data } = await api.get('/packages'); return data.packages },
  async listDriver() { const { data } = await api.get('/packages/driver'); return data.packages },
  async get(id) { const { data } = await api.get(`/packages/${id}`); return data.package },
  async track(code) { const { data } = await api.get(`/packages/track/${code}`); return data.package },
  async pickup(id) { const { data } = await api.post(`/packages/${id}/pickup`); return data },
  async inTransit(id) { const { data } = await api.post(`/packages/${id}/in-transit`); return data },
  async incident(id) { const { data } = await api.post(`/packages/${id}/incident`); return data },
  async deliver(id, payload, file) {
    const form = new FormData()
    for (const k of Object.keys(payload)) if (payload[k]) form.append(k, payload[k])
    if (file) form.append('photo', file)
    const { data } = await api.post(`/packages/${id}/deliver`, form)
    return data
  },
}
