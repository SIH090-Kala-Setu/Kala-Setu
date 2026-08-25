@echo off
echo ===================================================
echo             STARTING KALASETU (ARTISAN AI)          
echo ===================================================

echo [1/3] Launching FastAPI Backend on port 8000...
start "KalaSetu Backend Server" cmd /k "cd backend && .\venv\Scripts\python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Launching React Vite Frontend Server on port 5173...
start "KalaSetu React Frontend" cmd /k "cd frontend && npm run dev"

echo Waiting for services to initialize...
timeout /t 4 /nobreak > nul

echo [3/3] Opening portal in your web browser...
start http://localhost:5173

echo ===================================================
echo KalaSetu Platform is running!
echo - React Frontend:  http://localhost:5173
echo - Backend API Docs: http://localhost:8000/docs
echo ===================================================
pause
