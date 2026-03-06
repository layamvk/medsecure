@echo off
echo ========================================
echo   MedSecure - Starting Application
echo ========================================
echo.

echo Starting Backend Server (Django)...
start "MedSecure Backend" cmd /k "cd /d "o:\final bf\medsecure\backend" && "o:\final bf\medsecure\venv\Scripts\python.exe" manage.py runserver"

timeout /t 3 >nul

echo Starting Frontend Server (React)...
start "MedSecure Frontend" cmd /k "cd /d "o:\final bf\medsecure" && npm run dev"

echo.
echo ========================================
echo   Servers Starting...
echo ========================================
echo.
echo Backend:  http://127.0.0.1:8000/
echo Admin:    http://127.0.0.1:8000/admin/
echo Frontend: http://localhost:5174/
echo.
echo Admin Credentials:
echo   Username: admin
echo   Password: admin123
echo.
echo Press any key to exit this window...
pause >nul
