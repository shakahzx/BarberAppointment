import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import SiteLayout from './components/SiteLayout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ServicesPage from './pages/ServicesPage'
import BookingPage from './pages/BookingPage'
import AppointmentsPage from './pages/AppointmentsPage'
import ProfilePage from './pages/ProfilePage'
import AdminDashboard from './pages/AdminDashboard'
import ManageAppointmentPage from './pages/ManageAppointmentPage'
import StyleMatcherPage from './pages/StyleMatcherPage'
import BarberDashboard from './pages/BarberDashboard'
import './App.css'

function ProtectedRoute({ children, adminOnly = false, customerOnly = false, barberOnly = false }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <main className="page-loading"><span className="spinner" />Loading your account</main>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />
  if (customerOnly && user.role !== 'customer') return <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'barber' ? '/barber' : '/'} replace />
  if (barberOnly && user.role !== 'barber') return <Navigate to={user.role === 'admin' ? '/admin' : '/'} replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/style-matcher" element={<StyleMatcherPage />} />
        <Route path="/manage-appointment" element={<ManageAppointmentPage />} />
        <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : user.role === 'barber' ? '/barber' : '/'} replace /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <RegisterPage />} />
        <Route path="/verify-email" element={user ? <Navigate to="/" replace /> : <VerifyEmailPage />} />
        <Route path="/book" element={<ProtectedRoute customerOnly><BookingPage /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute customerOnly><AppointmentsPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute customerOnly><ProfilePage /></ProtectedRoute>} />
      </Route>
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/barber" element={<ProtectedRoute barberOnly><BarberDashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return <BrowserRouter><AuthProvider><AppRoutes /></AuthProvider></BrowserRouter>
}
