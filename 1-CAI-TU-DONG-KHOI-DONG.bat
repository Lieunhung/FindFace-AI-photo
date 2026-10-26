@echo off
chcp 65001 >nul
echo === Cai dat shortcut khoi dong FindFace-AI ===
echo.

REM Tao shortcut tren Desktop
set "BAT=D:\sc3\FindFace-AI\start-all.bat"
set "DESK=%USERPROFILE%\Desktop"
set "LNK=%DESK%\FindFace-AI.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws=New-Object -ComObject WScript.Shell;" ^
  "$s=$ws.CreateShortcut('%LNK%');" ^
  "$s.TargetPath='%BAT%';" ^
  "$s.WorkingDirectory='D:\sc3\FindFace-AI';" ^
  "$s.WindowStyle=1;" ^
  "$s.Description='Khoi dong FindFace-AI - Rowena Global';" ^
  "$s.Save();" ^
  "Write-Host 'OK'"

if exist "%LNK%" (
    echo.
    echo [OK] Da tao shortcut tren Desktop!
    echo.
    echo Ten file: FindFace-AI.lnk
    echo Vi tri: %DESK%
    echo.
    echo =================================================
    echo Moi khi can dung app: BAM DOI vao icon tren Desktop
    echo App se tu khoi dong trong 25 giay
    echo =================================================
) else (
    echo [LOI] Khong tao duoc shortcut.
    echo.
    echo Lam thu cong: Copy file start-all.bat ra Desktop la xong.
)
echo.
pause
