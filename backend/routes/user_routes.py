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
    # Manually call authenticate and role check
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


def _parse_times(val):
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return [val]
    return val


def _parse_items(val):
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return []
    return val


# ============= DASHBOARD =============
@user_bp.route('/dashboard', methods=['GET'])
def dashboard():
    try:
        uid = g.user['id']
        reminders = query('SELECT * FROM reminders WHERE user_id = ? AND active = 1', [uid])
        medicines = query('SELECT * FROM user_medicines WHERE user_id = ?', [uid])
        orders = query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [uid])
        dose_logs = query("SELECT * FROM dose_logs WHERE user_id = ? AND date(taken_at) = date('now') ORDER BY taken_at DESC", [uid])

        # Track which reminders were taken today
        taken_reminder_ids = set(d['reminder_id'] for d in dose_logs)

        total_doses_today = sum(len(_parse_times(r['times'])) for r in reminders)
        doses_taken = min(len(dose_logs), total_doses_today)  # cap at max
        low_stock = sum(1 for m in medicines if m['status'] in ('low', 'critical'))
        active_orders = sum(1 for o in orders if o['status'] != 'delivered')

        return jsonify({
            'stats': {
                'totalDosesToday': total_doses_today,
                'dosesTaken': doses_taken,
                'medicineCount': len(medicines),
                'lowStockCount': low_stock,
                'activeOrders': active_orders,
            },
            'upcomingMeds': [
                {**r, 'times': _parse_times(r['times']), 'active': bool(r['active']), 'takenToday': r['id'] in taken_reminder_ids}
                for r in reminders
            ],
            'recentOrders': [
                {**o, 'items': _parse_items(o['items'])}
                for o in orders[:5]
            ],
        })
    except Exception as e:
        print(f'Dashboard error: {e}')
        return jsonify({'error': 'Failed to load dashboard'}), 500


# ============= REMINDERS =============
@user_bp.route('/reminders', methods=['GET'])
def get_reminders():
    try:
        rows = query('SELECT * FROM reminders WHERE user_id = ? ORDER BY id DESC', [g.user['id']])
        return jsonify([
            {**r, 'times': _parse_times(r['times']), 'active': bool(r['active'])}
            for r in rows
        ])
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
            'INSERT INTO reminders (user_id, medicine_name, dosage, times, frequency) VALUES (?,?,?,?,?)',
            [g.user['id'], name, dosage, json.dumps(times), freq]
        )
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
        if 'times' in data:
            fields.append('times = ?')
            values.append(json.dumps(data['times']))
        if 'active' in data:
            fields.append('active = ?')
            values.append(1 if data['active'] else 0)

        if not fields:
            return jsonify({'error': 'Nothing to update'}), 400

        values += [rid, g.user['id']]
        run(f"UPDATE reminders SET {', '.join(fields)} WHERE id = ? AND user_id = ?", values)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': 'Failed to update reminder'}), 500


@user_bp.route('/reminders/<int:rid>', methods=['DELETE'])
def delete_reminder(rid):
    try:
        run('DELETE FROM reminders WHERE id = ? AND user_id = ?', [rid, g.user['id']])
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': 'Failed to delete reminder'}), 500


@user_bp.route('/reminders/<int:rid>/take', methods=['POST'])
def take_dose(rid):
    try:
        # Check if already taken today
        existing = query(
            "SELECT id FROM dose_logs WHERE reminder_id = ? AND user_id = ? AND date(taken_at) = date('now')",
            [rid, g.user['id']]
        )
        if existing:
            return jsonify({'error': 'Already taken today', 'alreadyTaken': True}), 409

        insert('INSERT INTO dose_logs (reminder_id, user_id) VALUES (?,?)', [rid, g.user['id']])
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': 'Failed to log dose'}), 500


