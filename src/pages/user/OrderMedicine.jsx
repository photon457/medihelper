import { useState, useEffect } from 'react'
import { FiShoppingCart, FiSearch, FiPlus, FiMinus, FiStar, FiX, FiMapPin, FiCreditCard, FiArrowRight, FiCheck } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { userAPI } from '../../services/api'
import './UserPages.css'

export default function OrderMedicine() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState({})
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [ordering, setOrdering] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [orderComplete, setOrderComplete] = useState(null)
  const [address, setAddress] = useState(user?.address || '')
  const [paymentMethod, setPaymentMethod] = useState('cod')

  useEffect(() => {
    userAPI.shop().then(r => setProducts(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  const categories = ['All', ...new Set(products.map(p => p.category))]

  const addToCart = (id) => setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
  const removeFromCart = (id) => setCart(prev => {
    const next = { ...prev }
    if (next[id] > 1) next[id]--
    else delete next[id]
    return next
  })

  const filtered = products.filter(m =>
    (category === 'All' || m.category === category) &&
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const cartItems = Object.entries(cart).map(([id, qty]) => {
    const med = products.find(m => m.id === Number(id))
    return { id: Number(id), name: med?.name, qty, price: Number(med?.price || 0), unitPrice: Number(med?.price || 0) / qty || Number(med?.price || 0) }
  }).filter(i => i.name)

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const cartTotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.qty), 0)
  const deliveryFee = cartTotal >= 20 ? 0 : 2.99
  const orderTotal = cartTotal + deliveryFee

  const placeOrder = async () => {
    if (cartCount === 0 || !address.trim()) return
    setOrdering(true)
    try {
      const items = cartItems.map(i => ({ name: i.name, qty: i.qty, price: i.unitPrice * i.qty }))
      const res = await userAPI.placeOrder({ items, total: orderTotal, address, paymentMethod })
      setOrderComplete(res.data)
      setCart({})
    } catch (err) {
      console.error(err)
    } finally {
      setOrdering(false)
    }
  }

  if (loading) return <div className="page"><p>Loading pharmacy...</p></div>

  // Order complete screen
  if (orderComplete) {
    return (
      <div className="page">
        <div className="card" style={{ maxWidth: '500px', margin: '60px auto', textAlign: 'center', padding: '40px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--success), #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#fff' }}>
            <FiCheck size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>Order Placed! 🎉</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Order #{orderComplete.id} has been placed successfully</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--gray-50)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Payment</small>
              <p style={{ fontWeight: 600, marginTop: '4px' }}>{paymentMethod === 'cod' ? '💵 Cash on Delivery' : '💳 Card Payment'}</p>
            </div>
            <div style={{ background: 'var(--gray-50)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Est. Delivery</small>
              <p style={{ fontWeight: 600, marginTop: '4px' }}>~2 hours</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="btn btn--ghost" onClick={() => { setOrderComplete(null); }}>Continue Shopping</button>
            <button className="btn btn--primary" onClick={() => navigate('/user/tracking')}>
              Track Order <FiArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Order Medicine</h1>
          <p className="page-subtitle">Browse medicines from local pharmacies</p>
        </div>
        <button className="btn btn--primary" onClick={() => cartCount > 0 && setShowCheckout(true)} disabled={cartCount === 0}
          style={{ position: 'relative' }}>
          <FiShoppingCart size={18} />
          {cartCount > 0 ? `Checkout (${cartCount}) — $${cartTotal.toFixed(2)}` : 'Cart Empty'}
          {cartCount > 0 && (
            <span style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: '#fff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700 }}>
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>🛒 Review Your Order</h2>
              <button className="icon-btn" onClick={() => setShowCheckout(false)}><FiX size={20} /></button>
            </div>

            {/* Cart items */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '16px' }}>
              {cartItems.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <strong style={{ fontSize: '0.92rem' }}>{item.name}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <button className="icon-btn" onClick={() => removeFromCart(item.id)} style={{ width: '24px', height: '24px' }}><FiMinus size={12} /></button>
                      <span style={{ fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                      <button className="icon-btn" onClick={() => addToCart(item.id)} style={{ width: '24px', height: '24px' }}><FiPlus size={12} /></button>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700 }}>${(item.unitPrice * item.qty).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                <span>Subtotal</span><span>${cartTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.88rem' }}>
                <span>Delivery Fee</span>
                <span style={{ color: deliveryFee === 0 ? 'var(--success)' : undefined }}>
                  {deliveryFee === 0 ? 'FREE' : `$${deliveryFee.toFixed(2)}`}
                </span>
              </div>
              {deliveryFee === 0 && <small style={{ color: 'var(--success)', fontSize: '0.75rem' }}>🎉 Free delivery on orders over $20!</small>}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.05rem', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px' }}>
                <span>Total</span><span>${orderTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FiMapPin size={13} /> Delivery Address *
              </label>
              <input className="form-input" placeholder="Enter your delivery address" value={address}
                onChange={e => setAddress(e.target.value)} />
            </div>

            {/* Payment Method */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                <FiCreditCard size={13} /> Payment Method
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[{ val: 'cod', label: '💵 Cash on Delivery' }, { val: 'card', label: '💳 Card' }, { val: 'upi', label: '📱 UPI' }].map(m => (
                  <button key={m.val} className={`pill ${paymentMethod === m.val ? 'pill--active' : ''}`}
                    onClick={() => setPaymentMethod(m.val)} style={{ flex: 1 }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated delivery */}
            <div style={{ background: 'rgba(59,143,252,0.06)', borderRadius: 'var(--radius-md)', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
              <span>🕐</span>
              <span>Estimated delivery: <strong>~2 hours</strong></span>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn--ghost" onClick={() => setShowCheckout(false)}>Cancel</button>
              <button className="btn btn--primary" onClick={placeOrder} disabled={!address.trim() || ordering}>
                {ordering ? 'Placing Order...' : `Place Order — $${orderTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="filter-bar">
        <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
          <FiSearch size={18} />
          <input type="text" placeholder="Search medicines..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="category-pills">
          {categories.map(c => (
            <button key={c} className={`pill ${category === c ? 'pill--active' : ''}`} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="product-grid">
        {filtered.map(med => (
          <div key={med.id} className="product-card">
            <div className="product-card__top">
              <span className="category-badge">{med.category}</span>
              <div className="product-rating"><FiStar size={12} fill="#f59e0b" color="#f59e0b" /> {med.rating || '4.5'}</div>
            </div>
            <h3 className="product-card__name">{med.name}</h3>
            <p className="product-card__pharmacy">{med.pharmacy || 'Local Pharmacy'}</p>
            <div className="product-card__bottom">
              <span className="product-card__price">${Number(med.price).toFixed(2)}</span>
              {med.stock <= 0 ? (
                <span className="status-badge status-badge--danger">Out of Stock</span>
              ) : cart[med.id] ? (
                <div className="qty-control">
                  <button onClick={() => removeFromCart(med.id)}><FiMinus size={14} /></button>
                  <span>{cart[med.id]}</span>
                  <button onClick={() => addToCart(med.id)}><FiPlus size={14} /></button>
                </div>
              ) : (
                <button className="btn btn--primary btn--sm" onClick={() => addToCart(med.id)}>
                  <FiPlus size={14} /> Add
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
