@echo off
echo ===================================================
echo             STARTING ARTISAN AI PORTAL             
echo ===================================================

echo [1/3] Launching FastAPI Backend on port 8000...
start "Artisan AI Backend Server" cmd /k "cd backend && .\.venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000"

echo [2/3] Launching Web Frontend Server on port 5500...
start "Artisan AI Frontend Server" cmd /k "cd frontend && ..\backend\.venv\Scripts\python -m http.server 5500"

echo Waiting for services to initialize...
timeout /t 3 /nobreak > nul

echo [3/3] Opening portal in your web browser...
start http://localhost:5500

echo ===================================================
echo Artisan AI is running!
echo - Frontend Portal: http://localhost:5500
echo - Backend API Docs: http://localhost:8000/docs
echo ===================================================
pause
