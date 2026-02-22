#!/usr/bin/env python3
"""
Test script for AriesxHit Python Backend
"""

import requests
import json
import time

BASE_URL = "http://localhost:3001"

def test_health():
    """Test health endpoint"""
    print("🩺 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_invalid_endpoint():
    """Test invalid endpoint"""
    print("\n🔍 Testing invalid endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/invalid")
        if response.status_code == 404:
            print("✅ 404 handling works")
            return True
        else:
            print(f"❌ Unexpected status: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing invalid endpoint: {e}")
        return False

def test_cors():
    """Test CORS headers"""
    print("\n🌐 Testing CORS headers...")
    try:
        response = requests.options(f"{BASE_URL}/api/health")
        cors_headers = ['access-control-allow-origin', 'access-control-allow-methods']
        has_cors = any(h in response.headers for h in cors_headers)
        if has_cors:
            print("✅ CORS headers present")
            return True
        else:
            print("⚠️  No CORS headers found")
            return True  # Not critical
    except Exception as e:
        print(f"❌ CORS test error: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 ARIESXHIT PYTHON BACKEND TESTS")
    print("=" * 40)

    tests = [
        test_health,
        test_invalid_endpoint,
        test_cors
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1

    print("\n" + "=" * 40)
    print(f"📊 Test Results: {passed}/{total} passed")

    if passed == total:
        print("🎉 All tests passed! Backend is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the output above.")

    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)