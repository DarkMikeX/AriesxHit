#!/usr/bin/env python3
"""
AriesxHit Python Backend Runner
"""

from app import app
from config import Config

if __name__ == '__main__':
    print("🚀 Starting AriesxHit Python Backend...")
    print(f"📡 Server: http://{Config.HOST}:{Config.PORT}")
    print(f"🌍 Environment: {Config.NODE_ENV}")

    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.NODE_ENV == 'development'
    )