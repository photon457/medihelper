import { useState, useEffect } from 'react'
import { FiList, FiCheckCircle, FiDollarSign, FiStar } from 'react-icons/fi'
import { deliveryAPI } from '../../services/api'
import '../user/UserPages.css'

export default function DeliveryHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    deliveryAPI.getHistory().then(r => setHistory(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  const todayTotal = history.reduce((s, d) => s + Number(d.earnings || 0), 0)
  const avgRating = history.length > 0
    ? (history.filter(d => d.rating).reduce((s, d) => s + d.rating, 0) / history.filter(d => d.rating).length).toFixed(1)
    : '—'

  if (loading) return <div className="page"><p>Loading history...</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Delivery History</h1>
          <p className="page-subtitle">Your past deliveries and earnings summary</p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)' }}>
            <FiDollarSign size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Earnings</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>${todayTotal.toFixed(2)}</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--primary-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-600)' }}>
            <FiCheckCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Deliveries</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{history.length}</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)' }}>
            <FiStar size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Avg Rating</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>⭐ {avgRating}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title"><FiList size={18} /> All Deliveries</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>ID</th><th>Customer</th><th>Address</th><th>Items</th><th>Distance</th><th>Earnings</th><th>Rating</th></tr>
            </thead>
            <tbody>
              {history.map((d, i) => (
                <tr key={i}>
                  <td><strong>#{d.id}</strong></td>
                  <td>{d.customer_name}</td>
                  <td style={{ maxWidth: '160px' }}>{d.address}</td>
                  <td>{d.items_count}</td>
                  <td>{d.distance}</td>
                  <td><strong style={{ color: 'var(--success)' }}>${Number(d.earnings || 0).toFixed(2)}</strong></td>
                  <td>
                    {d.rating ? (
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {[...Array(d.rating)].map((_, j) => <FiStar key={j} size={12} fill="#f59e0b" color="#f59e0b" />)}
                      </div>
                    ) : '—'}
                  </td>
                </tr>
              ))}
              {history.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No deliveries yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
