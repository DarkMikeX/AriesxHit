# OTP Login – How to Use

Step-by-step guide for the Telegram OTP login system.

---

## Prerequisites

1. **Telegram account**
2. **Backend server** running (with your bot token in `.env`)

---

## Step 1: Create a Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send: `/newbot`
3. Enter a name (e.g. `AriesxHit Bot`)
4. Enter a username (e.g. `ariesxhit_otp_bot`)
5. Copy the **bot token** (looks like `8268278005:AAG49bxah...`)

---

## Step 2: Add Token to Backend

Add to `backend/.env`:

```
TELEGRAM_BOT_TOKEN=8268278005:AAG49bxah...
```

---

## Step 3: Get Your Telegram ID

1. Open Telegram and search for **@userinfobot**
2. Send any message (e.g. `hi`)
3. The bot will reply with your **user ID** (e.g. `123456789`)
4. Copy this number

---

## Step 4: Start the Backend

```bash
cd backend
npm install
npm start
```

You should see something like: `Server: http://localhost:3000`

---

## Step 5: Use OTP in the Extension

1. Go to any webpage
2. Click the **✦** button (top-right)
3. The panel opens with the **Login** screen
4. Enter **Backend API URL**:
   - Local: `http://localhost:3000`
   - Online: `https://your-app.railway.app` (or your backend URL)
5. Enter your **Telegram ID** (from Step 3)
6. Click **Send OTP**
7. Check Telegram – you should receive a code (e.g. `123456`)
8. Enter the code in the **Token** field
9. Click **Login**

After login, you see the main panel (BIN/CC, Start, Logs, Settings).

---

## Step 6: Hit Notifications

Once logged in:

- Successful hits are sent to your Telegram
- Each message includes your name, the card, and attempt count

---

## Troubleshooting

| Problem | Solution |
|--------|----------|
| "OTP sent! Check your Telegram" but no message | Start your bot with `/start` in Telegram first |
| "Failed" on Send OTP | Check backend is running and URL is correct |
| "Invalid token" | Token expires in 5 minutes; request a new one |
| CORS error | Use the correct backend URL (include `http://` or `https://`) |

---

## Skip Login

To use the extension without Telegram:

- Click **Skip (no TG)** on the login screen
- No OTP or hit notifications, but the rest of the extension works
