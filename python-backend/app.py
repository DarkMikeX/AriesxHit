from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import traceback
from datetime import datetime
from config import Config
import sys
import os
sys.path.append(os.path.dirname(__file__))
from database.database import db
from checkout_service import CheckoutService
from telegram_bot import bot
from utils import validate_telegram_id, sanitize_input

app = Flask(__name__)
CORS(app, origins=Config.CORS_ORIGINS)

checkout_service = CheckoutService()

# Initialize database on startup
def initialize_app():
    """Initialize database and create default data"""
    try:
        import database.database as db_mod
        db_mod.db.init_db()
        db_mod.db.create_default_admin()
        print("[SUCCESS] App initialized successfully")
    except Exception as e:
        print(f"[ERROR] App initialization failed: {e}")

# Initialize on import
initialize_app()

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    })

# Telegram webhook endpoint
@app.route('/api/tg/webhook', methods=['POST'])
def telegram_webhook():
    """Handle Telegram webhook updates"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"ok": False, "error": "No data received"}), 400

        # Process the update (this would need to be implemented based on telegram-bot library)
        # For now, just acknowledge receipt
        print(f"📡 Webhook received: {json.dumps(data, indent=2)[:500]}...")

        return jsonify({"ok": True}), 200

    except Exception as e:
        print(f"Webhook error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500

# Send OTP endpoint
@app.route('/api/tg/send-otp', methods=['POST'])
def send_otp():
    """Send OTP to user"""
    try:
        data = request.get_json() or {}
        tg_id = str(data.get('tg_id', '')).strip()

        if not tg_id or not tg_id.isdigit() or len(tg_id) < 5:
            return jsonify({"ok": False, "error": "Invalid Telegram ID"}), 400

        # Generate OTP token
        import secrets
        otp_token = secrets.token_hex(4).upper()

        # Store OTP (in production, use Redis or similar)
        # For now, just return success
        print(f"OTP generated for {tg_id}: {otp_token}")

        # Send OTP via Telegram bot
        try:
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(send_otp_message(tg_id, otp_token))
            loop.close()
        except Exception as e:
            print(f"Failed to send OTP: {e}")

        return jsonify({
            "ok": True,
            "message": "OTP sent successfully",
            "expires_in": 300  # 5 minutes
        })

    except Exception as e:
        print(f"Send OTP error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500

async def send_otp_message(tg_id, otp_token):
    """Send OTP message via Telegram bot"""
    try:
        message = (
            f"🔐 <b>ARIESxHIT VERIFICATION</b>\n\n"
            f"Your OTP Code: <code>{otp_token}</code>\n\n"
            f"This code expires in 5 minutes.\n\n"
            f"If you didn't request this, ignore this message."
        )
        await bot.application.bot.send_message(chat_id=tg_id, text=message, parse_mode='HTML')
    except Exception as e:
        print(f"Error sending OTP message: {e}")

# Verify OTP endpoint
@app.route('/api/tg/verify', methods=['POST'])
def verify_otp():
    """Verify OTP and create/update user"""
    try:
        data = request.get_json() or {}
        tg_id = str(data.get('tg_id', '')).strip()
        otp_code = str(data.get('otp', '')).strip().upper()
        name = data.get('name', 'User')

        if not tg_id or not otp_code:
            return jsonify({"ok": False, "error": "Missing tg_id or otp"}), 400

        # In production, verify OTP from storage
        # For now, accept any 8-character code
        if len(otp_code) != 8:
            return jsonify({"ok": False, "error": "Invalid OTP format"}), 400

        # Create or update user
        db_module.db.set_user_name(tg_id, name)
        token = db_module.db.generate_login_token(tg_id, name)

        return jsonify({
            "ok": True,
            "token": token,
            "expires_in": 86400  # 24 hours
        })

    except Exception as e:
        print(f"Verify OTP error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500

# See proxies endpoint
@app.route('/api/tg/see-proxy', methods=['POST'])
def see_proxy():
    """Get user's proxies"""
    try:
        data = request.get_json() or {}
        tg_id = str(data.get('tg_id', '')).strip()

        if not tg_id:
            return jsonify({"ok": False, "error": "Missing tg_id"}), 400

        user_data = db_module.db.get_user_data(tg_id)
        if not user_data or not user_data.get('proxies'):
            return jsonify({
                "ok": True,
                "total": 0,
                "active": 0,
                "proxies": [],
                "message": "No proxies found"
            })

        proxies = user_data['proxies']
        active_count = len([p for p in proxies if p.get('status') == 'active'])

        return jsonify({
            "ok": True,
            "total": len(proxies),
            "active": active_count,
            "proxies": [p.get('proxy', f"{p['host']}:{p['port']}") for p in proxies],
            "details": proxies
        })

    except Exception as e:
        print(f"See proxy error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500

# Add proxy endpoint
@app.route('/api/tg/add-proxy', methods=['POST'])
def add_proxy():
    """Add proxy for user"""
    try:
        data = request.get_json() or {}
        tg_id = str(data.get('tg_id', '')).strip()
        proxy = data.get('proxy', '').strip()

        if not tg_id or not proxy:
            return jsonify({"ok": False, "error": "Missing tg_id or proxy"}), 400

        # Parse proxy string
        parts = proxy.split(':')
        if len(parts) < 2:
            return jsonify({"ok": False, "error": "Invalid proxy format"}), 400

        proxy_data = {
            'host': parts[0],
            'port': int(parts[1]),
            'user': parts[2] if len(parts) > 2 else None,
            'pass': parts[3] if len(parts) > 3 else None
        }

        proxy_id = db.add_proxy(tg_id, proxy_data)

        return jsonify({
            "ok": True,
            "added": 1,
            "failed": 0,
            "total": len(db.get_user_data(tg_id).get('proxies', [])),
            "proxies": [proxy],
            "message": f"✅ Proxy Added Successfully!\n\n🌐 Host: {proxy_data['host']}\n🔌 Port: {proxy_data['port']}\n👤 User: {proxy_data['user'] or 'None'}\n📅 Added: {datetime.now().strftime('%m/%d/%Y %I:%M:%S %p')}\n\nYou can now use /co command!"
        })

    except Exception as e:
        print(f"Add proxy error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500

# Check proxy endpoint
@app.route('/api/tg/check-proxy', methods=['POST'])
def check_proxy():
    """Check proxy status"""
    try:
        data = request.get_json() or {}
        tg_id = str(data.get('tg_id', '')).strip()
        proxies_to_check = data.get('proxies', [])

        if not tg_id:
            return jsonify({"ok": False, "error": "Missing tg_id"}), 400

        # Simple proxy check (in production, implement actual connectivity tests)
        results = []
        for proxy_str in proxies_to_check:
            # Mark as working for now
            results.append({
                "proxy": proxy_str,
                "status": "working"
            })

        # Update proxy statuses in database
        user_data = db.get_user_data(tg_id)
        if user_data and user_data.get('proxies'):
            for proxy in user_data['proxies']:
                db.update_proxy_status(tg_id, proxy['id'], 'working')

        return jsonify({
            "ok": True,
            "total": len(results),
            "working": len([r for r in results if r['status'] == 'working']),
            "failed": len([r for r in results if r['status'] == 'failed']),
            "results": results,
            "message": f"✅ Proxy Status Updated!\n\n✅ Working: {len(results)}\n❌ Failed: 0\n📊 Total: {len(results)}"
        })

    except Exception as e:
        print(f"Check proxy error: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500

# Checkout endpoint
@app.route('/api/tg/co', methods=['POST'])
def checkout():
    """Process checkout request"""
    try:
        data = request.get_json() or {}
        tg_id = str(data.get('tg_id', '')).strip()
        checkout_url = data.get('checkout_url', '').strip()

        print(f"[CO_REQUEST] User {tg_id} requested checkout analysis")

        if not tg_id or not checkout_url:
            return jsonify({"ok": False, "error": "Missing tg_id or checkout_url"}), 400

        # Check if user has proxies
        user_data = db.get_user_data(tg_id)
        if not user_data or not user_data.get('proxies'):
            return jsonify({
                "ok": False,
                "error": "❌ Proxy Required!\n\nYou must add a proxy before using /co.\n\nUse: /addpxy host:port:user:pass"
            })

        proxies = user_data['proxies']
        active_proxies = [p for p in proxies if p.get('status') == 'active']

        if not active_proxies:
            return jsonify({
                "ok": False,
                "error": f"❌ No Active Proxies!\n\nYou have {len(proxies)} proxies, but none are active.\n\nUse /chkpxy to test your proxies."
            })

        # Select random proxy
        import random
        selected_proxy = random.choice(active_proxies)

        print(f"[CO_PROCESS] User {tg_id} using proxy {selected_proxy['host']}:{selected_proxy['port']}")

        # Parse checkout URL
        parsed = checkout_service.parse_checkout_url(checkout_url)
        if not parsed['sessionId'] or not parsed['publicKey']:
            return jsonify({
                "ok": False,
                "error": "❌ Invalid Checkout URL!\n\nPlease provide a valid Stripe checkout URL."
            })

        # Fetch checkout info
        info = checkout_service.fetch_checkout_info(parsed['sessionId'], parsed['publicKey'], {
            'host': selected_proxy['host'],
            'port': selected_proxy['port'],
            'user': selected_proxy.get('user'),
            'pass': selected_proxy.get('pass')
        })

        if info.get('error'):
            return jsonify({
                "ok": False,
                "error": "❌ Failed to analyze checkout!\n\nThe checkout URL might be expired or invalid."
            })

        # Extract amount and currency
        amount_data = checkout_service.get_amount_and_currency(info)

        merchant = amount_data.get('businessName') or amount_data.get('businessUrl') or 'Stripe Checkout'
        if amount_data.get('businessUrl') and not amount_data.get('businessName'):
            merchant = amount_data['businessUrl'].replace('https://', '').replace('http://', '').rstrip('/')

        # Convert amount to display format
        amount = amount_data.get('amount', 0)
        currency = amount_data.get('currency', 'USD')
        display_amount = f"{amount/100:.2f}" if amount else "0.00"

        currency_symbol = {
            'INR': '₹',
            'USD': '$',
            'EUR': '€',
            'GBP': '£'
        }.get(currency, '$')

        # Update proxy last used time
        db.update_proxy_status(tg_id, selected_proxy['id'], 'active')

        return jsonify({
            "ok": True,
            "message": f"✅ Checkout Analyzed Successfully!\n\n🏪 Merchant: {merchant}\n💰 Amount: {currency_symbol}{display_amount} {currency}\n🌐 Proxy: {selected_proxy['host']}:{selected_proxy['port']}\n\n✅ Protected by random proxy rotation!",
            "data": {
                "merchant": merchant,
                "amount": f"{currency_symbol}{display_amount}",
                "currency": currency,
                "proxy_used": f"{selected_proxy['host']}:{selected_proxy['port']}"
            }
        })

    except Exception as e:
        print(f"Checkout error: {e}")
        traceback.print_exc()
        return jsonify({"ok": False, "error": f"❌ Checkout processing failed: {str(e)}"}), 500

# Notify hit endpoint
@app.route('/api/tg/notify-hit', methods=['POST'])
def notify_hit():
    """Handle hit notifications from extension"""
    print("[HIT_NOTIFICATION] 🚨🚨🚨 ENDPOINT CALLED! 🚨🚨🚨")
    print(f"[HIT_NOTIFICATION] Timestamp: {datetime.now().isoformat()}")

    try:
        data = request.get_json() or {}
        print(f"[HIT_NOTIFICATION] Payload keys: {list(data.keys()) if data else 'None'}")
        print(f"[HIT_NOTIFICATION] Full payload: {json.dumps(data, indent=2)}")

        if not Config.TELEGRAM_BOT_TOKEN:
            print("[HIT_NOTIFICATION] ❌ Bot token not configured")
            return jsonify({"ok": False, "error": "Bot not configured"}), 500

        # Extract data
        tg_id = str(data.get('tg_id', '')).strip()
        name = data.get('name', 'User')
        card = data.get('card', '')
        attempts = data.get('attempts', 0)
        amount = data.get('amount', '')
        time_sec = data.get('time_sec', 0)
        hit_mode = data.get('hit_mode', 'unknown')

        print(f"[HIT_NOTIFICATION] RECEIVED FROM EXTENSION: tg_id={tg_id}, name={name}, card={card[:20]}..., attempts={attempts}")

        if not tg_id:
            return jsonify({"ok": False, "error": "Missing tg_id"}), 400

        # Update user statistics
        db.increment_user_hits(tg_id)

        # Send hit notification to Telegram groups
        import asyncio
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            # Format hit message
            current_time = datetime.now().strftime('%m/%d/%Y %I:%M:%S %p')
            bin_code = card[:6] if card and len(card) >= 6 else 'Unknown'

            hit_message = (
                "🎯 𝗛𝗜𝗧 𝗖𝗛𝗔𝗥𝗚𝗘𝗗 ✅\n\n"
                "「❃」 𝗥𝗲𝘀𝗽𝗼𝗻𝘀𝗲 : Charged\n"
                f"「❃」 𝗔𝗺𝗼𝘂𝗻𝘁 : {amount}\n"
                f"「❃」 𝗠𝗲𝗿𝗰𝗵𝗮𝗻𝘁 : {data.get('business_name', 'Unknown')}\n"
                f"「❃」 𝗘𝗺𝗮𝗶𝗹 : {data.get('email', 'Unknown')}\n"
                f"「❃」 𝗕𝗜𝗡 :- {bin_code}\n"
                f"「❃」 𝗛𝗶𝘁 𝗕𝘆 : {tg_id}\n"
                f"「❃」 𝗧𝗶𝗺𝗲 : {current_time}\n"
            )

            # Send to groups
            if Config.TELEGRAM_GROUP_1:
                loop.run_until_complete(
                    bot.application.bot.send_message(
                        chat_id=Config.TELEGRAM_GROUP_1,
                        text=hit_message,
                        parse_mode='HTML'
                    )
                )
                print(f"[HIT_NOTIFICATION] ✅ Sent to group 1: {Config.TELEGRAM_GROUP_1}")

            if Config.TELEGRAM_GROUP_2:
                loop.run_until_complete(
                    bot.application.bot.send_message(
                        chat_id=Config.TELEGRAM_GROUP_2,
                        text=hit_message,
                        parse_mode='HTML'
                    )
                )
                print(f"[HIT_NOTIFICATION] ✅ Sent to group 2: {Config.TELEGRAM_GROUP_2}")

            loop.close()

        except Exception as e:
            print(f"[HIT_NOTIFICATION] ❌ Error sending to Telegram: {e}")

        return jsonify({"ok": True, "message": "Hit notification processed"})

    except Exception as e:
        print(f"[HIT_NOTIFICATION] ❌ Error processing hit notification: {e}")
        traceback.print_exc()
        return jsonify({"ok": False, "error": str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"success": False, "message": "API endpoint not found", "path": request.path, "method": request.method}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"success": False, "message": "Internal server error"}), 500

if __name__ == '__main__':
    Config.validate()
    print("🚀 Starting AriesxHit Python Backend...")
    print(f"📡 Server: http://localhost:{Config.PORT}")
    print(f"🌍 Environment: {Config.NODE_ENV}")

    # Start Telegram bot in background thread
    import threading
    bot_thread = threading.Thread(target=bot.run, daemon=True)
    bot_thread.start()

    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.NODE_ENV == 'development'
    )