import { useState, useEffect } from 'react'
import { FiPackage, FiAlertTriangle, FiShoppingCart, FiSearch, FiPlus, FiX, FiTrash2 } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { userAPI } from '../../services/api'
import { useToast } from '../../components/Toast'
import { SkeletonTable } from '../../components/Skeleton'
import './UserPages.css'

const statusColors = { good: 'success', low: 'warning', critical: 'danger' }
const statusLabels = { good: 'In Stock', low: 'Low Stock', critical: 'Critical' }
const CATEGORIES = ['Diabetes', 'Blood Pressure', 'Heart', 'Gastric', 'Pain Relief', 'Antibiotic', 'Supplement', 'Allergy', 'Cholesterol', 'Other']
const FREQUENCIES = ['Daily', 'Twice Daily', 'Every 8 hours', 'Every 12 hours', 'Weekly']

const emptyForm = { name: '', category: 'Other', dosage: '1 tablet', stock: 30, total: 30, expires: '', frequency: 'Daily', times: ['9:00 AM'] }

export default function MedicineInventory() {
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  useEffect(() => {
    userAPI.getMedicines().then(r => setMedicines(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await userAPI.addMedicine(form)
      const r = await userAPI.getMedicines()
      setMedicines(r.data)
      setForm({ ...emptyForm })
      setShowAdd(false)
      toast(`${form.name} added successfully`, 'success')
    } catch (err) {
      toast('Failed to add medicine', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (med) => {
    if (!confirm(`Delete ${med.name}? This will also remove its reminder.`)) return
    try {
      await userAPI.deleteMedicine(med.id)
      setMedicines(prev => prev.filter(m => m.id !== med.id))
      toast(`${med.name} deleted`, 'success')
    } catch (err) {
      toast('Failed to delete medicine', 'error')
    }
  }

  const lowCount = medicines.filter(m => m.status === 'low' || m.status === 'critical').length
  const filtered = medicines.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return (
    <div className="page">
      <div className="page-header"><div><h1 className="page-title">My Medicines</h1></div></div>
      <div className="card"><SkeletonTable rows={4} cols={5} /></div>
    </div>
  )

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Medicines</h1>
          <p className="page-subtitle">Track your medicine stock and set auto-refill alerts</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn--primary" onClick={() => setShowAdd(true)}>
            <FiPlus size={18} /> Add Medicine
          </button>
          <Link to="/user/order" className="btn btn--outline">
            <FiShoppingCart size={18} /> Reorder
          </Link>
        </div>
      </div>

      {/* Add Medicine Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>💊 Add New Medicine</h2>
              <button className="icon-btn" onClick={() => setShowAdd(false)}><FiX size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Medicine Name *</label>
                <input className="form-input" placeholder="e.g. Metformin 500mg" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Category</label>
                <select className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Dosage</label>
                <input className="form-input" placeholder="e.g. 1 tablet" value={form.dosage}
                  onChange={e => setForm({ ...form, dosage: e.target.value })} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Frequency</label>
                <select className="form-input" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                  {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current Stock</label>
                <input className="form-input" type="number" min="0" value={form.stock}
                  onChange={e => setForm({ ...form, stock: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Pack Size</label>
                <input className="form-input" type="number" min="1" value={form.total}
                  onChange={e => setForm({ ...form, total: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Expiry Date</label>
                <input className="form-input" type="date" value={form.expires}
                  onChange={e => setForm({ ...form, expires: e.target.value })} />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Dose Time</label>
                <input className="form-input" type="time" value={(() => {
                  const t = (form.times || ['9:00 AM'])[0]
                  try {
                    const [time, ampm] = t.trim().split(' ')
                    let [h, m] = time.split(':').map(Number)
                    if (ampm?.toUpperCase() === 'PM' && h !== 12) h += 12
                    if (ampm?.toUpperCase() === 'AM' && h === 12) h = 0
                    return `${String(h).padStart(2,'0')}:${String(m||0).padStart(2,'0')}`
                  } catch { return '09:00' }
                })()}
                  onChange={e => {
                    const [h, m] = e.target.value.split(':').map(Number)
                    const ampm = h >= 12 ? 'PM' : 'AM'
                    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
                    setForm({ ...form, times: [`${h12}:${String(m).padStart(2,'0')} ${ampm}`] })
                  }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn btn--ghost" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleAdd} disabled={!form.name.trim() || saving}>
                {saving ? 'Adding...' : <><FiPlus size={16} /> Add Medicine</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {lowCount > 0 && (
        <div className="alert-banner alert-banner--warning">
          <FiAlertTriangle size={18} />
          <span><strong>{lowCount} medicine{lowCount > 1 ? 's' : ''}</strong> running low. Consider reordering soon.</span>
          <Link to="/user/order" className="btn btn--primary btn--sm">Reorder Now</Link>
        </div>
      )}

      <div className="search-bar">
        <FiSearch size={18} />
        <input type="text" placeholder="Search your medicines..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Medicine</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Expires</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No medicines yet. Click "Add Medicine" to get started.
                </td></tr>
              )}
              {filtered.map((med, i) => (
                <tr key={i}>
                  <td><strong>{med.name}</strong></td>
                  <td><span className="category-badge">{med.category}</span></td>
                  <td>
                    <div className="stock-bar-wrap">
                      <div className="stock-bar">
                        <div className={`stock-bar__fill stock-bar__fill--${statusColors[med.status] || 'success'}`} style={{ width: `${(med.stock / (med.total || 1)) * 100}%` }}></div>
                      </div>
                      <span className="stock-text">{med.stock} / {med.total}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-badge--${statusColors[med.status] || 'success'}`}>
                      {statusLabels[med.status] || med.status}
                    </span>
                  </td>
                  <td>{med.expires ? new Date(med.expires).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <Link to="/user/order" className="btn btn--outline btn--sm">
                        <FiShoppingCart size={14} /> Reorder
                      </Link>
                      <button className="btn btn--sm" onClick={() => handleDelete(med)}
                        style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
