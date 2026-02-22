# Telegram Service - handles Telegram bot operations
import requests
from config import Config

class TelegramService:
    def __init__(self):
        self.base_url = f"https://api.telegram.org/bot{Config.TELEGRAM_BOT_TOKEN}"

    def send_message(self, chat_id, text, parse_mode='HTML'):
        """Send message to Telegram chat"""
        try:
            url = f"{self.base_url}/sendMessage"
            data = {
                'chat_id': chat_id,
                'text': text,
                'parse_mode': parse_mode
            }

            response = requests.post(url, data=data)
            return response.json()

        except Exception as e:
            print(f"❌ Telegram send message failed: {e}")
            return {'ok': False, 'error': str(e)}

    def set_webhook(self, webhook_url):
        """Set webhook URL"""
        try:
            url = f"{self.base_url}/setWebhook"
            data = {'url': webhook_url}

            response = requests.post(url, data=data)
            return response.json()

        except Exception as e:
            print(f"❌ Telegram set webhook failed: {e}")
            return {'ok': False, 'error': str(e)}

    def get_webhook_info(self):
        """Get webhook info"""
        try:
            url = f"{self.base_url}/getWebhookInfo"
            response = requests.get(url)
            return response.json()

        except Exception as e:
            print(f"❌ Telegram get webhook info failed: {e}")
            return {'ok': False, 'error': str(e)}