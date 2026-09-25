@echo off
setlocal

echo ======================================================================
echo           Kashvira Infotech - KS-PMT Service Stopper
echo ======================================================================
echo.
echo Stopping all KS-PMT Backend and Frontend services...

:: 1. Forcefully kill all processes rooted in ks-pmt\server or ks-pmt\web or listening on app ports
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$pids = [System.Collections.Generic.HashSet[int]]::new();" ^
    "Get-CimInstance Win32_Process | Where-Object { $cmd = $_.CommandLine; $cmd -and ($cmd -like '*ks-pmt\server*' -or $cmd -like '*ks-pmt\web*') -and $_.ProcessId -ne $PID } | ForEach-Object { [void]$pids.Add($_.ProcessId) };" ^
    "3000, 4000, 5000, 5173 | ForEach-Object { Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue | ForEach-Object { if ($_.OwningProcess -gt 4) { [void]$pids.Add($_.OwningProcess) } } };" ^
    "foreach ($id in $pids) { & taskkill.exe /F /T /PID $id 2>&1 | Out-Null };"

:: 2. Also terminate any console windows by title if they still exist
taskkill /F /FI "WINDOWTITLE eq KS-PMT Backend Server*" /T >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq KS-PMT Frontend Web*" /T >nul 2>&1

echo.
echo ======================================================================
echo  All KS-PMT Backend and Frontend services have been stopped.
echo ======================================================================
echo.
ping 127.0.0.1 -n 3 >nul
