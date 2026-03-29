# 💊 MediHelper — Smart Medicine Assistant

A full-stack web application for managing medications, scheduling dose reminders with real-time sound alerts, ordering medicines from pharmacies, and tracking doorstep deliveries.

Built with **React + Vite** (frontend) and **Flask + MySQL** (backend).

---

## 🚀 Quick Start (One Command)

> **Don't want to set up manually?** Just double-click the batch file!

```bash
start.bat
```

This single script will:
1. ✅ Check that Node.js, Python, and pip are installed
2. 📦 Install all backend (pip) and frontend (npm) dependencies
3. ⚙️ Create the `.env` config file if it doesn't exist
4. 🖥️ Start the backend server (Flask) in a new window
5. 🌐 Start the frontend server (Vite) in a new window
6. 🔗 Open `http://localhost:5173` in your browser automatically

> **Note:** If you have MySQL running, edit `backend\.env` with your password before running. If you don't have MySQL, no worries — it will use SQLite automatically.

---

## 📑 Table of Contents

- [Quick Start](#-quick-start-one-command)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Manual Setup](#-manual-setup)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Backend Setup](#2-backend-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Running the Application](#-running-the-application)
- [Test Accounts](#-test-accounts)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Endpoints](#-api-endpoints)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

| Role | Features |
|------|----------|
| **Patient** | Dose reminders with sound alerts, medicine inventory tracking, order medicines from pharmacies, delivery tracking, health profile management |
| **Pharmacy** | Manage product inventory, process incoming orders, view analytics dashboard |
| **Delivery** | View assigned deliveries, update delivery status, earnings history |

### Key Highlights
- **Real-time dose notifications** — Browser notifications fire 5 minutes before each scheduled dose
- **Overdue alarm system** — Repeating sound alert with full-screen modal when doses are missed (no page refresh needed)
- **Auto-schema & seeding** — The backend automatically creates all database tables and seeds sample data on first run
- **SQLite fallback** — If MySQL is unavailable, the backend automatically falls back to SQLite (zero config)

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, React Router 7, Axios |
| Backend | Python 3, Flask, Flask-CORS, PyJWT, bcrypt |
| Database | MySQL (primary), SQLite (automatic fallback) |
| Styling | Vanilla CSS with custom design system |

---

## 📋 Prerequisites

Make sure the following are installed on your system:

### Required
| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | v18 or higher | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.8 or higher | [python.org](https://www.python.org/downloads/) |
| **pip** | (comes with Python) | — |

### Optional (but recommended)
| Software | Version | Download |
|----------|---------|----------|
| **MySQL** | 8.0+ | [dev.mysql.com](https://dev.mysql.com/downloads/mysql/) |

> **Note:** MySQL is optional! If MySQL is not installed or not running, the backend will automatically use SQLite as a local file-based database. Everything works the same — no configuration needed.

---

## 🔧 Manual Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd medihelper
```

---

### 2. Backend Setup

#### a) Install Python dependencies

```bash
cd backend
pip install -r requirements.txt
```

This installs:
- `flask` — Web framework
- `flask-cors` — Cross-origin resource sharing
- `PyJWT` — JSON Web Token authentication
- `bcrypt` — Password hashing
- `mysql-connector-python` — MySQL driver
- `python-dotenv` — Environment variable loading

#### b) Configure environment variables

Copy the example environment file and edit it with your MySQL credentials:

```bash
cp .env.example .env
```

Then open `backend/.env` and update:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
MYSQL_DATABASE=medihelper
JWT_SECRET=medihelper_secret_key_2026
PORT=5000
```

> **If you don't have MySQL:** You can skip this step entirely. The backend will detect that MySQL is unavailable and automatically fall back to SQLite. No `.env` file is needed for SQLite mode.

#### c) Start the backend server

```bash
cd backend
python app.py
```

You should see:

```
🔧 Initializing MediHelper backend...
✅ MySQL database `medihelper` ensured
✅ Database: Connected to MySQL at localhost:3306/medihelper
✅ Schema: All 12 normalized tables created
✅ Seed: Sample data inserted (3NF normalized)

🚀 MediHelper API running on http://localhost:5000
```

> On first run, the backend automatically:
> 1. Creates the `medihelper` database (if using MySQL)
> 2. Creates all 12 normalized tables
> 3. Seeds sample data (users, medicines, reminders, orders)

---

### 3. Frontend Setup

Open a **new terminal** (keep the backend running in the first one):

#### a) Install Node dependencies

```bash
# From the project root (medihelper/)
npm install
```

#### b) Start the frontend dev server

```bash
npm run dev
```

You should see:

```
VITE v8.0.0  ready in 191 ms

  ➜  Local:   http://localhost:5173/
```

---

## ▶️ Running the Application

You need **two terminals** running simultaneously:

| Terminal | Command | Directory | URL |
|----------|---------|-----------|-----|
| Terminal 1 (Backend) | `python app.py` | `medihelper/backend/` | http://localhost:5000 |
| Terminal 2 (Frontend) | `npm run dev` | `medihelper/` | http://localhost:5173 |

Once both are running, open your browser and go to:

### 👉 **http://localhost:5173**

---

## 🔑 Test Accounts

The backend seeds these accounts automatically on first run (password for all: **`password123`**):

| Role | Email | Password | What You Can Do |
|------|-------|----------|-----------------|
| 👤 Patient | `margaret@test.com` | `password123` | View dashboard, manage medicines, set reminders, place orders |
| 💊 Pharmacy | `pharmacy@test.com` | `password123` | Manage inventory, process orders, view analytics |
| 🚚 Delivery | `delivery@test.com` | `password123` | View assigned deliveries, update status, track earnings |

---

## 📁 Project Structure

```
medihelper/
├── backend/                    # Flask API server
│   ├── app.py                  # Entry point — registers routes, starts server
│   ├── db.py                   # Database layer (MySQL/SQLite abstraction)
│   ├── schema.py               # Table creation + seed data (3NF normalized)
│   ├── auth.py                 # JWT authentication middleware
│   ├── requirements.txt        # Python dependencies
│   ├── .env.example            # Environment variable template
│   ├── .env                    # Your local environment config (not in git)
│   └── routes/
│       ├── auth_routes.py      # Login, register, token verification
│       ├── user_routes.py      # Patient dashboard, reminders, orders
│       ├── pharmacy_routes.py  # Inventory, order management, analytics
│       └── delivery_routes.py  # Active deliveries, status updates
│
├── src/                        # React frontend
│   ├── main.jsx                # App entry point
│   ├── App.jsx                 # Route definitions
│   ├── index.css               # Global design system (variables, utilities)
│   ├── context/
│   │   └── AuthContext.jsx     # Authentication state management
│   ├── services/
│   │   └── api.js              # Axios API client with auth interceptors
│   ├── hooks/
│   │   └── useDoseNotifications.js  # Real-time dose alarm system
│   ├── components/
│   │   ├── DashboardLayout.jsx # Sidebar + main content layout
│   │   ├── Sidebar.jsx         # Navigation sidebar
│   │   ├── AlarmOverlay.jsx    # Full-screen overdue dose alert
│   │   ├── Toast.jsx           # Toast notification system
│   │   ├── Skeleton.jsx        # Loading skeleton components
│   │   └── ...
│   └── pages/
│       ├── Landing.jsx         # Public landing page
│       ├── Login.jsx           # Login form
│       ├── Register.jsx        # Registration form
│       ├── SetupWizard.jsx     # First-time patient setup
│       ├── user/               # Patient pages (dashboard, inventory, orders...)
│       ├── pharmacy/           # Pharmacy pages (inventory, order management)
│       └── delivery/           # Delivery pages (active jobs, history)
│
├── package.json                # Node dependencies & scripts
├── vite.config.js              # Vite configuration (proxy, port)
├── index.html                  # HTML entry point
├── start.bat                   # One-click setup & run script (Windows)
└── README.md                   # This file
```

---

## 🗄 Database Schema

The database uses **Third Normal Form (3NF)** with 12 tables:

```
users                  ← Core user table (all roles)
├── user_profiles      ← Patient-specific data (1:1)
├── pharmacy_profiles  ← Pharmacy-specific data (1:1)
├── reminders          ← Medication reminders
│   └── reminder_times ← Scheduled times per reminder
├── dose_logs          ← Dose taken/missed tracking
├── user_medicines     ← Patient's medicine inventory
└── orders             ← Medicine orders
    └── order_items    ← Individual items per order

categories             ← Medicine categories (lookup)
suppliers              ← Pharmacy suppliers (lookup)
pharmacy_inventory     ← Pharmacy stock
deliveries             ← Delivery assignments & tracking
```

---

## 🔌 API Endpoints

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | ❌ | Server health check |
| `POST` | `/auth/register` | ❌ | Create new account |
| `POST` | `/auth/login` | ❌ | Login, get JWT token |
| `GET` | `/auth/me` | ✅ | Get current user info |
| `GET` | `/user/dashboard` | ✅ | Patient dashboard data |
| `GET` | `/user/reminders` | ✅ | List all reminders |
| `POST` | `/user/reminders` | ✅ | Create a reminder |
| `PUT` | `/user/reminders/:id` | ✅ | Update a reminder |
| `DELETE` | `/user/reminders/:id` | ✅ | Delete a reminder |
| `POST` | `/user/reminders/:id/take` | ✅ | Mark dose as taken |
| `GET` | `/user/medicines` | ✅ | Patient medicine inventory |
| `POST` | `/user/medicines` | ✅ | Add medicine to inventory |
| `GET` | `/user/orders` | ✅ | List patient orders |
| `POST` | `/user/orders` | ✅ | Place a new order |
| `GET` | `/user/shop` | ✅ | Browse pharmacy products |
| `GET` | `/pharmacy/dashboard` | ✅ | Pharmacy dashboard |
| `GET` | `/pharmacy/inventory` | ✅ | Pharmacy stock |
| `GET` | `/pharmacy/orders` | ✅ | Incoming orders |
| `GET` | `/delivery/dashboard` | ✅ | Delivery dashboard |
| `GET` | `/delivery/active` | ✅ | Active deliveries |

---

## ❓ Troubleshooting

### "Module not found" error in backend
```bash
cd backend
pip install -r requirements.txt
```

### "MySQL connection failed" — backend uses SQLite instead
This is normal if MySQL isn't installed. The backend will print:
```
⚠️  MySQL connection failed: ...
🔄 Falling back to SQLite…
✅ Database: SQLite (backend/medihelper.db)
```
Everything works fine with SQLite.

### Frontend shows "connection refused"
Make sure the backend is running first (`python app.py` in the `backend/` folder), then start the frontend (`npm run dev`).

### Port already in use
- Backend (5000): Kill any existing process on port 5000, or change `PORT` in `backend/.env`
- Frontend (5173): Vite will auto-pick the next available port

### Notifications not working
1. Make sure you click **"Enable"** on the notification permission banner in the dashboard
2. Browser notifications require HTTPS in production, but work on `localhost` during development
3. Sound alerts require a user interaction (click anywhere on the page) before browsers allow audio playback

### "npm install" fails
Make sure you have Node.js v18+ installed:
```bash
node --version   # Should be v18.x or higher
npm --version    # Should be v9.x or higher
```

---

## 📄 License

This project is for educational/demonstration purposes.
