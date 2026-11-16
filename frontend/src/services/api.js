// ============================================================
// WayGo - Cliente HTTP (axios)
// - Adjunta el access token en cada solicitud
// - Renueva automaticamente con la cookie de refresh (rotacion)
//   cuando el backend responde 401
// ============================================================
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // envia la cookie de refresh
})

let accessToken = null
let onSessionExpired = null

export const setAccessToken = (token) => { accessToken = token }
export const getAccessToken = () => accessToken
export const setOnSessionExpired = (fn) => { onSessionExpired = fn }

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

let refreshPromise = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isAuthEndpoint = original?.url?.startsWith('/auth/login') || original?.url?.startsWith('/auth/refresh')
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true
      try {
        // Evita multiples refresh simultaneos
        refreshPromise = refreshPromise || axios.post('/api/auth/refresh', {}, { withCredentials: true })
        const { data } = await refreshPromise
        refreshPromise = null
        setAccessToken(data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch (e) {
        refreshPromise = null
        setAccessToken(null)
        if (onSessionExpired) onSessionExpired()
      }
    }
    return Promise.reject(error)
  }
)

/** Extrae un mensaje legible del error de la API */
export const apiErrorMessage = (error, fallback = 'Ocurrio un error inesperado') =>
  error?.response?.data?.error?.message || fallback

export default api
