// ============================================================
// WayGo - Recuperar contrasena
// ============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import { apiErrorMessage } from '../../services/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await authService.forgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo procesar la solicitud'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="wg-auth">
      <div className="wg-auth__card">
        <div className="wg-auth__logo"><img src="/favicon.svg" alt="WayGo" /></div>
        <h2>Recuperar contrasena</h2>
        <p className="wg-auth__subtitle">Te enviaremos un enlace para restablecerla</p>

        {error && <div className="wg-alert wg-alert--error">{error}</div>}
        {sent ? (
          <div className="wg-alert wg-alert--success">
            Si el correo existe en WayGo, recibiras un enlace de recuperacion (valido 1 hora).
            Revisa tu bandeja de entrada y spam.
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="wg-field">
              <label htmlFor="email">Correo electronico</label>
              <input id="email" type="email" className="wg-input" value={email}
                onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>
            <button type="submit" className="wg-btn wg-btn--primary wg-btn--block" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </form>
        )}

        <div className="wg-auth__links">
          <Link to="/ingresar">← Volver a ingresar</Link>
        </div>
      </div>
    </div>
  )
}
