// ============================================================
// WayGo - Administracion: listado de usuarios
// ============================================================
import { useEffect, useState } from 'react'
import { adminService } from '../../services/admin.service'
import { apiErrorMessage } from '../../services/api'
import { StatusBadge, STATUS_MAP, EmptyState } from '../../components/StatusBadge'
import ViewSwitcher from '../../components/ViewSwitcher'
import StatusBoard from '../../components/StatusBoard'
import TimelineView from '../../components/TimelineView'

const ROLE_LABEL = { ADMIN: 'Administrador', CUSTOMER: 'Cliente', DRIVER: 'Conductor', CALL_CENTER: 'Call Center' }

export default function AdminUsersPage() {
  const [filter, setFilter] = useState({ role: '', status: '', search: '' })
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [msg, setMsg] = useState(null)
  const [view, setView] = useState('list')

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h2>Usuarios ({total})</h2>
          <ViewSwitcher value={view} onChange={setView} />
        </div>
        {users.length === 0 && <EmptyState icon="👥" title="Sin resultados" />}

        {view === 'list' && (
          <div style={{ overflowX: 'auto' }}>
            <table className="wg-table">
              <thead>
                <tr><th>Usuario</th><th>Rol</th><th>Estado</th><th>Registro</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.profile?.firstName} {u.profile?.lastName}</strong>
                      <div className="wg-muted" style={{ fontSize: 12 }}>{u.email}</div>
                    </td>
                    <td>{ROLE_LABEL[u.role.name]}</td>
                    <td><StatusBadge value={u.status} map={STATUS_MAP} /></td>
                    <td className="wg-muted">{new Date(u.createdAt).toLocaleDateString('es-CO')}</td>
                    <td>
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
        )}

        {view === 'grid' && (
          <div className="wg-grid" style={{ gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {users.map((u) => (
              <div key={u.id} className="wg-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{u.profile?.firstName} {u.profile?.lastName}</strong>
                  <StatusBadge value={u.status} map={STATUS_MAP} />
                </div>
                <div className="wg-muted" style={{ fontSize: 12, marginTop: 4 }}>{u.email}</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{ROLE_LABEL[u.role.name]}</div>
                <div className="wg-muted" style={{ fontSize: 12 }}>Desde {new Date(u.createdAt).toLocaleDateString('es-CO')}</div>
                {u.status !== 'DELETED' && (
                  <button className="wg-btn wg-btn--outline wg-btn--block wg-mt" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => toggleStatus(u)}>
                    {u.status === 'BLOCKED' ? 'Habilitar' : 'Bloquear'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {view === 'canvas' && (
          <StatusBoard
            items={users}
            statusMap={{ ACTIVE: { label: 'Activos' }, BLOCKED: { label: 'Bloqueados' }, PENDING_VERIFICATION: { label: 'Pendientes' }, DELETED: { label: 'Eliminados' } }}
            renderItem={(u) => (
              <div>
                <strong style={{ fontSize: 14 }}>{u.profile?.firstName} {u.profile?.lastName}</strong>
                <div className="wg-muted" style={{ fontSize: 12 }}>{u.email}</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>{ROLE_LABEL[u.role.name]}</div>
              </div>
            )}
          />
        )}

        {view === 'timeline' && (
          <TimelineView
            items={users}
            getDate={(u) => new Date(u.createdAt)}
            renderItem={(u) => (
              <div className="wg-card" style={{ padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{u.profile?.firstName} {u.profile?.lastName}</strong>
                  <StatusBadge value={u.status} map={STATUS_MAP} />
                </div>
                <div className="wg-muted" style={{ fontSize: 12, marginTop: 3 }}>{u.email} · {ROLE_LABEL[u.role.name]}</div>
              </div>
            )}
          />
        )}
      </div>
    </div>
  )
}
