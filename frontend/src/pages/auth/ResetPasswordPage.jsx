// ============================================================
// WayGo - Restablecer contrasena (desde enlace de correo)
// ============================================================
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import { apiErrorMessage } from '../../services/api'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('La contrasena debe tener al menos 8 caracteres')
    if (password !== confirm) return setError('Las contrasenas no coinciden')
    setSubmitting(true)
    try {
      await authService.resetPassword(token, password)
      navigate('/ingresar', { state: { message: 'Contrasena restablecida. Inicia sesion con tu nueva contrasena.' } })
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo restablecer la contrasena'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="wg-auth">
        <div className="wg-auth__card">
          <div className="wg-alert wg-alert--error">Enlace invalido: falta el token de recuperacion.</div>
          <div className="wg-auth__links"><Link to="/recuperar-contrasena">Solicitar nuevo enlace</Link></div>
        </div>
      </div>
    )
  }

  return (
    <div className="wg-auth">
      <div className="wg-auth__card">
        <div className="wg-auth__logo"><img src="/favicon.svg" alt="WayGo" /></div>
        <h2>Nueva contrasena</h2>
        <p className="wg-auth__subtitle">Define tu nueva contrasena de acceso</p>

        {error && <div className="wg-alert wg-alert--error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="wg-field">
            <label htmlFor="password">Nueva contrasena</label>
            <input id="password" type="password" className="wg-input" value={password}
              onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
          </div>
          <div className="wg-field">
            <label htmlFor="confirm">Confirmar contrasena</label>
            <input id="confirm" type="password" className="wg-input" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
          </div>
          <button type="submit" className="wg-btn wg-btn--primary wg-btn--block" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Restablecer contrasena'}
          </button>
        </form>
      </div>
    </div>
  )
}
