// ============================================================
// WayGo - Administracion: listado de usuarios
// ============================================================
import { useEffect, useState } from 'react'
import { adminService } from '../../services/admin.service'
import { apiErrorMessage } from '../../services/api'
import { StatusBadge, STATUS_MAP, EmptyState } from '../../components/StatusBadge'

const ROLE_LABEL = { ADMIN: 'Administrador', CUSTOMER: 'Cliente', DRIVER: 'Conductor', CALL_CENTER: 'Call Center' }

export default function AdminUsersPage() {
  const [filter, setFilter] = useState({ role: '', status: '', search: '' })
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [msg, setMsg] = useState(null)

  const load = async () => {
    const params = {}
    if (filter.role) params.role = filter.role
    if (filter.status) params.status = filter.status
    if (filter.search) params.search = filter.search
    const res = await adminService.listUsers(params)
    setUsers(res.items); setTotal(res.total)
  }

  useEffect(() => { load().catch(() => {}) }, [])

  const toggleStatus = async (u) => {
    const next = u.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED'
    if (!window.confirm(`${next === 'BLOCKED' ? 'Bloquear' : 'Habilitar'} a ${u.email}?`)) return
    try {
      await adminService.setUserStatus(u.id, next)
      setMsg({ type: 'success', text: `Usuario ${next === 'BLOCKED' ? 'bloqueado' : 'habilitado'}` })
      load()
    } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  return (
    <div>
      {msg && <div className={`wg-alert wg-alert--${msg.type}`}>{msg.text}</div>}

      <div className="wg-card" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
        <div className="wg-field" style={{ margin: 0, flex: 1, minWidth: 180 }}>
          <label>Rol</label>
          <select className="wg-input" value={filter.role} onChange={(e) => setFilter({ ...filter, role: e.target.value })}>
            <option value="">Todos</option>
            {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="wg-field" style={{ margin: 0, flex: 1, minWidth: 180 }}>
          <label>Estado</label>
          <select className="wg-input" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
            <option value="">Todos</option>
            <option value="ACTIVE">Activo</option>
            <option value="BLOCKED">Bloqueado</option>
            <option value="PENDING_VERIFICATION">Pendiente de verificacion</option>
          </select>
        </div>
        <div className="wg-field" style={{ margin: 0, flex: 2, minWidth: 200 }}>
          <label>Buscar (correo o nombre)</label>
          <input className="wg-input" value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })} placeholder="Buscar..." />
        </div>
        <button className="wg-btn wg-btn--primary" onClick={load}>Filtrar</button>
      </div>

      <div className="wg-card">
        <h2 style={{ marginBottom: 16 }}>Usuarios ({total})</h2>
        {users.length === 0 && <EmptyState icon="👥" title="Sin resultados" />}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--wg-gray-400)', borderBottom: '2px solid var(--wg-gray-200)' }}>
                <th style={{ padding: 10 }}>Usuario</th>
                <th style={{ padding: 10 }}>Rol</th>
                <th style={{ padding: 10 }}>Estado</th>
                <th style={{ padding: 10 }}>Registro</th>
                <th style={{ padding: 10 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--wg-gray-100)' }}>
                  <td style={{ padding: 10 }}>
                    <strong>{u.profile?.firstName} {u.profile?.lastName}</strong>
                    <div className="wg-muted" style={{ fontSize: 12 }}>{u.email}</div>
                  </td>
                  <td style={{ padding: 10 }}>{ROLE_LABEL[u.role.name]}</td>
                  <td style={{ padding: 10 }}><StatusBadge value={u.status} map={STATUS_MAP} /></td>
                  <td style={{ padding: 10 }} className="wg-muted">{new Date(u.createdAt).toLocaleDateString('es-CO')}</td>
                  <td style={{ padding: 10 }}>
                    {u.status !== 'DELETED' && (
                      <button className="wg-btn wg-btn--outline" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => toggleStatus(u)}>
                        {u.status === 'BLOCKED' ? 'Habilitar' : 'Bloquear'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
