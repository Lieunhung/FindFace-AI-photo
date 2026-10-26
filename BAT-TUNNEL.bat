@echo off
chcp 65001 >nul
title Cloudflare Tunnel - Rowena Global
echo ==========================================
echo   Dang ket noi Cloudflare Tunnel...
echo   Giu cua so nay MO de hoc vien vao duoc
echo ==========================================
echo.
taskkill /F /IM cloudflared.exe >nul 2>&1
timeout /t 2 >nul
D:\sc3\FindFace-AI\cloudflared.exe tunnel --config D:\sc3\FindFace-AI\tunnel-config.yml run
pause
