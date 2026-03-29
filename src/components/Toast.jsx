import { createContext, useContext, useState, useCallback } from 'react'
import { FiCheck, FiX, FiAlertTriangle, FiInfo } from 'react-icons/fi'

const ToastContext = createContext()

export const useToast = () => useContext(ToastContext)

const icons = {
  success: <FiCheck size={18} />,
  error: <FiX size={18} />,
  warning: <FiAlertTriangle size={18} />,
  info: <FiInfo size={18} />,
}

const colors = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.4)', color: '#059669' },
  error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.4)', color: '#dc2626' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)', color: '#d97706' },
  info: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)', color: '#2563eb' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none'
      }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.info
          return (
            <div key={t.id} style={{
              background: c.bg, border: `1px solid ${c.border}`, borderRadius: '12px',
              padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '10px',
              color: c.color, fontWeight: 600, fontSize: '0.9rem', pointerEvents: 'auto',
              backdropFilter: 'blur(12px)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              animation: 'fadeInUp 0.3s ease, fadeOut 0.3s ease 2.7s forwards',
              maxWidth: '380px'
            }}>
              {icons[t.type]}{t.message}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
