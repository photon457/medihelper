"""User routes — dashboard, reminders, medicines, orders, profile, shop."""
import json
from flask import Blueprint, request, jsonify, g
from db import query, insert, run
from auth import authenticate, require_role

user_bp = Blueprint('user', __name__)


@user_bp.before_request
def before():
    if request.method == 'OPTIONS':
        return '', 200
    auth_result = _check_auth('user')
    if auth_result:
        return auth_result


def _check_auth(role):
    from auth import JWT_SECRET
    import jwt as pyjwt
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'error': 'No token provided'}), 401
    token = auth_header.split(' ', 1)[1]
    try:
        decoded = pyjwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        g.user = decoded
    except Exception:
        return jsonify({'error': 'Invalid token'}), 401
    if decoded.get('role') != role:
        return jsonify({'error': 'Insufficient permissions'}), 403
    return None


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def _stock_status(stock, total):
    """Compute medicine status from stock/total ratio."""
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


def _get_reminder_times(reminder_id):
    """Fetch time_slot list for a reminder."""
    rows = query('SELECT time_slot FROM reminder_times WHERE reminder_id = ?', [reminder_id])
    return [r['time_slot'] for r in rows]


def _get_order_items(order_id):
    """Fetch items list for an order."""
    rows = query('SELECT name, qty, price FROM order_items WHERE order_id = ?', [order_id])
    return rows


def _get_or_create_category(name):
    """Return category id, creating if needed."""
    rows = query('SELECT id FROM categories WHERE name = ?', [name])
    if rows:
        return rows[0]['id']
    return insert('INSERT INTO categories (name) VALUES (?)', [name])


def _parse_time_str(time_str):
    """Parse '8:00 AM' or '2:00 PM' into (hours24, minutes)."""
    try:
        parts = time_str.strip().split(' ')
        t, ampm = parts[0], parts[1].upper() if len(parts) > 1 else 'AM'
        h, m = t.split(':')
        h, m = int(h), int(m)
        if ampm == 'PM' and h != 12:
            h += 12
        if ampm == 'AM' and h == 12:
            h = 0
        return h, m
    except Exception:
        return None, None


def _time_to_minutes(time_str):
    """Convert '8:00 AM' to minutes since midnight."""
    h, m = _parse_time_str(time_str)
    if h is None:
        return 0
    return h * 60 + m


def _minutes_to_time_str(total_minutes):
    """Convert minutes-since-midnight back to '8:00 AM' format."""
    total_minutes = total_minutes % (24 * 60)
    h = total_minutes // 60
    m = total_minutes % 60
    ampm = 'AM' if h < 12 else 'PM'
    display_h = h if h <= 12 else h - 12
    if display_h == 0:
        display_h = 12
    return f'{display_h}:{m:02d} {ampm}'


def _compute_delay_minutes(scheduled_time_str):
    """Return how many minutes late the current time is vs scheduled.
    Negative = early, 0 = on time, positive = late."""
    from datetime import datetime
    h, m = _parse_time_str(scheduled_time_str)
    if h is None:
        return 0
    now = datetime.now()
    scheduled_min = h * 60 + m
    now_min = now.hour * 60 + now.minute
    return now_min - scheduled_min


def _adjust_remaining_times(all_times, taken_slot, delay_minutes):
    """Shift all times AFTER taken_slot forward by delay_minutes.
    Returns dict mapping original_time -> adjusted_time."""
    taken_min = _time_to_minutes(taken_slot)
    adjustments = {}
    for t in all_times:
        t_min = _time_to_minutes(t)
        if t_min > taken_min:
            adjustments[t] = _minutes_to_time_str(t_min + delay_minutes)
        else:
            adjustments[t] = t
    return adjustments


