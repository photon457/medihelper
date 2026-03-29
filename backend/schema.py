"""
Schema creation + seed data for MediHelper.
Normalized to Third Normal Form (3NF).
Works with both MySQL and SQLite.
"""
import json
import bcrypt
from db import query, insert, run, exec_script, get_engine

# ─────────────────────────────────────────────
# MySQL Schema (3NF)
# ─────────────────────────────────────────────
MYSQL_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','pharmacy','delivery') NOT NULL DEFAULT 'user',
  phone VARCHAR(50) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INT PRIMARY KEY,
  address VARCHAR(500) DEFAULT '',
  age INT DEFAULT NULL,
  blood_group VARCHAR(10) DEFAULT '',
  emergency_contact VARCHAR(255) DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pharmacy_profiles (
  user_id INT PRIMARY KEY,
  pharmacy_name VARCHAR(255) NOT NULL DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  medicine_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  frequency VARCHAR(50) NOT NULL DEFAULT 'Daily',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reminder_times (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reminder_id INT NOT NULL,
  time_slot VARCHAR(20) NOT NULL,
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dose_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reminder_id INT NOT NULL,
  user_id INT NOT NULL,
  time_slot VARCHAR(20) NOT NULL DEFAULT '',
  taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'taken',
  delay_minutes INT NOT NULL DEFAULT 0,
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_id INT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  expires DATE DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pharmacy_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  category_id INT NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplier_id INT DEFAULT NULL,
  rating DECIMAL(2,1) DEFAULT 4.5,
  FOREIGN KEY (pharmacy_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pharmacy_id INT DEFAULT NULL,
  delivery_id INT DEFAULT NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  address VARCHAR(500) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  qty INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deliveries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  driver_id INT NOT NULL,
  distance VARCHAR(20) DEFAULT '',
  eta VARCHAR(50) DEFAULT '',
  earnings DECIMAL(10,2) DEFAULT 0,
  rating INT DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'assigned',
  completed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
);
"""

# ─────────────────────────────────────────────
# SQLite Schema (3NF)
# ─────────────────────────────────────────────
SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','pharmacy','delivery')),
  phone TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY,
  address TEXT DEFAULT '',
  age INTEGER DEFAULT NULL,
  blood_group TEXT DEFAULT '',
  emergency_contact TEXT DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pharmacy_profiles (
  user_id INTEGER PRIMARY KEY,
  pharmacy_name TEXT NOT NULL DEFAULT '',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'Daily',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reminder_times (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_id INTEGER NOT NULL,
  time_slot TEXT NOT NULL,
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dose_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  time_slot TEXT NOT NULL DEFAULT '',
  taken_at TEXT DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'taken',
  delay_minutes INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_medicines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  expires TEXT DEFAULT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pharmacy_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  supplier_id INTEGER DEFAULT NULL,
  rating REAL DEFAULT 4.5,
  FOREIGN KEY (pharmacy_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pharmacy_id INTEGER DEFAULT NULL,
  delivery_id INTEGER DEFAULT NULL,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  address TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  price REAL NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  distance TEXT DEFAULT '',
  eta TEXT DEFAULT '',
  earnings REAL DEFAULT 0,
  rating INTEGER DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'assigned',
  completed_at TEXT DEFAULT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
);
"""


def init_schema():
    engine = get_engine()
    schema = MYSQL_SCHEMA if engine == 'mysql' else SQLITE_SCHEMA
    exec_script(schema)
    print('✅ Schema: All 12 normalized tables created')


# ─────────────────────────────────────────────
# Helpers for seed
# ─────────────────────────────────────────────
def _get_or_create_category(name):
    """Return category id, creating if needed."""
    rows = query('SELECT id FROM categories WHERE name = ?', [name])
    if rows:
        return rows[0]['id']
    return insert('INSERT INTO categories (name) VALUES (?)', [name])


def _get_or_create_supplier(name):
    """Return supplier id, creating if needed."""
    rows = query('SELECT id FROM suppliers WHERE name = ?', [name])
    if rows:
        return rows[0]['id']
    return insert('INSERT INTO suppliers (name) VALUES (?)', [name])


def _stock_status(stock, total):
    """Compute status from stock/total ratio (used by routes, not stored)."""
    ratio = stock / total if total > 0 else 1
    if ratio > 0.3:
        return 'good'
    elif ratio > 0.1:
        return 'low'
    return 'critical'


def _inv_status(stock):
    """Compute inventory status from stock level."""
    if stock > 50:
        return 'good'
    elif stock > 10:
        return 'low'
    return 'critical'


# ─────────────────────────────────────────────
# Seed data
# ─────────────────────────────────────────────
def seed_data():
    rows = query('SELECT COUNT(*) as count FROM users')
    count = rows[0].get('count', 0) if rows else 0
    if count > 0:
        print('ℹ️  Seed: Data already exists, skipping')
        return

    pw_hash = bcrypt.hashpw(b'password123', bcrypt.gensalt()).decode('utf-8')

    # --- Users ---
    user_id = insert(
        'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)',
        ['Margaret Thompson', 'margaret@test.com', pw_hash, 'user', '+91 98765 12345']
    )
    # User profile (patient-specific data)
    insert(
        'INSERT INTO user_profiles (user_id, address, age, blood_group, emergency_contact) VALUES (?,?,?,?,?)',
        [user_id, '42 Greenfield Lane, Bangalore 560001', 72, 'O+', 'John Thompson — +91 98765 54321']
    )

    pharmacy_id = insert(
        'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)',
        ['HealthPlus Admin', 'pharmacy@test.com', pw_hash, 'pharmacy', '+91 98765 99999']
    )
    # Pharmacy profile
    insert(
        'INSERT INTO pharmacy_profiles (user_id, pharmacy_name) VALUES (?,?)',
        [pharmacy_id, 'HealthPlus Pharmacy']
    )

    driver_id = insert(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
        ['Raj Kumar', 'delivery@test.com', pw_hash, 'delivery']
    )

    # --- Categories ---
    cat_diabetes    = _get_or_create_category('Diabetes')
    cat_bp          = _get_or_create_category('Blood Pressure')
    cat_heart       = _get_or_create_category('Heart')
    cat_gastric     = _get_or_create_category('Gastric')
    cat_supplement  = _get_or_create_category('Supplement')
    cat_pain        = _get_or_create_category('Pain Relief')
    cat_allergy     = _get_or_create_category('Allergy')
    cat_cholesterol = _get_or_create_category('Cholesterol')
    cat_antibiotic  = _get_or_create_category('Antibiotic')

    # --- Suppliers ---
    sup_pharma  = _get_or_create_supplier('PharmaCorp')
    sup_med     = _get_or_create_supplier('MedSupply')
    sup_health  = _get_or_create_supplier('HealthDist')
    sup_vita    = _get_or_create_supplier('VitaSource')

    # --- Reminders + reminder_times ---
    reminder_data = [
        (user_id, 'Metformin 500mg',  '1 tablet', 'Daily', 1, ['8:00 AM', '2:00 PM', '8:00 PM']),
        (user_id, 'Amlodipine 5mg',   '1 tablet', 'Daily', 1, ['6:00 PM']),
        (user_id, 'Aspirin 75mg',     '1 tablet', 'Daily', 1, ['9:00 PM']),
        (user_id, 'Vitamin D3',       '1 capsule', 'Weekly (Sun)', 0, ['9:00 AM']),
        (user_id, 'Omeprazole 20mg',  '1 capsule', 'Daily', 1, ['7:30 AM']),
    ]
    for uid, med_name, dosage, freq, active, times in reminder_data:
        rid = insert(
            'INSERT INTO reminders (user_id, medicine_name, dosage, frequency, active) VALUES (?,?,?,?,?)',
            [uid, med_name, dosage, freq, active]
        )
        for t in times:
            insert('INSERT INTO reminder_times (reminder_id, time_slot) VALUES (?,?)', [rid, t])

    # --- User medicines (no status column — computed at query time) ---
    user_meds = [
        (user_id, 'Metformin 500mg',  cat_diabetes,   45, 90, '2026-08-15'),
        (user_id, 'Amlodipine 5mg',   cat_bp,         12, 30, '2026-06-20'),
        (user_id, 'Aspirin 75mg',     cat_heart,       5, 60, '2026-09-10'),
        (user_id, 'Omeprazole 20mg',  cat_gastric,    25, 30, '2026-07-01'),
        (user_id, 'Vitamin D3',       cat_supplement, 20, 30, '2027-01-15'),
        (user_id, 'Losartan 50mg',    cat_bp,          8, 30, '2026-05-30'),
    ]
    for uid, name, cat_id, stock, total, expires in user_meds:
        insert(
            'INSERT INTO user_medicines (user_id, name, category_id, stock, total, expires) VALUES (?,?,?,?,?,?)',
            [uid, name, cat_id, stock, total, expires]
        )

    # --- Pharmacy inventory (no status — computed at query time) ---
    pharm_inv = [
        (pharmacy_id, 'Metformin 500mg',     cat_diabetes,    245, 12.99, sup_pharma, 4.8),
        (pharmacy_id, 'Amlodipine 5mg',      cat_bp,          180,  8.49, sup_med,    4.6),
        (pharmacy_id, 'Aspirin 75mg',        cat_heart,        12,  5.99, sup_pharma, 4.9),
        (pharmacy_id, 'Omeprazole 20mg',     cat_gastric,      95, 15.00, sup_health, 4.5),
        (pharmacy_id, 'Losartan 50mg',       cat_bp,            8, 11.20, sup_med,    4.7),
        (pharmacy_id, 'Paracetamol 500mg',   cat_pain,        520,  3.49, sup_pharma, 4.8),
        (pharmacy_id, 'Cetirizine 10mg',     cat_allergy,      15,  6.75, sup_health, 4.3),
        (pharmacy_id, 'Vitamin D3 1000IU',   cat_supplement,  150,  9.99, sup_vita,   4.4),
        (pharmacy_id, 'Atorvastatin 10mg',   cat_cholesterol,  88, 18.50, sup_pharma, 4.6),
        (pharmacy_id, 'Ciprofloxacin 500mg', cat_antibiotic,   42, 22.00, sup_med,    4.5),
    ]
    for pid, name, cat_id, stock, price, sup_id, rating in pharm_inv:
        insert(
            'INSERT INTO pharmacy_inventory (pharmacy_id, name, category_id, stock, price, supplier_id, rating) VALUES (?,?,?,?,?,?,?)',
            [pid, name, cat_id, stock, price, sup_id, rating]
        )

    # --- Orders + order_items ---
    order1_id = insert(
        'INSERT INTO orders (user_id, pharmacy_id, delivery_id, total, status, address) VALUES (?,?,?,?,?,?)',
        [user_id, pharmacy_id, driver_id, 31.97, 'out_for_delivery', '42 Greenfield Lane, Bangalore']
    )
    for item in [('Metformin 500mg', 2, 25.98), ('Aspirin 75mg', 1, 5.99)]:
        insert('INSERT INTO order_items (order_id, name, qty, price) VALUES (?,?,?,?)',
               [order1_id, item[0], item[1], item[2]])

    order2_id = insert(
        'INSERT INTO orders (user_id, pharmacy_id, total, status, address) VALUES (?,?,?,?,?)',
        [user_id, pharmacy_id, 42.50, 'delivered', '42 Greenfield Lane, Bangalore']
    )
    for item in [('Omeprazole 20mg', 1, 15.00), ('Paracetamol x2', 2, 6.98), ('Vitamin D3', 1, 9.99)]:
        insert('INSERT INTO order_items (order_id, name, qty, price) VALUES (?,?,?,?)',
               [order2_id, item[0], item[1], item[2]])

    order3_id = insert(
        'INSERT INTO orders (user_id, pharmacy_id, total, status, address) VALUES (?,?,?,?,?)',
        [user_id, pharmacy_id, 12.99, 'delivered', '42 Greenfield Lane, Bangalore']
    )
    insert('INSERT INTO order_items (order_id, name, qty, price) VALUES (?,?,?,?)',
           [order3_id, 'Metformin 500mg', 1, 12.99])

    # --- Deliveries (no denormalized customer data — JOINed at query time) ---
    from datetime import datetime
    now = datetime.utcnow().isoformat()

    insert(
        'INSERT INTO deliveries (order_id, driver_id, distance, eta, status) VALUES (?,?,?,?,?)',
        [order1_id, driver_id, '3.2 km', '15 min', 'picked_up']
    )
    insert(
        'INSERT INTO deliveries (order_id, driver_id, distance, eta, earnings, rating, status, completed_at) VALUES (?,?,?,?,?,?,?,?)',
        [order1_id, driver_id, '4.2 km', '', 8.50, 5, 'delivered', now]
    )
    insert(
        'INSERT INTO deliveries (order_id, driver_id, distance, eta, earnings, rating, status, completed_at) VALUES (?,?,?,?,?,?,?,?)',
        [order1_id, driver_id, '7.1 km', '', 12.00, 5, 'delivered', now]
    )

    print('✅ Seed: Sample data inserted (3NF normalized)')
    print('   👤 Patient:  margaret@test.com  (password123)')
    print('   💊 Pharmacy: pharmacy@test.com  (password123)')
    print('   🚚 Delivery: delivery@test.com  (password123)')
