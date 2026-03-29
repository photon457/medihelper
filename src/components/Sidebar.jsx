import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  FiHome, FiClock, FiPackage, FiShoppingCart, FiMapPin,
  FiUser, FiBarChart2, FiList, FiTruck, FiLogOut,
  FiMenu, FiX, FiHeart, FiSettings
} from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import './Sidebar.css'

const navItems = {
  user: [
    { path: '/user',           icon: FiHome,         label: 'Dashboard',  exact: true },
    { path: '/user/inventory', icon: FiPackage,      label: 'My Medicines' },
    { path: '/user/order',     icon: FiShoppingCart, label: 'Order Medicine' },
    { path: '/user/tracking',  icon: FiMapPin,       label: 'Track Orders' },
    { path: '/user/profile',   icon: FiUser,         label: 'Profile' },
  ],
  pharmacy: [
    { path: '/pharmacy',           icon: FiHome,     label: 'Dashboard',  exact: true },
    { path: '/pharmacy/inventory', icon: FiPackage,  label: 'Inventory' },
    { path: '/pharmacy/orders',    icon: FiList,     label: 'Orders' },
    { path: '/pharmacy/analytics', icon: FiBarChart2, label: 'Analytics' },
  ],
  delivery: [
    { path: '/delivery',         icon: FiTruck, label: 'Dashboard', exact: true },
    { path: '/delivery/history', icon: FiList,  label: 'History' },
  ],
}

const roleLabels = {
  user: 'Patient Portal',
  pharmacy: 'Pharmacy Portal',
  delivery: 'Delivery Portal',
}

export default function Sidebar({ role }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const { logout } = useAuth()
  const items = navItems[role] || []

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button className="sidebar-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}>
        {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
      </button>

      {/* Overlay */}
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <FiHeart size={collapsed ? 20 : 24} />
            </div>
            {!collapsed && <span className="sidebar-logo-text">MediHelper</span>}
          </div>
          {!collapsed && <span className="sidebar-role-label">{roleLabels[role]}</span>}
          <button className="sidebar-collapse-btn desktop-only" onClick={() => setCollapsed(!collapsed)}>
            <FiMenu size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon size={20} className="sidebar-link-icon" />
              {!collapsed && <span className="sidebar-link-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="sidebar-footer">
          <button className="sidebar-link sidebar-logout" onClick={handleLogout}>
            <FiLogOut size={20} className="sidebar-link-icon" />
            {!collapsed && <span className="sidebar-link-label">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