# ============= DASHBOARD =============
@user_bp.route('/dashboard', methods=['GET'])
def dashboard():
    try:
        uid = g.user['id']
        reminders = query('SELECT * FROM reminders WHERE user_id = ? AND active = 1', [uid])
        medicines = query("""
            SELECT um.*, c.name as category
            FROM user_medicines um
            JOIN categories c ON um.category_id = c.id
            WHERE um.user_id = ?
        """, [uid])
        orders = query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [uid])
        dose_logs = query("SELECT * FROM dose_logs WHERE user_id = ? AND date(taken_at) = date('now') ORDER BY taken_at DESC", [uid])

        # Build a lookup: (reminder_id, time_slot) -> dose_log
        taken_slots = {}
        for d in dose_logs:
            key = (d['reminder_id'], d.get('time_slot', ''))
            taken_slots[key] = d

        # Gather times for each reminder and compute adjustments
        all_adjustments = {}  # (reminder_id, time) -> adjusted_time
        for r in reminders:
            r['times'] = _get_reminder_times(r['id'])
            # Check if any slot for this reminder was taken late today
            for d in dose_logs:
                if d['reminder_id'] == r['id'] and d.get('delay_minutes', 0) > 0:
                    adj = _adjust_remaining_times(r['times'], d['time_slot'], d['delay_minutes'])
                    for orig, shifted in adj.items():
                        all_adjustments[(r['id'], orig)] = shifted

        total_doses_today = sum(len(r['times']) for r in reminders)
        doses_taken = len(dose_logs)

        # Compute status for medicines
        for m in medicines:
            m['status'] = _stock_status(m['stock'], m['total'])

        low_stock = sum(1 for m in medicines if m['status'] in ('low', 'critical'))
        active_orders = sum(1 for o in orders if o['status'] != 'delivered')

        # Build order items
        recent_orders = []
        for o in orders[:5]:
            items = _get_order_items(o['id'])
            recent_orders.append({**o, 'items': items})

        # Build per-slot dose info for each reminder
        upcoming_meds = []
        for r in reminders:
            dose_slots = []
            for t in r['times']:
                key = (r['id'], t)
                log = taken_slots.get(key)
                adjusted = all_adjustments.get(key, t)
                dose_slots.append({
                    'time': t,
                    'adjustedTime': adjusted,
                    'taken': log is not None,
                    'status': log['status'] if log else None,
                    'delayMinutes': log.get('delay_minutes', 0) if log else 0,
                })
            upcoming_meds.append({
                **r,
                'active': bool(r['active']),
                'takenToday': all(s['taken'] for s in dose_slots),
                'doseSlots': dose_slots,
            })

        return jsonify({
            'stats': {
                'totalDosesToday': total_doses_today,
                'dosesTaken': doses_taken,
                'medicineCount': len(medicines),
                'lowStockCount': low_stock,
                'activeOrders': active_orders,
            },
            'upcomingMeds': upcoming_meds,
            'recentOrders': recent_orders,
        })
    except Exception as e:
        print(f'Dashboard error: {e}')
        return jsonify({'error': 'Failed to load dashboard'}), 500


# ============= REMINDERS =============
@user_bp.route('/reminders', methods=['GET'])
def get_reminders():
    try:
        rows = query('SELECT * FROM reminders WHERE user_id = ? ORDER BY id DESC', [g.user['id']])
        result = []
        for r in rows:
            r['times'] = _get_reminder_times(r['id'])
            r['active'] = bool(r['active'])
            result.append(r)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': 'Failed to fetch reminders'}), 500


@user_bp.route('/reminders', methods=['POST'])
def create_reminder():
    try:
        data = request.get_json()
        name = data.get('medicine_name', '')
        dosage = data.get('dosage', '')
        times = data.get('times', [])
        freq = data.get('frequency', 'Daily')

        if not name or not dosage or not times:
            return jsonify({'error': 'medicine_name, dosage, and times are required'}), 400

        rid = insert(
            'INSERT INTO reminders (user_id, medicine_name, dosage, frequency) VALUES (?,?,?,?)',
            [g.user['id'], name, dosage, freq]
        )
        for t in times:
            insert('INSERT INTO reminder_times (reminder_id, time_slot) VALUES (?,?)', [rid, t])

        return jsonify({'id': rid, 'medicine_name': name, 'dosage': dosage, 'times': times, 'frequency': freq, 'active': True}), 201
    except Exception as e:
        return jsonify({'error': 'Failed to create reminder'}), 500


