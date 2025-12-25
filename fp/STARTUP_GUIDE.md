# 🚀 AriesxHit Fingerprint Site - Startup Guide

## 📋 Prerequisites

Before starting, make sure you have:
- **Node.js** 16+ installed
- **npm** 8+ installed
- **Backend API** running (see `/backend/README.md`)

## 🔧 Setup Steps

### 1. Install Dependencies

```bash
cd /workspace/fp
npm install
```

This will install:
- React 18.2.0
- React DOM 18.2.0
- React Scripts 5.0.1
- FingerprintJS (if needed)

### 2. Configure Backend API URL

Create a `.env` file in the `/workspace/fp` directory:

```bash
cd /workspace/fp
touch .env
```

Add the following content:

```env
REACT_APP_API_URL=http://localhost:3000/api
```

**For production**, change to your actual backend URL:
```env
REACT_APP_API_URL=https://your-backend-api.com/api
```

### 3. Start the Development Server

```bash
npm start
```

The app will start on **http://localhost:3000** (or next available port).

### 4. Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` folder.

## 🌐 How It Works

### Registration Flow

1. **User visits the site** → Checks if fingerprint exists in localStorage
2. **If fingerprint exists** → Checks backend for registration status
3. **If registered** → Shows pending/approved/rejected status
4. **If not registered** → Shows registration form

### Registration Steps

1. **Step 1: User Info**
   - Username (required, 3-30 chars, alphanumeric + underscore)
   - Email (required, valid email format)
   - Telegram (optional, 5-32 chars)

2. **Step 2: Fingerprint Collection**
   - Automatically collects device fingerprint
   - Uses SHA-256 hash of browser characteristics
   - Shows device info (platform, browser, screen, timezone)

3. **Submit Registration**
   - Sends data to backend `/api/auth/register`
   - Stores fingerprint in localStorage
   - Shows pending status

### Status Pages

- **Pending**: Shows registration details, auto-refreshes every 30s
- **Approved**: Shows success message with next steps
- **Rejected**: Shows rejection message
- **Error**: Shows error with retry option

## 🔌 API Endpoints Used

The fingerprint site calls these backend endpoints:

1. **POST `/api/auth/register`**
   - Registers new user with fingerprint
   - Body: `{ username, email, telegram, fingerprint_hash }`

2. **POST `/api/auth/check`** (needs to be added)
   - Checks if fingerprint is already registered
   - Body: `{ fingerprint_hash }`
   - Returns: `{ exists: true/false, user: {...} }`

3. **GET `/api/auth/status`** (needs to be added)
   - Gets user status by fingerprint
   - Header: `X-Fingerprint: <hash>`
   - Returns: `{ status: 'pending'|'active'|'blocked', user: {...} }`

## 🎨 Features

- ✅ **Custom Fingerprint Generation**: Uses browser APIs (Canvas, WebGL, Audio, Fonts)
- ✅ **Beautiful UI**: Dark theme with glassmorphism effects
- ✅ **Responsive Design**: Works on mobile and desktop
- ✅ **Auto-refresh**: Checks status every 30 seconds when pending
- ✅ **Form Validation**: Real-time validation with error messages
- ✅ **Loading States**: Smooth loading animations
- ✅ **Error Handling**: User-friendly error messages

## 🐛 Troubleshooting

### Port Already in Use

If port 3000 is taken, React will ask to use another port. Or set manually:

```bash
PORT=3001 npm start
```

### Backend Connection Error

1. Make sure backend is running: `cd /workspace/backend && npm start`
2. Check API URL in `.env` file
3. Check CORS settings in backend

### Fingerprint Collection Fails

- Make sure browser allows JavaScript
- Check browser console for errors
- Some browsers block Canvas fingerprinting

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm start
```

## 📝 Notes

- Fingerprint is stored in `localStorage` as `ariesxhit_fingerprint`
- The site uses custom fingerprint generation (not FingerprintJS library)
- All API calls include `X-Fingerprint` header
- Status checks happen automatically every 30 seconds

## 🚀 Next Steps

After registration:
1. Admin approves user in admin panel
2. User opens Chrome extension
3. Extension uses same fingerprint for login
4. User gets access based on permissions

---

**Need Help?** Check the main `/docs` folder for more information.
