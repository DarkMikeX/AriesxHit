# PowerShell Commands - Quick Reference

## 🚀 Quick Start Commands

### 1. Navigate to Fingerprint Site
```powershell
cd F:\AriesxHit\fp
```

### 2. Start Backend First (Terminal 1)
```powershell
cd F:\AriesxHit\backend
npm start
```
**Keep this running!** Backend must be on `http://localhost:3000`

### 3. Start Fingerprint Site (Terminal 2)
```powershell
cd F:\AriesxHit\fp
npm start
```

Or use the startup script:
```powershell
cd F:\AriesxHit\fp
.\START_PWSH.ps1
```

---

## 🔧 Setup Commands

### Install Dependencies
```powershell
cd F:\AriesxHit\fp
npm install
```

### Create .env File
```powershell
cd F:\AriesxHit\fp
Copy-Item .env.example .env
```

### Verify Installation
```powershell
# Check React version
npm list react

# Check if node_modules exists
Test-Path node_modules

# Check if .env exists
Test-Path .env
```

---

## 🐛 Troubleshooting Commands

### Clean Install (if having issues)
```powershell
cd F:\AriesxHit\fp
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
npm start
```

### Check Backend Connection
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/health"
```

### Check Port Usage
```powershell
# Check if port 3000 is in use
netstat -ano | findstr :3000
```

### Set Different Port
```powershell
$env:PORT=3001
npm start
```

---

## 📋 Complete Startup Sequence

**Terminal 1 (Backend):**
```powershell
cd F:\AriesxHit\backend
npm install  # if first time
npm start
```

**Terminal 2 (Fingerprint Site):**
```powershell
cd F:\AriesxHit\fp
npm install  # if first time
Copy-Item .env.example .env  # if .env doesn't exist
npm start
```

---

## ✅ Verification Commands

### Check All Prerequisites
```powershell
# Check Node.js version
node --version

# Check npm version
npm --version

# Check React installation
npm list react react-dom react-scripts

# Check .env file
Get-Content .env

# Check backend health
Invoke-WebRequest -Uri "http://localhost:3000/api/health"
```

---

## 🎯 Expected Output

When `npm start` works correctly, you'll see:

```
Compiled successfully!

You can now view ariesxhit-fingerprint in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000

Note that the development build is not optimized.
To create a production build, use npm run build.
```

---

## 💡 Tips

1. **Always start backend first** - Fingerprint site needs backend API
2. **Keep terminals open** - Both backend and frontend need to run
3. **Check .env file** - Make sure `REACT_APP_API_URL=http://localhost:3000/api`
4. **Port conflicts** - If port 3000 is taken, React will ask to use another port

---

## 🆘 Common Errors & Solutions

### Error: "react-scripts is not recognized"
```powershell
npm install react-scripts
npm start
```

### Error: "Cannot find module 'react'"
```powershell
npm install react react-dom
npm start
```

### Error: "Port 3000 already in use"
```powershell
# Option 1: Use different port
$env:PORT=3001
npm start

# Option 2: Stop what's using port 3000
netstat -ano | findstr :3000
# Then kill the process ID shown
```

### Error: "Backend connection failed"
```powershell
# Make sure backend is running
cd ..\backend
npm start
```

---

**Ready to start? Run `.\START_PWSH.ps1` or `npm start`!** 🚀
