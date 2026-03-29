import { useState, useEffect } from 'react'
import { FiClock, FiPlus, FiEdit2, FiTrash2, FiBell, FiCheck, FiX } from 'react-icons/fi'
import { userAPI } from '../../services/api'
import './UserPages.css'

export default function Reminders() {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newForm, setNewForm] = useState({ medicine_name: '', dosage: '', time: '', frequency: 'Daily' })

  const loadReminders = () => {
    userAPI.getReminders().then(r => setReminders(r.data)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { loadReminders() }, [])

  const toggleReminder = (id, currentActive) => {
    userAPI.updateReminder(id, { active: !currentActive }).then(() => {
      setReminders(prev => prev.map(r => r.id === id ? { ...r, active: !currentActive } : r))
    })
  }

  const deleteReminder = (id) => {
    userAPI.deleteReminder(id).then(() => {
      setReminders(prev => prev.filter(r => r.id !== id))
    })
  }

  const handleAdd = () => {
    if (!newForm.medicine_name || !newForm.dosage || !newForm.time) return
    userAPI.createReminder({
      medicine_name: newForm.medicine_name,
      dosage: newForm.dosage,
      times: [newForm.time],
      frequency: newForm.frequency,
    }).then(r => {
      setReminders(prev => [r.data, ...prev])
      setShowAdd(false)
      setNewForm({ medicine_name: '', dosage: '', time: '', frequency: 'Daily' })
    }).catch(console.error)
  }

  // Build today's schedule from active reminders
  const todaySchedule = []
  reminders.filter(r => r.active).forEach(r => {
    (r.times || []).forEach(t => {
      todaySchedule.push({ time: t, med: r.medicine_name, status: 'upcoming' })
    })
  })
  todaySchedule.sort((a, b) => a.time.localeCompare(b.time))

  if (loading) return <div className="page"><p>Loading reminders...</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Medicine Reminders</h1>
          <p className="page-subtitle">Manage your medication schedules and never miss a dose</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowAdd(!showAdd)}>
          <FiPlus size={18} /> Add Reminder
        </button>
      </div>

      {showAdd && (
        <div className="card add-form-card" style={{ animation: 'fadeInUp 0.3s ease' }}>
          <h3 className="card-title"><FiPlus size={16} /> New Reminder</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Medicine Name</label>
              <input type="text" placeholder="e.g. Metformin 500mg" className="form-input" value={newForm.medicine_name} onChange={e => setNewForm({ ...newForm, medicine_name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Dosage</label>
              <input type="text" placeholder="e.g. 1 tablet" className="form-input" value={newForm.dosage} onChange={e => setNewForm({ ...newForm, dosage: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input type="time" className="form-input" value={newForm.time} onChange={e => setNewForm({ ...newForm, time: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Frequency</label>
              <select className="form-input" value={newForm.frequency} onChange={e => setNewForm({ ...newForm, frequency: e.target.value })}>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Every 8 hours</option>
                <option>Every 12 hours</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn btn--primary" onClick={handleAdd}><FiCheck size={16} /> Save Reminder</button>
            <button className="btn btn--ghost" onClick={() => setShowAdd(false)}><FiX size={16} /> Cancel</button>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Today's Schedule */}
        <div className="card">
          <h2 className="card-title"><FiClock size={18} /> Today's Schedule</h2>
          <div className="schedule-timeline">
            {todaySchedule.length === 0 && <p style={{ color: 'var(--text-muted)', padding: '12px' }}>No doses scheduled</p>}
            {todaySchedule.map((item, i) => (
              <div key={i} className={`schedule-item schedule-item--${item.status}`}>
                <div className="schedule-item__time">{item.time}</div>
                <div className="schedule-item__dot"></div>
                <div className="schedule-item__content">
                  <strong>{item.med}</strong>
                  <span className={`schedule-badge schedule-badge--${item.status}`}>
                    {item.status === 'taken' ? '✓ Taken' : '⏰ Upcoming'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reminder List */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h2 className="card-title"><FiBell size={18} /> All Reminders</h2>
          <div className="reminder-list">
            {reminders.map(r => (
              <div key={r.id} className={`reminder-item ${!r.active ? 'reminder-item--inactive' : ''}`}>
                <div className="reminder-item__toggle">
                  <label className="toggle">
                    <input type="checkbox" checked={r.active} onChange={() => toggleReminder(r.id, r.active)} />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <div className="reminder-item__info">
                  <strong>{r.medicine_name}</strong>
                  <span>{r.dosage} · {r.frequency}</span>
                </div>
                <div className="reminder-item__times">
                  {(r.times || []).map((t, j) => (
                    <span key={j} className="time-badge">{t}</span>
                  ))}
                </div>
                <div className="reminder-item__actions">
                  <button className="icon-btn icon-btn--danger" onClick={() => deleteReminder(r.id)}><FiTrash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
