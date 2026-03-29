import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { FiHeart, FiMail, FiLock, FiUser, FiArrowRight, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import './Auth.css'

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { register } = useAuth()

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await register(form)
      navigate(`/${user.role}`)
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-orbs">
        <div className="orb orb--1"></div>
        <div className="orb orb--2"></div>
      </div>
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <div className="auth-logo-icon"><FiHeart size={22} /></div>
          <span>MediHelper</span>
        </Link>
        <h1>Create Account</h1>
        <p className="auth-subtitle">Join MediHelper and take control of your health</p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontSize: '0.88rem' }}>
            <FiAlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Full Name</label>
            <div className="auth-input-wrap">
              <FiUser size={18} />
              <input type="text" placeholder="John Doe" value={form.name} onChange={e => update('name', e.target.value)} required />
            </div>
          </div>
          <div className="auth-field">
            <label>Email</label>
            <div className="auth-input-wrap">
              <FiMail size={18} />
              <input type="email" placeholder="you@example.com" value={form.email} onChange={e => update('email', e.target.value)} required />
            </div>
          </div>
          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input-wrap">
              <FiLock size={18} />
              <input type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => update('password', e.target.value)} required />
              <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(!showPw)}>
                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn--primary auth-submit" disabled={loading}>
            {loading ? 'Creating account...' : <>Create Account <FiArrowRight size={18} /></>}
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  )
}
