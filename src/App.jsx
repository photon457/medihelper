import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import './App.css'

// Context
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import ProtectedRoute from './components/ProtectedRoute'

// Layout
import DashboardLayout from './components/DashboardLayout'

// Landing & Auth
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import SetupWizard from './pages/SetupWizard'

// User Pages
import UserDashboard from './pages/user/UserDashboard'
import MedicineInventory from './pages/user/MedicineInventory'
import OrderMedicine from './pages/user/OrderMedicine'
import OrderTracking from './pages/user/OrderTracking'
import UserProfile from './pages/user/UserProfile'

// Services
import { userAPI } from './services/api'

// Wrapper: checks if user needs setup, redirects if so
function SetupCheck({ children }) {
  const [checking, setChecking] = useState(true)
  const [needsSetup, setNeedsSetup] = useState(false)

  useEffect(() => {
    userAPI.setupStatus()
      .then(r => setNeedsSetup(r.data.needsSetup))
      .catch(() => setNeedsSetup(false))
      .finally(() => setChecking(false))
  }, [])

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner" style={{
          width: '40px', height: '40px',
          border: '3px solid var(--gray-200)',
          borderTopColor: 'var(--primary-500)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
      </div>
    )
  }

  if (needsSetup) return <Navigate to="/setup" replace />
  return children
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Setup Wizard */}
          <Route path="/setup" element={
            <ProtectedRoute role="user"><SetupWizard /></ProtectedRoute>
          } />

          {/* User Routes — wrapped with SetupCheck */}
          <Route path="/user" element={
            <ProtectedRoute role="user">
              <SetupCheck>
                <DashboardLayout role="user" />
              </SetupCheck>
            </ProtectedRoute>
          }>
            <Route index element={<UserDashboard />} />
            <Route path="inventory" element={<MedicineInventory />} />
            <Route path="order" element={<OrderMedicine />} />
            <Route path="tracking" element={<OrderTracking />} />
            <Route path="profile" element={<UserProfile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
