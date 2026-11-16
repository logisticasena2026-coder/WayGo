// ============================================================
// WayGo - Estadisticas y reportes (por rol) con graficos
// ============================================================
import { useEffect, useState } from 'react'
import { statisticsService } from '../services/statistics.service'
import { apiErrorMessage } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export default function StatsPage() {
  const { user } = useAuth()
  const role = user?.role?.name
  const [data, setData] = useState(null)
  const [packages, setPackages] = useState(null)
  const [msg, setMsg] = useState(null)

  const load = async () => {
    setMsg(null)
    try {
      if (role === 'ADMIN' || role === 'CALL_CENTER') {
        const g = await statisticsService.general()
        const p = await statisticsService.packages()
        setData(g); setPackages(p)
      } else if (role === 'DRIVER') {
        setData({ stats: await statisticsService.driver() })
      } else if (role === 'CUSTOMER') {
        setData({ stats: await statisticsService.customer() })
      }
    } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  useEffect(() => { load() }, [role])

  if (!data) return <div className="wg-loading"><div className="wg-spinner" /></div>

  const isAdmin = role === 'ADMIN' || role === 'CALL_CENTER'
  const chart = data.servicesByMonth || data.stats?.servicesByMonth

  return (
    <div>
      {msg && <div className={`wg-alert wg-alert--${msg.type}`}>{msg.text}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2>Estadisticas y reportes</h2>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <a className="wg-btn wg-btn--outline" href={statisticsService.exportUrl('csv')} target="_blank" rel="noreferrer" download>📊 Excel (CSV)</a>
            <a className="wg-btn wg-btn--outline" href={statisticsService.exportUrl('pdf')} target="_blank" rel="noreferrer" download>📄 PDF</a>
          </div>
        )}
      </div>

      {isAdmin && (
        <>
          <div className="wg-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 16 }}>
            <StatCard label="Clientes" value={data.summary.totalCustomers} />
            <StatCard label="Conductores" value={data.summary.totalDrivers} />
            <StatCard label="Usuarios activos" value={data.summary.activeUsers} />
            <StatCard label="Solicitudes" value={data.summary.totalRequests} />
            <StatCard label="Viajes completados" value={data.summary.completedTrips} />
            <StatCard label="Ingresos (COP)" value={`$${Number(data.summary.totalRevenue).toLocaleString('es-CO')}`} />
            <StatCard label="Cancelados" value={data.summary.cancelledServices} />
            <StatCard label="Promedio calif." value={data.summary.avgDriverRating ? `${data.summary.avgDriverRating} ★` : 'n/a'} />
          </div>
          {packages && (
            <div className="wg-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 16 }}>
              <StatCard label="Paquetes" value={packages.total} />
              <StatCard label="Entregados" value={packages.delivered} />
              <StatCard label="Pendientes" value={packages.pending} />
              <StatCard label="Incidencias" value={packages.incidents} />
              <StatCard label="Entrega prom. (h)" value={packages.avgDeliveryHours} />
            </div>
          )}
        </>
      )}

      {role === 'DRIVER' && (
        <div className="wg-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 16 }}>
          <StatCard label="Viajes" value={data.stats.totalTrips} />
          <StatCard label="Kilometros" value={`${Number(data.stats.totalKm).toLocaleString('es-CO')} km`} />
          <StatCard label="Ingresos" value={`$${Number(data.stats.totalEarnings).toLocaleString('es-CO')}`} />
          <StatCard label="Calificacion" value={data.stats.averageRating ? `${data.stats.averageRating} ★` : 'n/a'} />
          <StatCard label="Cumplimiento" value={`${data.stats.completionRate}%`} />
        </div>
      )}

      {role === 'CUSTOMER' && (
        <div className="wg-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 16 }}>
          <StatCard label="Solicitudes" value={data.stats.totalRequests} />
          <StatCard label="Viajes" value={data.stats.completedTrips} />
          <StatCard label="Kilometros" value={`${Number(data.stats.totalKm).toLocaleString('es-CO')} km`} />
          <StatCard label="Gastos" value={`$${Number(data.stats.totalSpent).toLocaleString('es-CO')}`} />
          <StatCard label="Contratos" value={data.stats.monthlyContracts} />
        </div>
      )}

      {chart && (
        <div className="wg-card">
          <h3 style={{ marginBottom: 12 }}>Servicios por mes</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} name="Servicios" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="wg-card" style={{ padding: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
      <div className="wg-muted" style={{ fontSize: 13 }}>{label}</div>
    </div>
  )
}
