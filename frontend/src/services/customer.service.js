// ============================================================
// WayGo - Servicio de clientes (frontend)
// ============================================================
import api from './api'

export const customerService = {
  async getProfile() {
    const { data } = await api.get('/customers/me')
    return data.customer
  },
}
