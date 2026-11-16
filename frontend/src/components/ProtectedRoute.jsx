// ============================================================
// WayGo - Rutas protegidas y por rol
// ============================================================
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="wg-loading">
        <div className="wg-spinner" />
        <p>Restaurando sesion...</p>
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/ingresar" state={{ from: location }} replace />
  return <Outlet />
}

/** @param {{roles: string[]}} props */
export function RoleRoute({ roles }) {
  const { user } = useAuth()
  if (!user || !roles.includes(user.role?.name)) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