@user_bp.route('/reminders/<int:rid>', methods=['PUT'])
def update_reminder(rid):
    try:
        data = request.get_json()
        fields, values = [], []

        for key in ('medicine_name', 'dosage', 'frequency'):
            if key in data:
                fields.append(f'{key} = ?')
                values.append(data[key])
        if 'active' in data:
            fields.append('active = ?')
            values.append(1 if data['active'] else 0)

        if fields:
            values += [rid, g.user['id']]
            run(f"UPDATE reminders SET {', '.join(fields)} WHERE id = ? AND user_id = ?", values)

        # Replace reminder_times if times provided
        if 'times' in data:
            run('DELETE FROM reminder_times WHERE reminder_id = ?', [rid])
            for t in data['times']:
                insert('INSERT INTO reminder_times (reminder_id, time_slot) VALUES (?,?)', [rid, t])

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': 'Failed to update reminder'}), 500


@user_bp.route('/reminders/<int:rid>', methods=['DELETE'])
def delete_reminder(rid):
    try:
        # reminder_times cascade-deleted via FK
        run('DELETE FROM reminders WHERE id = ? AND user_id = ?', [rid, g.user['id']])
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': 'Failed to delete reminder'}), 500


@user_bp.route('/reminders/<int:rid>/take', methods=['POST'])
def take_dose(rid):
    try:
        data = request.get_json(silent=True) or {}
        time_slot = data.get('time_slot', '')

        # Check if this specific slot was already taken today
        if time_slot:
            existing = query(
                "SELECT id FROM dose_logs WHERE reminder_id = ? AND user_id = ? AND time_slot = ? AND date(taken_at) = date('now')",
                [rid, g.user['id'], time_slot]
            )
        else:
            existing = query(
                "SELECT id FROM dose_logs WHERE reminder_id = ? AND user_id = ? AND date(taken_at) = date('now')",
                [rid, g.user['id']]
            )
        if existing:
            return jsonify({'error': 'Already taken', 'alreadyTaken': True}), 409

        # Compute delay
        delay = 0
        status = 'taken'
        if time_slot:
            delay = _compute_delay_minutes(time_slot)
            if delay > 30:
                status = 'taken_late'
            elif delay < 0:
                delay = 0  # early is fine

        insert(
            'INSERT INTO dose_logs (reminder_id, user_id, time_slot, status, delay_minutes) VALUES (?,?,?,?,?)',
            [rid, g.user['id'], time_slot, status, max(delay, 0)]
        )

        # Compute adjusted times for remaining slots
        adjusted_times = {}
        if status == 'taken_late' and delay > 0:
            times = _get_reminder_times(rid)
            adjusted_times = _adjust_remaining_times(times, time_slot, delay)

        return jsonify({
            'success': True,
            'status': status,
            'delayMinutes': max(delay, 0),
            'adjustedTimes': adjusted_times,
        })
    except Exception as e:
        print(f'Take dose error: {e}')
        return jsonify({'error': 'Failed to log dose'}), 500


