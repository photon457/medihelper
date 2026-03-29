import { FiAlertCircle, FiX, FiCheck } from 'react-icons/fi'
import './AlarmOverlay.css'

export default function AlarmOverlay({ overdueMeds, dismissAlarm, dismissAll }) {
  if (!overdueMeds || overdueMeds.length === 0) return null

  return (
    <div className="alarm-overlay">
      <div className="alarm-panel">
        {/* Pulsing icon */}
        <div className="alarm-icon-wrap">
          <div className="alarm-icon-pulse" />
          <div className="alarm-icon">
            <FiAlertCircle size={28} />
          </div>
        </div>

        <div className="alarm-content">
          <h3 className="alarm-title">⏰ Overdue Dose{overdueMeds.length > 1 ? 's' : ''}!</h3>
          <p className="alarm-subtitle">You have {overdueMeds.length} dose{overdueMeds.length > 1 ? 's' : ''} past their scheduled time</p>

          <div className="alarm-items">
            {overdueMeds.map(med => {
              const scheduled = parseTime(med.timeStr)
              const now = new Date()
              const lateMin = scheduled ? Math.round((now - scheduled) / 60000) : 0

              return (
                <div key={med.key} className="alarm-med-item">
                  <div className="alarm-med-info">
                    <strong>{med.medicine_name}</strong>
                    <span>{med.dosage} · Scheduled at {med.timeStr}</span>
                    {lateMin > 0 && <span className="alarm-late-badge">{lateMin} min late</span>}
                  </div>
                  <button className="alarm-dismiss-btn" onClick={() => dismissAlarm(med.key)} title="Dismiss">
                    <FiCheck size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <button className="alarm-dismiss-all" onClick={dismissAll}>
          <FiX size={16} /> Dismiss All
        </button>
      </div>
    </div>
  )
}

function parseTime(timeStr) {
  if (!timeStr) return null
  try {
    const [time, ampm] = timeStr.trim().split(' ')
    let [h, m] = time.split(':').map(Number)
    if (ampm?.toUpperCase() === 'PM' && h !== 12) h += 12
    if (ampm?.toUpperCase() === 'AM' && h === 12) h = 0
    const d = new Date()
    d.setHours(h, m || 0, 0, 0)
    return d
  } catch { return null }
}
