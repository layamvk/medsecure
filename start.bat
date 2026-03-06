@echo off
echo ========================================
echo   MedSecure - Starting Application
echo ========================================
echo.

echo Starting Backend Server (Node.js)...
start "MedSecure Backend" cmd /k "cd backend && npm run dev"

timeout /t 5 >nul

echo Starting Frontend Server (React)...
start "MedSecure Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo   Servers Starting...
echo ========================================
echo.
echo Backend:  http://localhost:3001/api
echo Frontend: http://localhost:5173/
echo.
echo Default Admin Credentials:
echo   Email:    admin@medsecure.com
echo   Password: SecureAdmin123!
echo.
echo Press any key to exit this window...
pause >nul
