@echo off
chcp 65001 >nul
setlocal ENABLEDELAYEDEXPANSION
title FindFace-AI - Rowena Global

echo ============================================
echo   FindFace-AI - Rowena Global
echo ============================================
echo.

cd /d D:\sc3\FindFace-AI

echo [1/4] Khoi dong Face Service (port 8100)...
start "Face-Service-8100" /min cmd /c "cd /d D:\sc3\FindFace-AI\apps\dich-vu-khuon-mat && .venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8100 2>&1"

timeout /t 6 /nobreak >nul

echo [2/4] Khoi dong Web App (port 3002)...
start "WebApp-3002" /min cmd /c "cd /d D:\sc3\FindFace-AI && pnpm dev 2>&1"

timeout /t 10 /nobreak >nul

echo [3/4] Khoi dong Worker (chi muc anh moi phut, don sinh trac, gom cum)...
start "Worker" /min cmd /c "cd /d D:\sc3\FindFace-AI && pnpm dev:worker 2>&1"

echo [4/4] Khoi dong Cloudflare Tunnel (URL co dinh)...
start "CF-Tunnel" /min cmd /c "D:\sc3\FindFace-AI\cloudflared.exe tunnel --config D:\sc3\FindFace-AI\tunnel-config.yml run 2>&1"

timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo  App da khoi dong thanh cong!
echo.
echo  URL CONG KHAI VINH VIEN (chia se voi hoc vien):
set /p PUBLIC_URL=<"D:\sc3\FindFace-AI\URL-PUBLIC.txt"
echo  !PUBLIC_URL!
echo.
echo  URL NOI BO:  http://localhost:3002
echo ============================================
echo.
echo  Giu cua so nay de app tiep tuc chay.
echo  Nhan phim bat ky de dong (app van chay nen).
pause >nul
