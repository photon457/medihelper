import './Skeleton.css'

export function SkeletonLine({ width = '100%', height = '14px' }) {
  return <div className="skeleton-line" style={{ width, height }} />
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="skeleton-card">
      <SkeletonLine width="60%" height="18px" />
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={`${80 - i * 15}%`} />
      ))}
    </div>
  )
}

export function SkeletonStatCards({ count = 4 }) {
  return (
    <div className="skeleton-stats">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-stat">
          <SkeletonLine width="70%" height="12px" />
          <SkeletonLine width="40%" height="28px" />
          <SkeletonLine width="50%" height="10px" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 4, cols = 5 }) {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="skeleton-table-row">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={`${60 + Math.random() * 40}%`} />
          ))}
        </div>
      ))}
    </div>
  )
}
