# MediHelper — Smart Medicine Assistant

A full-stack medicine management app with smart reminders, late-dose tracking, pharmacy integration, and doorstep delivery.

---

## Prerequisites

| Tool | Version | Required? |
|------|---------|-----------|
| **Node.js** | 18+ | ✅ Yes |
| **Python** | 3.9+ | ✅ Yes |
| **pip** | latest | ✅ Yes |
| **MySQL** | 8.0 | ❌ Optional (auto-falls back to SQLite) |

---

## Setup Steps

### 1. Clone / Copy the project

Copy the entire `medihelper` folder to the target system.

### 2. Install Frontend Dependencies

Open a terminal in the project root:

```bash
cd medihelper
npm install
```

### 3. Install Backend Dependencies

```bash
cd medihelper/backend
pip install -r requirements.txt
```

### 4. Configure the Database

#### Option A — MySQL (recommended)

1. Make sure MySQL 8.0 is installed and the service is running.
2. Copy the example env file and edit it:

```bash
cd backend
copy .env.example .env        # Windows
# cp .env.example .env        # Mac/Linux
```

3. Open `backend/.env` and set **your MySQL password**:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=YOUR_MYSQL_PASSWORD_HERE    ← change this
MYSQL_DATABASE=medihelper
JWT_SECRET=medihelper-jwt-secret-key-2026
```

> **Note:** The database will be **auto-created** on first run — no manual SQL needed. Only the password needs to match your local MySQL setup.

#### Option B — SQLite (zero setup)

If MySQL is not installed, **do nothing**. The backend will automatically use a local `medihelper.db` SQLite file. No `.env` file is needed.

### 5. Start the Backend

```bash
cd medihelper/backend
python app.py
```

You should see:
```
🔧 Initializing MediHelper backend...
✅ Database: Connected to MySQL at localhost:3306/medihelper
✅ Schema: All 12 normalized tables created
✅ Seed: Sample data inserted (3NF normalized)
🚀 MediHelper API running on http://localhost:5000
```

### 6. Start the Frontend (new terminal)

```bash
cd medihelper
npm run dev
```

You should see:
```
VITE ready at http://localhost:5173/
```

### 7. Open in Browser

Go to **http://localhost:5173**

---

## Test Accounts

All accounts use password: **`password123`**

| Role | Email | What it does |
|------|-------|-------------|
| 👤 Patient | `margaret@test.com` | Dashboard, reminders, medicines, orders |
| 💊 Pharmacy | `pharmacy@test.com` | Inventory, order management, analytics |
| 🚚 Delivery | `delivery@test.com` | Active deliveries, history, earnings |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm install` fails | Make sure Node.js 18+ is installed: `node --version` |
| `pip install` fails | Make sure Python 3.9+ is installed: `python --version` |
| Backend shows "Using SQLite" | MySQL service is not running. Start it or just use SQLite. |
| Port 5000 in use | Kill the process using port 5000, or change the port in `app.py` |
| Port 5173 in use | Vite will auto-pick the next available port |
| "Module not found" error | Run `pip install -r requirements.txt` again |

---

## Project Structure

```
medihelper/
├── backend/
│   ├── app.py              # Flask entry point
│   ├── db.py               # MySQL/SQLite dual engine
│   ├── auth.py             # JWT authentication
│   ├── schema.py           # 3NF normalized schema + seed data
│   ├── requirements.txt    # Python dependencies
│   ├── .env                # Database config (create this)
│   └── routes/
│       ├── auth_routes.py
│       ├── user_routes.py
│       ├── pharmacy_routes.py
│       └── delivery_routes.py
├── src/                    # React frontend (Vite)
│   ├── pages/
│   ├── components/
│   ├── services/api.js
│   └── context/
├── package.json
└── README.md
```
