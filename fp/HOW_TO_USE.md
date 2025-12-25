# 🚀 How to Use the Fingerprint Site

## 📋 Prerequisites

Before starting, make sure you have:
- ✅ Node.js 16+ installed
- ✅ Backend API running (see Step 1)

---

## Step 1: Start the Backend API

**Open a terminal/command prompt:**

```powershell
# Navigate to backend folder
cd F:\AriesxHit\backend

# Install dependencies (if not done already)
npm install

# Start the backend server
npm start
```

**You should see:**
```
🔥 AriesxHit Backend API Server
===================================
📡 Server:      http://localhost:3000
🌍 Environment: development
🔗 API Prefix:  /api
```

**Keep this terminal open!** The backend must be running.

---

## Step 2: Configure Fingerprint Site

**Open a NEW terminal/command prompt:**

```powershell
# Navigate to fingerprint site folder
cd F:\AriesxHit\fp

# Create .env file (if not exists)
# Copy the example file
copy .env.example .env

# Edit .env file - make sure it has:
# REACT_APP_API_URL=http://localhost:3000/api
```

**Check `.env` file:**
- Open `F:\AriesxHit\fp\.env` in a text editor
- Make sure it contains: `REACT_APP_API_URL=http://localhost:3000/api`
- If your backend runs on a different port, change it accordingly

---

## Step 3: Install Dependencies (if not done)

```powershell
cd F:\AriesxHit\fp
npm install
```

Wait for installation to complete (should see "added XXX packages").

---

## Step 4: Start the Fingerprint Site

```powershell
cd F:\AriesxHit\fp
npm start
```

**You should see:**
```
Compiled successfully!

You can now view ariesxhit-fingerprint in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

**The browser will automatically open** to `http://localhost:3000`

**Note:** If port 3000 is already used (by backend), React will ask to use another port like 3001. That's fine!

---

## Step 5: Register a User

### On the Website:

1. **Fill in Registration Form:**
   - **Username**: Choose a username (3-30 characters, letters/numbers/underscore only)
   - **Email**: Your email address
   - **Telegram**: Optional (your Telegram username)

2. **Click "Continue"**

3. **Fingerprint Collection:**
   - The site will automatically collect your device fingerprint
   - You'll see device info (Platform, Browser, Screen, Timezone)
   - Wait for "Device Identified" ✅

4. **Click "Complete Registration"**

5. **You'll see "Registration Pending" status**
   - Your registration is now waiting for admin approval

---

## Step 6: Approve User (Admin)

**Open Admin Panel** (in another terminal):

```powershell
cd F:\AriesxHit\adm-panel
npm install  # if not done
npm start
```

1. Go to `http://localhost:3001` (or whatever port admin panel uses)
2. Login as admin
3. Go to "Pending Users"
4. Find your registered user
5. Click "Approve"
6. Set password and permissions:
   - **Password**: Set a password for the user
   - **Auto Hit**: Enable/disable
   - **Bypass**: Enable/disable
7. Click "Approve User"

---

## Step 7: Check Status

**Go back to the fingerprint site** (`http://localhost:3000`):

- The page will automatically refresh
- You should see **"Registration Approved! 🎉"**
- Status changes from "Pending" to "Approved"

---

## Step 8: Use Chrome Extension

1. **Open Chrome Extension** (load from `/ext` folder)
2. **Click Login**
3. **Enter credentials:**
   - Username: Your registered username
   - Password: The password set by admin
4. **Login** - Extension will use the same fingerprint automatically
5. **Start using features** based on your permissions!

---

## 🔧 Troubleshooting

### Backend Not Running?
```powershell
# Check if backend is running
curl http://localhost:3000/api/health

# If error, start backend:
cd F:\AriesxHit\backend
npm start
```

### Port Already in Use?
```powershell
# React will ask to use another port - say YES
# Or set manually:
set PORT=3001
npm start
```

### CORS Errors?
- Make sure backend is running
- Check `.env` file has correct API URL
- Backend should allow `localhost` origins in development

### Fingerprint Collection Fails?
- Make sure JavaScript is enabled
- Try a different browser
- Check browser console for errors

### Can't Connect to Backend?
- Verify backend is running on port 3000
- Check `.env` file: `REACT_APP_API_URL=http://localhost:3000/api`
- Make sure no firewall is blocking

---

## 📝 Quick Reference

### Terminal 1 (Backend):
```powershell
cd F:\AriesxHit\backend
npm start
# Keep running on http://localhost:3000
```

### Terminal 2 (Fingerprint Site):
```powershell
cd F:\AriesxHit\fp
npm start
# Opens http://localhost:3000 (or 3001)
```

### Terminal 3 (Admin Panel - Optional):
```powershell
cd F:\AriesxHit\adm-panel
npm start
# Opens http://localhost:3001 (or 3002)
```

---

## 🎯 Complete Flow Summary

1. ✅ Start Backend → `cd backend && npm start`
2. ✅ Start Fingerprint Site → `cd fp && npm start`
3. ✅ Register User → Fill form, collect fingerprint
4. ✅ Admin Approves → Set password & permissions
5. ✅ User Logs In → Use Chrome extension
6. ✅ Start Using → Access features based on permissions

---

**Need Help?** Check `STARTUP_GUIDE.md` for detailed documentation.
