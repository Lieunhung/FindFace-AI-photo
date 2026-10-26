@echo off
echo === Kiem tra .venv ===
if not exist "D:\sc3\FindFace-AI\apps\dich-vu-khuon-mat\.venv\Scripts\uvicorn.exe" (
  echo THAT BAI: Khong tim thay uvicorn tai .venv\Scripts\uvicorn.exe
  pause
  exit /b 1
)
echo [OK] .venv ton tai
echo.
echo === Khoi dong Face Service tai port 8100 ===
cd /d D:\sc3\FindFace-AI\apps\dich-vu-khuon-mat
.venv\Scripts\uvicorn.exe main:app --host 127.0.0.1 --port 8100 --reload
pause
