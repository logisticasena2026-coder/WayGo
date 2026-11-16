// ============================================================
// WayGo - Layout principal de la aplicacion (menu lateral)
// El menu se construye segun el rol del usuario autenticado
// ============================================================
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const MENU_BY_ROLE = {
  CUSTOMER: [
    { section: 'Principal' },
    { to: '/panel', label: 'Inicio', icon: '🏠', end: true },
    { to: '/panel/solicitar', label: 'Solicitar servicio', icon: '🚗' },
    { to: '/panel/ofertas', label: 'Ofertas recibidas', icon: '💬' },
    { to: '/panel/servicios', label: 'Mis servicios', icon: '📋' },
    { section: 'Cuenta' },
    { to: '/panel/enviar-paquete', label: 'Enviar paquete', icon: '📦' },
    { to: '/panel/paquetes', label: 'Mis paquetes', icon: '📋' },
    { to: '/panel/contratos', label: 'Contratos mensuales', icon: '📄' },
    { to: '/panel/calificaciones', label: 'Calificaciones', icon: '⭐' },
    { to: '/panel/historial', label: 'Historial y gastos', icon: '📊' },
    { to: '/panel/perfil', label: 'Mi perfil', icon: '👤' },
  ],
  DRIVER: [
    { section: 'Operacion' },
    { to: '/panel', label: 'Inicio', icon: '🏠', end: true },
    { to: '/panel/solicitudes', label: 'Solicitudes', icon: '🔔' },
    { to: '/panel/mis-ofertas', label: 'Mis ofertas', icon: '💬' },
    { to: '/panel/servicios', label: 'Servicios asignados', icon: '🚗' },
    { section: 'Cuenta' },
    { to: '/panel/vehiculos', label: 'Mis vehiculos', icon: '🚙' },
    { to: '/panel/documentos', label: 'Mis documentos', icon: '📑' },
    { to: '/panel/paquetes', label: 'Paquetes', icon: '📦' },
    { to: '/panel/calificaciones', label: 'Calificaciones', icon: '⭐' },
    { to: '/panel/ingresos', label: 'Ingresos y estadisticas', icon: '📊' },
    { to: '/panel/perfil', label: 'Mi perfil', icon: '👤' },
  ],
  CALL_CENTER: [
    { section: 'Centro de control' },
    { to: '/panel', label: 'Mapa operativo', icon: '🗺️', end: true },
    { to: '/panel/solicitudes', label: 'Solicitudes', icon: '📋' },
    { to: '/panel/servicios', label: 'Servicios activos', icon: '🚗' },
    { to: '/panel/incidentes', label: 'Incidentes', icon: '⚠️' },
    { to: '/panel/estadisticas', label: 'Estadisticas', icon: '📊' },
  ],
  ADMIN: [
    { section: 'Administracion' },
    { to: '/panel', label: 'Conductores', icon: '🚗', end: true },
    { to: '/panel/usuarios', label: 'Usuarios', icon: '👥' },
    { to: '/panel/vehiculos-admin', label: 'Vehiculos', icon: '🚙' },
    { to: '/panel/solicitudes-admin', label: 'Solicitudes', icon: '📋' },
    { to: '/panel/contratos-admin', label: 'Contratos', icon: '📄' },
    { to: '/panel/estadisticas', label: 'Estadisticas', icon: '📊' },
    { to: '/panel/operadores', label: 'Call center', icon: '🎧' },
    { to: '/panel/auditoria', label: 'Auditoria', icon: '🔍' },
    { to: '/panel/configuracion', label: 'Configuracion', icon: '⚙️' },
  ],
}

const ROLE_LABEL = {
  CUSTOMER: 'Cliente',
  DRIVER: 'Conductor',
  CALL_CENTER: 'Call Center',
  ADMIN: 'Administrador',
}

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const role = user?.role?.name
  const menu = MENU_BY_ROLE[role] || []
  const initials = `${user?.profile?.firstName?.[0] || ''}${user?.profile?.lastName?.[0] || ''}`.toUpperCase() || 'WG'

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="wg-layout">
      <aside className="wg-sidebar">
        <div className="wg-sidebar__brand">
          <img src="/favicon.svg" alt="WayGo" />
          <span>WayGo</span>
        </div>
        <nav className="wg-sidebar__nav">
          {menu.map((item, i) =>
            item.section ? (
              <div key={`s-${i}`} className="wg-sidebar__section">{item.section}</div>
            ) : (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `wg-sidebar__link${isActive ? ' active' : ''}`}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            )
          )}
        </nav>
        <div className="wg-sidebar__footer">
          <button type="button" className="wg-btn wg-btn--ghost wg-btn--block" style={{ color: '#cbd5e1' }} onClick={handleLogout}>
            Cerrar sesion
          </button>
        </div>
      </aside>

      <div className="wg-main">
        <header className="wg-topbar">
          <h1>Panel de {ROLE_LABEL[role] || 'usuario'}</h1>
          <div className="wg-topbar__user">
            <div>
              <strong>{user?.profile?.firstName} {user?.profile?.lastName}</strong>
              <div className="wg-muted" style={{ fontSize: 12 }}>{user?.email}</div>
            </div>
            <div className="wg-avatar">{initials}</div>
          </div>
        </header>
        <main className="wg-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
