// ============================================================
// WayGo - Hook de notificaciones en tiempo real (Socket.IO)
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getAccessToken } from '../services/api'
import { useAuth } from '../context/AuthContext'

/**
 * Conecta el socket con el JWT y expone las notificaciones recibidas.
 * Devuelve { notifications } (las que llegan en vivo durante la sesion).
 */
export function useNotifications() {
  const { isAuthenticated } = useAuth()
  const [live, setLive] = useState([])
  const socketRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated) return

    const token = getAccessToken()
    const socket = io({ auth: { token } })
    socketRef.current = socket

    const onNotif = (payload) => {
      setLive((prev) => [{ ...payload, _id: `${Date.now()}-${Math.random()}` }, ...prev].slice(0, 30))
    }

    // Escucha cualquier evento de notificacion
    const handler = (payload) => onNotif(payload)
    ;[
      'notif:NEW_OFFER', 'notif:COUNTEROFFER', 'notif:OFFER_ACCEPTED',
      'notif:OFFER_WITHDRAWN', 'notif:REQUEST_ASSIGNED', 'notif:REQUEST_CANCELLED',
    ].forEach((evt) => socket.on(evt, handler))
    socket.on('request:new', (payload) => onNotif({ type: 'NEW_REQUEST', title: 'Nueva solicitud disponible', body: `Solicitud #${payload.requestNumber} cerca de ti.`, data: payload }))

    socket.on('connect_error', () => {})

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [isAuthenticated])

  return { notifications: live, socket: socketRef }
}
