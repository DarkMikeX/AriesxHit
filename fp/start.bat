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

REM Check if node_modules exists
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Starting development server...
echo.
call npm start

pause
