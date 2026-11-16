// ============================================================
// WayGo - Documentos del conductor (licencia + documentos)
// ============================================================
import { useEffect, useState } from 'react'
import { driverService } from '../../services/driver.service'
import { apiErrorMessage } from '../../services/api'
import { StatusBadge, STATUS_MAP, EmptyState } from '../../components/StatusBadge'

const DOC_TYPES = [
  { code: 'LICENCIA', label: 'Licencia de conduccion' },
  { code: 'CEDULA', label: 'Cedula de ciudadania' },
  { code: 'ANTECEDENTES', label: 'Certificado de antecedentes' },
  { code: 'SEGURO', label: 'Seguro' },
  { code: 'OTRO', label: 'Otro documento' },
]

export default function DocumentsPage() {
  const [driver, setDriver] = useState(null)
  const [license, setLicense] = useState({ licenseNumber: '', licenseCategory: '', licenseExpiresAt: '' })
  const [upload, setUpload] = useState({ type: 'LICENCIA', expiresAt: '' })
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => driverService.getProfile().then((d) => {
    setDriver(d)
    setLicense({
      licenseNumber: d.licenseNumber || '',
      licenseCategory: d.licenseCategory || '',
      licenseExpiresAt: d.licenseExpiresAt ? d.licenseExpiresAt.slice(0, 10) : '',
    })
  })

  useEffect(() => { load().catch(() => {}) }, [])

  const saveLicense = async (e) => {
    e.preventDefault(); setSaving(true); setMsg(null)
    try {
      await driverService.updateLicense(license)
      setMsg({ type: 'success', text: 'Licencia guardada' })
      load()
    } catch (e2) {
      setMsg({ type: 'error', text: apiErrorMessage(e2, 'No se pudo guardar la licencia') })
    } finally { setSaving(false) }
  }

  const submitDoc = async (e) => {
    e.preventDefault()
    if (!file) return setMsg({ type: 'error', text: 'Selecciona un archivo (JPG, PNG, WebP o PDF)' })
    setSaving(true); setMsg(null)
    try {
      await driverService.uploadDocument(upload.type, file, upload.expiresAt || undefined)
      setMsg({ type: 'success', text: 'Documento cargado. Queda pendiente de revision.' })
      setFile(null); setUpload({ type: 'LICENCIA', expiresAt: '' }); e.target.reset(); load()
    } catch (e2) {
      setMsg({ type: 'error', text: apiErrorMessage(e2, 'No se pudo cargar el documento') })
    } finally { setSaving(false) }
  }

  const removeDoc = async (id) => {
    if (!window.confirm('Eliminar este documento?')) return
    try { await driverService.deleteDocument(id); load() } catch (e2) { setMsg({ type: 'error', text: apiErrorMessage(e2) }) }
  }

  if (!driver) return <div className="wg-loading"><div className="wg-spinner" /></div>

  return (
    <div>
      {msg && <div className={`wg-alert wg-alert--${msg.type}`}>{msg.text}</div>}

      <div className="wg-grid wg-grid--2">
        <div className="wg-card">
          <h2 style={{ marginBottom: 16 }}>Licencia de conduccion</h2>
          <form onSubmit={saveLicense}>
            <div className="wg-field">
              <label>Numero de licencia</label>
              <input className="wg-input" value={license.licenseNumber} onChange={(e) => setLicense({ ...license, licenseNumber: e.target.value })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="wg-field">
                <label>Categoria (B1, C2...)</label>
                <input className="wg-input" value={license.licenseCategory} onChange={(e) => setLicense({ ...license, licenseCategory: e.target.value })} />
              </div>
              <div className="wg-field">
                <label>Fecha de vencimiento</label>
                <input className="wg-input" type="date" value={license.licenseExpiresAt} onChange={(e) => setLicense({ ...license, licenseExpiresAt: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="wg-btn wg-btn--primary" disabled={saving}>Guardar licencia</button>
          </form>
        </div>

        <div className="wg-card">
          <h2 style={{ marginBottom: 16 }}>Cargar documento</h2>
          <form onSubmit={submitDoc}>
            <div className="wg-field">
              <label>Tipo de documento</label>
              <select className="wg-input" value={upload.type} onChange={(e) => setUpload({ ...upload, type: e.target.value })}>
                {DOC_TYPES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
              </select>
            </div>
            <div className="wg-field">
              <label>Fecha de vencimiento (opcional)</label>
              <input className="wg-input" type="date" value={upload.expiresAt} onChange={(e) => setUpload({ ...upload, expiresAt: e.target.value })} />
            </div>
            <div className="wg-field">
              <label>Archivo (JPG, PNG, WebP o PDF, max 5 MB)</label>
              <input className="wg-input" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={(e) => setFile(e.target.files?.[0])} />
            </div>
            <button type="submit" className="wg-btn wg-btn--primary" disabled={saving}>Subir documento</button>
          </form>
        </div>
      </div>

      <div className="wg-card wg-mt">
        <h2 style={{ marginBottom: 16 }}>Documentos ({driver.documents?.length || 0})</h2>
        {(!driver.documents || driver.documents.length === 0) && (
          <EmptyState icon="📑" title="Sin documentos" text="Carga tu cedula y licencia para iniciar la verificacion." />
        )}
        <div className="wg-grid" style={{ gap: 12 }}>
          {driver.documents?.map((d) => {
            const meta = DOC_TYPES.find((t) => t.code === d.type)
            return (
              <div key={d.id} className="wg-card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <strong>{meta?.label || d.type}</strong>
                  {d.expiresAt && <div className="wg-muted" style={{ fontSize: 13 }}>Vence: {new Date(d.expiresAt).toLocaleDateString('es-CO')}</div>}
                  {d.notes && <div className="wg-muted" style={{ fontSize: 13 }}>Obs: {d.notes}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <StatusBadge value={d.status} map={STATUS_MAP} />
                  {d.status !== 'APPROVED' && (
                    <button className="wg-btn wg-btn--ghost" style={{ padding: '6px 10px' }} onClick={() => removeDoc(d.id)}>🗑️</button>
                  )}
                  <a href={d.fileUrl} target="_blank" rel="noreferrer" className="wg-btn wg-btn--outline" style={{ padding: '6px 12px', fontSize: 13 }}>Ver</a>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
