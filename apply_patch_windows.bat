@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0apply_patch.ps1" -Path "%~dp0app.js"
if errorlevel 1 (
  echo.
  echo Patch failed. Make sure this folder contains app.js
  echo.
  pause
  exit /b 1
)
echo.
echo Patch complete. app.js.bak created.
echo.
pause