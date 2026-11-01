# SignSpeak AI - Automated Development Launcher
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "                  SignSpeak AI Suite" -ForegroundColor White
Write-Host "          Neural Sign-to-Speech Translation System" -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[1/2] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root\backend'; python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting Vite Frontend on http://localhost:5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$Root\frontend'; npm run dev"

Write-Host "`nAll services successfully initiated!" -ForegroundColor Cyan
Write-Host "Web Application: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Backend API:     http://localhost:8000/docs" -ForegroundColor Yellow

