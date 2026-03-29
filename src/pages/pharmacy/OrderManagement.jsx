import { useState, useEffect } from 'react'
import { FiList, FiEye, FiCheck } from 'react-icons/fi'
import { pharmacyAPI } from '../../services/api'
import '../user/UserPages.css'

const statusFlow = ['pending', 'preparing', 'ready', 'dispatched', 'delivered']
const statusMap = {
  pending: { label: 'Pending', color: 'warning' },
  preparing: { label: 'Preparing', color: 'primary' },
  ready: { label: 'Ready', color: 'success' },
  dispatched: { label: 'Dispatched', color: 'primary' },
  out_for_delivery: { label: 'In Transit', color: 'primary' },
  delivered: { label: 'Delivered', color: 'success' },
}
const tabs = ['All', 'Pending', 'Preparing', 'Ready', 'Dispatched', 'Delivered']

export default function OrderManagement() {
  const [orders, setOrders] = useState([])
  const [activeTab, setActiveTab] = useState('All')
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    pharmacyAPI.getOrders().then(r => setOrders(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = activeTab === 'All' ? orders : orders.filter(o => o.status === activeTab.toLowerCase())

  const advanceStatus = (id, currentStatus) => {
    const idx = statusFlow.indexOf(currentStatus)
    if (idx < statusFlow.length - 1) {
      const nextStatus = statusFlow[idx + 1]
      pharmacyAPI.updateOrderStatus(id, nextStatus).then(() => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: nextStatus } : o))
      }).catch(console.error)
    }
  }

  if (loading) return <div className="page"><p>Loading orders...</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Order Management</h1>
          <p className="page-subtitle">Process and track incoming orders</p>
        </div>
      </div>

      <div className="category-pills" style={{ marginBottom: '20px' }}>
        {tabs.map(t => (
          <button key={t} className={`pill ${activeTab === t ? 'pill--active' : ''}`} onClick={() => setActiveTab(t)}>
            {t} {t !== 'All' && `(${orders.filter(o => o.status === t.toLowerCase()).length})`}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(order => (
                <>
                  <tr key={order.id}>
                    <td><strong>#{order.id}</strong></td>
                    <td>{order.customer_name || 'Customer'}</td>
                    <td>{Array.isArray(order.items) ? order.items.length : 0} items</td>
                    <td><strong>${Number(order.total).toFixed(2)}</strong></td>
                    <td>
                      <span className={`status-badge status-badge--${(statusMap[order.status] || statusMap.pending).color}`}>
                        {(statusMap[order.status] || statusMap.pending).label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="icon-btn" title="View Details" onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                          <FiEye size={15} />
                        </button>
                        {order.status !== 'delivered' && (
                          <button className="btn btn--primary btn--sm" onClick={() => advanceStatus(order.id, order.status)}>
                            {order.status === 'pending' ? 'Accept' : order.status === 'preparing' ? 'Mark Ready' : order.status === 'ready' ? 'Dispatch' : 'Complete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === order.id && (
                    <tr key={`${order.id}-details`}>
                      <td colSpan="6" style={{ background: 'var(--gray-50)', padding: '16px 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.88rem' }}>
                          <div><strong>Phone:</strong> {order.customer_phone || '—'}</div>
                          <div><strong>Address:</strong> {order.customer_address || order.address || '—'}</div>
                          <div style={{ gridColumn: 'span 2' }}>
                            <strong>Items:</strong>
                            <ul style={{ paddingLeft: '18px', marginTop: '4px', listStyle: 'disc' }}>
                              {(Array.isArray(order.items) ? order.items : []).map((item, j) => (
                                <li key={j}>{typeof item === 'string' ? item : `${item.name} x${item.qty}`}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filtered.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No orders</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
