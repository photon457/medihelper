import { useState, useEffect } from 'react'
import { FiTrendingUp, FiDollarSign, FiShoppingCart, FiPackage, FiUsers } from 'react-icons/fi'
import StatCard from '../../components/StatCard'
import { pharmacyAPI } from '../../services/api'
import '../user/UserPages.css'

const chartColors = ['#3b8ffc', '#8b5cf6', '#10b981', '#f59e0b', '#6b7280', '#ef4444', '#06b6d4']

export default function PharmacyAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    pharmacyAPI.analytics().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page"><p>Loading analytics...</p></div>

  const stats = data?.stats || {}
  const categoryBreakdown = data?.categoryBreakdown || []
  const topProducts = data?.topProducts || []

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Insights into your pharmacy performance</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={FiDollarSign} label="Total Revenue" value={`$${Number(stats.monthlyRevenue || 0).toFixed(0)}`} color="success" />
        <StatCard icon={FiShoppingCart} label="Total Orders" value={stats.totalOrders || 0} color="primary" />
        <StatCard icon={FiUsers} label="Active Customers" value={stats.activeCustomers || 0} color="accent" />
        <StatCard icon={FiPackage} label="Products in Stock" value={stats.productsSold || 0} color="warning" />
      </div>

      <div className="dashboard-grid">
        {/* Category Donut */}
        <div className="card">
          <h2 className="card-title"><FiPackage size={18} /> Sales by Category</h2>
          {categoryBreakdown.length > 0 ? (
            <div className="donut-wrap" style={{ marginTop: '20px' }}>
              <div className="donut" style={{
                background: `conic-gradient(${categoryBreakdown.map((c, i) => {
                  const start = categoryBreakdown.slice(0, i).reduce((s, x) => s + x.percent, 0)
                  return `${chartColors[i % chartColors.length]} ${start}% ${start + c.percent}%`
                }).join(', ')})`
              }}>
                <div className="donut-center">
                  <strong>100%</strong>
                  <span>Total</span>
                </div>
              </div>
              <div className="donut-legend">
                {categoryBreakdown.map((c, i) => (
                  <div key={i} className="donut-legend-item">
                    <div className="donut-legend-dot" style={{ background: chartColors[i % chartColors.length] }}></div>
                    <span>{c.name} ({c.percent}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p style={{ color: 'var(--text-muted)', padding: '20px' }}>No data yet</p>}
        </div>

        {/* Top Products */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h2 className="card-title"><FiTrendingUp size={18} /> Top Products</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>#</th><th>Product</th><th>Units</th><th>Revenue</th></tr></thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i}>
                    <td>
                      <span style={{
                        display: 'inline-flex', width: '28px', height: '28px', borderRadius: '50%',
                        background: i < 3 ? 'linear-gradient(135deg, var(--primary-500), var(--accent))' : 'var(--gray-200)',
                        color: i < 3 ? '#fff' : 'var(--text-muted)', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.78rem', fontWeight: 700
                      }}>{i + 1}</span>
                    </td>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.sold}</td>
                    <td><strong>${Number(p.revenue).toFixed(2)}</strong></td>
                  </tr>
                ))}
                {topProducts.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No data yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
