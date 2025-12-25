# AriesxHit Fingerprint Site Startup Script
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Starting AriesxHit Fingerprint Site" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "Creating .env file..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host ".env file created!" -ForegroundColor Green
    Write-Host ""
}

# Check if node_modules exists
if (-not (Test-Path node_modules)) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "Starting development server..." -ForegroundColor Green
Write-Host ""
npm start
