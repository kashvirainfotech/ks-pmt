# Walkthrough - Batch Scripts for Starting and Stopping Services

## Overview
Created two automated Windows Batch (`.bat`) scripts in the root project directory to easily launch and cleanly terminate both the Backend API (`server/`) and Frontend Web application (`web/`).

---

## Files

1. [`start.bat`](file:///c:/Projects/KashviraInfotech/ks-pmt/start.bat)
   - Checks if `server/.env` exists and automatically provisions one from `server/.env.example` if absent.
   - Spawns the NestJS backend API in a dedicated command window titled `"KS-PMT Backend Server"` running `npm run start:dev`.
   - Spawns the React/Vite web application in a dedicated command window titled `"KS-PMT Frontend Web"` running `npm run dev`.
   - Displays URLs for the Web application (`http://localhost:3000`), Backend REST API (`http://localhost:5000/api/v1`), and Swagger Documentation (`http://localhost:5000/api/docs`).

2. [`stop.bat`](file:///c:/Projects/KashviraInfotech/ks-pmt/stop.bat)
   - Uses PowerShell with WMI process inspection (`Get-CimInstance Win32_Process`) to locate all parent console windows and child processes running in `ks-pmt\server` and `ks-pmt\web`.
   - Identifies any processes actively listening on application ports `3000`, `4000`, `5000`, `5173`.
   - Invokes `taskkill /F /T /PID` against each process tree. Because the tree kill is executed on the parent console windows (`cmd.exe`) and watcher processes (`nest start --watch`, `vite`), child workers are not restarted and all terminal windows close automatically.
   - Provides clean terminal output and auto-closes after 3 seconds.

---

## Usage Instructions

### Starting Services
Double-click [`start.bat`](file:///c:/Projects/KashviraInfotech/ks-pmt/start.bat) or run from PowerShell / Command Prompt:
```cmd
start.bat
```

### Stopping Services
Double-click [`stop.bat`](file:///c:/Projects/KashviraInfotech/ks-pmt/stop.bat) or run from PowerShell / Command Prompt:
```cmd
stop.bat
```
