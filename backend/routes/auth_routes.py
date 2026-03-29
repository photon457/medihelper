"""Auth routes — register, login, me."""
import json
import bcrypt
from flask import Blueprint, request, jsonify, g
from db import query, insert
from auth import generate_token, authenticate

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        role = data.get('role', 'user')
        phone = data.get('phone', '')
        pharmacy_name = data.get('pharmacy_name', '')

        if not name or not email or not password:
            return jsonify({'error': 'Name, email, and password are required'}), 400

        existing = query('SELECT id FROM users WHERE email = ?', [email])
        if existing:
            return jsonify({'error': 'Email already registered'}), 409

        pw_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        uid = insert(
            'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)',
            [name, email, pw_hash, role, phone]
        )

        # Create role-specific profile
        if role == 'pharmacy':
            insert('INSERT INTO pharmacy_profiles (user_id, pharmacy_name) VALUES (?,?)',
                   [uid, pharmacy_name])
        elif role == 'user':
            insert('INSERT INTO user_profiles (user_id, address, age, blood_group, emergency_contact) VALUES (?,?,?,?,?)',
                   [uid, '', None, '', ''])
        # delivery role has no extra profile table

        user = {'id': uid, 'name': name, 'email': email, 'role': role}
        token = generate_token(user)
        return jsonify({'token': token, 'user': user}), 201

    except Exception as e:
        print(f'Register error: {e}')
        return jsonify({'error': 'Registration failed'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email', '').strip()
        password = data.get('password', '')

        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400

        rows = query('SELECT * FROM users WHERE email = ?', [email])
        if not rows:
            return jsonify({'error': 'Invalid credentials'}), 401

        user = rows[0]
        if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return jsonify({'error': 'Invalid credentials'}), 401

        token = generate_token(user)
        return jsonify({
            'token': token,
            'user': {'id': user['id'], 'name': user['name'], 'email': user['email'], 'role': user['role']}
        })

    except Exception as e:
        print(f'Login error: {e}')
        return jsonify({'error': 'Login failed'}), 500


@auth_bp.route('/me', methods=['GET'])
@authenticate
def me():
    try:
        uid = g.user['id']
        role = g.user['role']

        if role == 'user':
            rows = query("""
                SELECT u.id, u.name, u.email, u.role, u.phone, u.created_at,
                       p.address, p.age, p.blood_group, p.emergency_contact
                FROM users u
                LEFT JOIN user_profiles p ON u.id = p.user_id
                WHERE u.id = ?
            """, [uid])
        elif role == 'pharmacy':
            rows = query("""
                SELECT u.id, u.name, u.email, u.role, u.phone, u.created_at,
                       pp.pharmacy_name
                FROM users u
                LEFT JOIN pharmacy_profiles pp ON u.id = pp.user_id
                WHERE u.id = ?
            """, [uid])
        else:
            rows = query(
                'SELECT id, name, email, role, phone, created_at FROM users WHERE id = ?',
                [uid]
            )

        if not rows:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(rows[0])
    except Exception as e:
        print(f'Me error: {e}')
        return jsonify({'error': 'Failed to fetch user'}), 500
