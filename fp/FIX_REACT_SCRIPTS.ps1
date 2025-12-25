# Fix react-scripts Installation Issue
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Fixing react-scripts Installation" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clean everything
Write-Host "[1/5] Cleaning old files..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules
    Write-Host "  ✓ Removed node_modules" -ForegroundColor Green
}
if (Test-Path "package-lock.json") {
    Remove-Item -Force package-lock.json
    Write-Host "  ✓ Removed package-lock.json" -ForegroundColor Green
}

# Step 2: Clear npm cache
Write-Host "[2/5] Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "  ✓ Cache cleared" -ForegroundColor Green

# Step 3: Install react-scripts first (this will pull in all dependencies)
Write-Host "[3/5] Installing react-scripts..." -ForegroundColor Yellow
Write-Host "  This may take a few minutes..." -ForegroundColor Gray
npm install react-scripts@5.0.1 --save
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to install react-scripts!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ react-scripts installed" -ForegroundColor Green

# Step 4: Install all other dependencies
Write-Host "[4/5] Installing other dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Failed to install dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ All dependencies installed" -ForegroundColor Green

# Step 5: Verify installation
Write-Host "[5/5] Verifying installation..." -ForegroundColor Yellow
$reactScripts = Test-Path "node_modules\.bin\react-scripts.cmd"
$react = npm list react 2>$null | Select-String "react@"
$reactDom = npm list react-dom 2>$null | Select-String "react-dom@"

if ($reactScripts -and $react -and $reactDom) {
    Write-Host "  ✓ react-scripts found" -ForegroundColor Green
    Write-Host "  ✓ react installed" -ForegroundColor Green
    Write-Host "  ✓ react-dom installed" -ForegroundColor Green
    Write-Host ""
    Write-Host "====================================" -ForegroundColor Green
    Write-Host "  Installation Complete!" -ForegroundColor Green
    Write-Host "====================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run: npm start" -ForegroundColor Cyan
} else {
    Write-Host "  ✗ Verification failed!" -ForegroundColor Red
    Write-Host "  Try running: npm install react react-dom react-scripts --save" -ForegroundColor Yellow
}
