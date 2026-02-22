# Fingerprint Service - handles device fingerprinting
import random
import string
from config import Config

class FingerprintService:
    def __init__(self):
        pass

    def generate_device_id(self):
        """Generate a unique device ID"""
        return ''.join(random.choices(string.ascii_letters + string.digits, k=32))

    def generate_session_id(self):
        """Generate a session ID"""
        return ''.join(random.choices(string.ascii_letters + string.digits, k=16))

    def get_browser_fingerprint(self):
        """Get browser fingerprint data"""
        return {
            "screen_width": random.choice([1920, 1366, 1536, 1440]),
            "screen_height": random.choice([1080, 768, 864, 900]),
            "screen_color_depth": 24,
            "language": "en-US",
            "platform": random.choice(["MacIntel", "Win32", "Linux x86_64"]),
            "timezone": "America/New_York",
            "cookies_enabled": True,
            "do_not_track": False
        }