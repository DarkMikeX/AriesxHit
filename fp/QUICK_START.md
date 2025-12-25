# ⚡ Quick Start - Fingerprint Site

## 🚀 Fast Setup (3 Steps)

### Step 1: Install Dependencies
```bash
cd /workspace/fp
npm install
```

### Step 2: Configure API URL
```bash
# Copy example env file
cp .env.example .env

# Edit .env and set your backend URL (default: http://localhost:3000/api)
# For production: REACT_APP_API_URL=https://your-api.com/api
```

### Step 3: Start Development Server
```bash
npm start
```

**That's it!** The site will open at http://localhost:3000

---

## ✅ Verify It's Working

1. **Backend Running?**
   - Make sure backend is running: `cd /workspace/backend && npm start`
   - Backend should be on port 3000 (or update `.env` if different)

2. **Open Browser**
   - Visit http://localhost:3000
   - You should see the registration form

3. **Test Registration**
   - Fill in username, email, telegram (optional)
   - Click "Continue"
   - Fingerprint will be collected automatically
   - Click "Complete Registration"
   - You should see "Pending" status

---

## 🔧 Troubleshooting

### Port Conflict?
```bash
PORT=3001 npm start
```

### Backend Not Connected?
- Check backend is running: `curl http://localhost:3000/api/health`
- Check `.env` file has correct URL
- Check browser console for CORS errors

### Build for Production?
```bash
npm run build
# Files will be in /workspace/fp/build/
```

---

## 📚 More Info

See `STARTUP_GUIDE.md` for detailed documentation.
