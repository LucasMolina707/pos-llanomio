@echo off
TITLE LLANOMIO POS - Iniciar Tunel Seguro de Cloudflare (Acceso Remoto)
COLOR 0B

cd /d "%~dp0..\.."

echo ===============================================================================
echo                SISTEMA POS LOCAL LLANOMIO - TUNEL CLOUDFLARE
echo                   ACCESO REMOTO DESDE CUALQUIER LUGAR DEL MUNDO
echo ===============================================================================
echo.

:: 1. Detectar ejecutable cloudflared
set CLOUDFLARED_EXE=cloudflared
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
        set "CLOUDFLARED_EXE=C:\Program Files (x86)\cloudflared\cloudflared.exe"
    ) else if exist "C:\Program Files\cloudflared\cloudflared.exe" (
        set "CLOUDFLARED_EXE=C:\Program Files\cloudflared\cloudflared.exe"
    ) else if exist "%~dp0..\..\cloudflared.exe" (
        set "CLOUDFLARED_EXE=%~dp0..\..\cloudflared.exe"
    ) else (
        echo [ERROR] No se encontro cloudflared.exe instalado en el sistema.
        echo Por favor instale Cloudflared o descarguelo en esta carpeta.
        pause
        exit /b 1
    )
)

echo [OK] Cloudflared detectado en: "%CLOUDFLARED_EXE%"
echo.

:: 2. Token predeterminado o parametrizable
set "TUNNEL_TOKEN=eyJhIjoiYjViODUyODI1ZWYzNWNhYWJhODEyZTE3MTNmN2I0MzciLCJ0IjoiMWVhMmE5M2MtMGY1Mi00MzU3LTk3MDAtOWQ5NDgxMDZhN2U2IiwicyI6Ik0ySTNOemt3WmpFdFlUTmhZaTAwWkRJMExXSTVNREl0TURGak9HRmlPV1l3TkdFeE1EWTFObUV4TlRJdFlUUm1NeTAwWVRFNExUbGpPR0V0TTJGaE5URmhORGRpWTJKbCJ9"

echo [INFO] Iniciando conexion con la red perimetral de Cloudflare...
echo [INFO] Su sistema POS local sera accesible remotamente a traves del dominio configurado.
echo Presione Ctrl + C si desea detener el tunel manual.
echo.

"%CLOUDFLARED_EXE%" tunnel run --token %TUNNEL_TOKEN%
pause
