import { useState, useEffect } from 'react'
import { FiPackage, FiPlus, FiSearch, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi'
import { pharmacyAPI } from '../../services/api'
import '../user/UserPages.css'

const statusMap = { good: { label: 'In Stock', color: 'success' }, low: { label: 'Low', color: 'warning' }, critical: { label: 'Critical', color: 'danger' } }

export default function InventoryManagement() {
  const [inventory, setInventory] = useState([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState({ name: '', category: '', price: '', stock: '', supplier: '' })

  useEffect(() => {
    pharmacyAPI.getInventory().then(r => setInventory(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = inventory.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))

  const handleAdd = () => {
    if (!newItem.name || !newItem.category) return
    pharmacyAPI.addProduct({
      name: newItem.name,
      category: newItem.category,
      price: parseFloat(newItem.price) || 0,
      stock: parseInt(newItem.stock) || 0,
      supplier: newItem.supplier,
    }).then(r => {
      setInventory(prev => [r.data, ...prev])
      setShowAdd(false)
      setNewItem({ name: '', category: '', price: '', stock: '', supplier: '' })
    }).catch(console.error)
  }

  const handleDelete = (id) => {
    pharmacyAPI.deleteProduct(id).then(() => {
      setInventory(prev => prev.filter(i => i.id !== id))
    })
  }

  if (loading) return <div className="page"><p>Loading inventory...</p></div>

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory Management</h1>
          <p className="page-subtitle">Manage your pharmacy stock digitally</p>
        </div>
        <button className="btn btn--primary" onClick={() => setShowAdd(!showAdd)}>
          <FiPlus size={18} /> Add Product
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ animation: 'fadeInUp 0.3s ease', marginBottom: '20px' }}>
          <h3 className="card-title"><FiPlus size={16} /> New Product</h3>
          <div className="form-grid">
            <div className="form-group"><label>Medicine Name</label><input className="form-input" placeholder="e.g. Metformin 500mg" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} /></div>
            <div className="form-group"><label>Category</label><input className="form-input" placeholder="e.g. Diabetes" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} /></div>
            <div className="form-group"><label>Price ($)</label><input type="number" className="form-input" placeholder="0.00" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} /></div>
            <div className="form-group"><label>Stock Qty</label><input type="number" className="form-input" placeholder="0" value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} /></div>
            <div className="form-group"><label>Supplier</label><input className="form-input" placeholder="Supplier name" value={newItem.supplier} onChange={e => setNewItem({...newItem, supplier: e.target.value})} /></div>
          </div>
          <div className="form-actions">
            <button className="btn btn--primary" onClick={handleAdd}><FiCheck size={16} /> Add Product</button>
            <button className="btn btn--ghost" onClick={() => setShowAdd(false)}><FiX size={16} /> Cancel</button>
          </div>
        </div>
      )}

      <div className="search-bar">
        <FiSearch size={18} />
        <input type="text" placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Price</th><th>Supplier</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id}>
                  <td><strong>{item.name}</strong></td>
                  <td><span className="category-badge">{item.category}</span></td>
                  <td>{item.stock} units</td>
                  <td>${Number(item.price).toFixed(2)}</td>
                  <td>{item.supplier}</td>
                  <td><span className={`status-badge status-badge--${(statusMap[item.status] || statusMap.good).color}`}>{(statusMap[item.status] || statusMap.good).label}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="icon-btn icon-btn--danger" onClick={() => handleDelete(item.id)}><FiTrash2 size={15} /></button>
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