# ============= MEDICINES =============
@user_bp.route('/medicines', methods=['GET'])
def get_medicines():
    try:
        rows = query("""
            SELECT um.*, c.name as category
            FROM user_medicines um
            JOIN categories c ON um.category_id = c.id
            WHERE um.user_id = ?
            ORDER BY um.name
        """, [g.user['id']])
        # Compute status
        for r in rows:
            r['status'] = _stock_status(r['stock'], r['total'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': 'Failed to fetch medicines'}), 500


@user_bp.route('/medicines', methods=['POST'])
def add_medicine():
    try:
        uid = g.user['id']
        data = request.get_json()
        name = data.get('name', '').strip()
        if not name:
            return jsonify({'error': 'Medicine name is required'}), 400

        category = data.get('category', 'General')
        stock = data.get('stock', 30)
        total = data.get('total', 30)
        expires = data.get('expires', '') or None
        dosage = data.get('dosage', '1 tablet')
        frequency = data.get('frequency', 'Daily')
        times = data.get('times', ['9:00 AM'])

        cat_id = _get_or_create_category(category)

        med_id = insert(
            'INSERT INTO user_medicines (user_id, name, category_id, stock, total, expires) VALUES (?,?,?,?,?,?)',
            [uid, name, cat_id, stock, total, expires]
        )

        # Auto-create reminder + times
        rid = insert(
            'INSERT INTO reminders (user_id, medicine_name, dosage, frequency) VALUES (?,?,?,?)',
            [uid, name, dosage, frequency]
        )
        for t in times:
            insert('INSERT INTO reminder_times (reminder_id, time_slot) VALUES (?,?)', [rid, t])

        return jsonify({'success': True, 'id': med_id}), 201
    except Exception as e:
        print(f'Add medicine error: {e}')
        return jsonify({'error': 'Failed to add medicine'}), 500


@user_bp.route('/medicines/<int:mid>', methods=['DELETE'])
def delete_medicine(mid):
    try:
        uid = g.user['id']
        meds = query('SELECT name FROM user_medicines WHERE id = ? AND user_id = ?', [mid, uid])
        if not meds:
            return jsonify({'error': 'Medicine not found'}), 404
        # Delete associated reminder (reminder_times cascade via FK)
        run('DELETE FROM reminders WHERE user_id = ? AND medicine_name = ?', [uid, meds[0]['name']])
        run('DELETE FROM user_medicines WHERE id = ? AND user_id = ?', [mid, uid])
        return jsonify({'success': True})
    except Exception as e:
        print(f'Delete medicine error: {e}')
        return jsonify({'error': 'Failed to delete medicine'}), 500


# ============= ORDERS =============
@user_bp.route('/orders', methods=['GET'])
def get_orders():
    try:
        from datetime import datetime, timedelta
        rows = query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [g.user['id']])
        result = []
        for o in rows:
            items = _get_order_items(o['id'])
            order = {**o, 'items': items}
            # Auto-progress order status
            if o['status'] not in ('delivered', 'cancelled') and o['created_at']:
                try:
                    created = datetime.strptime(o['created_at'], '%Y-%m-%d %H:%M:%S')
                    elapsed = (datetime.now() - created).total_seconds() / 60
                    new_status = o['status']
                    if elapsed > 60:
                        new_status = 'delivered'
                    elif elapsed > 30:
                        new_status = 'out_for_delivery'
                    elif elapsed > 15:
                        new_status = 'ready'
                    elif elapsed > 5:
                        new_status = 'preparing'
                    if new_status != o['status']:
                        run('UPDATE orders SET status = ? WHERE id = ?', [new_status, o['id']])
                        order['status'] = new_status
                except:
                    pass
                try:
                    created = datetime.strptime(o['created_at'], '%Y-%m-%d %H:%M:%S')
                    eta = created + timedelta(hours=2)
                    order['estimatedDelivery'] = eta.strftime('%Y-%m-%d %H:%M:%S')
                except:
                    pass
            result.append(order)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': 'Failed to fetch orders'}), 500


@user_bp.route('/orders', methods=['POST'])
def place_order():
    try:
        uid = g.user['id']
        data = request.get_json()
        items = data.get('items', [])
        total = data.get('total', 0)
        address = data.get('address', '')
        payment_method = data.get('paymentMethod', 'cod')

        if not items or not total:
            return jsonify({'error': 'items and total are required'}), 400
        if not address.strip():
            return jsonify({'error': 'Delivery address is required'}), 400

        pharmacies = query("SELECT id FROM users WHERE role = 'pharmacy' LIMIT 1")
        pharm_id = pharmacies[0]['id'] if pharmacies else None

        from datetime import datetime, timedelta
        est_delivery = (datetime.now() + timedelta(hours=2)).strftime('%Y-%m-%d %H:%M:%S')

        oid = insert(
            'INSERT INTO orders (user_id, pharmacy_id, total, status, address) VALUES (?,?,?,?,?)',
            [uid, pharm_id, total, 'pending', address]
        )

        # Insert order_items
        for item in items:
            insert('INSERT INTO order_items (order_id, name, qty, price) VALUES (?,?,?,?)',
                   [oid, item.get('name', ''), item.get('qty', 1), item.get('price', 0)])

        # Auto-deduct stock from user_medicines
        for item in items:
            item_name = item.get('name', '')
            item_qty = item.get('qty', 0)
            if item_name and item_qty > 0:
                meds = query('SELECT * FROM user_medicines WHERE user_id = ? AND name LIKE ?', [uid, f'%{item_name}%'])
                if meds:
                    new_stock = max(0, meds[0]['stock'] - item_qty)
                    run('UPDATE user_medicines SET stock=? WHERE id=?', [new_stock, meds[0]['id']])

        return jsonify({
            'id': oid,
            'status': 'pending',
            'estimatedDelivery': est_delivery,
            'paymentMethod': payment_method
        }), 201
    except Exception as e:
        print(f'Order error: {e}')
        return jsonify({'error': 'Failed to place order'}), 500


@user_bp.route('/orders/<int:oid>/cancel', methods=['POST'])
def cancel_order(oid):
    """Cancel an order if it hasn't been delivered yet."""
    try:
        uid = g.user['id']
        orders = query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [oid, uid])
        if not orders:
            return jsonify({'error': 'Order not found'}), 404

        order = orders[0]
        if order['status'] == 'delivered':
            return jsonify({'error': 'Cannot cancel a delivered order'}), 400

        # Restore stock
        items = _get_order_items(oid)
        for item in items:
            item_name = item.get('name', '')
            item_qty = item.get('qty', 0)
            if item_name and item_qty > 0:
                meds = query('SELECT * FROM user_medicines WHERE user_id = ? AND name LIKE ?', [uid, f'%{item_name}%'])
                if meds:
                    new_stock = meds[0]['stock'] + item_qty
                    run('UPDATE user_medicines SET stock=? WHERE id=?', [new_stock, meds[0]['id']])

        run('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', oid])
        return jsonify({'success': True, 'message': 'Order cancelled'})
    except Exception as e:
        print(f'Cancel order error: {e}')
        return jsonify({'error': 'Failed to cancel order'}), 500


