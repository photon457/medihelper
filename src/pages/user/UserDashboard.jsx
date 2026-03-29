import { useState, useEffect } from 'react'
import { FiClock, FiPackage, FiShoppingCart, FiTruck, FiAlertCircle, FiCheckCircle, FiCalendar, FiArrowRight, FiPlus, FiBell } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import StatCard from '../../components/StatCard'
import { useAuth } from '../../context/AuthContext'
import { userAPI } from '../../services/api'
import { useToast } from '../../components/Toast'
import { SkeletonStatCards, SkeletonCard } from '../../components/Skeleton'
import { useDoseNotifications } from '../../hooks/useDoseNotifications'
import './UserPages.css'

export default function UserDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  )

  // Activate dose notification + alarm system
  const { overdueMeds, dismissAlarm, dismissAll } = useDoseNotifications()

  useEffect(() => {
    userAPI.dashboard().then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="page">
      <div className="page-header"><div><h1 className="page-title">Dashboard</h1></div></div>
      <SkeletonStatCards count={4} />
      <div className="dashboard-grid"><SkeletonCard lines={3} /><SkeletonCard lines={4} /></div>
    </div>
  )

  const stats = data?.stats || {}
  const upcomingMeds = data?.upcomingMeds || []
  const recentOrders = data?.recentOrders || []

  const firstName = user?.name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  // Helper: check if current time is within ±30 min of a scheduled time like "9:00 AM"
  const isWithinTimeWindow = (timeStr) => {
    if (!timeStr) return false
    try {
      const now = new Date()
      const [time, ampm] = timeStr.trim().split(' ')
      let [h, m] = time.split(':').map(Number)
      if (ampm?.toUpperCase() === 'PM' && h !== 12) h += 12
      if (ampm?.toUpperCase() === 'AM' && h === 12) h = 0
      const scheduled = new Date()
      scheduled.setHours(h, m || 0, 0, 0)
      const diff = Math.abs(now - scheduled) / 60000  // minutes
      return diff <= 30
    } catch { return false }
  }

  const getTimeStatus = (timeStr) => {
    if (!timeStr) return 'none'
    try {
      const now = new Date()
      const [time, ampm] = timeStr.trim().split(' ')
      let [h, m] = time.split(':').map(Number)
      if (ampm?.toUpperCase() === 'PM' && h !== 12) h += 12
      if (ampm?.toUpperCase() === 'AM' && h === 12) h = 0
      const scheduled = new Date()
      scheduled.setHours(h, m || 0, 0, 0)
      const diff = (now - scheduled) / 60000
      if (diff < -30) return 'upcoming'  // not yet
      if (diff > 30) return 'missed'     // window passed
      return 'active'                     // within window
    } catch { return 'none' }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{greeting}, {firstName} 👋</h1>
          <p className="page-subtitle">Here's your medication overview for today</p>
        </div>
        <div className="page-header-date">
          <FiCalendar size={16} />
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Notification Permission Banner */}
      {notifPermission !== 'granted' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,143,252,0.08), rgba(139,92,246,0.08))',
          border: '1px solid rgba(59,143,252,0.2)', borderRadius: 'var(--radius-lg)',
          padding: '14px 20px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiBell size={20} color="var(--primary-500)" />
            <div>
              <strong style={{ fontSize: '0.9rem' }}>Enable Dose Reminders</strong>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Get notified 5 minutes before each scheduled dose
              </p>
            </div>
          </div>
          <button className="btn btn--primary btn--sm" onClick={() => {
            Notification.requestPermission().then(p => {
              setNotifPermission(p)
              if (p === 'granted') toast('Dose reminders enabled! 🔔', 'success')
            })
          }}>
            <FiBell size={14} /> Enable
          </button>
        </div>
      )}

      {/* Overdue Alarm Banner */}
      {overdueMeds.length > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '2px solid rgba(239,68,68,0.4)',
          borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: '16px',
          animation: 'pulse-alarm 1s ease infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>🔔</span>
              <strong style={{ color: 'var(--danger)', fontSize: '1rem' }}>Overdue Doses!</strong>
            </div>
            <button className="btn btn--sm" onClick={dismissAll}
              style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)' }}>
              Dismiss All
            </button>
          </div>
          {overdueMeds.map(med => (
            <div key={med.key} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', background: 'rgba(239,68,68,0.04)', borderRadius: 'var(--radius-md)', marginBottom: '6px'
            }}>
              <div>
                <strong>{med.medicine_name}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.85rem' }}>
                  {med.dosage} · Scheduled at {med.timeStr}
                </span>
              </div>
              <button className="btn btn--sm btn--ghost" onClick={() => dismissAlarm(med.key)}>Dismiss</button>
            </div>
          ))}
        </div>
      )}

      <div className="stats-grid">
        <StatCard icon={FiClock} label="Today's Doses" value={`${stats.dosesTaken} / ${stats.totalDosesToday}`} color="primary" trend={`${stats.totalDosesToday - stats.dosesTaken} remaining`} />
        <StatCard icon={FiCheckCircle} label="Medicines" value={stats.medicineCount} color="success" />
        <StatCard icon={FiPackage} label="Low Stock" value={stats.lowStockCount} color="warning" trend={stats.lowStockCount > 0 ? 'Needs attention' : 'All good'} />
        <StatCard icon={FiShoppingCart} label="Active Orders" value={stats.activeOrders} color="accent" />
      </div>

      <div className="dashboard-grid">
        {/* Today's Doses — time-based */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><FiClock size={18} /> Today's Schedule</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Take within ±30 min of scheduled time</span>
          </div>
          <div className="upcoming-meds">
            {upcomingMeds.length === 0 && <p style={{ color: 'var(--text-muted)', padding: '12px' }}>No medicines scheduled today</p>}
            {upcomingMeds.map((med, i) => {
              const doseTime = (med.times || [])[0] || ''
              const timeStatus = getTimeStatus(doseTime)
              const canTake = !med.takenToday && timeStatus === 'active'

              return (
                <div key={i} className="med-item">
                  <div className="med-item__time" style={{
                    color: timeStatus === 'active' ? 'var(--primary-600)' : timeStatus === 'missed' ? 'var(--danger)' : 'var(--text-muted)',
                    fontWeight: timeStatus === 'active' ? 700 : 500
                  }}>{doseTime}</div>
                  <div className="med-item__info">
                    <strong>{med.medicine_name}</strong>
                    <span className="med-item__type">{med.dosage} · {med.frequency}</span>
                  </div>
                  {med.takenToday ? (
                    <span className="btn btn--sm" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)', border: '1px solid rgba(16,185,129,0.3)', cursor: 'default', pointerEvents: 'none' }}>
                      ✓ Taken
                    </span>
                  ) : canTake ? (
                    <button className="btn btn--primary btn--sm" onClick={() => {
                      userAPI.takeDose(med.id).then(() => {
                        setData(prev => ({
                          ...prev,
                          stats: { ...prev.stats, dosesTaken: Math.min(prev.stats.dosesTaken + 1, prev.stats.totalDosesToday) },
                          upcomingMeds: prev.upcomingMeds.map(m => m.id === med.id ? { ...m, takenToday: true } : m)
                        }))
                        toast(`${med.medicine_name} dose taken ✓`, 'success')
                      }).catch(() => toast('Already taken today', 'info'))
                    }}>Take Now</button>
                  ) : (
                    <span className="btn btn--sm" style={{
                      background: timeStatus === 'missed' ? 'rgba(239,68,68,0.08)' : 'rgba(107,114,128,0.08)',
                      color: timeStatus === 'missed' ? 'var(--danger)' : 'var(--text-muted)',
                      border: `1px solid ${timeStatus === 'missed' ? 'rgba(239,68,68,0.2)' : 'rgba(107,114,128,0.2)'}`,
                      cursor: 'default', pointerEvents: 'none', fontSize: '0.78rem'
                    }}>
                      {timeStatus === 'missed' ? '⏰ Missed' : '🕐 Not yet'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><FiCalendar size={18} /> Recent Orders</h2>
          </div>
          <div className="activity-list">
            {recentOrders.length === 0 && <p style={{ color: 'var(--text-muted)', padding: '12px' }}>No orders yet</p>}
            {recentOrders.map((order, i) => (
              <div key={i} className="activity-item">
                <div className={`activity-item__icon activity-item__icon--${order.status === 'delivered' ? 'success' : 'primary'}`}>
                  {order.status === 'delivered' ? <FiCheckCircle size={16} /> : <FiTruck size={16} />}
                </div>
                <div className="activity-item__content">
                  <span>Order #{order.id} — ${Number(order.total).toFixed(2)}</span>
                  <small>{order.status}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card quick-actions-card">
          <h2 className="card-title">Quick Actions</h2>
          <div className="quick-actions">
            <Link to="/user/order" className="quick-action quick-action--primary">
              <FiShoppingCart size={22} />
              <span>Order Medicine</span>
            </Link>
            <Link to="/user/inventory" className="quick-action quick-action--accent">
              <FiPackage size={22} />
              <span>My Medicines</span>
            </Link>
            <Link to="/user/tracking" className="quick-action quick-action--success">
              <FiTruck size={22} />
              <span>Track Delivery</span>
            </Link>
            <Link to="/user/inventory" className="quick-action quick-action--warning">
              <FiPlus size={22} />
              <span>Add Medicine</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
