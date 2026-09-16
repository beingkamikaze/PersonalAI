@echo off
setlocal
cd /d "%~dp0"

echo === PersonaAI Web (Next.js) ===

if not exist "apps\web\package.json" (
  echo ERROR: apps\web\ folder not found.
  pause
  exit /b 1
)

if not exist "apps\web\.env.local" (
  if exist "apps\web\.env.local.example" (
    echo WARNING: apps\web\.env.local missing.
    echo Copy apps\web\.env.local.example to apps\web\.env.local and fill Supabase values.
    echo.
  )
)

if not exist "node_modules" (
  echo Installing npm dependencies...
  call npm install
)

echo Starting web on http://localhost:3000
call npm run dev:web
