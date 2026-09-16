@echo off
setlocal
cd /d "%~dp0"

echo === PersonaAI — starting API + Web ===
echo API:  http://127.0.0.1:8000
echo Web:  http://localhost:3000
echo.

start "PersonaAI API" cmd /k "%~dp0run-api.bat"
timeout /t 2 /nobreak >nul
start "PersonaAI Web" cmd /k "%~dp0run-web.bat"

echo Opened two windows. Close them to stop the servers.
pause
