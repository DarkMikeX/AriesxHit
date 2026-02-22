import sqlite3
import os
from datetime import datetime
import json
from config import Config

class Database:
    def __init__(self):
        self.db_path = Config.DATABASE_PATH
        self.ensure_db_directory()
        self.init_db()

    def ensure_db_directory(self):
        """Ensure database directory exists"""
        db_dir = os.path.dirname(self.db_path)
        if not os.path.exists(db_dir):
            os.makedirs(db_dir)

    def get_connection(self):
        """Get database connection"""
        return sqlite3.connect(self.db_path)

    def init_db(self):
        """Initialize database tables"""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Users table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    tg_id TEXT PRIMARY KEY,
                    tg_name TEXT,
                    login_token TEXT,
                    login_time INTEGER,
                    created_at INTEGER,
                    updated_at INTEGER
                )
            ''')

            # User proxies table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_proxies (
                    id TEXT PRIMARY KEY,
                    tg_id TEXT NOT NULL,
                    host TEXT NOT NULL,
                    port INTEGER NOT NULL,
                    user TEXT,
                    pass TEXT,
                    status TEXT DEFAULT 'unknown',
                    last_used INTEGER,
                    added_at INTEGER,
                    FOREIGN KEY (tg_id) REFERENCES users (tg_id) ON DELETE CASCADE
                )
            ''')

            # User statistics table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_stats (
                    tg_id TEXT PRIMARY KEY,
                    hits INTEGER DEFAULT 0,
                    total_tests INTEGER DEFAULT 0,
                    created_at INTEGER,
                    updated_at INTEGER,
                    FOREIGN KEY (tg_id) REFERENCES users (tg_id) ON DELETE CASCADE
                )
            ''')

            conn.commit()
            print("✅ Database tables initialized")

    def create_default_admin(self):
        """Create default admin user if not exists"""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # Check if admin exists
            cursor.execute("SELECT tg_id FROM users WHERE tg_id = ?", ("admin",))
            if cursor.fetchone():
                return

            # Create admin user
            now = int(datetime.now().timestamp() * 1000)
            cursor.execute('''
                INSERT INTO users (tg_id, tg_name, login_token, login_time, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', ("admin", "Administrator", "admin123", now, now, now))

            conn.commit()
            print("✅ Default admin user created (username: admin, password: admin123)")

    # User management methods
    def get_user_data(self, tg_id):
        """Get user data by telegram ID"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users WHERE tg_id = ?", (str(tg_id),))
            row = cursor.fetchone()

            if not row:
                return None

            # Get user proxies
            cursor.execute("SELECT * FROM user_proxies WHERE tg_id = ?", (str(tg_id),))
            proxy_rows = cursor.fetchall()

            proxies = []
            for proxy_row in proxy_rows:
                proxies.append({
                    'id': proxy_row[0],
                    'host': proxy_row[2],
                    'port': proxy_row[3],
                    'user': proxy_row[4],
                    'pass': proxy_row[5],
                    'status': proxy_row[6] or 'unknown',
                    'lastUsed': proxy_row[7],
                    'addedAt': proxy_row[8]
                })

            # Get user stats
            cursor.execute("SELECT * FROM user_stats WHERE tg_id = ?", (str(tg_id),))
            stats_row = cursor.fetchone()

            return {
                'tg_id': row[0],
                'tg_name': row[1],
                'login_token': row[2],
                'login_time': row[3],
                'created_at': row[4],
                'updated_at': row[5],
                'proxies': proxies,
                'stats': {
                    'hits': stats_row[1] if stats_row else 0,
                    'total_tests': stats_row[2] if stats_row else 0
                } if stats_row else {'hits': 0, 'total_tests': 0}
            }

    def set_user_data(self, tg_id, data):
        """Update user data"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = int(datetime.now().timestamp() * 1000)

            # Update user info
            cursor.execute('''
                INSERT OR REPLACE INTO users (tg_id, tg_name, login_token, login_time, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                str(tg_id),
                data.get('tg_name'),
                data.get('login_token'),
                data.get('login_time', now),
                data.get('created_at', now),
                now
            ))

            # Update proxies
            if 'proxies' in data and data['proxies']:
                # Delete existing proxies
                cursor.execute("DELETE FROM user_proxies WHERE tg_id = ?", (str(tg_id),))

                # Insert new proxies
                for proxy in data['proxies']:
                    cursor.execute('''
                        INSERT INTO user_proxies (id, tg_id, host, port, user, pass, status, last_used, added_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        proxy.get('id', f"{tg_id}_{proxy['host']}_{proxy['port']}"),
                        str(tg_id),
                        proxy['host'],
                        proxy['port'],
                        proxy.get('user'),
                        proxy.get('pass'),
                        proxy.get('status', 'unknown'),
                        proxy.get('lastUsed'),
                        proxy.get('addedAt', now)
                    ))

            conn.commit()

    def set_user_name(self, tg_id, name):
        """Update user name"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = int(datetime.now().timestamp() * 1000)

            cursor.execute('''
                INSERT OR REPLACE INTO users (tg_id, tg_name, updated_at)
                VALUES (?, ?, ?)
            ''', (str(tg_id), name, now))

            conn.commit()

    def get_login_token_for_user(self, tg_id):
        """Get login token for user"""
        user_data = self.get_user_data(tg_id)
        return user_data.get('login_token') if user_data else None

    def generate_login_token(self, tg_id, name):
        """Generate new login token for user"""
        import secrets
        token = secrets.token_hex(16)

        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = int(datetime.now().timestamp() * 1000)

            cursor.execute('''
                UPDATE users SET login_token = ?, login_time = ?, updated_at = ?
                WHERE tg_id = ?
            ''', (token, now, now, str(tg_id)))

            conn.commit()

        return token

    # Proxy management methods
    def add_proxy(self, tg_id, proxy_data):
        """Add proxy for user"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = int(datetime.now().timestamp() * 1000)

            proxy_id = f"{tg_id}_{proxy_data['host']}_{proxy_data['port']}_{now}"

            cursor.execute('''
                INSERT INTO user_proxies (id, tg_id, host, port, user, pass, status, added_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                proxy_id,
                str(tg_id),
                proxy_data['host'],
                proxy_data['port'],
                proxy_data.get('user'),
                proxy_data.get('pass'),
                'unknown',
                now
            ))

            conn.commit()
            return proxy_id

    def remove_proxy(self, tg_id, proxy_id):
        """Remove proxy from user"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM user_proxies WHERE tg_id = ? AND id = ?", (str(tg_id), proxy_id))
            conn.commit()
            return cursor.rowcount > 0

    def update_proxy_status(self, tg_id, proxy_id, status):
        """Update proxy status"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = int(datetime.now().timestamp() * 1000)

            cursor.execute('''
                UPDATE user_proxies SET status = ?, last_used = ? WHERE tg_id = ? AND id = ?
            ''', (status, now, str(tg_id), proxy_id))

            conn.commit()

    # Statistics methods
    def increment_user_hits(self, tg_id):
        """Increment user hit count"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            now = int(datetime.now().timestamp() * 1000)

            cursor.execute('''
                INSERT OR REPLACE INTO user_stats (tg_id, hits, updated_at)
                VALUES (?, COALESCE((SELECT hits FROM user_stats WHERE tg_id = ?), 0) + 1, ?)
            ''', (str(tg_id), str(tg_id), now))

            conn.commit()

    def get_user_hits(self, tg_id):
        """Get user hit count"""
        user_data = self.get_user_data(tg_id)
        return user_data['stats']['hits'] if user_data else 0

    def get_user_rank(self, tg_id):
        """Get user rank by hits"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT COUNT(*) + 1 as rank FROM user_stats
                WHERE hits > (SELECT hits FROM user_stats WHERE tg_id = ?)
            ''', (str(tg_id),))

            result = cursor.fetchone()
            return result[0] if result else None

# Global database instance
db = Database()