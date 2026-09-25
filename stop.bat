@echo off
setlocal

echo ======================================================================
echo           Kashvira Infotech - KS-PMT Service Stopper
echo ======================================================================
echo.

:: 1. Terminate windows by Window Title
echo [1/2] Terminating service console windows...
taskkill /F /FI "WINDOWTITLE eq KS-PMT Backend Server*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq KS-PMT Frontend Web*" /T >nul 2>&1

:: 2. Terminate any lingering processes listening on application ports
echo [2/2] Scanning and freeing ports (3000, 4000, 5000, 5173)...
for %%p in (3000 4000 5000 5173) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%%p " ^| findstr "LISTENING"') do (
        if not "%%a"=="" (
            if not "%%a"=="0" (
                echo       - Stopping lingering process on port %%p (PID: %%a)...
                taskkill /F /PID %%a >nul 2>&1
            )
        )
    )
)

echo.
echo ======================================================================
echo  All KS-PMT Backend and Frontend services have been stopped.
echo ======================================================================
echo.
ping 127.0.0.1 -n 3 >nul
