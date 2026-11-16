// ============================================================
// WayGo - Servicio de estadisticas y notificaciones (frontend)
// ============================================================
import api from './api'

export const statisticsService = {
  async general() { const { data } = await api.get('/statistics/general'); return data },
  async driver() { const { data } = await api.get('/statistics/driver'); return data.stats },
  async customer() { const { data } = await api.get('/statistics/customer'); return data.stats },
  async packages() { const { data } = await api.get('/statistics/packages'); return data.stats },
  exportUrl(format) { return `/api/statistics/export/general?format=${format}` },
}

export const notificationService = {
  async list() { const { data } = await api.get('/notifications'); return data },
  async readAll() { const { data } = await api.put('/notifications/read-all'); return data },
}
