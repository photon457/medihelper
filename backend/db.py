"""
MediHelper Database Layer
MySQL primary — SQLite fallback
Provides a unified interface regardless of which engine is active.
"""
import sqlite3
import json
import os

active_engine = None
_mysql_pool = None
_sqlite_conn = None

DB_DIR = os.path.dirname(os.path.abspath(__file__))


def init_database():
    """Try MySQL first, fall back to SQLite."""
    global active_engine, _mysql_pool, _sqlite_conn

    # --- Try MySQL ---
    try:
        import mysql.connector
        from mysql.connector import pooling

        config = {
            'host': os.getenv('MYSQL_HOST', 'localhost'),
            'port': int(os.getenv('MYSQL_PORT', '3306')),
            'user': os.getenv('MYSQL_USER', 'root'),
            'password': os.getenv('MYSQL_PASSWORD', ''),
            'database': os.getenv('MYSQL_DATABASE', 'medihelper'),
        }

        _mysql_pool = pooling.MySQLConnectionPool(
            pool_name='medihelper_pool',
            pool_size=5,
            pool_reset_session=True,
            **config,
        )

        # Test connection
        conn = _mysql_pool.get_connection()
        conn.ping(reconnect=True)
        conn.close()

        active_engine = 'mysql'
        print('✅ Database: MySQL connected successfully')
        return

    except Exception as e:
        print(f'⚠️  MySQL connection failed: {e}')
        print('🔄 Falling back to SQLite...')
        _mysql_pool = None

    # --- SQLite fallback ---
    try:
        db_path = os.path.join(DB_DIR, 'medihelper.db')
        _sqlite_conn = sqlite3.connect(db_path, check_same_thread=False)
        _sqlite_conn.row_factory = sqlite3.Row
        _sqlite_conn.execute('PRAGMA journal_mode=WAL')
        _sqlite_conn.execute('PRAGMA foreign_keys=ON')

        active_engine = 'sqlite'
        print(f'✅ Database: SQLite connected ({db_path})')

    except Exception as e:
        print(f'❌ Both MySQL and SQLite failed: {e}')
        raise


def get_engine():
    return active_engine


def _dict_row(row_or_dict):
    """Convert sqlite3.Row or mysql row to plain dict."""
    if row_or_dict is None:
        return None
    if isinstance(row_or_dict, dict):
        return row_or_dict
    if isinstance(row_or_dict, sqlite3.Row):
        return dict(row_or_dict)
    return row_or_dict


def query(sql, params=None):
    """SELECT — returns list of dicts."""
    params = params or []
    if active_engine == 'mysql':
        conn = _mysql_pool.get_connection()
        try:
            cur = conn.cursor(dictionary=True)
            cur.execute(sql, params)
            rows = cur.fetchall()
            cur.close()
            return rows
        finally:
            conn.close()
    else:
        cur = _sqlite_conn.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


def insert(sql, params=None):
    """INSERT — returns lastrowid."""
    params = params or []
    if active_engine == 'mysql':
        conn = _mysql_pool.get_connection()
        try:
            cur = conn.cursor()
            cur.execute(sql, params)
            conn.commit()
            rid = cur.lastrowid
            cur.close()
            return rid
        finally:
            conn.close()
    else:
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
            cur.execute(sql, params)
            conn.commit()
            rc = cur.rowcount
            cur.close()
            return rc
        finally:
            conn.close()
    else:
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
        _sqlite_conn.executescript(sql)
