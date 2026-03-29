import { useState, useEffect } from 'react'
import { FiMapPin, FiTruck, FiCheckCircle, FiPackage, FiClock, FiXCircle, FiShoppingCart, FiArrowRight } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { userAPI } from '../../services/api'
import './UserPages.css'

const statusSteps = ['pending', 'preparing', 'ready', 'out_for_delivery', 'delivered']
const stepLabels = ['Order Placed', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered']
const stepIcons = [FiShoppingCart, FiCheckCircle, FiPackage, FiTruck, FiCheckCircle]

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function OrderTracking() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState(null)

  useEffect(() => {
    userAPI.getOrders().then(r => setOrders(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleCancel = async (id) => {
    if (!confirm('Cancel this order? Stock will be restored to your inventory.')) return
    setCancellingId(id)
    try {
      await userAPI.cancelOrder(id)
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' } : o))
    } catch (err) {
      console.error(err)
    } finally {
      setCancellingId(null)
    }
  }

  const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const pastOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status))

  if (loading) return <div className="page"><p>Loading orders...</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Order Tracking</h1>
          <p className="page-subtitle">Track your active and past orders</p>
        </div>
        <Link to="/user/order" className="btn btn--primary">
          <FiShoppingCart size={18} /> New Order
        </Link>
      </div>

      {/* Active Orders */}
      {activeOrders.map(order => {
        const currentStep = statusSteps.indexOf(order.status) + 1
        const items = Array.isArray(order.items) ? order.items : []

        return (
          <div key={order.id} className="card active-order-card" style={{ marginBottom: '20px' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 className="card-title" style={{ marginBottom: '4px' }}><FiTruck size={18} /> Order #{order.id}</h2>
                <small style={{ color: 'var(--text-muted)' }}>{formatDate(order.created_at)} · {timeAgo(order.created_at)}</small>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="status-badge status-badge--primary">{order.status.replace(/_/g, ' ')}</span>
                {order.status !== 'delivered' && (
                  <button className="btn btn--sm"
                    style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}
                    onClick={() => handleCancel(order.id)}
                    disabled={cancellingId === order.id}>
                    <FiXCircle size={14} /> {cancellingId === order.id ? 'Cancelling...' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>

            {/* Estimated Delivery */}
            <div style={{ background: 'rgba(59,143,252,0.06)', borderRadius: 'var(--radius-md)', padding: '12px 16px', margin: '12px 0', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
              <FiClock size={16} color="var(--primary-500)" />
              <span>Estimated delivery: <strong>~2 hours from order</strong></span>
              {order.address && (
                <>
                  <span style={{ color: 'var(--border-color)' }}>|</span>
                  <FiMapPin size={14} color="var(--text-muted)" />
                  <span style={{ color: 'var(--text-secondary)' }}>{order.address}</span>
                </>
              )}
            </div>

            <div className="order-stepper">
              {stepLabels.map((step, i) => {
                const Icon = stepIcons[i]
                return (
                  <div key={i} className={`stepper-step ${i < currentStep ? 'done' : ''} ${i === currentStep ? 'current' : ''}`}>
                    <div className="stepper-dot">
                      {i < currentStep ? <FiCheckCircle size={16} /> : <Icon size={14} />}
                    </div>
                    <span className="stepper-label">{step}</span>
                  </div>
                )
              })}
              <div className="stepper-line">
                <div className="stepper-line__fill" style={{ width: `${(currentStep / (stepLabels.length - 1)) * 100}%` }}></div>
              </div>
            </div>

            <div className="order-items">
              <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '10px' }}>Order Items</h3>
              {items.map((item, i) => (
                <div key={i} className="order-item-row">
                  <span>{item.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>x{item.qty}</span>
                  <span className="price">${Number(item.price).toFixed(2)}</span>
                </div>
              ))}
              <div className="order-item-row order-total">
                <span>Total</span>
                <span></span>
                <span className="price">${Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        )
      })}

      {activeOrders.length === 0 && (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <FiPackage size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>No active orders</p>
          <p style={{ fontSize: '0.88rem', marginBottom: '16px' }}>Place an order to see it tracked here in real-time</p>
          <Link to="/user/order" className="btn btn--primary btn--sm">
            <FiShoppingCart size={14} /> Order Medicine
          </Link>
        </div>
      )}

      {/* Past Orders */}
      {pastOrders.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <h2 className="card-title"><FiPackage size={18} /> Order History</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pastOrders.map((order, i) => (
                  <tr key={i}>
                    <td><strong>#{order.id}</strong></td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>{Array.isArray(order.items) ? order.items.map(i => i.name).join(', ') : '—'}</td>
                    <td>${Number(order.total).toFixed(2)}</td>
                    <td>
                      <span className={`status-badge status-badge--${order.status === 'cancelled' ? 'danger' : 'success'}`}>
                        {order.status === 'cancelled' ? 'Cancelled' : 'Delivered'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
