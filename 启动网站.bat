@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [Nyxie] Node.js was not found. Please install Node.js before starting the site.
  pause
  exit /b 1
)

if not defined PORT set "PORT=4173"

if not exist "node_modules\vite\bin\vite.js" (
  echo [Nyxie] Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo [Nyxie] Dependency installation failed.
    pause
    exit /b 1
  )
)

echo [Nyxie] Starting http://127.0.0.1:%PORT%
echo [Nyxie] Keep this window open. Close it to stop the site.
echo.

if not defined NYXIE_NO_BROWSER (
  start "" /min cmd /d /c "timeout /t 1 /nobreak ^>nul ^&^& start http://127.0.0.1:%PORT%"
)

call npm run dev -- --port %PORT%
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo [Nyxie] The site stopped with exit code %EXIT_CODE%.
  pause
)

endlocal & exit /b %EXIT_CODE%
