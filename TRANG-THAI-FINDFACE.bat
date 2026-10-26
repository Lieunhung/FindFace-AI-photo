@echo off
chcp 65001 >nul
echo === Trang thai FindFace-AI ===
curl -s -m 8 http://127.0.0.1:3002/api/suc-khoe
echo.
curl -s -m 5 http://127.0.0.1:8100/suc-khoe
echo.
echo --- Nhat ky giam sat (20 dong cuoi) ---
powershell -NoProfile -Command "Get-Content 'D:\sc3\FindFace-AI\logs\giam-sat.log' -Tail 20"
pause
