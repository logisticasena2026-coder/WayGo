// ============================================================
// WayGo - Pagina inicial
// Accesos: Soy cliente | Soy conductor | Centro de control | Administracion
// ============================================================
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ROLE_CARDS = [
  {
    icon: '🧍',
    title: 'Soy cliente',
    text: 'Solicita transporte de personas o paquetes, propone tu precio y elige entre las ofertas de los conductores.',
    to: '/ingresar?rol=CUSTOMER',
  },
  {
    icon: '🚗',
    title: 'Soy conductor',
    text: 'Recibe solicitudes cercanas, acepta el precio propuesto o presenta contraofertas y gestiona tus servicios.',
    to: '/ingresar?rol=DRIVER',
  },
  {
    icon: '🎧',
    title: 'Centro de control',
    text: 'Supervision en tiempo real de la operacion, asignacion manual de conductores y gestion de incidentes.',
    to: '/ingresar?rol=CALL_CENTER',
  },
  {
    icon: '⚙️',
    title: 'Administracion',
    text: 'Gestion de usuarios, vehiculos, tarifas, contratos, estadisticas generales y auditoria de la plataforma.',
    to: '/ingresar?rol=ADMIN',
  },
]

export default function LandingPage() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="wg-landing">
      <nav className="wg-landing__nav">
        <div className="wg-logo">
          <img src="/favicon.svg" alt="WayGo" />
          <span>WayGo</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {isAuthenticated ? (
            <button type="button" className="wg-btn wg-btn--primary" onClick={() => navigate('/panel')}>
              Ir a mi panel
            </button>
          ) : (
            <>
              <Link to="/ingresar" className="wg-btn wg-btn--ghost">Ingresar</Link>
              <Link to="/registro" className="wg-btn wg-btn--primary">Crear cuenta</Link>
            </>
          )}
        </div>
      </nav>

      <section className="wg-landing__hero">
        <h1>Tu transporte, <span>a tu precio</span>.</h1>
        <p>
          WayGo conecta clientes y conductores para servicios de transporte de personas,
          envio de paquetes y contratos mensuales. Publica tu solicitud, propone el precio
          y elige la mejor oferta.
        </p>

        <div className="wg-landing__roles">
          {ROLE_CARDS.map((card) => (
            <Link key={card.title} to={card.to} className="wg-role-card">
              <div className="wg-role-card__icon" aria-hidden="true">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <footer className="wg-landing__footer">
        WayGo &middot; Plataforma inteligente de transporte y servicios &middot; Colombia
      </footer>
    </div>
  )
}
