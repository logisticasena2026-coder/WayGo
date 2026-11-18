// ============================================================
// WayGo - Seguimiento en vivo del servicio (cliente)
// Muestra el recorrido origen->destino y la ubicacion del vehiculo
// actualizandose en tiempo real via Socket.IO.
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { assignmentService } from '../../services/assignment.service'
import { apiErrorMessage, getAccessToken } from '../../services/api'
import RouteMap from '../../components/RouteMap'
import { StatusBadge, EmptyState } from '../../components/StatusBadge'

const ASG_STATUS = {
  ASSIGNED: { label: 'Conductor asignado', tone: 'success' },
  DRIVER_EN_ROUTE: { label: 'En camino', tone: 'warning' },
  IN_SERVICE: { label: 'En servicio', tone: 'warning' },
}

export default function ServiceTrackingPage() {
  const [assignment, setAssignment] = useState(null)
  const [driverPos, setDriverPos] = useState(null)
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(true)
  const socketRef = useRef(null)

  const load = () => assignmentService.activeAsCustomer()
    .then((a) => {
      setAssignment(a)
      if (a?.driver?.driverProfile?.lastLat) {
        setDriverPos({ lat: a.driver.driverProfile.lastLat, lng: a.driver.driverProfile.lastLng })
      }
      setLoading(false)
    })
    .catch(() => setLoading(false))

  useEffect(() => { load() }, [])

  // Escucha la ubicacion del conductor en tiempo real
  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    const socket = io({ auth: { token } })
    socketRef.current = socket
    socket.on('driver:location', (p) => {
      if (p.lat && p.lng) setDriverPos({ lat: p.lat, lng: p.lng })
    })
    socket.on('connect_error', () => {})
    return () => socket.disconnect()
  }, [])

  if (loading) return <div className="wg-loading"><div className="wg-spinner" /></div>

  if (!assignment) {
    return (
      <div className="wg-card">
        <EmptyState icon="🗺️" title="No tienes un servicio activo" text="Cuando un conductor sea asignado y este en camino, veras aqui el recorrido en tiempo real." />
      </div>
    )
  }

  const r = assignment.request
  const driver = assignment.driver

  return (
    <div>
      {msg && <div className={`wg-alert wg-alert--${msg.type}`}>{msg.text}</div>}

      <div className="wg-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>Seguimiento del servicio #{r.requestNumber}</h2>
            <div className="wg-muted" style={{ fontSize: 14 }}>
              {r.pickupAddress} → {r.dropoffAddress}
            </div>
          </div>
          <StatusBadge value={assignment.status} map={ASG_STATUS} />
        </div>
        <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="wg-muted" style={{ fontSize: 12 }}>Conductor</div>
            <strong>{driver.profile?.firstName} {driver.profile?.lastName}</strong>
          </div>
          <div>
            <div className="wg-muted" style={{ fontSize: 12 }}>Vehiculo</div>
            <strong>{assignment.vehicle.brand} {assignment.vehicle.model} · {assignment.vehicle.color}</strong>
          </div>
          <div>
            <div className="wg-muted" style={{ fontSize: 12 }}>Placa</div>
            <strong>{assignment.vehicle.plate}</strong>
          </div>
          <div>
            <div className="wg-muted" style={{ fontSize: 12 }}>Precio</div>
            <strong>${Number(assignment.agreedPrice).toLocaleString('es-CO')}</strong>
          </div>
        </div>
      </div>

      <div className="wg-card" style={{ padding: 0, overflow: 'hidden' }}>
        <RouteMap
          pickup={{ lat: r.pickupLat, lng: r.pickupLng, address: r.pickupAddress }}
          dropoff={{ lat: r.dropoffLat, lng: r.dropoffLng, address: r.dropoffAddress }}
          driverPos={driverPos}
          tracking={assignment.tracking || []}
          height={460}
        />
      </div>

      <p className="wg-muted wg-mt" style={{ fontSize: 12 }}>
        🟢 Origen · 🔴 Destino · 🚗 Vehiculo en vivo · línea azul = ruta · línea verde = recorrido ya realizado
      </p>
    </div>
  )
}
