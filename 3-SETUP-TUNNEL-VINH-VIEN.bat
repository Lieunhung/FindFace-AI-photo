@echo off
chcp 65001 >nul
setlocal ENABLEDELAYEDEXPANSION
echo =================================================================
echo   SETUP URL CONG KHAI VINH VIEN - Cloudflare Tunnel
echo =================================================================
echo.

set "CF=%~dp0cloudflared.exe"
set "CONFIG=%~dp0tunnel-config.yml"

REM === BUOC 1: Dang nhap Cloudflare (khong can Admin) ===
echo [1/3] Dang nhap tai khoan Cloudflare...
echo   Trinh duyet se tu mo - click ALLOW tren trang web roi quay lai day.
echo.
"%CF%" tunnel login
if %errorLevel% neq 0 (
  echo [LOI] Dang nhap that bai! Thu lai.
  pause & exit /b 1
)
echo [OK] Da dang nhap!
echo.

REM === BUOC 2: Tao tunnel ===
echo [2/3] Tao Cloudflare Tunnel...
"%CF%" tunnel delete rowena-anh 2>nul
"%CF%" tunnel delete rowena-findface 2>nul
timeout /t 2 /nobreak >nul

"%CF%" tunnel create rowena-anh > "%TEMP%\cf_out.txt" 2>&1
type "%TEMP%\cf_out.txt"
echo.

for /f "delims=" %%I in ('powershell -NoProfile -Command "$t=Get-Content '%TEMP%\cf_out.txt' -Raw;$m=[regex]::Match($t,'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}');if($m.Success){$m.Value}else{'ERROR'}"') do set "TID=%%I"

if "!TID!"=="ERROR" ( echo [LOI] Khong lay duoc Tunnel ID! & pause & exit /b 1 )
echo [OK] Tunnel ID: !TID!
echo.

REM === Tao config.yml ===
set "CRED=%USERPROFILE%\.cloudflared\!TID!.json"
(
  echo tunnel: !TID!
  echo credentials-file: !CRED!
  echo ingress:
  echo   - service: http://localhost:3002
) > "!CONFIG!"

echo https://!TID!.cfargotunnel.com> "%~dp0URL-PUBLIC.txt"

REM === BUOC 3: Thu cai Service (can Admin) hoac them vao start-all ===
echo [3/3] Cai Cloudflare tu dong chay...
net session >nul 2>&1
if %errorLevel% equ 0 (
  sc stop cloudflared >nul 2>&1
  "%CF%" --config "!CONFIG!" service uninstall >nul 2>&1
  "%CF%" --config "!CONFIG!" service install
  if !errorLevel! equ 0 (
    sc start cloudflared >nul 2>&1
    echo [OK] Da cai Windows Service - tunnel tu chay khi bat may!
    goto :done
  )
)

REM Fallback: them cloudflared vao start-all.bat
echo [Info] Khong cai duoc service, them vao start-all.bat...
findstr /c:"tunnel run" "%~dp0start-all.bat" >nul 2>&1
if %errorLevel% neq 0 (
  echo. >> "%~dp0start-all.bat"
  echo REM Cloudflare Tunnel >> "%~dp0start-all.bat"
  echo start "Cloudflare" /min "%CF%" --config "!CONFIG!" tunnel run rowena-anh >> "%~dp0start-all.bat"
  echo [OK] Da them vao start-all.bat - tunnel chay khi bam icon Desktop!
)

:done
echo.
echo =================================================================
echo   URL VINH VIEN CUA BAN:
set /p URL=<"%~dp0URL-PUBLIC.txt"
echo   !URL!
echo.
echo   Luu URL nay gui cho hoc vien - khong bao gio thay doi!
echo =================================================================
echo.
pause
