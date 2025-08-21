@echo off
REM Navigate to frontend folder (update path if needed)
cd /d "%~dp0"

REM Get the local IPv4 address (ignores 127.0.0.1)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
    set ip=%%a
    goto :done
)

:done
set ip=%ip:~1%

echo ====================================================
echo Checking and installing frontend dependencies...
echo ====================================================

REM Run npm install (safe to run every time, it skips if already installed)
call npm install

echo ====================================================
echo Starting frontend on host %ip% ...
echo ====================================================

call npm run dev -- --host %ip%

pause
