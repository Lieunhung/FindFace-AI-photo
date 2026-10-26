@echo off
cd /d D:\sc3\FindFace-AI\apps\dich-vu-khuon-mat
echo === Starting Face Service :8100 ===
.venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8100
pause
