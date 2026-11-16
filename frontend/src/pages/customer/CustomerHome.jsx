// ============================================================
// WayGo - Inicio del cliente
// ============================================================
import { useEffect, useState } from 'react'
import { customerService } from '../../services/customer.service'
import { useAuth } from '../../context/AuthContext'

export default function CustomerHome() {
  const { user } = useAuth()
  const [customer, setCustomer] = useState(null)

  useEffect(() => { customerService.getProfile().then(setCustomer).catch(() => {}) }, [])

  return (
    <div>
      <div className="wg-card" style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 8 }}>Hola, {user?.profile?.firstName} 👋</h2>
        <p className="wg-muted">Solicita un servicio de transporte o paquete, propone tu precio y elige la mejor oferta.</p>
        <button className="wg-btn wg-btn--primary wg-mt" disabled title="Disponible en FASE 3">
          🚗 Solicitar un servicio
        </button>
      </div>

      <div className="wg-grid wg-grid--2">
        <div className="wg-card">
          <h3 style={{ marginBottom: 12 }}>Mis acumulados</h3>
          <Stat label="Viajes realizados" value={customer?.totalTrips || 0} />
          <Stat label="Kilometros recorridos" value={`${Number(customer?.totalKm || 0).toLocaleString('es-CO')} km`} />
          <Stat label="Gastos acumulados" value={`$ ${Number(customer?.totalSpent || 0).toLocaleString('es-CO')}`} />
        </div>
        <div className="wg-card">
          <h3 style={{ marginBottom: 12 }}>Accesos rapidos</h3>
          <p className="wg-muted" style={{ fontSize: 14 }}>
            Los modulos de solicitud de servicios, ofertas, seguimiento, paquetes y contratos
            se habilitan en las fases siguientes.
          </p>
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
