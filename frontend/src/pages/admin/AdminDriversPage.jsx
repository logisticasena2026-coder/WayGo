// ============================================================
// WayGo - Administracion: verificacion de conductores
// ============================================================
import { useEffect, useState } from 'react'
import { adminService } from '../../services/admin.service'
import { apiErrorMessage } from '../../services/api'
import { StatusBadge, STATUS_MAP, EmptyState } from '../../components/StatusBadge'

const DOC_LABEL = { LICENCIA: 'Licencia', CEDULA: 'Cedula', ANTECEDENTES: 'Antecedentes', SEGURO: 'Seguro', OTRO: 'Otro' }
const VEH_DOC_LABEL = { SOAT: 'SOAT', TECNOMECANICA: 'Tecnomecanica', TARJETA_PROPIEDAD: 'Tarjeta de propiedad', OTRO: 'Otro' }

export default function AdminDriversPage() {
  const [filter, setFilter] = useState('PENDING')
  const [drivers, setDrivers] = useState([])
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [msg, setMsg] = useState(null)

  const load = async () => {
    const res = await adminService.listDrivers({ status: filter === 'ALL' ? undefined : filter, pageSize: 50 })
    setDrivers(res.items); setTotal(res.total)
  }

  useEffect(() => { load().catch(() => {}) }, [filter])

  const open = async (id) => {
    const d = await adminService.getDriver(id)
    setSelected(d)
  }

  const reviewDoc = async (kind, docId, action) => {
    if (action === 'REJECT' && !rejectReason) return setMsg({ type: 'error', text: 'Escribe el motivo del rechazo' })
    setMsg(null)
    try {
      if (kind === 'driver') await adminService.reviewDriverDocument(docId, action, rejectReason)
      else await adminService.reviewVehicleDocument(docId, action, rejectReason)
      setRejectReason(''); await open(selected.id); await load()
    } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  const verify = async (action) => {
    setMsg(null)
    try {
      await adminService.verifyDriver(selected.id, action)
      setSelected(null); await load()
    } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((f) => (
          <button key={f} className={`wg-btn ${filter === f ? 'wg-btn--primary' : 'wg-btn--outline'}`} style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => setFilter(f)}>
            {f === 'ALL' ? 'Todos' : STATUS_MAP[f]?.label || f} {f === 'PENDING' && total > 0 && `(${total})`}
          </button>
        ))}
      </div>

      {msg && <div className={`wg-alert wg-alert--${msg.type}`}>{msg.text}</div>}

      <div className="wg-grid wg-grid--2">
        <div className="wg-card">
          <h2 style={{ marginBottom: 16 }}>Conductores ({total})</h2>
          {drivers.length === 0 && <EmptyState icon="🚗" title="Sin conductores" text="No hay conductores en este filtro." />}
          <div className="wg-grid" style={{ gap: 12 }}>
            {drivers.map((d) => (
              <button key={d.id} onClick={() => open(d.id)} className="wg-card" style={{ textAlign: 'left', cursor: 'pointer', padding: 16, border: 'none', fontFamily: 'inherit', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{d.user.profile.firstName} {d.user.profile.lastName}</strong>
                  <StatusBadge value={d.verificationStatus} map={STATUS_MAP} />
                </div>
                <div className="wg-muted" style={{ fontSize: 13 }}>{d.user.email}</div>
                <div className="wg-muted" style={{ fontSize: 13 }}>
                  Docs: {d.documents.length} · Vehiculos: {d.vehicles.length}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="wg-card">
          <h2 style={{ marginBottom: 16 }}>Detalle</h2>
          {!selected && <EmptyState icon="👈" title="Selecciona un conductor" text="Haz clic en un conductor para revisar sus documentos y vehiculos." />}

          {selected && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <strong>{selected.user.profile.firstName} {selected.user.profile.lastName}</strong>
                <div className="wg-muted" style={{ fontSize: 13 }}>{selected.user.email} · {selected.user.profile.phone || 'Sin telefono'}</div>
                <div style={{ marginTop: 6 }}>
                  <StatusBadge value={selected.verificationStatus} map={STATUS_MAP} />
                  {' '}Licencia: {selected.licenseNumber ? `${selected.licenseNumber} (${selected.licenseCategory})` : 'Sin registrar'}
                </div>
              </div>

              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Documentos del conductor</h3>
              {selected.documents.length === 0 && <p className="wg-muted" style={{ fontSize: 13 }}>Sin documentos.</p>}
              {selected.documents.map((doc) => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--wg-gray-100)' }}>
                  <span style={{ flex: 1, fontSize: 14 }}>{DOC_LABEL[doc.type] || doc.type}</span>
                  <StatusBadge value={doc.status} map={STATUS_MAP} />
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="wg-btn wg-btn--ghost" style={{ padding: '4px 8px', fontSize: 12 }}>Ver</a>
                  {doc.status !== 'APPROVED' && (
                    <>
                      <button className="wg-btn wg-btn--outline" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => reviewDoc('driver', doc.id, 'APPROVE')}>Aprobar</button>
                      <button className="wg-btn wg-btn--ghost" style={{ padding: '4px 8px', fontSize: 12, color: 'var(--wg-danger)' }} onClick={() => reviewDoc('driver', doc.id, 'REJECT')}>Rechazar</button>
                    </>
                  )}
                </div>
              ))}

              <h3 style={{ fontSize: 15, margin: '14px 0 8px' }}>Vehiculos</h3>
              {selected.vehicles.map((v) => (
                <div key={v.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--wg-gray-100)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ flex: 1, fontSize: 14 }}><strong>{v.brand} {v.model}</strong> · {v.plate}</span>
                    <StatusBadge value={v.verificationStatus} map={STATUS_MAP} />
                  </div>
                  {v.documents.map((doc) => (
                    <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0 6px 16px' }}>
                      <span style={{ flex: 1, fontSize: 13 }} className="wg-muted">{VEH_DOC_LABEL[doc.type] || doc.type}</span>
                      <StatusBadge value={doc.status} map={STATUS_MAP} />
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="wg-btn wg-btn--ghost" style={{ padding: '4px 8px', fontSize: 12 }}>Ver</a>
                      {doc.status !== 'APPROVED' && (
                        <>
                          <button className="wg-btn wg-btn--outline" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => reviewDoc('vehicle', doc.id, 'APPROVE')}>Aprobar</button>
                          <button className="wg-btn wg-btn--ghost" style={{ padding: '4px 8px', fontSize: 12, color: 'var(--wg-danger)' }} onClick={() => reviewDoc('vehicle', doc.id, 'REJECT')}>Rechazar</button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}

              <div className="wg-field wg-mt">
                <label>Motivo de rechazo (para el proximo rechazo)</label>
                <input className="wg-input" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Ej: documento ilegible" />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                {selected.verificationStatus !== 'APPROVED' && (
                  <button className="wg-btn wg-btn--primary" onClick={() => verify('APPROVE')}>✅ Habilitar conductor</button>
                )}
                {selected.verificationStatus !== 'REJECTED' && (
                  <button className="wg-btn wg-btn--outline" style={{ color: 'var(--wg-danger)', borderColor: 'var(--wg-danger)' }} onClick={() => verify('REJECT')}>Rechazar</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
