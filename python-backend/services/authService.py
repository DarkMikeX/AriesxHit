# Auth Service - handles authentication logic
import secrets
import hashlib
from datetime import datetime, timedelta
from config import Config

class AuthService:
    def __init__(self):
        pass

    def generate_token(self, length=32):
        """Generate a secure random token"""
        return secrets.token_hex(length)

    def hash_password(self, password):
        """Hash password using SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()

    def verify_password(self, password, hashed_password):
        """Verify password against hash"""
        return self.hash_password(password) == hashed_password

    def generate_otp(self):
        """Generate a 6-digit OTP"""
        return str(secrets.randbelow(900000) + 100000)

    def generate_login_token(self, user_id, expiry_hours=24):
        """Generate login token with expiry"""
        token = self.generate_token(16)
        expiry = datetime.now() + timedelta(hours=expiry_hours)

        return {
            'token': token,
            'expiry': expiry.isoformat(),
            'user_id': user_id
        }