# AriesxHit Python Backend

A Python Flask-based backend for the AriesxHit Stripe checkout testing system.

## Features

- 🐍 **Python Flask** web server
- 🤖 **Telegram Bot** integration
- 💳 **Stripe Checkout** processing
- 🗄️ **SQLite Database** for data storage
- 🔐 **JWT Authentication** system
- 🌐 **RESTful API** endpoints

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd python-backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run the application**
   ```bash
   python run.py
   ```

## Configuration

Edit the `.env` file with your settings:

```env
# Server
NODE_ENV=development
PORT=3001
HOST=localhost

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_GROUP_1=your_group_id
TELEGRAM_GROUP_2=your_group_id
```

## API Endpoints

### Health Check
- `GET /api/health` - Server health check

### Authentication
- `POST /api/tg/send-otp` - Send OTP to user
- `POST /api/tg/verify` - Verify OTP and login

### Telegram Webhook
- `POST /api/tg/webhook` - Handle Telegram updates

### Proxy Management
- `POST /api/tg/see-proxy` - Get user proxies
- `POST /api/tg/add-proxy` - Add proxy
- `POST /api/tg/check-proxy` - Test proxies

### Checkout Processing
- `POST /api/tg/co` - Process checkout URL
- `POST /api/tg/notify-hit` - Handle hit notifications

## Project Structure

```
python-backend/
├── app.py                 # Main Flask application
├── config.py             # Configuration management
├── database.py           # Database operations
├── telegram_bot.py       # Telegram bot handler
├── checkout_service.py   # Stripe checkout processing
├── run.py               # Application runner
├── requirements.txt      # Python dependencies
├── .env                 # Environment variables
├── database/            # Database related files
├── routes/              # Route handlers
└── services/            # Business logic services
```

## Development

### Running Tests
```bash
python -m pytest
```

### Code Formatting
```bash
black .
flake8 .
```

## Deployment

The application can be deployed using:

- **Gunicorn** for production WSGI server
- **Docker** for containerized deployment
- **Systemd** for service management

## License

This project is part of the AriesxHit system.