@echo off
setlocal

set "ROOT_DIR=%~dp0"

echo ======================================================================
echo           Kashvira Infotech - KS-PMT Service Launcher
echo ======================================================================
echo.

:: Check for server .env configuration
if not exist "%ROOT_DIR%server\.env" (
    if exist "%ROOT_DIR%server\.env.example" (
        echo [INFO] server\.env not found. Creating default from .env.example...
        copy "%ROOT_DIR%server\.env.example" "%ROOT_DIR%server\.env" >nul
        echo [INFO] server\.env created successfully.
    )
)

:: 1. Launch Backend (NestJS Server) in a separate window
echo [1/2] Starting KS-PMT Backend API (NestJS)...
start "KS-PMT Backend Server" cmd /k "cd /d "%ROOT_DIR%server" && echo Starting Backend Server... && npm run start:dev"

:: Brief delay to allow backend initialization
ping 127.0.0.1 -n 3 >nul

:: 2. Launch Frontend (Vite React Web) in a separate window
echo [2/2] Starting KS-PMT Frontend (Vite Web App)...
start "KS-PMT Frontend Web" cmd /k "cd /d "%ROOT_DIR%web" && echo Starting Frontend Web App... && npm run dev"

echo.
echo ======================================================================
echo  Both services have been launched in separate console windows!
echo.
echo  - Backend API:       http://localhost:5000/api/v1
echo  - Swagger API Docs:  http://localhost:5000/api/docs
echo  - Web Application:   http://localhost:3000
echo.
echo  To stop all running services cleanly, run stop.bat
echo ======================================================================
echo.
ping 127.0.0.1 -n 4 >nul
