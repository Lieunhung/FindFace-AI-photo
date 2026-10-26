@echo off
echo ============================================================
echo   FindFace-AI - CAI DAT TU DONG KHOI DONG + CLOUDFLARE
echo ============================================================
echo.

REM === BUOC 1: Kiem tra quyen Admin ===
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [LOI] Can chay voi quyen Administrator!
    echo       Click phai vao file nay, chon "Run as administrator"
    pause
    exit /b 1
)
echo [OK] Dang chay voi quyen Administrator

REM === BUOC 2: Tao Task Scheduler - tu dong khoi dong khi dang nhap ===
echo.
echo === Cai dat tu dong khoi dong khi dang nhap Windows ===

schtasks /delete /tn "FindFace-AI" /f >nul 2>&1

schtasks /create ^
  /tn "FindFace-AI" ^
  /tr "D:\sc3\FindFace-AI\start-all.bat" ^
  /sc ONLOGON ^
  /rl HIGHEST ^
  /delay 0001:00 ^
  /f

if %errorLevel% equ 0 (
    echo [OK] Da cai dat: app se tu khoi dong 1 phut sau khi dang nhap
) else (
    echo [LOI] Khong tao duoc Task Scheduler - thu cach thu cong
)

REM === BUOC 3: Cai Cloudflare Tunnel ===
echo.
echo === Cai dat Cloudflare Tunnel ===
echo Buoc nay se mo trinh duyet de ban dang nhap Cloudflare.
echo Neu ban chua co tai khoan, dang ky mien phi tai cloudflare.com
echo.
pause

D:\sc3\FindFace-AI\cloudflared.exe tunnel login

if %errorLevel% neq 0 (
    echo [LOI] Dang nhap Cloudflare that bai - thu lai sau
    goto DONE
)

REM === Tao tunnel co ten co dinh ===
echo.
echo === Tao tunnel "rowena-findface" ===
D:\sc3\FindFace-AI\cloudflared.exe tunnel create rowena-findface

REM Lay tunnel ID
for /f "tokens=*" %%i in ('D:\sc3\FindFace-AI\cloudflared.exe tunnel list ^| findstr rowena-findface') do set TUNNEL_LINE=%%i

echo.
echo === Tao file cau hinh tunnel ===
mkdir "%USERPROFILE%\.cloudflared" 2>nul

REM Lay tunnel UUID tu output
for /f %%i in ('D:\sc3\FindFace-AI\cloudflared.exe tunnel list --output json ^| python -c "import sys,json;tunnels=json.load(sys.stdin);[print(t[\"id\"]) for t in tunnels if t[\"name\"]==\"rowena-findface\"]" 2^>nul') do set TUNNEL_UUID=%%i

echo ingress: > "%USERPROFILE%\.cloudflared\config.yml"
echo   - hostname: rowena-findface.local >> "%USERPROFILE%\.cloudflared\config.yml"  
echo     service: http://localhost:3002 >> "%USERPROFILE%\.cloudflared\config.yml"
echo   - service: http_status:404 >> "%USERPROFILE%\.cloudflared\config.yml"

REM === Cai Cloudflare Tunnel lam Windows Service ===
echo.
echo === Cai Cloudflare Service tu dong chay khi khoi dong may ===
D:\sc3\FindFace-AI\cloudflared.exe service install

if %errorLevel% equ 0 (
    echo [OK] Cloudflare Tunnel da duoc cai lam Windows Service
    echo      Se tu chay moi khi khoi dong may
) else (
    echo [CANH BAO] Khong cai duoc service - co the da cai roi
)

:DONE
echo.
echo ============================================================
echo   HOAN THANH! 
echo   - App tu khoi dong: 1 phut sau khi dang nhap Windows
echo   - Cloudflare Tunnel: tu chay khi khoi dong may
echo ============================================================
pause
