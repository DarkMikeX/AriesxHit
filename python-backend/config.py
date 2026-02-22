import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    # Server Configuration
    NODE_ENV = os.getenv('NODE_ENV', 'development')
    PORT = int(os.getenv('PORT', 3001))
    HOST = os.getenv('HOST', 'localhost')

    # Telegram Bot Configuration
    TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
    TELEGRAM_GROUP_1 = os.getenv('TELEGRAM_GROUP_1')
    TELEGRAM_GROUP_2 = os.getenv('TELEGRAM_GROUP_2')

    # Database Configuration
    DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'database', 'ariesxhit.db')

    # Stripe Configuration
    STRIPE_API_BASE = "https://api.stripe.com"
    XOR_KEY = 5

    # CORS Configuration
    CORS_ORIGINS = ["*"]

    # 3DS Configuration
    THREEDS_MAX_RETRIES = 3
    THREEDS_RETRY_DELAY = 0.5
    THREEDS_TIMEOUT = 15

    @classmethod
    def validate(cls):
        """Validate required configuration"""
        required = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_GROUP_1', 'TELEGRAM_GROUP_2']
        missing = [key for key in required if not getattr(cls, key)]

        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

        return True