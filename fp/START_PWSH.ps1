# ===================================
# AriesxHit Fingerprint Site - PowerShell Startup Script
# ===================================

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  AriesxHit Fingerprint Site" -ForegroundColor Cyan
Write-Host "  PowerShell Startup Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "Please run this script from the fp directory:" -ForegroundColor Yellow
    Write-Host "  cd F:\AriesxHit\fp" -ForegroundColor White
    Write-Host "  .\START_PWSH.ps1" -ForegroundColor White
    exit 1
}

# Step 1: Check/Create .env file
Write-Host "[1/4] Checking .env file..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "  Creating .env from .env.example..." -ForegroundColor Gray
    Copy-Item ".env.example" ".env"
    Write-Host "  ✓ .env file created!" -ForegroundColor Green
} else {
    Write-Host "  ✓ .env file exists" -ForegroundColor Green
}

# Step 2: Check node_modules
Write-Host "[2/4] Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing dependencies (this may take a minute)..." -ForegroundColor Gray
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ npm install failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Dependencies installed!" -ForegroundColor Green
} else {
    Write-Host "  ✓ node_modules exists" -ForegroundColor Green
}

# Step 3: Verify React is installed
Write-Host "[3/4] Verifying React installation..." -ForegroundColor Yellow
$reactVersion = npm list react 2>$null | Select-String "react@"
if ($reactVersion) {
    Write-Host "  ✓ React installed: $reactVersion" -ForegroundColor Green
} else {
    Write-Host "  Installing React..." -ForegroundColor Gray
    npm install react react-dom react-scripts
    Write-Host "  ✓ React installed!" -ForegroundColor Green
}

# Step 4: Check backend connection
Write-Host "[4/4] Checking backend connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  ✓ Backend is running!" -ForegroundColor Green
} catch {
    Write-Host "  ⚠ Backend not running on port 3000" -ForegroundColor Yellow
    Write-Host "  Start backend first: cd ..\backend && npm start" -ForegroundColor Gray
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Starting development server..." -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "The browser will open automatically at:" -ForegroundColor White
Write-Host "  http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""

# Start the development server
npm start
