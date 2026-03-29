"""Pharmacy routes — dashboard, inventory, orders, analytics."""
import json
from flask import Blueprint, request, jsonify, g
from db import query, insert, run
from auth import authenticate, require_role

pharmacy_bp = Blueprint('pharmacy', __name__)


@pharmacy_bp.before_request
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
    if decoded.get('role') != 'pharmacy':
        return jsonify({'error': 'Insufficient permissions'}), 403


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def _inv_status(stock):
    if stock > 50:
        return 'good'
    elif stock > 10:
        return 'low'
    return 'critical'


def _get_order_items(order_id):
    return query('SELECT name, qty, price FROM order_items WHERE order_id = ?', [order_id])


def _get_or_create_category(name):
    rows = query('SELECT id FROM categories WHERE name = ?', [name])
    if rows:
        return rows[0]['id']
    return insert('INSERT INTO categories (name) VALUES (?)', [name])


def _get_or_create_supplier(name):
    if not name:
        return None
    rows = query('SELECT id FROM suppliers WHERE name = ?', [name])
    if rows:
        return rows[0]['id']
    return insert('INSERT INTO suppliers (name) VALUES (?)', [name])


# ============= DASHBOARD =============
@pharmacy_bp.route('/dashboard', methods=['GET'])
def dashboard():
    try:
        pid = g.user['id']
        orders = query('SELECT * FROM orders WHERE pharmacy_id = ? ORDER BY created_at DESC', [pid])
        inventory = query("""
            SELECT pi.*, c.name as category, s.name as supplier
            FROM pharmacy_inventory pi
            JOIN categories c ON pi.category_id = c.id
            LEFT JOIN suppliers s ON pi.supplier_id = s.id
            WHERE pi.pharmacy_id = ?
        """, [pid])

        from datetime import date
        today = date.today().isoformat()
        today_orders = [o for o in orders if o.get('created_at', '') and str(o['created_at']).startswith(today)]
        today_revenue = sum(float(o['total']) for o in today_orders)

        # Compute status for inventory
        for i in inventory:
            i['status'] = _inv_status(i['stock'])
        low_stock = [i for i in inventory if i['status'] in ('low', 'critical')]

        # Build order items for recent orders
        recent_orders = []
        for o in orders[:10]:
            items = _get_order_items(o['id'])
            recent_orders.append({**o, 'items': items})

        return jsonify({
            'stats': {
                'todayOrders': len(today_orders),
                'todayRevenue': today_revenue,
                'totalProducts': len(inventory),
                'lowStockCount': len(low_stock),
            },
            'recentOrders': recent_orders,
            'lowStockItems': low_stock,
        })
    except Exception as e:
        print(f'Pharmacy dashboard error: {e}')
        return jsonify({'error': 'Failed to load dashboard'}), 500


# ============= INVENTORY =============
@pharmacy_bp.route('/inventory', methods=['GET'])
def get_inventory():
    try:
        rows = query("""
            SELECT pi.*, c.name as category, s.name as supplier
            FROM pharmacy_inventory pi
            JOIN categories c ON pi.category_id = c.id
            LEFT JOIN suppliers s ON pi.supplier_id = s.id
            WHERE pi.pharmacy_id = ?
            ORDER BY pi.name
        """, [g.user['id']])
        for r in rows:
            r['status'] = _inv_status(r['stock'])
        return jsonify(rows)
    except Exception as e:
        return jsonify({'error': 'Failed to fetch inventory'}), 500


@pharmacy_bp.route('/inventory', methods=['POST'])
def add_product():
    try:
        data = request.get_json()
        name = data.get('name', '')
        category = data.get('category', '')
        stock = data.get('stock', 0)
        price = data.get('price', 0)
        supplier = data.get('supplier', '')

        if not name or not category:
            return jsonify({'error': 'name and category are required'}), 400

        cat_id = _get_or_create_category(category)
        sup_id = _get_or_create_supplier(supplier)

        pid = insert(
            'INSERT INTO pharmacy_inventory (pharmacy_id, name, category_id, stock, price, supplier_id) VALUES (?,?,?,?,?,?)',
            [g.user['id'], name, cat_id, stock, price, sup_id]
        )
        status = _inv_status(stock)
        return jsonify({'id': pid, 'name': name, 'category': category, 'stock': stock,
                        'price': price, 'supplier': supplier, 'status': status}), 201
    except Exception as e:
        return jsonify({'error': 'Failed to add product'}), 500


