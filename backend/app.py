"""
MediHelper — Flask API Server
MySQL primary, SQLite fallback.
"""
import os
import sys
from dotenv import load_dotenv

load_dotenv()

from flask import Flask, jsonify
from flask_cors import CORS

from db import init_database, get_engine, get_engine_info
from schema import init_schema, seed_data

from routes.auth_routes import auth_bp
from routes.user_routes import user_bp
from routes.pharmacy_routes import pharmacy_bp
from routes.delivery_routes import delivery_bp

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(user_bp, url_prefix='/api/user')
app.register_blueprint(pharmacy_bp, url_prefix='/api/pharmacy')
app.register_blueprint(delivery_bp, url_prefix='/api/delivery')


@app.route('/api/health')
def health():
    info = get_engine_info()
    return jsonify({'status': 'ok', **info})


def main():
    print('\n🔧 Initializing MediHelper backend...')
    init_database()
    init_schema()
    seed_data()

    port = int(os.getenv('PORT', 5000))
    print(f'\n🚀 MediHelper API running on http://localhost:{port}')
    print(f'   Health: http://localhost:{port}/api/health')
    print(f'\n   Test accounts (password: password123):')
    print(f'   👤 Patient:  margaret@test.com')
    print(f'   💊 Pharmacy: pharmacy@test.com')
    print(f'   🚚 Delivery: delivery@test.com\n')

    app.run(host='0.0.0.0', port=port, debug=True)


if __name__ == '__main__':
    main()
