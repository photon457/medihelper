"""
MediHelper Database Layer
MySQL primary — SQLite fallback

All SQL should use `?` placeholders.  When running against MySQL the
layer automatically rewrites them to `%s` so callers never need to care
which engine is active.
"""
import sqlite3
import threading
import os

active_engine = None          # 'mysql' | 'sqlite'
_engine_reason = ''           # human-readable reason
_mysql_pool = None
_sqlite_conn = None
_sqlite_lock = threading.Lock()

DB_DIR = os.path.dirname(os.path.abspath(__file__))


# ──────────────────────────────────────────────
# Initialisation
# ──────────────────────────────────────────────
def init_database():
    """Try MySQL first, fall back to SQLite."""
    global active_engine, _engine_reason, _mysql_pool, _sqlite_conn

    # --- Try MySQL ---
    try:
        import mysql.connector
        from mysql.connector import pooling

        db_name = os.getenv('MYSQL_DATABASE', 'medihelper')
        base_config = {
            'host':     os.getenv('MYSQL_HOST', 'localhost'),
            'port':     int(os.getenv('MYSQL_PORT', '3306')),
            'user':     os.getenv('MYSQL_USER', 'root'),
            'password': os.getenv('MYSQL_PASSWORD', ''),
        }

        # Auto-create the database if it doesn't exist
        tmp_conn = mysql.connector.connect(**base_config)
        cur = tmp_conn.cursor()
        cur.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}`")
        cur.close()
        tmp_conn.close()
        print(f'✅ MySQL database `{db_name}` ensured')

        _mysql_pool = pooling.MySQLConnectionPool(
            pool_name='medihelper_pool',
            pool_size=5,
            pool_reset_session=True,
            database=db_name,
            **base_config,
        )

        # Validate the connection
        conn = _mysql_pool.get_connection()
        conn.ping(reconnect=True)
        conn.close()

        active_engine = 'mysql'
        _engine_reason = f"Connected to MySQL at {base_config['host']}:{base_config['port']}/{db_name}"
        print(f'✅ Database: {_engine_reason}')
        return

    except ImportError:
        print('⚠️  mysql-connector-python not installed — skipping MySQL')
        _engine_reason = 'mysql-connector-python not installed'
        _mysql_pool = None
    except Exception as e:
        print(f'⚠️  MySQL connection failed: {e}')
        _engine_reason = f'MySQL connection failed: {e}'
        _mysql_pool = None

    # --- SQLite fallback ---
    print('🔄 Falling back to SQLite…')
    try:
        db_path = os.path.join(DB_DIR, 'medihelper.db')
        _sqlite_conn = sqlite3.connect(db_path, check_same_thread=False)
        _sqlite_conn.row_factory = sqlite3.Row
        _sqlite_conn.execute('PRAGMA journal_mode=WAL')
        _sqlite_conn.execute('PRAGMA foreign_keys=ON')

        active_engine = 'sqlite'
        _engine_reason = f'SQLite ({db_path})'
        print(f'✅ Database: {_engine_reason}')

    except Exception as e:
        print(f'❌ Both MySQL and SQLite failed: {e}')
        raise


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────
def get_engine():
    """Return 'mysql' or 'sqlite'."""
    return active_engine


def get_engine_info():
    """Return detailed dict for the /health endpoint."""
    return {
        'engine': active_engine,
        'detail': _engine_reason,
    }


def _to_mysql(sql: str) -> str:
    """Convert SQLite syntax to MySQL syntax.
    - `?` placeholders  →  `%s`
    - date('now')       →  CURDATE()
    - datetime('now')   →  NOW()
    """
    sql = sql.replace('?', '%s')
    sql = sql.replace("date('now')", 'CURDATE()')
    sql = sql.replace("datetime('now')", 'NOW()')
    return sql


# ──────────────────────────────────────────────
# Query interface (unified ? placeholders)
# ──────────────────────────────────────────────
def query(sql, params=None):
    """SELECT — returns list of dicts."""
    params = params or []
    if active_engine == 'mysql':
        conn = _mysql_pool.get_connection()
        try:
            cur = conn.cursor(dictionary=True)
            cur.execute(_to_mysql(sql), params)
            rows = cur.fetchall()
            cur.close()
            return rows
        finally:
            conn.close()
    else:
        with _sqlite_lock:
            cur = _sqlite_conn.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]


def insert(sql, params=None):
    """INSERT — returns lastrowid."""
    params = params or []
    if active_engine == 'mysql':
        conn = _mysql_pool.get_connection()
        try:
            cur = conn.cursor()
            cur.execute(_to_mysql(sql), params)
            conn.commit()
            rid = cur.lastrowid
            cur.close()
            return rid
        finally:
            conn.close()
    else:
        with _sqlite_lock:
            cur = _sqlite_conn.execute(sql, params)
            _sqlite_conn.commit()
            return cur.lastrowid


def run(sql, params=None):
    """UPDATE / DELETE — returns rowcount."""
    params = params or []
    if active_engine == 'mysql':
        conn = _mysql_pool.get_connection()
        try:
            cur = conn.cursor()
            cur.execute(_to_mysql(sql), params)
            conn.commit()
            rc = cur.rowcount
            cur.close()
            return rc
        finally:
            conn.close()
    else:
        with _sqlite_lock:
            cur = _sqlite_conn.execute(sql, params)
            _sqlite_conn.commit()
            return cur.rowcount


def exec_script(sql):
    """Execute multi-statement SQL (schema creation)."""
    if active_engine == 'mysql':
        conn = _mysql_pool.get_connection()
        try:
            cur = conn.cursor()
            for stmt in sql.split(';'):
                stmt = stmt.strip()
                if stmt:
                    cur.execute(stmt)
            conn.commit()
            cur.close()
        finally:
            conn.close()
    else:
        with _sqlite_lock:
            _sqlite_conn.executescript(sql)
