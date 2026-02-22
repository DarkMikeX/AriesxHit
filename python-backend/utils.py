# Utility functions
import re
import json
from datetime import datetime

def validate_email(email):
    """Validate email address"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_telegram_id(tg_id):
    """Validate Telegram ID"""
    try:
        tg_id = str(tg_id).strip()
        return tg_id.isdigit() and 5 <= len(tg_id) <= 15
    except:
        return False

def sanitize_input(text):
    """Sanitize user input"""
    if not text:
        return ""
    # Remove potentially dangerous characters
    return re.sub(r'[^\w\s@.-]', '', str(text))

def format_timestamp(timestamp):
    """Format timestamp for display"""
    if isinstance(timestamp, (int, float)):
        dt = datetime.fromtimestamp(timestamp / 1000)
    else:
        dt = timestamp

    return dt.strftime('%Y-%m-%d %H:%M:%S')

def generate_id(prefix=""):
    """Generate a unique ID"""
    import uuid
    return f"{prefix}{uuid.uuid4().hex[:16]}"

def safe_json_loads(data, default=None):
    """Safely parse JSON"""
    try:
        return json.loads(data)
    except:
        return default or {}

def safe_json_dumps(data, default=None):
    """Safely serialize to JSON"""
    try:
        return json.dumps(data, indent=2)
    except:
        return json.dumps(default or {})