import './StatCard.css'

export default function StatCard({ icon: Icon, label, value, trend, trendUp, color = 'primary' }) {
  return (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-card__icon-wrap">
        {Icon && <Icon size={22} />}
      </div>
      <div className="stat-card__content">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__value">{value}</span>
        {trend && (
          <span className={`stat-card__trend ${trendUp ? 'up' : 'down'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
    </div>
  )
}
