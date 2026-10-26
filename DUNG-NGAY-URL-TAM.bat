@echo off
chcp 65001 >nul
setlocal ENABLEDELAYEDEXPANSION
title FindFace-AI - URL TAM THOI

echo Dang khoi dong app...

cd /d D:\sc3\FindFace-AI

REM Khoi dong services neu chua chay
tasklist /fi "windowtitle eq Face-Service-8100" 2>nul | find "cmd" >nul 2>&1
if errorlevel 1 (
    start "Face-Service-8100" /min cmd /c "cd /d D:\sc3\FindFace-AI\apps\dich-vu-khuon-mat && .venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8100"
    start "WebApp-3002" /min cmd /c "cd /d D:\sc3\FindFace-AI && pnpm dev"
    echo Dang cho app khoi dong...
    timeout /t 15 /nobreak >nul
)

REM Chay quick tunnel - tu dong tao URL ngau nhien
echo.
echo === KHOI DONG TUNNEL - CHO 10 GIAY ===
echo.
start "CF-Quick" /min cmd /c "D:\sc3\FindFace-AI\cloudflared.exe tunnel --url http://localhost:3002 > D:\sc3\FindFace-AI\quick-tunnel-log.txt 2>&1"

timeout /t 10 /nobreak >nul

REM Doc URL tu log
for /f "delims=" %%L in ('powershell -NoProfile -Command "Get-Content D:\sc3\FindFace-AI\quick-tunnel-log.txt -Raw | Select-String -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' | ForEach-Object {$_.Matches[0].Value}"') do set "QURL=%%L"

if defined QURL (
    echo.
    echo ============================================
    echo  URL HOC VIEN TRUY CAP NGAY BAY GIO:
    echo.
    echo   !QURL!
    echo.
    echo  [LUU Y] URL nay thay doi moi lan bat lai
    echo  Chay 4-COPY-CERT-VA-TAO-TUNNEL.bat de co URL co dinh
    echo ============================================
    echo !QURL!> D:\sc3\FindFace-AI\QUICK-URL.txt
    powershell -NoProfile -Command "Set-Clipboard '!QURL!'"
    echo [Da copy vao clipboard!]
) else (
    echo [Chua doc duoc URL - mo file quick-tunnel-log.txt de xem]
    type D:\sc3\FindFace-AI\quick-tunnel-log.txt 2>nul | head -20
)

echo.
pause
