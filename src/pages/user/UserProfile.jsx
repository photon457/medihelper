import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiUser, FiMail, FiPhone, FiMapPin, FiEdit2, FiSave, FiShield, FiBell, FiTrash2, FiAlertTriangle, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { userAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/Toast'
import { SkeletonCard } from '../../components/Skeleton'
import './UserPages.css'

export default function UserProfile() {
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const navigate = useNavigate()
  const { logout } = useAuth()
  const toast = useToast()

  useEffect(() => {
    userAPI.getProfile().then(r => setProfile(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleSave = () => {
    userAPI.updateProfile(profile)
      .then(() => { setEditing(false); toast('Profile updated', 'success') })
      .catch(() => toast('Failed to update profile', 'error'))
  }

  const handleChangePassword = async () => {
    if (!pwForm.oldPassword || !pwForm.newPassword) return toast('Fill in all password fields', 'warning')
    if (pwForm.newPassword.length < 6) return toast('New password must be at least 6 characters', 'warning')
    if (pwForm.newPassword !== pwForm.confirm) return toast('Passwords do not match', 'warning')
    setChangingPw(true)
    try {
      await userAPI.changePassword({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword })
      setPwForm({ oldPassword: '', newPassword: '', confirm: '' })
      toast('Password changed successfully', 'success')
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to change password'
      toast(msg, 'error')
    } finally {
      setChangingPw(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await userAPI.deleteAccount()
      logout()
      navigate('/')
    } catch (err) {
      toast('Failed to delete account', 'error')
      setDeleting(false)
    }
  }

  if (loading || !profile) return (
    <div className="page">
      <div className="page-header"><div><h1 className="page-title">My Profile</h1></div></div>
      <SkeletonCard lines={6} />
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your personal information and preferences</p>
        </div>
        <button className="btn btn--primary" onClick={() => editing ? handleSave() : setEditing(true)}>
          {editing ? <><FiSave size={18} /> Save Changes</> : <><FiEdit2 size={18} /> Edit Profile</>}
        </button>
      </div>

      <div className="dashboard-grid">
        <div className="card profile-card" style={{ gridColumn: 'span 2' }}>
          <div className="profile-header">
            <div className="profile-avatar">
              <span>{(profile.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <h2>{profile.name}</h2>
              <span className="profile-badge">Patient</span>
            </div>
          </div>

          <div className="profile-fields">
            <div className="profile-field">
              <label><FiUser size={15} /> Full Name</label>
              {editing ? <input className="form-input" value={profile.name || ''} onChange={e => setProfile({...profile, name: e.target.value})} /> : <span>{profile.name}</span>}
            </div>
            <div className="profile-field">
              <label><FiMail size={15} /> Email</label>
              <span>{profile.email}</span>
            </div>
            <div className="profile-field">
              <label><FiPhone size={15} /> Phone</label>
              {editing ? <input className="form-input" value={profile.phone || ''} onChange={e => setProfile({...profile, phone: e.target.value})} /> : <span>{profile.phone || '—'}</span>}
            </div>
            <div className="profile-field">
              <label><FiMapPin size={15} /> Address</label>
              {editing ? <input className="form-input" value={profile.address || ''} onChange={e => setProfile({...profile, address: e.target.value})} /> : <span>{profile.address || '—'}</span>}
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title"><FiShield size={18} /> Medical Info</h2>
          <div className="medical-info-list">
            <div className="medical-info-item">
              <span className="medical-info-label">Age</span>
              <span className="medical-info-value">{profile.age ? `${profile.age} years` : '—'}</span>
            </div>
            <div className="medical-info-item">
              <span className="medical-info-label">Blood Group</span>
              <span className="medical-info-value">{profile.blood_group || '—'}</span>
            </div>
            <div className="medical-info-item">
              <span className="medical-info-label">Emergency Contact</span>
              <span className="medical-info-value">{profile.emergency_contact || '—'}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title"><FiBell size={18} /> Notifications</h2>
          <div className="pref-list">
            {['Medicine Reminders', 'Low Stock Alerts', 'Order Updates', 'Weekly Summary', 'SMS Notifications'].map((pref, i) => (
              <div key={i} className="pref-item">
                <span>{pref}</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked={i < 3} />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="card" style={{ marginTop: '24px' }}>
        <h2 className="card-title"><FiLock size={18} /> Change Password</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', alignItems: 'end' }}>
          <div className="form-group">
            <label>Current Password</label>
            <div style={{ position: 'relative' }}>
              <input className="form-input" type={showPw ? 'text' : 'password'} placeholder="Current password"
                value={pwForm.oldPassword} onChange={e => setPwForm(p => ({ ...p, oldPassword: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input className="form-input" type={showPw ? 'text' : 'password'} placeholder="New password (min 6 chars)"
              value={pwForm.newPassword} onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input className="form-input" type={showPw ? 'text' : 'password'} placeholder="Confirm password"
              value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '14px', alignItems: 'center' }}>
          <button className="btn btn--ghost btn--sm" onClick={() => setShowPw(!showPw)}>
            {showPw ? <FiEyeOff size={14} /> : <FiEye size={14} />} {showPw ? 'Hide' : 'Show'} passwords
          </button>
          <button className="btn btn--primary btn--sm" onClick={handleChangePassword} disabled={changingPw}>
            <FiLock size={14} /> {changingPw ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card" style={{ marginTop: '24px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.02)' }}>
        <h2 className="card-title" style={{ color: 'var(--danger)' }}><FiAlertTriangle size={18} /> Danger Zone</h2>
        {!showDeleteConfirm ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <strong>Delete Account</strong>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                Permanently delete your account and all data. This action cannot be undone.
              </p>
            </div>
            <button className="btn" onClick={() => setShowDeleteConfirm(true)}
              style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.3)', flexShrink: 0 }}>
              <FiTrash2 size={16} /> Delete Account
            </button>
          </div>
        ) : (
          <div style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius-md)', padding: '20px', textAlign: 'center' }}>
            <FiAlertTriangle size={28} color="var(--danger)" />
            <p style={{ fontWeight: 700, fontSize: '1.05rem', margin: '10px 0 6px' }}>Are you absolutely sure?</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px' }}>
              This will permanently delete all your medicines, reminders, orders, and profile data.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn btn--ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn" onClick={handleDeleteAccount} disabled={deleting}
                style={{ background: 'var(--danger)', color: '#fff', border: 'none' }}>
                <FiTrash2 size={16} /> {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