# ============= PROFILE =============
@user_bp.route('/profile', methods=['GET'])
def get_profile():
    try:
        rows = query("""
            SELECT u.id, u.name, u.email, u.phone, u.created_at,
                   p.address, p.age, p.blood_group, p.emergency_contact
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE u.id = ?
        """, [g.user['id']])
        if not rows:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(rows[0])
    except Exception as e:
        return jsonify({'error': 'Failed to fetch profile'}), 500


@user_bp.route('/profile', methods=['PUT'])
def update_profile():
    try:
        data = request.get_json()
        uid = g.user['id']
        # Update users table
        run('UPDATE users SET name=?, phone=? WHERE id=?',
            [data.get('name', ''), data.get('phone', ''), uid])
        # Upsert user_profiles
        existing = query('SELECT user_id FROM user_profiles WHERE user_id = ?', [uid])
        if existing:
            run('UPDATE user_profiles SET address=?, age=?, blood_group=?, emergency_contact=? WHERE user_id=?',
                [data.get('address', ''), data.get('age'), data.get('blood_group', ''),
                 data.get('emergency_contact', ''), uid])
        else:
            insert('INSERT INTO user_profiles (user_id, address, age, blood_group, emergency_contact) VALUES (?,?,?,?,?)',
                   [uid, data.get('address', ''), data.get('age'), data.get('blood_group', ''),
                    data.get('emergency_contact', '')])
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': 'Failed to update profile'}), 500


@user_bp.route('/profile/password', methods=['PUT'])
def change_password():
    try:
        import bcrypt
        data = request.get_json()
        old_pw = data.get('oldPassword', '')
        new_pw = data.get('newPassword', '')
        if not old_pw or not new_pw:
            return jsonify({'error': 'Both old and new passwords required'}), 400
        if len(new_pw) < 6:
            return jsonify({'error': 'New password must be at least 6 characters'}), 400

        user = query('SELECT password_hash FROM users WHERE id = ?', [g.user['id']])
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if not bcrypt.checkpw(old_pw.encode(), user[0]['password_hash'].encode()):
            return jsonify({'error': 'Current password is incorrect'}), 401

        hashed = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt()).decode()
        run('UPDATE users SET password_hash = ? WHERE id = ?', [hashed, g.user['id']])
        return jsonify({'success': True, 'message': 'Password changed'})
    except Exception as e:
        print(f'Password change error: {e}')
        return jsonify({'error': 'Failed to change password'}), 500


