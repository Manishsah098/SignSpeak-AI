@echo off
title SignSpeak AI Launcher
echo ============================================================
echo                  SignSpeak AI Suite
echo          Neural Sign-to-Speech Translation System
echo ============================================================
echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "SignSpeak AI - Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Vite Frontend on http://localhost:5173 ...
start "SignSpeak AI - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================================
echo All services launched!
echo Web App:    http://localhost:5173
echo API Docs:   http://localhost:8000/docs
echo ============================================================
echo Keep this window open or press any key to close launcher.
pause >nul

