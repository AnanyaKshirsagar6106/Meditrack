@echo off
echo ============================================
echo    MediTrack - Ayurvedic Hospital Inventory
echo ============================================
echo.

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed.
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Starting MediTrack server...

REM Start the server
node server/index.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo Server exited with error. Try running: npm install
    pause
)

pause