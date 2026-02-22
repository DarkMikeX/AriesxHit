# Token Service - handles token generation and validation
import secrets
import jwt
import datetime
from config import Config

class TokenService:
    def __init__(self):
        self.secret_key = "ariesxhit-secret-key-change-in-production"
        self.algorithm = "HS256"

    def generate_token(self, payload, expiry_hours=24):
        """Generate JWT token"""
        payload['exp'] = datetime.datetime.utcnow() + datetime.timedelta(hours=expiry_hours)
        payload['iat'] = datetime.datetime.utcnow()

        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def verify_token(self, token):
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return {'valid': True, 'payload': payload}
        except jwt.ExpiredSignatureError:
            return {'valid': False, 'error': 'Token expired'}
        except jwt.InvalidTokenError:
            return {'valid': False, 'error': 'Invalid token'}

    def generate_login_token(self, user_id, length=32):
        """Generate simple login token"""
        return secrets.token_hex(length // 2)  # token_hex returns 2 chars per byte

    def generate_otp(self):
        """Generate 6-digit OTP"""
        return str(secrets.randbelow(900000) + 100000)