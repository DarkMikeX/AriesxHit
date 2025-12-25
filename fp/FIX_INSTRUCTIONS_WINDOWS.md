# 🔧 Fix: react-scripts Not Found on Windows

## Problem
`npm install` only installs 8 packages instead of hundreds, and `react-scripts` is missing.

## ✅ Solution

### Option 1: Use the Fix Script (Easiest)

```powershell
cd F:\AriesxHit\fp
.\FIX_REACT_SCRIPTS.ps1
```

This script will:
1. Clean old files
2. Clear npm cache
3. Install react-scripts explicitly
4. Install all dependencies
5. Verify installation

### Option 2: Manual Fix

Run these commands **one by one**:

```powershell
cd F:\AriesxHit\fp

# 1. Remove old files
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# 2. Clear npm cache
npm cache clean --force

# 3. Install react-scripts FIRST (this pulls in all dependencies)
npm install react-scripts@5.0.1 --save

# 4. Install remaining dependencies
npm install

# 5. Verify
npm list react-scripts
```

### Option 3: Force Install Everything

```powershell
cd F:\AriesxHit\fp
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm cache clean --force
npm install react@18.3.1 react-dom@18.2.0 react-scripts@5.0.1 --save
npm install
```

## ✅ Verification

After running the fix, verify:

```powershell
# Check react-scripts exists
Test-Path node_modules\.bin\react-scripts.cmd
# Should return: True

# Check package count
(Get-ChildItem node_modules -Directory).Count
# Should be hundreds, not 8

# Check react-scripts version
npm list react-scripts
# Should show: react-scripts@5.0.1
```

## 🚀 Then Start

```powershell
npm start
```

## 🐛 If Still Not Working

### Try installing with verbose output:
```powershell
npm install --verbose 2>&1 | Tee-Object install.log
```

### Check npm version:
```powershell
npm --version
# Should be 8+ or 9+
```

### Update npm if needed:
```powershell
npm install -g npm@latest
```

### Try with different registry:
```powershell
npm install --registry https://registry.npmjs.org/
```

## 📝 Expected Output

When `npm install` works correctly, you should see:
```
added 780 packages, and audited 1304 packages in 30s
```

NOT:
```
added 8 packages, and audited 9 packages in 1s
```

---

**Run `.\FIX_REACT_SCRIPTS.ps1` now to fix it!** 🚀
