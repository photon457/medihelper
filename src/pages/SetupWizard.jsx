import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiHeart, FiPlus, FiTrash2, FiArrowRight, FiArrowLeft, FiCheck, FiClock, FiPackage, FiShoppingCart, FiBell } from 'react-icons/fi'
import { userAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import './SetupWizard.css'

const CATEGORIES = ['Diabetes', 'Blood Pressure', 'Heart', 'Gastric', 'Pain Relief', 'Antibiotic', 'Supplement', 'Allergy', 'Cholesterol', 'Other']
const FREQUENCIES = ['Daily', 'Twice Daily', 'Every 8 hours', 'Every 12 hours', 'Weekly']

const emptyMed = () => ({
  name: '', category: 'Other', dosage: '1 tablet', stock: 30, total: 30,
  expires: '', times: ['9:00 AM'], frequency: 'Daily'
})

export default function SetupWizard() {
  const [step, setStep] = useState(0) // 0=welcome, 1=medicines, 2=done
  const [medicines, setMedicines] = useState([emptyMed()])
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuth()

  const updateMed = (idx, key, val) => {
    setMedicines(prev => prev.map((m, i) => i === idx ? { ...m, [key]: val } : m))
  }

  const addMed = () => setMedicines(prev => [...prev, emptyMed()])

  const removeMed = (idx) => {
    if (medicines.length <= 1) return
    setMedicines(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    const validMeds = medicines.filter(m => m.name.trim())
    if (validMeds.length === 0) return

    setSaving(true)
    try {
      await userAPI.submitSetup({ medicines: validMeds })
      setStep(2)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const validCount = medicines.filter(m => m.name.trim()).length

  return (
    <div className="setup-wizard">
      <div className="setup-wizard__bg-orbs">
        <div className="orb orb--1"></div>
        <div className="orb orb--2"></div>
      </div>

      <div className="setup-wizard__card">
        {/* Progress */}
        {step < 2 && (
          <div className="setup-progress">
            {['Welcome', 'Medicines', 'Done'].map((label, i) => (
              <div key={i} className="setup-progress__step">
                <div className={`setup-progress__dot ${i < step ? 'done' : ''} ${i === step ? 'active' : ''}`}>
                  {i < step ? <FiCheck size={14} /> : i + 1}
                </div>
                {i < 2 && <div className={`setup-progress__line ${i < step ? 'done' : ''}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div>
            <div className="setup-step__header">
              <div className="setup-step__emoji">👋</div>
              <h2>Welcome to MediHelper{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</h2>
              <p>Let's set up your medicines so we can help you stay on track</p>
            </div>

            <div className="setup-welcome-features">
              <div className="setup-welcome-feature">
                <div className="setup-welcome-feature__icon" style={{ background: 'var(--primary-50)', color: 'var(--primary-600)' }}>
                  <FiClock size={20} />
                </div>
                <span>Smart Reminders</span>
              </div>
              <div className="setup-welcome-feature">
                <div className="setup-welcome-feature__icon" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--success)' }}>
                  <FiPackage size={20} />
                </div>
                <span>Stock Tracking</span>
              </div>
              <div className="setup-welcome-feature">
                <div className="setup-welcome-feature__icon" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--accent)' }}>
                  <FiShoppingCart size={20} />
                </div>
                <span>Easy Reordering</span>
              </div>
              <div className="setup-welcome-feature">
                <div className="setup-welcome-feature__icon" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--warning)' }}>
                  <FiBell size={20} />
                </div>
                <span>Low Stock Alerts</span>
              </div>
            </div>

            <div className="setup-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn--primary btn--lg" onClick={() => setStep(1)}>
                Let's Get Started <FiArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Add medicines */}
        {step === 1 && (
          <div>
            <div className="setup-step__header">
              <div className="setup-step__emoji">💊</div>
              <h2>Add Your Medicines</h2>
              <p>Tell us which medicines you take regularly</p>
            </div>

            <div className="setup-med-list">
              {medicines.map((med, idx) => (
                <div key={idx} className="setup-med-item">
                  <div className="setup-med-item__header">
                    <span className="setup-med-item__num">Medicine {idx + 1}</span>
                    {medicines.length > 1 && (
                      <button className="icon-btn icon-btn--danger" onClick={() => removeMed(idx)}>
                        <FiTrash2 size={15} />
                      </button>
                    )}
                  </div>
                  <div className="form-grid">
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label>Medicine Name *</label>
                      <input className="form-input" placeholder="e.g. Metformin 500mg" value={med.name}
                        onChange={e => updateMed(idx, 'name', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <select className="form-input" value={med.category} onChange={e => updateMed(idx, 'category', e.target.value)}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Dosage</label>
                      <input className="form-input" placeholder="e.g. 1 tablet" value={med.dosage}
                        onChange={e => updateMed(idx, 'dosage', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Frequency</label>
                      <select className="form-input" value={med.frequency} onChange={e => updateMed(idx, 'frequency', e.target.value)}>
                        {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Current Stock</label>
                      <input className="form-input" type="number" min="0" value={med.stock}
                        onChange={e => updateMed(idx, 'stock', Number(e.target.value))} />
                    </div>
                    <div className="form-group">
                      <label>Total (pack size)</label>
                      <input className="form-input" type="number" min="1" value={med.total}
                        onChange={e => updateMed(idx, 'total', Number(e.target.value))} />
                    </div>
                    <div className="form-group">
                      <label>Expiry Date</label>
                      <input className="form-input" type="date" value={med.expires}
                        onChange={e => updateMed(idx, 'expires', e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}

              <button className="setup-add-btn" onClick={addMed}>
                <FiPlus size={18} /> Add Another Medicine
              </button>
            </div>

            <div className="setup-actions">
              <button className="btn btn--ghost" onClick={() => setStep(0)}>
                <FiArrowLeft size={16} /> Back
              </button>
              <button className="btn btn--primary" onClick={handleSubmit} disabled={validCount === 0 || saving}>
                {saving ? 'Setting up...' : <>{`Save ${validCount} Medicine${validCount !== 1 ? 's' : ''}`} <FiArrowRight size={16} /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Success */}
        {step === 2 && (
          <div className="setup-success">
            <div className="setup-success__check">
              <FiCheck size={36} />
            </div>
            <h2>You're All Set! 🎉</h2>
            <p>Your medicines and reminders have been configured</p>

            <div className="setup-summary">
              {medicines.filter(m => m.name.trim()).map((med, i) => (
                <div key={i} className="setup-summary__item">
                  <FiCheck size={16} />
                  <span><strong>{med.name}</strong> — {med.dosage}, {med.frequency}</span>
                </div>
              ))}
            </div>

            <button className="btn btn--primary btn--lg" onClick={() => navigate('/user')}>
              Go to Dashboard <FiArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
