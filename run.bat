@echo off
set ROOT=%~dp0

echo ===================================================
echo             STARTING KALASETU (ARTISAN AI)          
echo ===================================================

echo [1/3] Launching FastAPI Backend on port 8000...
start "KalaSetu Backend" cmd /k "cd /d "%ROOT%backend" && "%ROOT%backend\venv\Scripts\python.exe" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/3] Launching ML Pricing Engine V2 (Hybrid) on port 8002...
start "KalaSetu ML Pricing V2" cmd /k "cd /d "%ROOT%MLV2" && "%ROOT%MLV2\venv\Scripts\python.exe" -m uvicorn pricing_service_v2:app --host 0.0.0.0 --port 8002 --reload"

@REM echo [3/3] Launching React Vite Frontend on port 5173...
@REM start "KalaSetu Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo Waiting for services to initialize...
timeout /t 5 /nobreak > nul

@REM echo Opening portal in your web browser...
@REM start http://localhost:5173

echo ===================================================
echo KalaSetu Platform is running!
echo   React Frontend:      http://localhost:5173
echo   Backend API Docs:    http://localhost:8000/docs
echo   ML Pricing V2 Docs:  http://localhost:8002/docs
echo   V2 Health Check:     http://localhost:8002/api/v2/pricing/health
echo ===================================================
pause