@pharmacy_bp.route('/inventory/<int:pid>', methods=['PUT'])
def update_product(pid):
    try:
        data = request.get_json()
        stock = data.get('stock', 0)
        category = data.get('category', '')
        supplier = data.get('supplier', '')

        cat_id = _get_or_create_category(category)
        sup_id = _get_or_create_supplier(supplier)

        run(
            'UPDATE pharmacy_inventory SET name=?, category_id=?, stock=?, price=?, supplier_id=? WHERE id=? AND pharmacy_id=?',
            [data.get('name', ''), cat_id, stock, data.get('price', 0), sup_id, pid, g.user['id']]
        )
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': 'Failed to update product'}), 500


@pharmacy_bp.route('/inventory/<int:pid>', methods=['DELETE'])
def delete_product(pid):
    try:
        run('DELETE FROM pharmacy_inventory WHERE id=? AND pharmacy_id=?', [pid, g.user['id']])
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': 'Failed to delete product'}), 500


# ============= ORDERS =============
@pharmacy_bp.route('/orders', methods=['GET'])
def get_orders():
    try:
        rows = query("""
            SELECT o.*, u.name as customer_name, u.phone as customer_phone,
                   up.address as customer_address
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN user_profiles up ON u.id = up.user_id
            WHERE o.pharmacy_id = ?
            ORDER BY o.created_at DESC
        """, [g.user['id']])
        result = []
        for o in rows:
            items = _get_order_items(o['id'])
            result.append({**o, 'items': items})
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': 'Failed to fetch orders'}), 500


@pharmacy_bp.route('/orders/<int:oid>/status', methods=['PUT'])
def update_order_status(oid):
    try:
        data = request.get_json()
        status = data.get('status', '')
        valid = ('pending', 'preparing', 'ready', 'dispatched', 'delivered')
        if status not in valid:
            return jsonify({'error': 'Invalid status'}), 400

        run('UPDATE orders SET status=? WHERE id=? AND pharmacy_id=?', [status, oid, g.user['id']])

        # Auto-create delivery on dispatch
        if status == 'dispatched':
            order_rows = query('SELECT * FROM orders WHERE id=?', [oid])
            if order_rows:
                order = order_rows[0]
                drivers = query("SELECT id FROM users WHERE role='delivery' LIMIT 1")
                if drivers:
                    driver_id = drivers[0]['id']
                    items = _get_order_items(order['id'])
                    insert(
                        'INSERT INTO deliveries (order_id, driver_id, distance, eta, status) VALUES (?,?,?,?,?)',
                        [order['id'], driver_id, '3.5 km', '20 min', 'assigned']
                    )
                    run('UPDATE orders SET delivery_id=? WHERE id=?', [driver_id, order['id']])

        return jsonify({'success': True})
    except Exception as e:
        print(f'Order status error: {e}')
        return jsonify({'error': 'Failed to update status'}), 500


# ============= ANALYTICS =============
@pharmacy_bp.route('/analytics', methods=['GET'])
def analytics():
    try:
        pid = g.user['id']
        orders = query("SELECT * FROM orders WHERE pharmacy_id=? AND status='delivered'", [pid])
        inventory = query("""
            SELECT pi.*, c.name as category
            FROM pharmacy_inventory pi
            JOIN categories c ON pi.category_id = c.id
            WHERE pi.pharmacy_id = ?
        """, [pid])

        total_revenue = sum(float(o['total']) for o in orders)

        # Category breakdown
        categories = {}
        for item in inventory:
            categories[item['category']] = categories.get(item['category'], 0) + item['stock']
        total_stock = sum(categories.values()) or 1
        cat_breakdown = [
            {'name': name, 'percent': round(count / total_stock * 100)}
            for name, count in categories.items()
        ]

        # Top products
        top_products = sorted(inventory, key=lambda x: x['stock'], reverse=True)[:5]
        top = [{'name': p['name'], 'sold': p['stock'], 'revenue': round(p['stock'] * float(p['price']), 2)} for p in top_products]

        unique_customers = len(set(o['user_id'] for o in orders))
        total_sold = sum(i['stock'] for i in inventory)

        return jsonify({
            'stats': {
                'monthlyRevenue': total_revenue,
                'totalOrders': len(orders),
                'activeCustomers': unique_customers,
                'productsSold': total_sold,
            },
            'categoryBreakdown': cat_breakdown,
            'topProducts': top,
        })
    except Exception as e:
        print(f'Analytics error: {e}')
        return jsonify({'error': 'Failed to load analytics'}), 500
