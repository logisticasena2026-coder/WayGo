// ============================================================
// WayGo - Servicio de administracion (frontend)
// ============================================================
import api from './api'

export const adminService = {
  async listDrivers(params = {}) {
    const { data } = await api.get('/admin/drivers', { params })
    return data
  },

  async getDriver(id) {
    const { data } = await api.get(`/admin/drivers/${id}`)
    return data.driver
  },

  async verifyDriver(id, action, notes) {
    const { data } = await api.post(`/admin/drivers/${id}/verify`, { action, notes })
    return data
  },

  async reviewDriverDocument(docId, action, rejectionReason) {
    const { data } = await api.post(`/admin/driver-documents/${docId}/review`, { action, rejectionReason })
    return data
  },

  async reviewVehicleDocument(docId, action, rejectionReason) {
    const { data } = await api.post(`/admin/vehicle-documents/${docId}/review`, { action, rejectionReason })
    return data
  },

  async listUsers(params = {}) {
    const { data } = await api.get('/admin/users', { params })
    return data
  },

  async setUserStatus(id, status) {
    const { data } = await api.put(`/admin/users/${id}/status`, { status })
    return data
  },
}
