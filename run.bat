@echo off
setlocal

cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto :error
)

if not exist dist\server.js (
  echo Building...
  call npm run build
  if errorlevel 1 goto :error
)

echo Starting server on http://localhost:3000
start "" http://localhost:3000
node dist/server.js
goto :eof

:error
echo.
echo Failed. Press any key to exit.
pause >nul
exit /b 1
