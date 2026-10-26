@echo off
chcp 65001 >nul
setlocal ENABLEDELAYEDEXPANSION
title Link Cong Khai - Rowena Global

echo =================================================================
echo   LINK CONG KHAI CHO HOC VIEN - Rowena Global
echo =================================================================
echo.

if exist "D:\sc3\FindFace-AI\URL-PUBLIC.txt" (
  set /p PURL=<"D:\sc3\FindFace-AI\URL-PUBLIC.txt"
  echo   URL CO DINH ^(vinh vien, khong thay doi^):
  echo.
  echo   !PURL!
  echo.
  echo   May dang chay + online = sinh vien vao duoc!
) else (
  echo   Chua co URL co dinh.
  echo.
  echo   Dang tao URL tam thoi ^(thay doi moi lan mo^)...
  echo   Xem dong "https://..." trong output duoi day:
  echo.
  D:\sc3\FindFace-AI\cloudflared.exe tunnel --url http://localhost:3002
)
echo.
pause
