import asyncio
import json
import secrets
import re
from datetime import datetime
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes
from config import Config
from database import db

class TelegramBot:
    def __init__(self):
        self.application = None
        self.bot_token = Config.TELEGRAM_BOT_TOKEN
        self.group_1 = Config.TELEGRAM_GROUP_1
        self.group_2 = Config.TELEGRAM_GROUP_2

    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command"""
        keyboard = [
            [InlineKeyboardButton("🔑 Generate Token", callback_data="token")],
            [InlineKeyboardButton("📈 My Stats", callback_data="stats")],
            [InlineKeyboardButton("🏆 Scoreboard", callback_data="leaderboard")],
            [InlineKeyboardButton("👤 Profile", callback_data="profile")],
            [InlineKeyboardButton("❓ Help", callback_data="help")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        welcome_text = (
            "🎯 <b>ARIESxHIT</b>\n\n"
            "Welcome to the most advanced Stripe checkout hitter!\n\n"
            "⚡ <b>Features:</b>\n"
            "• Lightning-fast card testing\n"
            "• Advanced proxy rotation\n"
            "• Real-time hit notifications\n"
            "• Comprehensive statistics\n\n"
            "Choose an option below to get started!"
        )

        await update.message.reply_text(welcome_text, reply_markup=reply_markup, parse_mode='HTML')

    async def debug_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /debug command"""
        tg_id = str(update.effective_user.id)
        text = (
            f"🔧 <b>BOT DEBUG INFO</b>\n\n"
            f"📊 <b>Your Telegram ID:</b> <code>{tg_id}</code>\n"
            f"🤖 <b>Bot Status:</b> Online\n"
            f"📡 <b>Server:</b> Connected\n\n"
            f"💡 <b>Commands Available:</b>\n"
            f"• /co - Checkout hitter\n"
            f"• /addpxy - Add proxy\n"
            f"• /seepxy - View proxies\n"
            f"• /chkpxy - Test proxies\n"
            f"• /delpxy - Delete proxy\n"
            f"• /delallpxy - Delete all proxies\n"
            f"• /start - Main menu\n"
            f"• /debug - This info"
        )
        await update.message.reply_text(text, parse_mode='HTML')

    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle callback queries"""
        query = update.callback_query
        await query.answer()

        tg_id = str(update.effective_user.id)
        first_name = update.effective_user.first_name or "User"

        if query.data == "token":
            # Generate login token
            token = db.generate_login_token(tg_id, first_name)
            text = (
                f"🔑 <b>LOGIN TOKEN GENERATED</b>\n\n"
                f"📋 <b>Token:</b> <code>{token}</code>\n\n"
                f"🌐 <b>Use this token to login to the AriesxHit extension</b>\n\n"
                f"📝 <b>Steps:</b>\n"
                f"1. Open AriesxHit extension\n"
                f"2. Click 'Login with Token'\n"
                f"3. Enter the token above\n\n"
                f"⚠️ <b>This token expires in 24 hours</b>"
            )
            await query.edit_message_text(text, parse_mode='HTML')

        elif query.data == "stats":
            # Show user stats
            user_data = db.get_user_data(tg_id)
            hits = user_data['stats']['hits'] if user_data else 0
            total_tests = user_data['stats']['total_tests'] if user_data else 0
            rank = db.get_user_rank(tg_id)

            text = (
                f"📊 <b>YOUR STATISTICS</b>\n\n"
                f"🎯 <b>Hits:</b> {hits}\n"
                f"🧪 <b>Total Tests:</b> {total_tests}\n"
                f"🏆 <b>Rank:</b> #{rank or 'N/A'}\n\n"
                f"Keep hitting to climb the leaderboard! 🚀"
            )
            await query.edit_message_text(text, parse_mode='HTML')

        elif query.data == "leaderboard":
            # Show leaderboard (simplified)
            text = (
                f"🏆 <b>SCOREBOARD</b>\n\n"
                f"Coming soon! Top users will be displayed here.\n\n"
                f"Keep hitting to get on the leaderboard! 🎯"
            )
            await query.edit_message_text(text, parse_mode='HTML')

        elif query.data == "profile":
            # Show user profile
            user_data = db.get_user_data(tg_id)
            hits = user_data['stats']['hits'] if user_data else 0
            rank = db.get_user_rank(tg_id)
            token = db.get_login_token_for_user(tg_id)

            text = (
                f"👤 <b>PROFILE</b>\n"
                f"─────────────────\n"
                f"Code :- <code>{token or 'No token generated'}</code>\n\n"
                f"─────────────────\n"
                f"Name: {first_name}\n"
                f"--------------\n"
                f"Hits: {hits}\n"
                f"Rank: #{rank or 'N/A'}\n"
                f"--------------\n"
                f"Join :- @AriesxHit\n"
                f"Thanks For Using AriesxHit 💗\n\n"
                f"─────────────────"
            )
            await query.edit_message_text(text, parse_mode='HTML')

        elif query.data == "help":
            # Show help
            text = (
                f"❓ <b>HELP</b>\n"
                f"─────────────────\n\n"
                f"🔑 Generate Token\n"
                f"Get token for hitter login\n"
                f"----------------\n"
                f"Enter code in hitter → Login\n"
                f"----------------\n"
                f"📈 My Stats / My Hits – Your hits & rank\n"
                f"----------------\n"
                f"🏆 Scoreboard – Top users\n"
                f"----------------\n"
                f"👤 Profile – Your info\n\n"
                f"─────────────────\n"
                f"Join :- @Ariesxhit\n"
                f"Thanks For Using AriesxHit 💗"
            )
            await query.edit_message_text(text, parse_mode='HTML')

        elif query.data == "back":
            # Go back to main menu
            keyboard = [
                [InlineKeyboardButton("🔑 Generate Token", callback_data="token")],
                [InlineKeyboardButton("📈 My Stats", callback_data="stats")],
                [InlineKeyboardButton("🏆 Scoreboard", callback_data="leaderboard")],
                [InlineKeyboardButton("👤 Profile", callback_data="profile")],
                [InlineKeyboardButton("❓ Help", callback_data="help")]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)

            text = (
                "🎯 <b>ARIESxHIT</b>\n\n"
                "Choose an option below:"
            )

            await query.edit_message_text(text, reply_markup=reply_markup, parse_mode='HTML')

    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle regular messages (commands)"""
        message = update.message
        if not message or not message.text:
            return

        tg_id = str(update.effective_user.id)
        text = message.text.strip()

        # Handle different commands
        if text.startswith('/addpxy'):
            await self.handle_add_proxy(message, tg_id, text)
        elif text.startswith('/seepxy') or text.startswith('/seeproxy'):
            await self.handle_see_proxies(message, tg_id)
        elif text.startswith('/delpxy'):
            await self.handle_delete_proxy(message, tg_id, text)
        elif text.startswith('/delallpxy'):
            await self.handle_delete_all_proxies(message, tg_id)
        elif text.startswith('/chkpxy'):
            await self.handle_check_proxies(message, tg_id)
        elif text.startswith('/co'):
            await self.handle_checkout(message, tg_id, text)

    async def handle_add_proxy(self, message, tg_id, text):
        """Handle /addpxy command"""
        parts = text.split()
        if len(parts) < 2:
            reply_text = (
                "📝 <b>Add Proxy</b>\n\n"
                "Usage:\n"
                "• <code>/addpxy host:port:user:pass</code> - Single proxy\n"
                "• Reply to proxy list with <code>/addpxy</code> - Multiple proxies\n\n"
                "Example:\n"
                "<code>/addpxy 192.168.1.100:8080:myuser:mypass123</code>"
            )
            await message.reply_text(reply_text, parse_mode='HTML')
            return

        proxy_string = parts[1]

        # Basic validation
        if ':' not in proxy_string or proxy_string.count(':') < 2:
            await message.reply_text(
                "❌ <b>Invalid Proxy Format!</b>\n\n"
                "Use format: <code>host:port:user:pass</code>\n\n"
                "Example: <code>p.webshare.io:80:user:pass</code>",
                parse_mode='HTML'
            )
            return

        try:
            parts = proxy_string.split(':')
            proxy_data = {
                'host': parts[0],
                'port': int(parts[1]),
                'user': parts[2] if len(parts) > 2 else None,
                'pass': parts[3] if len(parts) > 3 else None
            }

            proxy_id = db.add_proxy(tg_id, proxy_data)

            reply_text = (
                "✅ <b>Proxy Added Successfully!</b>\n\n"
                f"🌐 Host: {proxy_data['host']}\n"
                f"🔌 Port: {proxy_data['port']}\n"
                f"👤 User: {proxy_data['user'] or 'None'}\n"
                f"📅 Added: {datetime.now().strftime('%m/%d/%Y %I:%M:%S %p')}\n\n"
                "You can now use /co command!"
            )

            await message.reply_text(reply_text, parse_mode='HTML')

        except Exception as e:
            await message.reply_text(f"❌ Error adding proxy: {str(e)}")

    async def handle_see_proxies(self, message, tg_id):
        """Handle /seepxy command"""
        user_data = db.get_user_data(tg_id)

        if not user_data or not user_data.get('proxies'):
            reply_text = (
                "📭 <b>No Proxies Found</b>\n\n"
                "You haven't added any proxies yet.\n\n"
                "Use <code>/addpxy host:port:user:pass</code> to add your first proxy."
            )
            await message.reply_text(reply_text, parse_mode='HTML')
            return

        proxies = user_data['proxies']
        proxy_list = "🔐 <b>Your Proxies</b>\n═══════════════════════════════\n\n"

        for i, proxy in enumerate(proxies, 1):
            status_emoji = {
                'active': '✅',
                'working': '✅',
                'failed': '❌',
                'unknown': '⏳'
            }.get(proxy['status'], '⏳')

            last_used = "Never"
            if proxy.get('lastUsed'):
                last_used = datetime.fromtimestamp(proxy['lastUsed'] / 1000).strftime('%m/%d %I:%M%p')

            proxy_list += (
                f"{i}. {status_emoji} <code>{proxy['host']}:{proxy['port']}</code>\n"
                f"   👤 {proxy['user'] or 'None'}\n"
                f"   📅 Added: {datetime.fromtimestamp(proxy['addedAt'] / 1000).strftime('%m/%d/%Y')}\n"
                f"   🕒 Last Used: {last_used}\n"
                f"   🆔 ID: <code>{proxy['id']}</code>\n\n"
            )

        proxy_list += "═══════════════════════════════\n"
        proxy_list += f"📊 <b>Summary:</b> {len([p for p in proxies if p['status'] == 'active'])} active, {len(proxies)} total\n\n"
        proxy_list += "💡 <b>Commands:</b>\n"
        proxy_list += "• <code>/chkpxy</code> - Test all proxies\n"
        proxy_list += "• <code>/delpxy [id]</code> - Delete proxy\n"

        await message.reply_text(proxy_list, parse_mode='HTML')

    async def handle_delete_proxy(self, message, tg_id, text):
        """Handle /delpxy command"""
        parts = text.split()
        if len(parts) < 2:
            await message.reply_text(
                "❌ <b>Invalid Format</b>\n\n"
                "Usage: <code>/delpxy proxy_id</code>\n\n"
                "Get proxy ID from <code>/seepxy</code> command",
                parse_mode='HTML'
            )
            return

        proxy_id = parts[1]
        success = db.remove_proxy(tg_id, proxy_id)

        if success:
            await message.reply_text("✅ <b>Proxy Deleted Successfully!</b>", parse_mode='HTML')
        else:
            await message.reply_text("❌ <b>Proxy Not Found!</b>\n\nUse <code>/seepxy</code> to see your proxy IDs.", parse_mode='HTML')

    async def handle_delete_all_proxies(self, message, tg_id):
        """Handle /delallpxy command"""
        user_data = db.get_user_data(tg_id)
        if not user_data or not user_data.get('proxies'):
            await message.reply_text("📭 <b>No proxies to delete</b>", parse_mode='HTML')
            return

        # Delete all proxies
        proxies = user_data['proxies']
        for proxy in proxies:
            db.remove_proxy(tg_id, proxy['id'])

        await message.reply_text(f"✅ <b>All {len(proxies)} Proxies Deleted!</b>", parse_mode='HTML')

    async def handle_check_proxies(self, message, tg_id):
        """Handle /chkpxy command"""
        await message.reply_text("🔍 <b>Proxy Testing Feature</b>\n\nComing soon! For now, proxies are marked as active when added.", parse_mode='HTML')

    async def handle_checkout(self, message, tg_id, text):
        """Handle /co command"""
        # This will be implemented in the main app.py with the checkout service
        await message.reply_text("⚡ <b>Checkout Processing</b>\n\nThis feature is handled by the web API. Use the AriesxHit extension for checkout testing.", parse_mode='HTML')

    async def send_hit_notification(self, hit_data):
        """Send hit notification to groups"""
        try:
            card = hit_data.get('card', 'Unknown')
            amount = hit_data.get('amount', 'Unknown')
            currency = hit_data.get('currency', 'USD')
            merchant = hit_data.get('business_name', 'Unknown')
            email = hit_data.get('email', 'Unknown')

            message = (
                "🎯 𝗛𝗜𝗧 𝗖𝗛𝗔𝗥𝗚𝗘𝗗 ✅\n\n"
                f"「❃」 𝗥𝗲𝘀𝗽𝗼𝗻𝘀𝗲 : Charged\n"
                f"「❃」 𝗔𝗺𝗼𝘂𝗻𝘁 : {amount} {currency}\n"
                f"「❃」 𝗠𝗲𝗿𝗰𝗵𝗮𝗻𝘁 : {merchant}\n"
                f"「❃」 𝗘𝗺𝗮𝗶𝗹 : {email}\n"
                f"「❃」 𝗕𝗜𝗡 :- {card[:6] if card != 'Unknown' else 'Unknown'}\n"
                f"「❃」 𝗛𝗶𝘁 𝗕𝘆 : ARIESxHIT\n"
                f"「❃」 𝗧𝗶𝗺𝗲 : {datetime.now().strftime('%m/%d/%Y %I:%M:%S %p')}\n"
            )

            # Send to both groups
            if self.group_1:
                await self.application.bot.send_message(chat_id=self.group_1, text=message, parse_mode='HTML')
            if self.group_2:
                await self.application.bot.send_message(chat_id=self.group_2, text=message, parse_mode='HTML')

        except Exception as e:
            print(f"Error sending hit notification: {e}")

    def run(self):
        """Start the bot"""
        if not self.bot_token:
            print("❌ No Telegram bot token configured")
            return

        self.application = Application.builder().token(self.bot_token).build()

        # Add handlers
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CommandHandler("debug", self.debug_command))
        self.application.add_handler(CallbackQueryHandler(self.handle_callback))
        self.application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))

        # Start the bot
        print("🤖 Starting Telegram bot...")
        self.application.run_polling(allowed_updates=["message", "callback_query"])

# Global bot instance
bot = TelegramBot()