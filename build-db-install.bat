@echo off
setlocal

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js was not found. Install Node.js 20+ and reopen this file.
    set "BUILD_EXIT_CODE=1"
    goto finish
)

echo Generating the pgAdmin SQL bundle...
node "%~dp0dbscripts\build-install.mjs"
set "BUILD_EXIT_CODE=%ERRORLEVEL%"
if not "%BUILD_EXIT_CODE%"=="0" (
    echo [ERROR] Generation failed. Review the error above.
    goto finish
)

echo [SUCCESS] Open "%~dp0dbscripts\install.sql" in pgAdmin Query Tool.
echo No SQL was executed against a database.

:finish
if /I not "%~1"=="--no-pause" pause
exit /b %BUILD_EXIT_CODE%
