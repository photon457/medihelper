import { useEffect, useRef, useState } from 'react'
import { userAPI } from '../services/api'

/**
 * Generates a beep sound using Web Audio API (no external files needed)
 */
function playBeep(audioCtxRef) {
  try {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = audioCtxRef.current
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880  // A5 note — urgent but not annoying
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.5)
  } catch (e) {
    // Audio not supported
  }
}

function parseTimeStr(timeStr) {
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

/**
 * Hook that:
 * 1. Fires browser notifications 5 min before dose
 * 2. Plays continuous alarm beeps when a dose is overdue
 * Returns: { overdueMeds, dismissAlarm }
 */
export function useDoseNotifications() {
  const notifiedRef = useRef(new Set())
  const dismissedRef = useRef(new Set())
  const audioCtxRef = useRef(null)
  const [overdueMeds, setOverdueMeds] = useState([])

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const checkDoses = async () => {
      try {
        const res = await userAPI.dashboard()
        const meds = res.data?.upcomingMeds || []
        const now = new Date()
        const overdueList = []

        meds.forEach(med => {
          if (med.takenToday) return

          const times = med.times || []
          times.forEach(timeStr => {
            if (!timeStr) return
            const key = `${med.id}-${timeStr}-${now.toDateString()}`
            const scheduled = parseTimeStr(timeStr)
            if (!scheduled) return
            const diffMin = (scheduled - now) / 60000

            // Browser notification 5 min before
            if ('Notification' in window && Notification.permission === 'granted') {
              if (diffMin > 3 && diffMin <= 6 && !notifiedRef.current.has(key)) {
                notifiedRef.current.add(key)
                new Notification('💊 MediHelper Reminder', {
                  body: `${med.medicine_name} (${med.dosage}) in ~5 minutes at ${timeStr}`,
                  icon: '/favicon.ico',
                  tag: key,
                  requireInteraction: true
                })
              }
            }

            // Overdue: past the scheduled time and within 2 hours
            if (diffMin < 0 && diffMin > -120 && !dismissedRef.current.has(key)) {
              overdueList.push({ ...med, timeStr, key })
            }
          })
        })

        setOverdueMeds(overdueList)

        // Play alarm beep if there are overdue doses
        if (overdueList.length > 0) {
          playBeep(audioCtxRef)
        }
      } catch (e) {
        // Silently fail
      }
    }

    // Check every 30 seconds for more responsive alarms
    checkDoses()
    const interval = setInterval(checkDoses, 30000)

    return () => clearInterval(interval)
  }, [])

  const dismissAlarm = (key) => {
    dismissedRef.current.add(key)
    setOverdueMeds(prev => prev.filter(m => m.key !== key))
  }

  const dismissAll = () => {
    overdueMeds.forEach(m => dismissedRef.current.add(m.key))
    setOverdueMeds([])
  }

  return { overdueMeds, dismissAlarm, dismissAll }
}
