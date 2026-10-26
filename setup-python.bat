@echo off
cd /d D:\sc3\FindFace-AI\apps\dich-vu-khuon-mat
echo === Cai dat Python venv cho dich vu khuon mat ===
echo Co the mat 5-10 phut, vui long doi...
python -m venv .venv
if errorlevel 1 (
  echo THAT BAI: python -m venv .venv
  echo Hay kiem tra Python 3.8+ co trong PATH
  pause
  exit /b 1
)
echo [OK] Da tao venv
.venv\Scripts\pip install -r requirements.txt
if errorlevel 1 (
  echo THAT BAI: pip install
  pause
  exit /b 1
)
echo.
echo [OK] Cai dat xong! Bay gio khoi dong lai start-all.bat
pause
