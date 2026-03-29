import { useState, useEffect } from 'react'
import { FiTruck, FiMapPin, FiPackage, FiDollarSign, FiNavigation, FiPhone, FiCheck, FiCheckCircle, FiUser } from 'react-icons/fi'
import StatCard from '../../components/StatCard'
import { deliveryAPI } from '../../services/api'
import '../user/UserPages.css'

const statusMap = {
  assigned: { label: 'Assigned', color: 'warning' },
  picked_up: { label: 'Picked Up', color: 'primary' },
  in_transit: { label: 'In Transit', color: 'primary' },
  delivered: { label: 'Delivered', color: 'success' },
}
const statusFlow = ['assigned', 'picked_up', 'in_transit', 'delivered']

export default function DeliveryDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    deliveryAPI.dashboard().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const advanceStatus = (id, currentStatus) => {
    const idx = statusFlow.indexOf(currentStatus)
    if (idx < statusFlow.length - 1) {
      const nextStatus = statusFlow[idx + 1]
      deliveryAPI.updateStatus(id, nextStatus, nextStatus === 'delivered' ? 7.00 : undefined)
        .then(() => loadData())
        .catch(console.error)
    }
  }

  if (loading) return <div className="page"><p>Loading dashboard...</p></div>

  const stats = data?.stats || {}
  const activeDeliveries = data?.activeDeliveries || []

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Delivery Dashboard</h1>
          <p className="page-subtitle">You have {activeDeliveries.length} active deliveries</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon={FiTruck} label="Active Deliveries" value={stats.activeDeliveries || 0} color="primary" />
        <StatCard icon={FiCheckCircle} label="Completed Today" value={stats.completedToday || 0} color="success" />
        <StatCard icon={FiDollarSign} label="Today's Earnings" value={`$${Number(stats.todayEarnings || 0).toFixed(0)}`} color="accent" />
        <StatCard icon={FiNavigation} label="Distance Covered" value={stats.distanceCovered || '0 km'} color="warning" />
      </div>

      <div className="map-placeholder">
        <span style={{ zIndex: 1 }}>🗺️ Live Map — Delivery Routes</span>
      </div>

      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Active Deliveries</h2>
      {activeDeliveries.length === 0 && (
        <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <FiCheckCircle size={32} style={{ marginBottom: '12px' }} />
          <p>No active deliveries. Great job!</p>
        </div>
      )}
      <div className="delivery-card-grid">
        {activeDeliveries.map((d, i) => (
          <div key={i} className="delivery-card" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="delivery-card__header">
              <div>
                <strong style={{ fontSize: '1rem' }}>#{d.id}</strong>
                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Order: #{d.order_id}</span>
              </div>
              <span className={`status-badge status-badge--${(statusMap[d.status] || statusMap.assigned).color}`}>
                {(statusMap[d.status] || statusMap.assigned).label}
              </span>
            </div>
            <div className="delivery-card__body">
              <div className="delivery-card__row"><FiUser size={15} /> {d.customer_name}</div>
              <div className="delivery-card__row"><FiMapPin size={15} /> {d.address}</div>
              <div className="delivery-card__row"><FiPhone size={15} /> {d.customer_phone}</div>
              <div className="delivery-card__row"><FiPackage size={15} /> {d.items_count} items</div>
              <div className="delivery-card__row"><FiNavigation size={15} /> {d.distance} · ETA: {d.eta}</div>
            </div>
            <div className="delivery-card__actions">
              <button className="btn btn--primary btn--sm" style={{ flex: 1 }}>
                <FiNavigation size={14} /> Navigate
              </button>
              <button className="btn btn--success btn--sm" style={{ flex: 1 }} onClick={() => advanceStatus(d.id, d.status)}>
                <FiCheck size={14} /> {d.status === 'in_transit' ? 'Mark Delivered' : 'Advance'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
