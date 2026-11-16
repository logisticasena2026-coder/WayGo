// ============================================================
// WayGo - Contratos mensuales (cliente)
// ============================================================
import { useEffect, useState } from 'react'
import { contractService } from '../../services/contract.service'
import { apiErrorMessage } from '../../services/api'
import { StatusBadge, EmptyState } from '../../components/StatusBadge'

const CT_STATUS = {
  DRAFT: { label: 'Borrador', tone: 'info' }, ACTIVE: { label: 'Activo', tone: 'success' },
  PAUSED: { label: 'Pausado', tone: 'warning' }, COMPLETED: { label: 'Completado', tone: 'success' },
  CANCELLED: { label: 'Cancelado', tone: 'warning' }, EXPIRED: { label: 'Vencido', tone: 'warning' },
}

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']

export default function ContractsPage() {
  const [contracts, setContracts] = useState(null)
  const [form, setForm] = useState({ type: '', startDate: '', endDate: '', pickupAddress: '', dropoffAddress: '', servicesIncluded: '', kmIncluded: '', monthlyPrice: '', conditions: '' })
  const [schedules, setSchedules] = useState([{ dayOfWeek: 1, time: '07:00' }])
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => contractService.list().then(setContracts).catch(() => setContracts([]))
  useEffect(() => { load() }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setSch = (i, k, v) => setSchedules((s) => s.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)))

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setMsg(null)
    try {
      const payload = { ...form, servicesIncluded: Number(form.servicesIncluded), kmIncluded: form.kmIncluded ? Number(form.kmIncluded) : null, monthlyPrice: Number(form.monthlyPrice), schedules: schedules.map((s) => ({ dayOfWeek: Number(s.dayOfWeek), time: s.time })) }
      await contractService.create(payload)
      setMsg({ type: 'success', text: 'Contrato creado' })
      setForm({ type: '', startDate: '', endDate: '', pickupAddress: '', dropoffAddress: '', servicesIncluded: '', kmIncluded: '', monthlyPrice: '', conditions: '' }); load()
    } catch (e2) { setMsg({ type: 'error', text: apiErrorMessage(e2, 'No se pudo crear el contrato') }) } finally { setSaving(false) }
  }

  const act = async (id, fn, label) => {
    try { await fn(id); setMsg({ type: 'success', text: label }); load() } catch (e) { setMsg({ type: 'error', text: apiErrorMessage(e) }) }
  }

  if (contracts === null) return <div className="wg-loading"><div className="wg-spinner" /></div>

  return (
    <div>
      {msg && <div className={`wg-alert wg-alert--${msg.type}`}>{msg.text}</div>}

      <div className="wg-grid wg-grid--2" style={{ alignItems: 'start' }}>
        <div className="wg-card">
          <h2 style={{ marginBottom: 16 }}>Nuevo contrato mensual</h2>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="wg-field"><label>Tipo (ESCOLAR, EMPRESARIAL...)</label><input className="wg-input" value={form.type} onChange={set('type')} required /></div>
              <div className="wg-field"><label>Precio mensual (COP)</label><input className="wg-input" type="number" value={form.monthlyPrice} onChange={set('monthlyPrice')} required /></div>
              <div className="wg-field"><label>Fecha inicial</label><input className="wg-input" type="date" value={form.startDate} onChange={set('startDate')} required /></div>
              <div className="wg-field"><label>Fecha final</label><input className="wg-input" type="date" value={form.endDate} onChange={set('endDate')} required /></div>
              <div className="wg-field"><label>Servicios incluidos</label><input className="wg-input" type="number" value={form.servicesIncluded} onChange={set('servicesIncluded')} required /></div>
              <div className="wg-field"><label>Km incluidos</label><input className="wg-input" type="number" value={form.kmIncluded} onChange={set('kmIncluded')} /></div>
            </div>
            <div className="wg-field"><label>Origen</label><input className="wg-input" value={form.pickupAddress} onChange={set('pickupAddress')} required /></div>
            <div className="wg-field"><label>Destino</label><input className="wg-input" value={form.dropoffAddress} onChange={set('dropoffAddress')} required /></div>

            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--wg-gray-600)' }}>Dias y horarios</label>
            {schedules.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, marginTop: 8 }}>
                <select className="wg-input" value={s.dayOfWeek} onChange={(e) => setSch(i, 'dayOfWeek', e.target.value)}>
                  {DAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
                </select>
                <input className="wg-input" type="time" value={s.time} onChange={(e) => setSch(i, 'time', e.target.value)} />
                {schedules.length > 1 && <button type="button" className="wg-btn wg-btn--ghost" onClick={() => setSchedules(schedules.filter((_, x) => x !== i))}>🗑️</button>}
              </div>
            ))}
            <button type="button" className="wg-btn wg-btn--ghost wg-mt" style={{ fontSize: 13 }} onClick={() => setSchedules([...schedules, { dayOfWeek: 1, time: '07:00' }])}>+ Agregar dia</button>

            <div className="wg-field wg-mt"><label>Condiciones (opcional)</label><textarea className="wg-input" rows="2" value={form.conditions} onChange={set('conditions')} /></div>
            <button className="wg-btn wg-btn--primary wg-btn--block" disabled={saving}>{saving ? 'Creando...' : 'Crear contrato'}</button>
          </form>
        </div>

        <div>
          <h2 style={{ marginBottom: 16 }}>Mis contratos ({contracts.length})</h2>
          {contracts.length === 0 && <EmptyState icon="📄" title="Sin contratos" />}
          <div className="wg-grid" style={{ gap: 12 }}>
            {contracts.map((c) => (
              <div key={c.id} className="wg-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>#{c.contractNumber} · {c.type}</strong>
                  <StatusBadge value={c.status} map={CT_STATUS} />
                </div>
                <div className="wg-muted" style={{ fontSize: 13, marginTop: 4 }}>{c.pickupAddress} → {c.dropoffAddress}</div>
                <div className="wg-muted" style={{ fontSize: 13 }}>{new Date(c.startDate).toLocaleDateString('es-CO')} al {new Date(c.endDate).toLocaleDateString('es-CO')} · ${Number(c.monthlyPrice).toLocaleString('es-CO')}/mes</div>
                <div className="wg-muted" style={{ fontSize: 13 }}>{c.servicesUsed}/{c.servicesIncluded} servicios usados</div>
                {c.driver && <div className="wg-muted" style={{ fontSize: 13 }}>Conductor: {c.driver.profile?.firstName} {c.driver.profile?.lastName}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {c.status === 'DRAFT' && <button className="wg-btn wg-btn--primary" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => act(c.id, (id) => contractService.setStatus(id, 'ACTIVE'), 'Contrato activado')}>Activar</button>}
                  {c.status === 'ACTIVE' && <button className="wg-btn wg-btn--outline" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => act(c.id, (id) => contractService.setStatus(id, 'PAUSED'), 'Contrato pausado')}>Pausar</button>}
                  <button className="wg-btn wg-btn--ghost" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => act(c.id, (id) => contractService.generate(id), 'Ejecuciones generadas')}>Generar servicios</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
