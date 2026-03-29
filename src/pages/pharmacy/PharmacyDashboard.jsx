import { useState, useEffect } from 'react'
import { FiPackage, FiDollarSign, FiShoppingCart, FiTrendingUp, FiArrowRight, FiAlertCircle } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import StatCard from '../../components/StatCard'
import { pharmacyAPI } from '../../services/api'
import '../user/UserPages.css'

const statusMap = {
  pending: { label: 'Pending', color: 'warning' },
  preparing: { label: 'Preparing', color: 'primary' },
  ready: { label: 'Ready', color: 'success' },
  dispatched: { label: 'Dispatched', color: 'primary' },
  out_for_delivery: { label: 'In Transit', color: 'primary' },
  delivered: { label: 'Delivered', color: 'success' },
}

export default function PharmacyDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    pharmacyAPI.dashboard().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><p>Loading dashboard...</p></div>

  const stats = data?.stats || {}
  const recentOrders = data?.recentOrders || []
  const lowStockItems = data?.lowStockItems || []

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Pharmacy Dashboard</h1>
          <p className="page-subtitle">Welcome back!</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={FiShoppingCart} label="Today's Orders" value={stats.todayOrders} color="primary" />
        <StatCard icon={FiDollarSign} label="Today's Revenue" value={`$${Number(stats.todayRevenue || 0).toFixed(0)}`} color="success" />
        <StatCard icon={FiPackage} label="Total Products" value={stats.totalProducts} color="accent" />
        <StatCard icon={FiAlertCircle} label="Low Stock Items" value={stats.lowStockCount} color="danger" trend={stats.lowStockCount > 0 ? 'Needs attention' : ''} />
      </div>

      <div className="dashboard-grid">
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h2 className="card-title"><FiShoppingCart size={18} /> Recent Orders</h2>
            <Link to="/pharmacy/orders" className="card-link">View All <FiArrowRight size={14} /></Link>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {recentOrders.map((order, i) => (
                  <tr key={i}>
                    <td><strong>#{order.id}</strong></td>
                    <td>{order.customer_name || 'Customer'}</td>
                    <td>{Array.isArray(order.items) ? order.items.length : 0} items</td>
                    <td>${Number(order.total).toFixed(2)}</td>
                    <td>
                      <span className={`status-badge status-badge--${(statusMap[order.status] || statusMap.pending).color}`}>
                        {(statusMap[order.status] || statusMap.pending).label}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No orders yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><FiAlertCircle size={18} /> Low Stock Alerts</h2>
          </div>
          {lowStockItems.map((item, i) => (
            <div key={i} className="med-item" style={{ marginBottom: '8px' }}>
              <div className="med-item__info" style={{ flex: 1 }}>
                <strong>{item.name}</strong>
                <span className="med-item__type">{item.stock} units left</span>
              </div>
              <span className="status-badge status-badge--danger">Low</span>
            </div>
          ))}
          {lowStockItems.length === 0 && <p style={{ color: 'var(--text-muted)', padding: '12px' }}>All items well stocked!</p>}
          <Link to="/pharmacy/inventory" className="btn btn--outline btn--sm" style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}>
            <FiPackage size={14} /> Manage Inventory
          </Link>
        </div>
      </div>
    </div>
  )
}
