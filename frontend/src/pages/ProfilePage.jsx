// ============================================================
// WayGo - Perfil del usuario (datos, foto y contrasena)
// Disponible para todos los roles
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { userService } from '../services/user.service'
import { apiErrorMessage } from '../services/api'
import { useAuth } from '../context/AuthContext'

const EMPTY = {
  firstName: '', lastName: '', phone: '', documentType: '',
  documentNumber: '', birthDate: '', address: '', city: '',
}

export default function ProfilePage() {
  const { user } = useAuth()
  const fileRef = useRef(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState(null)

  useEffect(() => {
    userService.getProfile().then((p) => {
      setForm({
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        phone: p.phone || '',
        documentType: p.documentType || '',
        documentNumber: p.documentNumber || '',
        birthDate: p.birthDate ? p.birthDate.slice(0, 10) : '',
        address: p.address || '',
        city: p.city || '',
      })
    })
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true); setMsg(null); setErr(null)
    try {
      const payload = { ...form }
      if (!payload.birthDate) delete payload.birthDate
      await userService.updateProfile(payload)
      setMsg('Perfil actualizado correctamente')
    } catch (e2) {
      setErr(apiErrorMessage(e2, 'No se pudo guardar'))
    } finally { setSaving(false) }
  }

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoBusy(true); setMsg(null); setErr(null)
    try {
      await userService.updatePhoto(file)
      setMsg('Fotografia actualizada. Se vera reflejada al reingresar.')
    } catch (e2) {
      setErr(apiErrorMessage(e2, 'No se pudo subir la foto'))
    } finally {
      setPhotoBusy(false)
      e.target.value = ''
    }
  }

  const changePw = async (e) => {
    e.preventDefault()
    setPwMsg(null)
    if (pw.next !== pw.confirm) return setPwMsg({ type: 'error', text: 'Las contrasenas no coinciden' })
    try {
      await userService.changePassword(pw.current, pw.next)
      setPw({ current: '', next: '', confirm: '' })
      setPwMsg({ type: 'success', text: 'Contrasena actualizada. Las demas sesiones fueron cerradas.' })
    } catch (e2) {
      setPwMsg({ type: 'error', text: apiErrorMessage(e2, 'No se pudo cambiar la contrasena') })
    }
  }

  return (
    <div className="wg-grid wg-grid--2">
      <div className="wg-card">
        <h2 style={{ marginBottom: 16 }}>Datos personales</h2>
        {msg && <div className="wg-alert wg-alert--success">{msg}</div>}
        {err && <div className="wg-alert wg-alert--error">{err}</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          {user?.profile?.photoUrl ? (
            <img src={user.profile.photoUrl} alt="Foto" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div className="wg-avatar" style={{ width: 64, height: 64, fontSize: 24 }}>{form.firstName?.[0]}{form.lastName?.[0]}</div>
          )}
          <div>
            <button type="button" className="wg-btn wg-btn--outline" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
              {photoBusy ? 'Subiendo...' : 'Cambiar fotografia'}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPhoto} />
          </div>
        </div>

        <form onSubmit={save}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="wg-field">
              <label>Nombre</label>
              <input className="wg-input" value={form.firstName} onChange={set('firstName')} />
            </div>
            <div className="wg-field">
              <label>Apellido</label>
              <input className="wg-input" value={form.lastName} onChange={set('lastName')} />
            </div>
            <div className="wg-field">
              <label>Telefono</label>
              <input className="wg-input" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="wg-field">
              <label>Ciudad</label>
              <input className="wg-input" value={form.city} onChange={set('city')} />
            </div>
            <div className="wg-field">
              <label>Tipo de documento</label>
              <select className="wg-input" value={form.documentType} onChange={set('documentType')}>
                <option value="">Seleccionar</option>
                <option value="CC">CC</option>
                <option value="CE">CE</option>
                <option value="NIT">NIT</option>
                <option value="PAS">Pasaporte</option>
              </select>
            </div>
            <div className="wg-field">
              <label>Numero de documento</label>
              <input className="wg-input" value={form.documentNumber} onChange={set('documentNumber')} />
            </div>
            <div className="wg-field">
              <label>Fecha de nacimiento</label>
              <input className="wg-input" type="date" value={form.birthDate} onChange={set('birthDate')} />
            </div>
          </div>
          <div className="wg-field">
            <label>Direccion</label>
            <input className="wg-input" value={form.address} onChange={set('address')} />
          </div>
          <button type="submit" className="wg-btn wg-btn--primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      <div className="wg-card" style={{ alignSelf: 'start' }}>
        <h2 style={{ marginBottom: 16 }}>Seguridad</h2>
        {pwMsg && <div className={`wg-alert wg-alert--${pwMsg.type === 'success' ? 'success' : 'error'}`}>{pwMsg.text}</div>}
        <form onSubmit={changePw}>
          <div className="wg-field">
            <label>Contrasena actual</label>
            <input className="wg-input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          </div>
          <div className="wg-field">
            <label>Nueva contrasena</label>
            <input className="wg-input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
          </div>
          <div className="wg-field">
            <label>Confirmar nueva contrasena</label>
            <input className="wg-input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </div>
          <button type="submit" className="wg-btn wg-btn--outline">Cambiar contrasena</button>
        </form>
      </div>
    </div>
  )
}
