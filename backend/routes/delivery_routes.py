"""Delivery routes — dashboard, active, status updates, history."""
from datetime import datetime
from flask import Blueprint, request, jsonify, g
from db import query, insert, run
from auth import authenticate, require_role

delivery_bp = Blueprint('delivery', __name__)


@delivery_bp.before_request
def before():
    if request.method == 'OPTIONS':
        return '', 200
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
    if decoded.get('role') != 'delivery':
        return jsonify({'error': 'Insufficient permissions'}), 403


# ============= DASHBOARD =============
@delivery_bp.route('/dashboard', methods=['GET'])
def dashboard():
    try:
        did = g.user['id']
        active = query("SELECT * FROM deliveries WHERE driver_id=? AND status != 'delivered' ORDER BY created_at DESC", [did])
        completed = query("SELECT * FROM deliveries WHERE driver_id=? AND status='delivered'", [did])

        from datetime import date
        today = date.today().isoformat()
        completed_today = [d for d in completed if d.get('completed_at', '') and str(d['completed_at']).startswith(today)]
        today_earnings = sum(float(d.get('earnings', 0)) for d in completed_today)

        total_dist = 0
        for d in completed:
            try:
                total_dist += float(str(d.get('distance', '0')).replace(' km', ''))
            except ValueError:
                pass

        return jsonify({
            'stats': {
                'activeDeliveries': len(active),
                'completedToday': len(completed_today),
                'todayEarnings': today_earnings,
                'distanceCovered': f'{total_dist:.1f} km',
            },
            'activeDeliveries': active,
        })
    except Exception as e:
        print(f'Delivery dashboard error: {e}')
        return jsonify({'error': 'Failed to load dashboard'}), 500


# ============= ACTIVE =============
@delivery_bp.route('/active', methods=['GET'])
def active_deliveries():
    try:
        rows = query("SELECT * FROM deliveries WHERE driver_id=? AND status != 'delivered' ORDER BY created_at DESC", [g.user['id']])
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': 'Failed to fetch active deliveries'}), 500


# ============= UPDATE STATUS =============
@delivery_bp.route('/<int:did>/status', methods=['PUT'])
def update_status(did):
    try:
        data = request.get_json()
        status = data.get('status', '')
        valid = ('assigned', 'picked_up', 'in_transit', 'delivered')
        if status not in valid:
            return jsonify({'error': 'Invalid status'}), 400

        if status == 'delivered':
            earnings = data.get('earnings', 7.00)
            now = datetime.utcnow().isoformat()
            run('UPDATE deliveries SET status=?, completed_at=?, earnings=? WHERE id=? AND driver_id=?',
                [status, now, earnings, did, g.user['id']])
            # Also mark order as delivered
            delivery = query('SELECT order_id FROM deliveries WHERE id=?', [did])
            if delivery:
                run("UPDATE orders SET status='delivered' WHERE id=?", [delivery[0]['order_id']])
        else:
            run('UPDATE deliveries SET status=? WHERE id=? AND driver_id=?', [status, did, g.user['id']])

        return jsonify({'success': True})
    except Exception as e:
        print(f'Delivery status error: {e}')
        return jsonify({'error': 'Failed to update status'}), 500


# ============= HISTORY =============
@delivery_bp.route('/history', methods=['GET'])
def history():
    try:
        rows = query("SELECT * FROM deliveries WHERE driver_id=? AND status='delivered' ORDER BY completed_at DESC", [g.user['id']])
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': 'Failed to fetch history'}), 500
