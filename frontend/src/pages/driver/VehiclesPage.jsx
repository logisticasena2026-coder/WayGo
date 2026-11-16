// ============================================================
// WayGo - Vehiculos del conductor (listar, crear, editar, foto)
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { vehicleService } from '../../services/vehicle.service'
import { apiErrorMessage } from '../../services/api'
import { StatusBadge, STATUS_MAP, EmptyState } from '../../components/StatusBadge'

const VEHICLE_TYPES = ['SEDAN', 'SUV', 'HATCHBACK', 'MOTO', 'CAMIONETA', 'VAN', 'PICKUP', 'OTRO']

const EMPTY = { plate: '', brand: '', model: '', year: '', color: '', type: 'SEDAN', capacity: 4 }

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)
  const photoRef = useRef({})

  const load = () => vehicleService.list().then(setVehicles).catch(() => setVehicles([]))

  useEffect(() => { load() }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const reset = () => { setForm(EMPTY); setEditing(null) }

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setMsg(null)
    try {
      const payload = { ...form, year: form.year ? Number(form.year) : null, capacity: Number(form.capacity) || 4 }
      if (editing) await vehicleService.update(editing, payload)
      else await vehicleService.create(payload)
      setMsg({ type: 'success', text: editing ? 'Vehiculo actualizado' : 'Vehiculo registrado' })
      reset(); load()
    } catch (e2) {
      setMsg({ type: 'error', text: apiErrorMessage(e2, 'No se pudo guardar') })
    } finally { setSaving(false) }
  }

  const edit = (v) => {
    setEditing(v.id)
    setForm({ plate: v.plate, brand: v.brand, model: v.model, year: v.year || '', color: v.color, type: v.type || 'SEDAN', capacity: v.capacity })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onPhoto = async (id, e) => {
    const file = e.target.files?.[0]; if (!file) return
    try {
      await vehicleService.updatePhoto(id, file)
      setMsg({ type: 'success', text: 'Foto del vehiculo actualizada' })
      load()
    } catch (e2) {
      setMsg({ type: 'error', text: apiErrorMessage(e2, 'No se pudo subir la foto') })
    }
  }

  if (vehicles === null) return <div className="wg-loading"><div className="wg-spinner" /></div>

  return (
    <div>
      {msg && <div className={`wg-alert wg-alert--${msg.type}`}>{msg.text}</div>}

      <div className="wg-grid wg-grid--2">
        <div className="wg-card">
          <h2 style={{ marginBottom: 16 }}>{editing ? 'Editar vehiculo' : 'Registrar vehiculo'}</h2>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="wg-field">
                <label>Placa</label>
                <input className="wg-input" value={form.plate} onChange={set('plate')} placeholder="ABC123" maxLength={6} disabled={!!editing} />
              </div>
              <div className="wg-field">
                <label>Marca</label>
                <input className="wg-input" value={form.brand} onChange={set('brand')} placeholder="Renault" />
              </div>
              <div className="wg-field">
                <label>Modelo</label>
                <input className="wg-input" value={form.model} onChange={set('model')} placeholder="Logan" />
              </div>
              <div className="wg-field">
                <label>Anio</label>
                <input className="wg-input" type="number" value={form.year} onChange={set('year')} />
              </div>
              <div className="wg-field">
                <label>Color</label>
                <input className="wg-input" value={form.color} onChange={set('color')} />
              </div>
              <div className="wg-field">
                <label>Tipo</label>
                <select className="wg-input" value={form.type} onChange={set('type')}>
                  {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="wg-field">
                <label>Capacidad (pasajeros)</label>
                <input className="wg-input" type="number" min="1" value={form.capacity} onChange={set('capacity')} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" className="wg-btn wg-btn--primary" disabled={saving}>
                {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Registrar'}
              </button>
              {editing && <button type="button" className="wg-btn wg-btn--ghost" onClick={reset}>Cancelar</button>}
            </div>
          </form>
        </div>

        <div>
          <h2 style={{ marginBottom: 16 }}>Mis vehiculos ({vehicles.length})</h2>
          {vehicles.length === 0 && <EmptyState icon="🚙" title="Aun no tienes vehiculos" text="Registra tu primer vehiculo para poder ofertar servicios." />}
          <div className="wg-grid" style={{ gap: 14 }}>
            {vehicles.map((v) => (
              <div key={v.id} className="wg-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ position: 'relative' }}>
                    {v.photoUrl ? (
                      <img src={v.photoUrl} alt={v.plate} style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 72, height: 72, borderRadius: 10, background: 'var(--wg-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🚙</div>
                    )}
                    <input type="file" accept="image/*" hidden ref={(el) => (photoRef.current[v.id] = el)} onChange={(e) => onPhoto(v.id, e)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <strong>{v.brand} {v.model} ({v.year})</strong>
                      {v.isPrimary && <span className="wg-badge wg-badge--info">Principal</span>}
                    </div>
                    <div className="wg-muted" style={{ fontSize: 13 }}>{v.plate} · {v.color} · {v.type}</div>
                    <div style={{ marginTop: 4 }}><StatusBadge value={v.verificationStatus} map={STATUS_MAP} /></div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button className="wg-btn wg-btn--ghost" style={{ padding: '8px 12px', fontSize: 13 }} onClick={() => photoRef.current[v.id]?.click()}>📷 Foto</button>
                  <button className="wg-btn wg-btn--ghost" style={{ padding: '8px 12px', fontSize: 13 }} onClick={() => edit(v)}>✏️ Editar</button>
                  {!v.isPrimary && (
                    <button className="wg-btn wg-btn--ghost" style={{ padding: '8px 12px', fontSize: 13 }}
                      onClick={async () => { await vehicleService.setPrimary(v.id); load() }}>
                      ⭐ Principal
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
