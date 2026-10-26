@echo off
chcp 65001 >nul
setlocal ENABLEDELAYEDEXPANSION
title FindFace-AI - Copy cert va tao tunnel

echo ============================================
echo   THIET LAP TUNNEL CLOUDFLARE VINH VIEN
echo ============================================
echo.

set "CF_DIR=%USERPROFILE%\.cloudflared"
set "CERT_DST=%CF_DIR%\cert.pem"
set "CF=%~dp0cloudflared.exe"
set "CONFIG=%~dp0tunnel-config.yml"

REM === Tao thu muc .cloudflared ===
if not exist "%CF_DIR%" mkdir "%CF_DIR%" 2>nul

REM === Tim cert.pem ===
echo Tim kiem cert.pem...
set "CERT_FOUND="
for %%P in (
    "%USERPROFILE%\Downloads\cert.pem"
    "%USERPROFILE%\Desktop\cert.pem"
    "%USERPROFILE%\Documents\cert.pem"
    "%USERPROFILE%\cert.pem"
) do (
    if exist %%P if not defined CERT_FOUND (
        set "CERT_FOUND=%%~P"
    )
)

if defined CERT_FOUND (
    echo [TIM THAY] !CERT_FOUND!
    copy /y "!CERT_FOUND!" "%CERT_DST%" >nul 2>&1
    if exist "%CERT_DST%" (
        echo [OK] Da copy cert.pem thanh cong!
    ) else (
        powershell -NoProfile -ExecutionPolicy Bypass -Command "Copy-Item '!CERT_FOUND!' '%CERT_DST%' -Force" >nul 2>&1
        if exist "%CERT_DST%" (echo [OK] Copy OK!) else (goto :no_cert)
    )
) else (
    goto :no_cert
)
goto :create_tunnel

:no_cert
echo.
echo [!] Khong tim thay cert.pem tu dong.
echo.
echo === BAN CAN LAM 1 BUOC NHO ===
echo 1. Mo trinh duyet >> tai xuong >> tim file cert.pem
echo 2. Copy file cert.pem vao: %CF_DIR%\
echo 3. Chay lai file bat nay
echo.
echo Hoac: Copy-paste duong dan file cert.pem vao day:
set /p "MANUAL_CERT=Duong dan cert.pem (bo qua neu khong co): "
if exist "!MANUAL_CERT!" (
    copy /y "!MANUAL_CERT!" "%CERT_DST%" >nul 2>&1
    echo [OK] Da copy!
    goto :create_tunnel
)
echo Khong co cert.pem - khong the tiep tuc.
pause & exit /b 1

:create_tunnel
echo.
echo === TAO TUNNEL ROWENA-GLOBAL ===
echo.

REM Xoa tunnel cu
"%CF%" tunnel delete rowena-global >nul 2>&1
"%CF%" tunnel delete rowena-anh >nul 2>&1

REM Tao tunnel moi
"%CF%" tunnel create rowena-global > "%TEMP%\cf_out.txt" 2>&1
type "%TEMP%\cf_out.txt"
echo.

REM Lay Tunnel ID
for /f "delims=" %%I in ('powershell -NoProfile -Command "$t=Get-Content '%TEMP%\cf_out.txt' -Raw;$m=[regex]::Match($t,'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}');if($m.Success){$m.Value}else{'ERROR'}"') do set "TID=%%I"

if "!TID!"=="ERROR" (
    echo [LOI] Khong lay duoc Tunnel ID - xem output o tren
    pause & exit /b 1
)

echo [OK] Tunnel ID: !TID!

REM Tao config.yml
(
echo tunnel: !TID!
echo credentials-file: %USERPROFILE%\.cloudflared\!TID!.json
echo ingress:
echo   - service: http://localhost:3002
) > "!CONFIG!"

REM Luu URL
echo https://!TID!.cfargotunnel.com> "%~dp0URL-PUBLIC.txt"

echo.
echo ============================================
echo   URL CONG KHAI VINH VIEN:
echo   https://!TID!.cfargotunnel.com
echo ============================================
echo.

REM Thu cai Windows Service (can admin)
"%CF%" --config "!CONFIG!" service install >nul 2>&1
if !errorlevel! equ 0 (
    echo [OK] Tunnel service da cai - tu dong chay khi bat may!
) else (
    echo [OK] Tunnel se chay khi ban mo start-all.bat
    start "CF-Tunnel" /min cmd /c ""%CF%" --config "!CONFIG!" tunnel run rowena-global"
    echo [OK] Tunnel dang chay ngay bay gio!
)

echo.
echo Chia se URL nay voi hoc vien:
echo https://!TID!.cfargotunnel.com
echo.
pause
