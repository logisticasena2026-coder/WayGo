// ============================================================
// WayGo - Enrutador principal
// ============================================================
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute'
import AppLayout from './layouts/AppLayout'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'
import ConfirmEmailPage from './pages/auth/ConfirmEmailPage'
import { ModulePlaceholder } from './pages/DashboardPages'

import ProfilePage from './pages/ProfilePage'
import CustomerHome from './pages/customer/CustomerHome'
import DriverHome from './pages/driver/DriverHome'
import VehiclesPage from './pages/driver/VehiclesPage'
import DocumentsPage from './pages/driver/DocumentsPage'
import AdminDriversPage from './pages/admin/AdminDriversPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import RequestServicePage from './pages/customer/RequestServicePage'
import MyServicesPage from './pages/customer/MyServicesPage'
import AvailableRequestsPage from './pages/driver/AvailableRequestsPage'
import MyOffersPage from './pages/driver/MyOffersPage'
import CallCenterHome from './pages/callcenter/CallCenterHome'
import ActiveServicePage from './pages/driver/ActiveServicePage'
import PackageRequestPage from './pages/customer/PackageRequestPage'
import MyPackagesPage from './pages/customer/MyPackagesPage'
import DriverPackagesPage from './pages/driver/DriverPackagesPage'
import ContractsPage from './pages/customer/ContractsPage'
import TrackingPage from './pages/TrackingPage'
import ServiceTrackingPage from './pages/customer/ServiceTrackingPage'
import ReviewsPage from './pages/ReviewsPage'
import StatsPage from './pages/StatsPage'

function RoleHome() {
  const { user } = useAuth()
  switch (user?.role?.name) {
    case 'CUSTOMER': return <CustomerHome />
    case 'DRIVER': return <DriverHome />
    case 'CALL_CENTER': return <CallCenterHome />
    case 'ADMIN': return <AdminDriversPage />
    default: return <Navigate to="/" replace />
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Publicas */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/ingresar" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
          <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
          <Route path="/confirmar-correo" element={<ConfirmEmailPage />} />
          <Route path="/rastrear" element={<TrackingPage />} />

          {/* Privadas (requieren sesion) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/panel" element={<AppLayout />}>
              <Route index element={<RoleHome />} />
              <Route path="perfil" element={<ProfilePage />} />

              {/* Cliente */}
              <Route element={<RoleRoute roles={['CUSTOMER']} />}>
                <Route path="solicitar" element={<RequestServicePage />} />
                <Route path="servicios" element={<MyServicesPage />} />
                <Route path="ofertas" element={<MyServicesPage />} />
                <Route path="seguimiento" element={<ServiceTrackingPage />} />
                <Route path="paquetes" element={<MyPackagesPage />} />
                <Route path="enviar-paquete" element={<PackageRequestPage />} />
                <Route path="contratos" element={<ContractsPage />} />
                <Route path="calificaciones" element={<ReviewsPage />} />
                <Route path="historial" element={<StatsPage />} />
              </Route>

              {/* Conductor */}
              <Route element={<RoleRoute roles={['DRIVER']} />}>
                <Route path="vehiculos" element={<VehiclesPage />} />
                <Route path="documentos" element={<DocumentsPage />} />
                <Route path="solicitudes" element={<AvailableRequestsPage />} />
                <Route path="mis-ofertas" element={<MyOffersPage />} />
                <Route path="servicios" element={<ActiveServicePage />} />
                <Route path="paquetes" element={<DriverPackagesPage />} />
                <Route path="calificaciones" element={<ReviewsPage />} />
                <Route path="ingresos" element={<StatsPage />} />
              </Route>

              {/* Call center */}
              <Route element={<RoleRoute roles={['CALL_CENTER']} />}>
                <Route path="incidentes" element={<CallCenterHome />} />
                <Route path="estadisticas" element={<StatsPage />} />
              </Route>

              {/* Administrador */}
              <Route element={<RoleRoute roles={['ADMIN']} />}>
                <Route path="conductores" element={<AdminDriversPage />} />
                <Route path="usuarios" element={<AdminUsersPage />} />
                <Route path="vehiculos-admin" element={<ModulePlaceholder title="Vehiculos" description="Gestion central de vehiculos." />} />
                <Route path="solicitudes-admin" element={<ModulePlaceholder title="Solicitudes" description="Consulta general de solicitudes." />} />
                <Route path="contratos-admin" element={<ContractsPage />} />
                <Route path="operadores" element={<ModulePlaceholder title="Operadores call center" description="Gestion de operadores." />} />
                <Route path="estadisticas" element={<StatsPage />} />
                <Route path="auditoria" element={<ModulePlaceholder title="Auditoria" description="Consulta de auditoria." />} />
                <Route path="configuracion" element={<ModulePlaceholder title="Configuracion" description="Parametros y tarifas." />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
