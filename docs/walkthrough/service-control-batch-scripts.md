# Walkthrough - Batch Scripts for Starting and Stopping Services

## Overview
Created two automated Windows Batch (`.bat`) scripts in the root project directory to easily launch and cleanly terminate both the Backend API (`server/`) and Frontend Web application (`web/`).

---

## Files Created

1. [`start.bat`](file:///c:/Projects/KashviraInfotech/ks-pmt/start.bat)
   - Checks if `server/.env` exists and automatically provisions one from `server/.env.example` if absent.
   - Spawns the NestJS backend API in a dedicated command window titled `"KS-PMT Backend Server"` running `npm run start:dev`.
   - Spawns the React/Vite web application in a dedicated command window titled `"KS-PMT Frontend Web"` running `npm run dev`.
   - Displays URLs for the Web application (`http://localhost:3000`), Backend REST API (`http://localhost:5000/api/v1`), and Swagger Documentation (`http://localhost:5000/api/docs`).

2. [`stop.bat`](file:///c:/Projects/KashviraInfotech/ks-pmt/stop.bat)
   - Targets and terminates the dedicated console windows and their child process trees using `taskkill /F /FI "WINDOWTITLE eq KS-PMT Backend Server*" /T` and `taskkill /F /FI "WINDOWTITLE eq KS-PMT Frontend Web*" /T`.
   - Performs a secondary port scan (`netstat -aon`) on application ports (`3000`, `4000`, `5000`, `5173`) and forcefully terminates any orphaned Node.js or Vite processes still holding those ports.
   - Provides clean status feedback upon completion.

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
