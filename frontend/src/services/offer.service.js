// ============================================================
// WayGo - Servicio de ofertas (frontend, vista conductor)
// ============================================================
import api from './api'

export const offerService = {
  async listMine() {
    const { data } = await api.get('/offers')
    return data.offers
  },

  async withdraw(id) {
    const { data } = await api.delete(`/offers/${id}`)
    return data
  },
}
