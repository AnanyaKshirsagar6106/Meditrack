@echo off
echo ============================================
echo    MediTrack Setup
echo ============================================
echo.
echo This script will install dependencies and set up the database.
echo.

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed.
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Step 1: Installing dependencies...
call npm install --production
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)
echo Done!

echo.
echo Step 2: Setting up database with demo data...
call node server/seed.js
if %ERRORLEVEL% neq 0 (
    echo WARNING: Database setup may have had issues.
)

echo.
echo ============================================
echo    Setup Complete!
echo ============================================
echo.
echo To start MediTrack:
echo   1. Double-click start-meditrack.bat
echo   2. Or run: node server/index.js
echo.
echo Then open your browser to: http://localhost:3001
echo.
echo Demo Login: admin@meditrack.local / MediTrack@2024
echo.
pause