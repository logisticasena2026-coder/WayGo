// ============================================================
// WayGo - Registro de cuenta (cliente o conductor)
// ============================================================
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../../services/auth.service'
import { apiErrorMessage } from '../../services/api'

const INITIAL = { firstName: '', lastName: '', email: '', phone: '', password: '', confirm: '' }

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [role, setRole] = useState(searchParams.get('rol') === 'DRIVER' ? 'DRIVER' : 'CUSTOMER')
  const [form, setForm] = useState(INITIAL)
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.firstName.trim()) errs.firstName = 'El nombre es obligatorio'
    if (!form.lastName.trim()) errs.lastName = 'El apellido es obligatorio'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Correo electronico invalido'
    if (form.password.length < 8) errs.password = 'Minimo 8 caracteres'
    if (!/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      errs.password = 'Debe incluir mayusculas, minusculas y numeros'
    }
    if (form.password !== form.confirm) errs.confirm = 'Las contrasenas no coinciden'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError(null)
    if (!validate()) return
    setSubmitting(true)
    try {
      await authService.register({
        email: form.email.trim(),
        password: form.password,
        role,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
      })
      navigate('/ingresar', {
        state: { message: 'Cuenta creada. Revisa tu correo para confirmarla antes de ingresar.' },
      })
    } catch (err) {
      setApiError(apiErrorMessage(err, 'No se pudo completar el registro'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="wg-auth">
      <div className="wg-auth__card">
        <div className="wg-auth__logo"><img src="/favicon.svg" alt="WayGo" /></div>
        <h2>Crear cuenta</h2>
        <p className="wg-auth__subtitle">Registrate en WayGo en menos de un minuto</p>

        <div className="wg-role-picker" role="group" aria-label="Tipo de cuenta">
          <button type="button" className={role === 'CUSTOMER' ? 'active' : ''} onClick={() => setRole('CUSTOMER')}>
            🧍 Soy cliente
          </button>
          <button type="button" className={role === 'DRIVER' ? 'active' : ''} onClick={() => setRole('DRIVER')}>
            🚗 Soy conductor
          </button>
        </div>

        {apiError && <div className="wg-alert wg-alert--error">{apiError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="wg-field">
            <label htmlFor="firstName">Nombre</label>
            <input id="firstName" className={`wg-input${errors.firstName ? ' wg-input--error' : ''}`}
              value={form.firstName} onChange={set('firstName')} autoComplete="given-name" />
            {errors.firstName && <div className="wg-field-error">{errors.firstName}</div>}
          </div>
          <div className="wg-field">
            <label htmlFor="lastName">Apellido</label>
            <input id="lastName" className={`wg-input${errors.lastName ? ' wg-input--error' : ''}`}
              value={form.lastName} onChange={set('lastName')} autoComplete="family-name" />
            {errors.lastName && <div className="wg-field-error">{errors.lastName}</div>}
          </div>
          <div className="wg-field">
            <label htmlFor="email">Correo electronico</label>
            <input id="email" type="email" className={`wg-input${errors.email ? ' wg-input--error' : ''}`}
              value={form.email} onChange={set('email')} autoComplete="email" />
            {errors.email && <div className="wg-field-error">{errors.email}</div>}
          </div>
          <div className="wg-field">
            <label htmlFor="phone">Telefono (opcional)</label>
            <input id="phone" type="tel" className="wg-input" value={form.phone} onChange={set('phone')} autoComplete="tel" />
          </div>
          <div className="wg-field">
            <label htmlFor="password">Contrasena</label>
            <input id="password" type="password" className={`wg-input${errors.password ? ' wg-input--error' : ''}`}
              value={form.password} onChange={set('password')} autoComplete="new-password" />
            {errors.password && <div className="wg-field-error">{errors.password}</div>}
          </div>
          <div className="wg-field">
            <label htmlFor="confirm">Confirmar contrasena</label>
            <input id="confirm" type="password" className={`wg-input${errors.confirm ? ' wg-input--error' : ''}`}
              value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
            {errors.confirm && <div className="wg-field-error">{errors.confirm}</div>}
          </div>
          <button type="submit" className="wg-btn wg-btn--primary wg-btn--block" disabled={submitting}>
            {submitting ? 'Creando cuenta...' : 'Registrarme'}
          </button>
        </form>

        <div className="wg-auth__links">
          <span>¿Ya tienes cuenta? <Link to="/ingresar">Ingresa</Link></span>
          <Link to="/">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  )
}
