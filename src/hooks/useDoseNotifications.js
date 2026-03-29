import { useEffect, useRef, useState, useCallback } from 'react'
import { userAPI } from '../services/api'

/* ───────────────────────────────────────────────────────────
 *  Alarm sound — built with Web Audio API, no external files.
 *  Plays a 3-tone urgent chime that repeats every 3 seconds
 *  while overdue doses exist and the alarm isn't dismissed.
 * ─────────────────────────────────────────────────────────── */

function createAlarmSound(audioCtxRef) {
  try {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = audioCtxRef.current

    // Resume context if suspended (autoplay policy)
    if (ctx.state === 'suspended') ctx.resume()

    const now = ctx.currentTime

    // --- Tone 1: attention-grabbing high note ---
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.frequency.value = 880      // A5
    osc1.type = 'square'
    gain1.gain.setValueAtTime(0.25, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
    osc1.start(now)
    osc1.stop(now + 0.2)

    // --- Tone 2: slightly lower ---
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.frequency.value = 698.46   // F5
    osc2.type = 'square'
    gain2.gain.setValueAtTime(0.25, now + 0.25)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45)
    osc2.start(now + 0.25)
    osc2.stop(now + 0.45)

    // --- Tone 3: back up, urgent ---
    const osc3 = ctx.createOscillator()
    const gain3 = ctx.createGain()
    osc3.connect(gain3)
    gain3.connect(ctx.destination)
    osc3.frequency.value = 1046.50  // C6
    osc3.type = 'square'
    gain3.gain.setValueAtTime(0.3, now + 0.5)
    gain3.gain.exponentialRampToValueAtTime(0.01, now + 0.9)
    osc3.start(now + 0.5)
    osc3.stop(now + 0.9)

  } catch (e) {
    // Audio not supported — silently fail
  }
}


/* ───────────────────────────────────────────────────────────
 *  Play notification chime (gentler, for 5-min-before alerts)
 * ─────────────────────────────────────────────────────────── */
function playNotifChime(audioCtxRef) {
  try {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') ctx.resume()

    const now = ctx.currentTime

    // Two gentle tones: ding-dong
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.frequency.value = 523.25   // C5
    osc1.type = 'sine'
    gain1.gain.setValueAtTime(0.2, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.4)
    osc1.start(now)
    osc1.stop(now + 0.4)

    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.frequency.value = 659.25   // E5
    osc2.type = 'sine'
    gain2.gain.setValueAtTime(0.2, now + 0.45)
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.85)
    osc2.start(now + 0.45)
    osc2.stop(now + 0.85)

  } catch (e) { /* silent */ }
}


/* ───────────────────────────────────────────────────────────
 *  Parse "9:00 AM" → Date object (today)
 * ─────────────────────────────────────────────────────────── */
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


/* ═══════════════════════════════════════════════════════════
 *  MAIN HOOK — mount this at DashboardLayout level so it
 *  runs on ALL user pages, not just the dashboard.
 *
 *  Features:
 *  1. Browser Notification 5 min before each dose
 *  2. Sound chime with the notification
 *  3. Overdue alarm: repeating urgent sound every 3 sec
 *  4. Checks every 15 seconds for quick response
 *  5. Alarm overlay data returned for UI rendering
 * ═══════════════════════════════════════════════════════════ */
export function useDoseNotifications(enabled = true) {
  const notifiedRef = useRef(new Set())
  const dismissedRef = useRef(new Set())
  const audioCtxRef = useRef(null)
  const alarmIntervalRef = useRef(null)
  const [overdueMeds, setOverdueMeds] = useState([])
  const [alarmActive, setAlarmActive] = useState(false)

  // Ensure AudioContext is created on first user interaction
  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
  }, [])

  // One-time: enable audio on first user click (autoplay policy workaround)
  useEffect(() => {
    const handler = () => {
      ensureAudioContext()
      document.removeEventListener('click', handler)
      document.removeEventListener('keydown', handler)
    }
    document.addEventListener('click', handler)
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('click', handler)
      document.removeEventListener('keydown', handler)
    }
  }, [ensureAudioContext])

  // Start / stop the repeating alarm sound
  useEffect(() => {
    if (alarmActive && overdueMeds.length > 0) {
      // Play immediately
      createAlarmSound(audioCtxRef)
      // Then repeat every 3 seconds
      alarmIntervalRef.current = setInterval(() => {
        createAlarmSound(audioCtxRef)
      }, 3000)
    } else {
      // Stop alarm
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current)
        alarmIntervalRef.current = null
      }
    }
    return () => {
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current)
        alarmIntervalRef.current = null
      }
    }
  }, [alarmActive, overdueMeds.length])

  // Main dose-checking loop
  useEffect(() => {
    if (!enabled) return

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

            // 5-minute-before notification + chime
            if (diffMin > 3 && diffMin <= 6 && !notifiedRef.current.has(key)) {
              notifiedRef.current.add(key)

              // Play gentle chime sound
              playNotifChime(audioCtxRef)

              // Browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
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

        // Activate alarm if there are new overdue doses
        if (overdueList.length > 0) {
          setAlarmActive(true)
        }
      } catch (e) {
        // Silently fail — user might not be logged in
      }
    }

    // Check every 15 seconds for faster response
    checkDoses()
    const interval = setInterval(checkDoses, 15000)

    return () => clearInterval(interval)
  }, [enabled])

  const dismissAlarm = useCallback((key) => {
    dismissedRef.current.add(key)
    setOverdueMeds(prev => {
      const next = prev.filter(m => m.key !== key)
      if (next.length === 0) setAlarmActive(false)
      return next
    })
  }, [])

  const dismissAll = useCallback(() => {
    overdueMeds.forEach(m => dismissedRef.current.add(m.key))
    setOverdueMeds([])
    setAlarmActive(false)
  }, [overdueMeds])

  return { overdueMeds, alarmActive, dismissAlarm, dismissAll }
}
