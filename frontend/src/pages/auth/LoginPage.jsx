// ============================================================
// WayGo - Inicio de sesion
// ============================================================
import { useState } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { apiErrorMessage } from '../../services/api'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const rolSugerido = searchParams.get('rol')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(location.state?.message || null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      const destino = location.state?.from?.pathname || '/panel'
      navigate(destino, { replace: true })
    } catch (err) {
      setError(apiErrorMessage(err, 'No se pudo iniciar sesion'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="wg-auth">
      <div className="wg-auth__card">
        <div className="wg-auth__logo"><img src="/favicon.svg" alt="WayGo" /></div>
        <h2>Ingresar a WayGo</h2>
        <p className="wg-auth__subtitle">
          {rolSugerido ? `Acceso para ${rolSugerido}` : 'Bienvenido de nuevo'}
        </p>

        {error && <div className="wg-alert wg-alert--error">{error}</div>}
        {info && <div className="wg-alert wg-alert--info">{info}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="wg-field">
            <label htmlFor="email">Correo electronico</label>
            <input
              id="email" type="email" className="wg-input" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} required
            />
          </div>
          <div className="wg-field">
            <label htmlFor="password">Contrasena</label>
            <input
              id="password" type="password" className="wg-input" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} required
            />
          </div>
          <button type="submit" className="wg-btn wg-btn--primary wg-btn--block" disabled={submitting}>
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <div className="wg-auth__links">
          <Link to="/recuperar-contrasena">Olvide mi contrasena</Link>
          <span>¿No tienes cuenta? <Link to="/registro">Registrate</Link></span>
          <Link to="/">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  )
}
