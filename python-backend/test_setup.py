#!/usr/bin/env python3
"""
Test script to verify Python backend setup
"""

import sys
import os

def test_imports():
    """Test if all required modules can be imported"""
    print("🧪 Testing imports...")

    try:
        import flask
        print("✅ Flask imported successfully")
    except ImportError:
        print("❌ Flask not installed")
        return False

    try:
        from config import Config
        print("✅ Config imported successfully")
    except ImportError:
        print("❌ Config import failed")
        return False

    try:
        from database import db
        print("✅ Database imported successfully")
    except ImportError:
        print("❌ Database import failed")
        return False

    try:
        from checkout_service import CheckoutService
        print("✅ Checkout service imported successfully")
    except ImportError:
        print("❌ Checkout service import failed")
        return False

    try:
        from telegram_bot import bot
        print("✅ Telegram bot imported successfully")
    except ImportError:
        print("❌ Telegram bot import failed")
        return False

    return True

def test_config():
    """Test configuration loading"""
    print("\n🧪 Testing configuration...")

    try:
        from config import Config
        print(f"✅ Config loaded - PORT: {Config.PORT}, ENV: {Config.NODE_ENV}")

        # Test required config
        missing = []
        if not Config.TELEGRAM_BOT_TOKEN:
            missing.append("TELEGRAM_BOT_TOKEN")
        if not Config.TELEGRAM_GROUP_1:
            missing.append("TELEGRAM_GROUP_1")

        if missing:
            print(f"⚠️  Missing configuration: {', '.join(missing)}")
            print("   Please update your .env file")
        else:
            print("✅ All required configuration present")

        return True

    except Exception as e:
        print(f"❌ Config test failed: {e}")
        return False

def test_database():
    """Test database initialization"""
    print("\n🧪 Testing database...")

    try:
        from database import db
        # This will initialize the database
        print("✅ Database module loaded")
        print("   Database will be created on first app run")
        return True

    except Exception as e:
        print(f"❌ Database test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 AriesxHit Python Backend Setup Test\n")
    print("=" * 50)

    tests = [
        test_imports,
        test_config,
        test_database
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1

    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} passed")

    if passed == total:
        print("✅ All tests passed! Backend is ready to run.")
        print("\nTo start the server:")
        print("  python run.py")
        print("\nTo start with auto-restart (development):")
        print("  pip install watchdog")
        print("  python -m watchdog run.py")
    else:
        print("❌ Some tests failed. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main()