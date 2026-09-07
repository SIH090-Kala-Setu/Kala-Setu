@echo off
set ROOT=%~dp0

echo ===================================================
echo             STARTING KALASETU (ARTISAN AI)          
echo ===================================================

echo [1/4] Launching FastAPI Backend on port 8000...
start "KalaSetu Backend" cmd /k "cd /d "%ROOT%backend" && "%ROOT%backend\venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/4] Launching ML Pricing Engine on port 8001...
start "KalaSetu ML Pricing" cmd /k "cd /d "%ROOT%ML" && "%ROOT%ML\.venv\Scripts\python.exe" -m uvicorn pricing_service:app --host 0.0.0.0 --port 8001 --reload"

@REM echo [3/4] Launching React Vite Frontend on port 5173...
@REM start "KalaSetu Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo Waiting for services to initialize...
timeout /t 4 /nobreak > nul

@REM echo [4/4] Opening portal in your web browser...
@REM start http://localhost:5173

echo ===================================================
echo KalaSetu Platform is running!
echo   React Frontend:     http://localhost:5173
echo   Backend API Docs:   http://localhost:8000/docs
echo   ML Pricing Docs:    http://localhost:8001/docs
echo   ML Health Check:    http://localhost:8001/api/v1/pricing/health
echo ===================================================
pause
