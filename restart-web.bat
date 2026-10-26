@echo off
echo === KHỞI ĐỘNG LẠI WEB APP FindFace-AI ===
taskkill /F /IM node.exe /T >nul 2>&1
echo Đã dừng Node.js...
timeout /t 2 /nobreak >nul
cd /d D:\sc3\FindFace-AI
start "FindFace Web App" cmd /k "pnpm --filter tim-anh dev"
echo Web app đang khởi động lại trên cổng 3002...
timeout /t 3 /nobreak >nul
echo Xong! Đợi 10-15 giây rồi vào lại trang web.
pause
