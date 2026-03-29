"""
JWT Authentication helpers.
"""
import os
import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, g

JWT_SECRET = os.getenv('JWT_SECRET', 'medihelper_secret_key_2026')
JWT_EXP_DAYS = 7


def generate_token(user: dict) -> str:
    payload = {
        'id': user['id'],
        'email': user['email'],
        'role': user['role'],
        'name': user['name'],
        'exp': datetime.now(timezone.utc) + timedelta(days=JWT_EXP_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')


def authenticate(f):
    """Decorator — require valid JWT."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'No token provided'}), 401
        token = auth_header.split(' ', 1)[1]
        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            g.user = decoded
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return wrapper


def require_role(*roles):
    """Decorator factory — require specific role(s). Must be used AFTER @authenticate."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if not hasattr(g, 'user') or g.user is None:
                return jsonify({'error': 'Not authenticated'}), 401
            if g.user['role'] not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator
