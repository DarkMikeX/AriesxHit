@echo off
echo ====================================
echo Starting AriesxHit Fingerprint Site
echo ====================================
echo.

REM Check if .env exists
if not exist .env (
    echo Creating .env file...
    copy .env.example .env
    echo .env file created!
    echo.
)

REM Check if react-scripts exists
if not exist "node_modules\.bin\react-scripts.cmd" (
    echo react-scripts not found! Installing...
    echo.
    echo Step 1: Installing react-scripts...
    call npm install react-scripts@5.0.1 --save
    echo.
    echo Step 2: Installing all dependencies...
    call npm install
    echo.
)

REM Check if node_modules exists
if not exist node_modules (
    echo Installing dependencies...
    call npm install react-scripts@5.0.1 --save
    call npm install
    echo.
)

echo Starting development server...
echo.
call npm start

pause
