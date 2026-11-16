// ============================================================
// WayGo - Confirmacion de correo (desde enlace de registro)
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import { apiErrorMessage } from '../../services/api'

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState({ status: 'loading', message: null })
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return // evita doble ejecucion de StrictMode
    ran.current = true
    if (!token) {
      setState({ status: 'error', message: 'Enlace invalido: falta el token de confirmacion.' })
      return
    }
    authService
      .confirmEmail(token)
      .then(() => setState({ status: 'success', message: 'Correo confirmado. Ya puedes iniciar sesion.' }))
      .catch((err) => setState({ status: 'error', message: apiErrorMessage(err, 'No se pudo confirmar el correo') }))
  }, [token])

  return (
    <div className="wg-auth">
      <div className="wg-auth__card" style={{ textAlign: 'center' }}>
        <div className="wg-auth__logo"><img src="/favicon.svg" alt="WayGo" /></div>
        <h2>Confirmacion de correo</h2>
        {state.status === 'loading' && (
          <div className="wg-mt"><div className="wg-spinner" style={{ margin: '16px auto' }} /><p className="wg-muted">Confirmando tu cuenta...</p></div>
        )}
        {state.status === 'success' && <div className="wg-alert wg-alert--success wg-mt">{state.message}</div>}
        {state.status === 'error' && <div className="wg-alert wg-alert--error wg-mt">{state.message}</div>}
        <div className="wg-auth__links">
          <Link to="/ingresar" className="wg-btn wg-btn--primary wg-btn--block">Ir a ingresar</Link>
        </div>
      </div>
    </div>
  )
}