@user_bp.route('/account', methods=['DELETE'])
def delete_account():
    """Permanently delete user account and all associated data."""
    try:
        uid = g.user['id']
        # Delete in dependency order (FKs will cascade most, but be explicit)
        run('DELETE FROM dose_logs WHERE user_id = ?', [uid])
        run('DELETE FROM reminders WHERE user_id = ?', [uid])
        run('DELETE FROM user_medicines WHERE user_id = ?', [uid])
        run('DELETE FROM orders WHERE user_id = ?', [uid])
        run('DELETE FROM user_profiles WHERE user_id = ?', [uid])
        run('DELETE FROM pharmacy_profiles WHERE user_id = ?', [uid])
        run('DELETE FROM users WHERE id = ?', [uid])
        return jsonify({'success': True, 'message': 'Account deleted'})
    except Exception as e:
        print(f'Delete account error: {e}')
        return jsonify({'error': 'Failed to delete account'}), 500


# ============= SHOP (browse pharmacy products) =============
@user_bp.route('/shop', methods=['GET'])
def shop():
    try:
        rows = query("""
            SELECT pi.id, pi.name, pi.stock, pi.price, pi.rating,
                   c.name as category,
                   s.name as supplier,
                   pp.pharmacy_name as pharmacy
            FROM pharmacy_inventory pi
            JOIN categories c ON pi.category_id = c.id
            LEFT JOIN suppliers s ON pi.supplier_id = s.id
            JOIN users u ON pi.pharmacy_id = u.id
            LEFT JOIN pharmacy_profiles pp ON u.id = pp.user_id
            WHERE pi.stock > 0
            ORDER BY pi.name
        """)
        # Compute status on the fly
        for r in rows:
            r['status'] = _inv_status(r['stock'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': 'Failed to fetch products'}), 500


# ============= SETUP (Onboarding) =============
@user_bp.route('/setup-status', methods=['GET'])
def setup_status():
    try:
        uid = g.user['id']
        meds = query('SELECT COUNT(*) as count FROM user_medicines WHERE user_id = ?', [uid])
        count = meds[0]['count'] if meds else 0
        return jsonify({'needsSetup': count == 0})
    except Exception as e:
        return jsonify({'error': 'Failed to check setup status'}), 500


@user_bp.route('/setup', methods=['POST'])
def setup():
    """Bulk-add medicines and auto-create reminders during onboarding."""
    try:
        uid = g.user['id']
        data = request.get_json()
        medicines = data.get('medicines', [])
        profile = data.get('profile', {})

        if not medicines:
            return jsonify({'error': 'At least one medicine is required'}), 400

        # Update profile if provided
        if profile:
            run('UPDATE users SET name=?, phone=? WHERE id=?',
                [profile.get('name', ''), profile.get('phone', ''), uid])
            existing = query('SELECT user_id FROM user_profiles WHERE user_id = ?', [uid])
            if existing:
                run('UPDATE user_profiles SET address=?, age=?, blood_group=?, emergency_contact=? WHERE user_id=?',
                    [profile.get('address', ''), profile.get('age'), profile.get('blood_group', ''),
                     profile.get('emergency_contact', ''), uid])
            else:
                insert('INSERT INTO user_profiles (user_id, address, age, blood_group, emergency_contact) VALUES (?,?,?,?,?)',
                       [uid, profile.get('address', ''), profile.get('age'),
                        profile.get('blood_group', ''), profile.get('emergency_contact', '')])

        # Add medicines and create reminders
        for med in medicines:
            name = med.get('name', '')
            category = med.get('category', 'General')
            stock = med.get('stock', 30)
            total = med.get('total', 30)
            expires = med.get('expires', '')
            dosage = med.get('dosage', '1 tablet')
            times = med.get('times', ['9:00 AM'])
            frequency = med.get('frequency', 'Daily')

            if not name:
                continue

            cat_id = _get_or_create_category(category)

            insert(
                'INSERT INTO user_medicines (user_id, name, category_id, stock, total, expires) VALUES (?,?,?,?,?,?)',
                [uid, name, cat_id, stock, total, expires or None]
            )

            rid = insert(
                'INSERT INTO reminders (user_id, medicine_name, dosage, frequency) VALUES (?,?,?,?)',
                [uid, name, dosage, frequency]
            )
            for t in times:
                insert('INSERT INTO reminder_times (reminder_id, time_slot) VALUES (?,?)', [rid, t])

        return jsonify({'success': True, 'medicinesAdded': len(medicines)}), 201
    except Exception as e:
        print(f'Setup error: {e}')
        return jsonify({'error': 'Setup failed'}), 500
