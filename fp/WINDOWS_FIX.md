# Windows Fix Guide

## Issue: 'react-scripts' is not recognized

This happens on Windows when npm doesn't properly add `node_modules/.bin` to PATH.

## Solution 1: Use npx (Recommended)

The package.json has been updated to use `npx`. Just run:

```powershell
npm start
```

## Solution 2: Manual Fix

If Solution 1 doesn't work, try:

```powershell
# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install

# Then try starting again
npm start
```

## Solution 3: Use Full Path

```powershell
.\node_modules\.bin\react-scripts start
```

## Solution 4: Add to PATH (Permanent Fix)

Add this to your PowerShell profile:

```powershell
$env:Path += ";$PWD\node_modules\.bin"
```

Or set it for current session:

```powershell
$env:Path += ";F:\AriesxHit\fp\node_modules\.bin"
npm start
```

## Verify Installation

Check if react-scripts is installed:

```powershell
Test-Path .\node_modules\.bin\react-scripts.cmd
```

Should return `True`.

---

**Note:** The package.json has been updated to use `npx` which should work automatically. Try `npm start` again!
