import { Link } from 'react-router-dom'
import { FiClock, FiPackage, FiTruck, FiShield, FiHeart, FiArrowRight, FiCheck } from 'react-icons/fi'
import './Landing.css'

const features = [
  {
    icon: FiClock,
    title: 'Smart Reminders',
    desc: 'Never miss a dose. Intelligent alerts tailored to your medication schedule with snooze & confirmation.',
    color: 'primary',
  },
  {
    icon: FiPackage,
    title: 'Inventory Tracking',
    desc: 'Auto-track your medicine stock. Get notified before you run out and reorder with one tap.',
    color: 'success',
  },
  {
    icon: FiTruck,
    title: 'Doorstep Delivery',
    desc: 'Medicines delivered to your door. Real-time tracking so you know exactly when they arrive.',
    color: 'accent',
  },
  {
    icon: FiShield,
    title: 'Pharmacy Integration',
    desc: 'Connected with local pharmacies for real-time stock availability and prescription management.',
    color: 'warning',
  },
]

const stats = [
  { value: '10K+', label: 'Active Users' },
  { value: '500+', label: 'Pharmacies' },
  { value: '98%', label: 'On-time Delivery' },
  { value: '4.9', label: 'User Rating' },
]



export default function Landing() {
  return (
    <div className="landing">
      {/* Nav */}
      <nav className="landing-nav">
        <div className="landing-nav__inner">
          <div className="landing-nav__logo">
            <div className="landing-nav__logo-icon"><FiHeart size={20} /></div>
            <span className="landing-nav__logo-text">MediHelper</span>
          </div>
          <div className="landing-nav__links">
            <a href="#features">Features</a>
            <a href="#how">How It Works</a>

          </div>
          <div className="landing-nav__actions">
            <Link to="/login" className="btn btn--ghost">Log In</Link>
            <Link to="/register" className="btn btn--primary">Get Started <FiArrowRight size={16} /></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero__bg-orbs">
          <div className="orb orb--1"></div>
          <div className="orb orb--2"></div>
          <div className="orb orb--3"></div>
        </div>
        <div className="hero__content">
          <span className="hero__badge">🏥 Trusted by 10,000+ users</span>
          <h1 className="hero__title">
            Your Personal<br />
            <span className="gradient-text">Medicine Assistant</span>
          </h1>
          <p className="hero__subtitle">
            Smart reminders, pharmacy integration, and doorstep delivery — all in one 
            platform designed for elderly care and chronic illness management.
          </p>
          <div className="hero__cta">
            <Link to="/register" className="btn btn--primary btn--lg">
              Start Free Today <FiArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn--outline btn--lg">
              View Demo
            </Link>
          </div>
          <div className="hero__stats">
            {stats.map((s, i) => (
              <div key={i} className="hero__stat">
                <span className="hero__stat-value">{s.value}</span>
                <span className="hero__stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hero__visual">
          <div className="hero__card hero__card--1">
            <FiClock size={24} />
            <div>
              <strong>Next Dose</strong>
              <span>Metformin 500mg — 2:00 PM</span>
            </div>
          </div>
          <div className="hero__card hero__card--2">
            <FiCheck size={24} />
            <div>
              <strong>Dose Taken ✓</strong>
              <span>Amlodipine — 8:00 AM</span>
            </div>
          </div>
          <div className="hero__card hero__card--3">
            <FiTruck size={24} />
            <div>
              <strong>Delivery on the way</strong>
              <span>Arriving in 25 min</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="section-container">
          <span className="section-eyebrow">Features</span>
          <h2 className="section-title">Everything You Need, <span className="gradient-text">One Platform</span></h2>
          <p className="section-subtitle">A comprehensive ecosystem connecting patients, pharmacies, and delivery agents.</p>
          <div className="features__grid">
            {features.map((f, i) => (
              <div key={i} className={`feature-card feature-card--${f.color}`} style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="feature-card__icon"><f.icon size={26} /></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how" id="how">
        <div className="section-container">
          <span className="section-eyebrow">How It Works</span>
          <h2 className="section-title">Simple as <span className="gradient-text">1-2-3</span></h2>
          <div className="how__steps">
            <div className="how__step">
              <div className="how__step-num">1</div>
              <h3>Sign Up & Add Medicines</h3>
              <p>Create your profile, add your prescriptions, and set up personalized reminder schedules.</p>
            </div>
            <div className="how__step-connector"></div>
            <div className="how__step">
              <div className="how__step-num">2</div>
              <h3>Get Smart Reminders</h3>
              <p>Receive timely alerts for each dose. Confirm or snooze — we'll keep track for you.</p>
            </div>
            <div className="how__step-connector"></div>
            <div className="how__step">
              <div className="how__step-num">3</div>
              <h3>Auto-Refill & Delivery</h3>
              <p>Running low? We notify your pharmacy and arrange doorstep delivery automatically.</p>
            </div>
          </div>
        </div>
      </section>



      {/* CTA */}
      <section className="landing-cta">
        <div className="section-container">
          <div className="landing-cta__inner">
            <h2>Ready to Never Miss a Dose Again?</h2>
            <p>Join thousands of users who trust MediHelper for their daily medication management.</p>
            <Link to="/register" className="btn btn--white btn--lg">
              Get Started Free <FiArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <div className="landing-footer__brand">
            <div className="landing-nav__logo">
              <div className="landing-nav__logo-icon"><FiHeart size={18} /></div>
              <span className="landing-nav__logo-text" style={{ color: '#fff' }}>MediHelper</span>
            </div>
            <p>Smart medicine management for a healthier life.</p>
          </div>
          <div className="landing-footer__links">
            <div>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how">How It Works</a>
              <a href="#testimonials">Reviews</a>
            </div>

            <div>
              <h4>Company</h4>
              <a href="#">About Us</a>
              <a href="#">Privacy</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>
        <div className="landing-footer__bottom">
          © 2026 MediHelper. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
