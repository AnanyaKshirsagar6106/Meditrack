@echo off
title MediTrack - Ayurvedic Hospital Inventory
echo ============================================
echo    MediTrack v1.0
echo    Ayurvedic Hospital Inventory Management
echo ============================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed.
    echo Please install from https://nodejs.org
    pause
    exit /b 1
)

REM Check dependencies
if not exist "node_modules" (
    echo First run: Installing dependencies...
    echo This may take 30-60 seconds...
    call npm install --production
    if %ERRORLEVEL% neq 0 (
        echo Failed to install dependencies.
        pause
        exit /b 1
    )
)

echo Starting MediTrack server...
echo.
echo  ========================================
echo   Server running on http://localhost:3001
echo   Login: admin@meditrack.local
echo   Password: MediTrack@2024
echo  ========================================
echo.
echo  The application opens automatically in your browser.
echo  If not, visit http://localhost:3001
echo.
echo  Press Ctrl+C to stop the server.
echo.

REM Open browser after 3 seconds
start /min cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3001"

REM Start the server
node server/index.js

echo.
echo MediTrack server stopped.
pause