import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import AlarmOverlay from './AlarmOverlay'
import { useDoseNotifications } from '../hooks/useDoseNotifications'
import './DashboardLayout.css'

export default function DashboardLayout({ role }) {
  // Mount notification system at layout level — works across all user pages
  // The hook handles graceful failure if the user isn't logged in as a patient
  const { overdueMeds, dismissAlarm, dismissAll } = useDoseNotifications(role === 'user')

  return (
    <div className="dashboard-layout">
      <Sidebar role={role} />
      <main className="dashboard-main">
        <Outlet />
      </main>

      {/* Global alarm overlay — visible on every user page */}
      {role === 'user' && (
        <AlarmOverlay
          overdueMeds={overdueMeds}
          dismissAlarm={dismissAlarm}
          dismissAll={dismissAll}
        />
      )}
    </div>
  )
}