# ============= MEDICINES =============
@user_bp.route('/medicines', methods=['GET'])
def get_medicines():
    try:
        rows = query('SELECT * FROM user_medicines WHERE user_id = ? ORDER BY name', [g.user['id']])
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

        ratio = stock / total if total > 0 else 1
        status = 'good' if ratio > 0.3 else ('low' if ratio > 0.1 else 'critical')

        med_id = insert(
            'INSERT INTO user_medicines (user_id, name, category, stock, total, expires, status) VALUES (?,?,?,?,?,?,?)',
            [uid, name, category, stock, total, expires, status]
        )

        # Auto-create reminder
        insert(
            'INSERT INTO reminders (user_id, medicine_name, dosage, times, frequency) VALUES (?,?,?,?,?)',
            [uid, name, dosage, json.dumps(times), frequency]
        )

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
        # Delete associated reminder
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
            order = {**o, 'items': _parse_items(o['items'])}
            # Auto-progress order status based on elapsed time
            if o['status'] not in ('delivered', 'cancelled') and o['created_at']:
                try:
                    created = datetime.strptime(o['created_at'], '%Y-%m-%d %H:%M:%S')
                    elapsed = (datetime.now() - created).total_seconds() / 60  # minutes
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
                # Calculate ETA
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

        # Calculate estimated delivery (2 hours from now for demo)
        from datetime import datetime, timedelta
        now = datetime.now()
        est_delivery = (now + timedelta(hours=2)).strftime('%Y-%m-%d %H:%M:%S')

        oid = insert(
            'INSERT INTO orders (user_id, pharmacy_id, items, total, status, address) VALUES (?,?,?,?,?,?)',
            [uid, pharm_id, json.dumps(items), total, 'pending', address]
        )

        # Auto-deduct stock from user_medicines
        for item in items:
            item_name = item.get('name', '')
            item_qty = item.get('qty', 0)
            if item_name and item_qty > 0:
                # Find and update user's medicine stock
                meds = query('SELECT * FROM user_medicines WHERE user_id = ? AND name LIKE ?', [uid, f'%{item_name}%'])
                if meds:
                    new_stock = max(0, meds[0]['stock'] - item_qty)
                    med_total = meds[0]['total'] or 1
                    ratio = new_stock / med_total
                    new_status = 'good' if ratio > 0.3 else ('low' if ratio > 0.1 else 'critical')
                    run('UPDATE user_medicines SET stock=?, status=? WHERE id=?', [new_stock, new_status, meds[0]['id']])

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
        items = _parse_items(order['items'])
        for item in items:
            item_name = item.get('name', '')
            item_qty = item.get('qty', 0)
            if item_name and item_qty > 0:
                meds = query('SELECT * FROM user_medicines WHERE user_id = ? AND name LIKE ?', [uid, f'%{item_name}%'])
                if meds:
                    new_stock = meds[0]['stock'] + item_qty
                    med_total = meds[0]['total'] or 1
                    ratio = new_stock / med_total
                    new_status = 'good' if ratio > 0.3 else ('low' if ratio > 0.1 else 'critical')
                    run('UPDATE user_medicines SET stock=?, status=? WHERE id=?', [new_stock, new_status, meds[0]['id']])

        run('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', oid])
        return jsonify({'success': True, 'message': 'Order cancelled'})
    except Exception as e:
        print(f'Cancel order error: {e}')
        return jsonify({'error': 'Failed to cancel order'}), 500


# ============= PROFILE =============
@user_bp.route('/profile', methods=['GET'])
def get_profile():
    try:
        rows = query(
            'SELECT id, name, email, phone, address, age, blood_group, emergency_contact, created_at FROM users WHERE id = ?',
            [g.user['id']]
        )
        if not rows:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(rows[0])
    except Exception as e:
        return jsonify({'error': 'Failed to fetch profile'}), 500


@user_bp.route('/profile', methods=['PUT'])
def update_profile():
    try:
        data = request.get_json()
        run(
            'UPDATE users SET name=?, phone=?, address=?, age=?, blood_group=?, emergency_contact=? WHERE id=?',
            [data.get('name',''), data.get('phone',''), data.get('address',''),
             data.get('age'), data.get('blood_group',''), data.get('emergency_contact',''),
             g.user['id']]
        )
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

        user = query('SELECT password FROM users WHERE id = ?', [g.user['id']])
        if not user:
            return jsonify({'error': 'User not found'}), 404

        if not bcrypt.checkpw(old_pw.encode(), user[0]['password'].encode()):
            return jsonify({'error': 'Current password is incorrect'}), 401

        hashed = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt()).decode()
        run('UPDATE users SET password = ? WHERE id = ?', [hashed, g.user['id']])
        return jsonify({'success': True, 'message': 'Password changed'})
    except Exception as e:
        print(f'Password change error: {e}')
        return jsonify({'error': 'Failed to change password'}), 500


@user_bp.route('/account', methods=['DELETE'])
def delete_account():
    """Permanently delete user account and all associated data."""
    try:
        uid = g.user['id']
        # Delete in dependency order
        run('DELETE FROM dose_logs WHERE user_id = ?', [uid])
        run('DELETE FROM reminders WHERE user_id = ?', [uid])
        run('DELETE FROM user_medicines WHERE user_id = ?', [uid])
        run('DELETE FROM orders WHERE user_id = ?', [uid])
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
            SELECT pi.*, u.pharmacy_name as pharmacy
            FROM pharmacy_inventory pi
            JOIN users u ON pi.pharmacy_id = u.id
            WHERE pi.stock > 0
            ORDER BY pi.name
        """)
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': 'Failed to fetch products'}), 500


# ============= SETUP (Onboarding) =============
@user_bp.route('/setup-status', methods=['GET'])
def setup_status():
    """Check if user needs onboarding (has no medicines yet)."""
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
            run(
                'UPDATE users SET name=?, phone=?, address=?, age=?, blood_group=?, emergency_contact=? WHERE id=?',
                [profile.get('name', ''), profile.get('phone', ''), profile.get('address', ''),
                 profile.get('age'), profile.get('blood_group', ''), profile.get('emergency_contact', ''),
                 uid]
            )

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

            # Determine stock status
            ratio = stock / total if total > 0 else 1
            status = 'good' if ratio > 0.3 else ('low' if ratio > 0.1 else 'critical')

            # Add to user_medicines
            insert(
                'INSERT INTO user_medicines (user_id, name, category, stock, total, expires, status) VALUES (?,?,?,?,?,?,?)',
                [uid, name, category, stock, total, expires or None, status]
            )

            # Auto-create a reminder
            insert(
                'INSERT INTO reminders (user_id, medicine_name, dosage, times, frequency) VALUES (?,?,?,?,?)',
                [uid, name, dosage, json.dumps(times), frequency]
            )

        return jsonify({'success': True, 'medicinesAdded': len(medicines)}), 201
    except Exception as e:
        print(f'Setup error: {e}')
        return jsonify({'error': 'Setup failed'}), 500

