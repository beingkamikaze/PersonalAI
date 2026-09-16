@echo off
setlocal
cd /d "%~dp0"

echo === PersonaAI API (FastAPI) ===
cd apps\api

REM Prefer apps\api\.env; fall back to copying root env once
if not exist ".env" (
  if exist "%~dp0env" (
    echo Creating apps\api\.env from root env file...
    copy /Y "%~dp0env" ".env" >nul
  ) else if exist ".env.example" (
    echo ERROR: Missing apps\api\.env
    echo Copy .env.example to .env and fill Supabase + LLM values.
    pause
    exit /b 1
  )
)

if not exist ".venv\Scripts\activate.bat" (
  echo Creating venv...
  python -m venv .venv
  if errorlevel 1 (
    echo ERROR: python not found. Use py -m venv .venv or add Python to PATH.
    pause
    exit /b 1
  )
)

call ".venv\Scripts\activate.bat"
python -m pip install --upgrade pip >nul
pip install -r requirements.txt
if errorlevel 1 (
  echo ERROR: pip install failed.
  pause
  exit /b 1
)

echo Starting API on http://127.0.0.1:8000
uvicorn app.main:app --reload --port 8000
