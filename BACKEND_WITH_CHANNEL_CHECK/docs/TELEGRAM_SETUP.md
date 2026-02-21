# Telegram Bot Setup

Use your Telegram bot for extension login (token + OTP) and hit notifications.

## 1. Create a bot

1. Open Telegram and message **@BotFather**
2. Send `/newbot` and follow the prompts
3. Copy the **bot token** (e.g. `7123456789:AAH...`)
4. Note your **bot username** (e.g. `AriesxHitBot`)

## 2. Configure backend

Add to your `.env`:

```
TELEGRAM_BOT_TOKEN=7123456789:AAH...your_token_here
TELEGRAM_BOT_USERNAME=AriesxHitBot
```

In `ext/scripts/autohitter/tg-config.js`, set `BOT_USERNAME` to match your bot.

## 3. Set Telegram webhook (for Get Token button)

Your server must be publicly reachable. For production, set the webhook:

```
https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://your-server.com/api/tg/webhook
```

For local dev, use ngrok or similar to expose your server.

## 4. Extension login flow

1. User opens extension dashboard → Login popup appears
2. User clicks **Get Token** → opens your bot on Telegram
3. User sends `/start` to bot → bot shows inline button "Get Login Token"
4. User clicks button → bot sends login token
5. User pastes token in extension → clicks **Login**

## 5. OTP flow (Telegram connect)

1. In extension: Menu → Telegram
2. Enter **Telegram ID** (get from @userinfobot)
3. Click **Send Code** → OTP sent to Telegram
4. Enter OTP → **Verify** → Connected

## 6. Hit notifications

When connected, every successful card hit sends to Telegram:
- HIT DETECTED (premium format)
- Name (link to user)
- CC, Attempts, Amount, Success URL
- Screenshot (if "Send Screenshots to Telegram" is ON)

## API endpoints

- `POST /api/tg/send-otp` – send OTP
- `POST /api/tg/verify` – verify OTP
- `POST /api/tg/notify-hit` – hit notification (+ optional screenshot)
- `POST /api/tg/validate-token` – validate login token
- `POST /api/tg/webhook` – Telegram webhook (/start, Get Token button)
