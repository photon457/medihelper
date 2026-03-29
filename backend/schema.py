"""
Schema creation + seed data for MediHelper.
Works with both MySQL and SQLite.
"""
import json
import bcrypt
from db import query, insert, exec_script, get_engine

MYSQL_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','pharmacy','delivery') NOT NULL DEFAULT 'user',
  phone VARCHAR(50) DEFAULT '',
  address TEXT,
  age INT DEFAULT NULL,
  blood_group VARCHAR(10) DEFAULT '',
  emergency_contact VARCHAR(255) DEFAULT '',
  pharmacy_name VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  medicine_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) NOT NULL,
  times JSON NOT NULL,
  frequency VARCHAR(50) NOT NULL DEFAULT 'Daily',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dose_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reminder_id INT NOT NULL,
  user_id INT NOT NULL,
  taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'taken',
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  expires DATE DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'good',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pharmacy_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplier VARCHAR(255) DEFAULT '',
  rating DECIMAL(2,1) DEFAULT 4.5,
  status VARCHAR(20) NOT NULL DEFAULT 'good',
  FOREIGN KEY (pharmacy_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  pharmacy_id INT DEFAULT NULL,
  delivery_id INT DEFAULT NULL,
  items JSON NOT NULL,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  address TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deliveries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  driver_id INT NOT NULL,
  customer_name VARCHAR(255) DEFAULT '',
  customer_phone VARCHAR(50) DEFAULT '',
  address TEXT DEFAULT '',
  items_count INT DEFAULT 0,
  distance VARCHAR(20) DEFAULT '',
  eta VARCHAR(50) DEFAULT '',
  earnings DECIMAL(10,2) DEFAULT 0,
  rating INT DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'assigned',
  completed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
)
"""

SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user','pharmacy','delivery')),
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  age INTEGER DEFAULT NULL,
  blood_group TEXT DEFAULT '',
  emergency_contact TEXT DEFAULT '',
  pharmacy_name TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  medicine_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  times TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'Daily',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dose_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reminder_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  taken_at TEXT DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'taken',
  FOREIGN KEY (reminder_id) REFERENCES reminders(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_medicines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  expires TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'good',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pharmacy_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  supplier TEXT DEFAULT '',
  rating REAL DEFAULT 4.5,
  status TEXT NOT NULL DEFAULT 'good',
  FOREIGN KEY (pharmacy_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pharmacy_id INTEGER DEFAULT NULL,
  delivery_id INTEGER DEFAULT NULL,
  items TEXT NOT NULL,
  total REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  address TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  customer_name TEXT DEFAULT '',
  customer_phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  items_count INTEGER DEFAULT 0,
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
    print('✅ Schema: All tables created')


def seed_data():
    rows = query('SELECT COUNT(*) as count FROM users')
    count = rows[0].get('count', 0) if rows else 0
    if count > 0:
        print('ℹ️  Seed: Data already exists, skipping')
        return

    pw_hash = bcrypt.hashpw(b'password123', bcrypt.gensalt()).decode('utf-8')

    # --- Users ---
    user_id = insert(
        'INSERT INTO users (name, email, password_hash, role, phone, address, age, blood_group, emergency_contact) VALUES (?,?,?,?,?,?,?,?,?)',
        ['Margaret Thompson', 'margaret@test.com', pw_hash, 'user',
         '+91 98765 12345', '42 Greenfield Lane, Bangalore 560001', 72, 'O+',
         'John Thompson — +91 98765 54321']
    )

    pharmacy_id = insert(
        'INSERT INTO users (name, email, password_hash, role, phone, pharmacy_name) VALUES (?,?,?,?,?,?)',
        ['HealthPlus Admin', 'pharmacy@test.com', pw_hash, 'pharmacy',
         '+91 98765 99999', 'HealthPlus Pharmacy']
    )

    driver_id = insert(
        'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)',
        ['Raj Kumar', 'delivery@test.com', pw_hash, 'delivery', '+91 98765 43210']
    )

    # --- Reminders ---
    reminders = [
        (user_id, 'Metformin 500mg',  '1 tablet', json.dumps(['8:00 AM', '2:00 PM', '8:00 PM']), 'Daily', 1),
        (user_id, 'Amlodipine 5mg',   '1 tablet', json.dumps(['6:00 PM']),                       'Daily', 1),
        (user_id, 'Aspirin 75mg',     '1 tablet', json.dumps(['9:00 PM']),                       'Daily', 1),
        (user_id, 'Vitamin D3',       '1 capsule', json.dumps(['9:00 AM']),                      'Weekly (Sun)', 0),
        (user_id, 'Omeprazole 20mg',  '1 capsule', json.dumps(['7:30 AM']),                      'Daily', 1),
    ]
    for r in reminders:
        insert('INSERT INTO reminders (user_id, medicine_name, dosage, times, frequency, active) VALUES (?,?,?,?,?,?)', list(r))

    # --- User medicines ---
    user_meds = [
        (user_id, 'Metformin 500mg',  'Diabetes',        45, 90, '2026-08-15', 'good'),
        (user_id, 'Amlodipine 5mg',   'Blood Pressure',  12, 30, '2026-06-20', 'low'),
        (user_id, 'Aspirin 75mg',     'Heart',            5, 60, '2026-09-10', 'critical'),
        (user_id, 'Omeprazole 20mg',  'Gastric',         25, 30, '2026-07-01', 'good'),
        (user_id, 'Vitamin D3',       'Supplement',      20, 30, '2027-01-15', 'good'),
        (user_id, 'Losartan 50mg',    'Blood Pressure',   8, 30, '2026-05-30', 'low'),
    ]
    for m in user_meds:
        insert('INSERT INTO user_medicines (user_id, name, category, stock, total, expires, status) VALUES (?,?,?,?,?,?,?)', list(m))

    # --- Pharmacy inventory ---
    pharm_inv = [
        (pharmacy_id, 'Metformin 500mg',     'Diabetes',        245, 12.99, 'PharmaCorp',  4.8, 'good'),
        (pharmacy_id, 'Amlodipine 5mg',      'Blood Pressure',  180,  8.49, 'MedSupply',   4.6, 'good'),
        (pharmacy_id, 'Aspirin 75mg',        'Heart',            12,  5.99, 'PharmaCorp',  4.9, 'critical'),
        (pharmacy_id, 'Omeprazole 20mg',     'Gastric',          95, 15.00, 'HealthDist',  4.5, 'good'),
        (pharmacy_id, 'Losartan 50mg',       'Blood Pressure',    8, 11.20, 'MedSupply',   4.7, 'critical'),
        (pharmacy_id, 'Paracetamol 500mg',   'Pain Relief',     520,  3.49, 'PharmaCorp',  4.8, 'good'),
        (pharmacy_id, 'Cetirizine 10mg',     'Allergy',          15,  6.75, 'HealthDist',  4.3, 'low'),
        (pharmacy_id, 'Vitamin D3 1000IU',   'Supplement',      150,  9.99, 'VitaSource',  4.4, 'good'),
        (pharmacy_id, 'Atorvastatin 10mg',   'Cholesterol',      88, 18.50, 'PharmaCorp',  4.6, 'good'),
        (pharmacy_id, 'Ciprofloxacin 500mg', 'Antibiotic',       42, 22.00, 'MedSupply',   4.5, 'low'),
    ]
    for p in pharm_inv:
        insert('INSERT INTO pharmacy_inventory (pharmacy_id, name, category, stock, price, supplier, rating, status) VALUES (?,?,?,?,?,?,?,?)', list(p))

    # --- Orders ---
    items1 = json.dumps([{'name': 'Metformin 500mg', 'qty': 2, 'price': 25.98}, {'name': 'Aspirin 75mg', 'qty': 1, 'price': 5.99}])
    order1_id = insert(
        'INSERT INTO orders (user_id, pharmacy_id, delivery_id, items, total, status, address) VALUES (?,?,?,?,?,?,?)',
        [user_id, pharmacy_id, driver_id, items1, 31.97, 'out_for_delivery', '42 Greenfield Lane, Bangalore']
    )

    items2 = json.dumps([{'name': 'Omeprazole 20mg', 'qty': 1, 'price': 15.00}, {'name': 'Paracetamol x2', 'qty': 2, 'price': 6.98}, {'name': 'Vitamin D3', 'qty': 1, 'price': 9.99}])
    insert(
        'INSERT INTO orders (user_id, pharmacy_id, items, total, status, address) VALUES (?,?,?,?,?,?)',
        [user_id, pharmacy_id, items2, 42.50, 'delivered', '42 Greenfield Lane, Bangalore']
    )

    items3 = json.dumps([{'name': 'Metformin 500mg', 'qty': 1, 'price': 12.99}])
    insert(
        'INSERT INTO orders (user_id, pharmacy_id, items, total, status, address) VALUES (?,?,?,?,?,?)',
        [user_id, pharmacy_id, items3, 12.99, 'delivered', '42 Greenfield Lane, Bangalore']
    )

    # --- Deliveries ---
    from datetime import datetime
    now = datetime.utcnow().isoformat()

    insert(
        'INSERT INTO deliveries (order_id, driver_id, customer_name, customer_phone, address, items_count, distance, eta, status) VALUES (?,?,?,?,?,?,?,?,?)',
        [order1_id, driver_id, 'Margaret T.', '+91 98765 12345', '42 Greenfield Lane, Bangalore', 2, '3.2 km', '15 min', 'picked_up']
    )
    insert(
        'INSERT INTO deliveries (order_id, driver_id, customer_name, customer_phone, address, items_count, distance, eta, earnings, rating, status, completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [order1_id, driver_id, 'Amit P.', '+91 98765 45678', '22 Indiranagar', 4, '4.2 km', '', 8.50, 5, 'delivered', now]
    )
    insert(
        'INSERT INTO deliveries (order_id, driver_id, customer_name, customer_phone, address, items_count, distance, eta, earnings, rating, status, completed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        [order1_id, driver_id, 'Lakshmi S.', '+91 98765 56789', '5 Whitefield', 1, '7.1 km', '', 12.00, 5, 'delivered', now]
    )

    print('✅ Seed: Sample data inserted')
    print('   👤 Patient:  margaret@test.com  (password123)')
    print('   💊 Pharmacy: pharmacy@test.com  (password123)')
    print('   🚚 Delivery: delivery@test.com  (password123)')
