#!/usr/bin/env python3
"""
Setup script for AriesxHit Python Backend
"""

import os
import sys
import subprocess

def run_command(command, description):
    """Run a command and return success status"""
    print(f"[SETUP] {description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"[SUCCESS] {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] {description} failed: {e}")
        if e.stdout:
            print(f"Output: {e.stdout}")
        if e.stderr:
            print(f"Error: {e.stderr}")
        return False

def main():
    """Main setup function"""
    print("ARIESXHIT PYTHON BACKEND SETUP")
    print("=" * 40)

    # Check Python version
    python_version = sys.version_info
    if python_version.major < 3 or (python_version.major == 3 and python_version.minor < 8):
        print(f"❌ Python {python_version.major}.{python_version.minor} is not supported. Please use Python 3.8+")
        return False

    print(f"[SUCCESS] Python {python_version.major}.{python_version.minor}.{python_version.micro} detected")

    # Create virtual environment
    if not os.path.exists('venv'):
        if not run_command("python -m venv venv", "Creating virtual environment"):
            return False
    else:
        print("[INFO] Virtual environment already exists")

    # Activate virtual environment and install dependencies
    activate_cmd = "venv\\Scripts\\activate" if os.name == 'nt' else "source venv/bin/activate"
    pip_cmd = f"{activate_cmd} && pip install -r requirements.txt"

    if not run_command(pip_cmd, "Installing Python dependencies"):
        return False

    # Create .env file if it doesn't exist
    if not os.path.exists('.env'):
        print("📝 Creating .env file...")
        env_content = """# ===================================
# PYTHON BACKEND ENVIRONMENT VARIABLES
# Edit this file with your actual values
# ===================================

# Server Configuration
NODE_ENV=development
PORT=3001
HOST=localhost

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_GROUP_1=your_group_chat_id
TELEGRAM_GROUP_2=your_group_chat_id

# Database Configuration (SQLite file will be created automatically)
# DATABASE_PATH=./database/ariesxhit.db

# CORS Configuration
# CORS_ORIGINS=["*"]

# 3DS Configuration
# THREEDS_MAX_RETRIES=3
# THREEDS_RETRY_DELAY=0.5
# THREEDS_TIMEOUT=15
"""
        with open('.env', 'w') as f:
            f.write(env_content)
        print("[SUCCESS] .env file created - please edit it with your actual values")
    else:
        print("[INFO] .env file already exists")

    # Create database directory
    os.makedirs('database', exist_ok=True)
    print("[SUCCESS] Database directory created")

    print("\n" + "=" * 40)
    print("SUCCESS: SETUP COMPLETED SUCCESSFULLY!")
    print("\nNEXT STEPS:")
    print("1. Edit the .env file with your Telegram bot token and group IDs")
    print("2. Run the application: python run.py")
    print("3. Test the setup: python test_app.py")
    print("\nDOCUMENTATION:")
    print("- API endpoints: See README.md")
    print("- Configuration: Edit .env file")
    print("- Deployment: Check docker-compose.yml")

    return True

if __name__ == "__main__":
    success = main()
    input("\nPress Enter to exit...")
    sys.exit(0 if success else 1)