import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import './DashboardLayout.css'

export default function DashboardLayout({ role }) {
  return (
    <div className="dashboard-layout">
      <Sidebar role={role} />
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  )
}
