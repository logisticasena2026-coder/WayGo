// ============================================================
// WayGo - Inicio del conductor: estado operativo y resumen
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { driverService } from '../../services/driver.service'
import { apiErrorMessage } from '../../services/api'
import { StatusBadge, STATUS_MAP } from '../../components/StatusBadge'

export default function DriverHome() {
  const [driver, setDriver] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [gpsOn, setGpsOn] = useState(false)
  const watchRef = useRef(null)

  const load = () => driverService.getProfile().then((d) => { setDriver(d); setLoading(false) })

  useEffect(() => { load().catch(() => setLoading(false)) }, [])

  useEffect(() => () => stopGps(), [])

  const stopGps = () => {
    if (watchRef.current) { navigator.geolocation.clearWatch(watchRef.current); watchRef.current = null }
    setGpsOn(false)
  }

  const startGps = async () => {
    setMsg(null)
    if (!navigator.geolocation) return setMsg({ type: 'error', text: 'Tu navegador no soporta geolocalizacion' })
    try {
      await driverService.setLocationConsent(true)
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          driverService.updateLocation(pos.coords.latitude, pos.coords.longitude).catch(() => {})
        },
        () => setMsg({ type: 'error', text: 'No se pudo obtener tu ubicacion' }),
        { enableHighAccuracy: true, maximumAge: 3000 }
      )
      setGpsOn(true)
      setMsg({ type: 'success', text: 'Compartiendo ubicacion en vivo' })
    } catch (e) {
      setMsg({ type: 'error', text: apiErrorMessage(e, 'No se pudo activar el GPS') })
    }
  }

  const toggleGps = async () => {
    if (gpsOn) {
      stopGps()
      await driverService.setLocationConsent(false).catch(() => {})
      setMsg({ type: 'info', text: 'Ubicacion en vivo desactivada' })
    } else {
      await startGps()
    }
  }

  const toggleStatus = async () => {
    setBusy(true); setMsg(null)
    const next = driver.operationalStatus === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE'
    try {
      const res = await driverService.setStatus(next)
      setDriver((d) => ({ ...d, operationalStatus: res.operationalStatus }))
      setMsg({ type: 'success', text: next === 'AVAILABLE' ? 'Ahora estas DISPONIBLE' : 'Te has DESCONECTADO' })
      if (next === 'OFFLINE') stopGps()
    } catch (e) {
      setMsg({ type: 'error', text: apiErrorMessage(e, 'No se pudo cambiar el estado') })
    } finally { setBusy(false) }
  }

  if (loading) return <div className="wg-loading"><div className="wg-spinner" /><p>Cargando panel...</p></div>

  const canConnect = driver.verificationStatus === 'APPROVED'
  const status = driver.operationalStatus

  return (
    <div className="wg-grid">
      {msg && <div className={`wg-alert wg-alert--${msg.type}`} style={{ marginBottom: 0 }}>{msg.text}</div>}

      <div className="wg-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h2>Estado operativo</h2>
            <StatusBadge value={status} map={STATUS_MAP} />
          </div>
          <p className="wg-muted" style={{ fontSize: 14 }}>
            {status === 'AVAILABLE' && 'Recibiras solicitudes cercanas en tu panel.'}
            {status === 'OFFLINE' && 'Conectate para comenzar a recibir solicitudes.'}
            {status === 'BUSY' && 'Tienes un servicio en curso.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`wg-btn ${gpsOn ? 'wg-btn--outline' : 'wg-btn--primary'}`}
            disabled={status !== 'AVAILABLE'}
            onClick={toggleGps}
          >
            {gpsOn ? '📡 Dejar de compartir GPS' : '📡 Compartir ubicacion en vivo'}
          </button>
          <button
            type="button"
            className={`wg-btn ${status === 'AVAILABLE' ? 'wg-btn--outline' : 'wg-btn--primary'}`}
            disabled={busy || !canConnect || status === 'BUSY'}
            onClick={toggleStatus}
          >
            {status === 'AVAILABLE' ? 'Desconectarme' : 'Conectarme'}
          </button>
        </div>
      </div>

      {!canConnect && (
        <div className="wg-alert wg-alert--warning">
          {driver.verificationStatus === 'PENDING'
            ? 'Tu cuenta esta pendiente de verificacion documental. Un administrador revisara tus documentos.'
            : 'Tu solicitud de habilitacion fue rechazada. Revisa las observaciones en "Mis documentos" y vuelve a cargar los archivos.'}
        </div>
      )}

      <div className="wg-grid wg-grid--2">
        <div className="wg-card">
          <h3 style={{ marginBottom: 12 }}>Resumen</h3>
          <Stat label="Viajes realizados" value={driver.totalTrips} />
          <Stat label="Kilometros acumulados" value={`${Number(driver.totalKm).toLocaleString('es-CO')} km`} />
          <Stat label="Ingresos acumulados" value={`$ ${Number(driver.totalEarnings).toLocaleString('es-CO')}`} />
          <Stat label="Calificacion promedio" value={driver.averageRating ? `${Number(driver.averageRating).toFixed(2)} ★` : 'Sin evaluaciones'} />
        </div>
        <div className="wg-card">
          <h3 style={{ marginBottom: 12 }}>Mis datos</h3>
          <Stat label="Licencia" value={driver.licenseNumber ? `${driver.licenseNumber} (${driver.licenseCategory})` : 'Sin registrar'} />
          <Stat label="Vence" value={driver.licenseExpiresAt ? new Date(driver.licenseExpiresAt).toLocaleDateString('es-CO') : '-'} />
          <Stat label="Vehiculos registrados" value={driver.vehicles?.length || 0} />
          <Stat label="Consentimiento de ubicacion" value={driver.locationConsent ? 'Autorizado' : 'No autorizado'} />
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--wg-gray-100)' }}>
      <span className="wg-muted" style={{ fontSize: 14 }}>{label}</span>
      <strong style={{ fontSize: 14 }}>{value}</strong>
    </div>
  )
}
