@echo off
TITLE LLANOMIO POS - Instalar Cloudflare Tunnel como Servicio de Windows (Admin)
COLOR 0E

:: Verificar privilegios de Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Solicitando permisos de Administrador de Windows...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

cd /d "%~dp0..\.."

echo ===============================================================================
echo        SISTEMA POS LOCAL LLANOMIO - INSTALADOR DE SERVICIO CLOUDFLARE
echo                   (REQUIERE PERMISOS DE ADMINISTRADOR)
echo ===============================================================================
echo.

:: 1. Detectar ejecutable cloudflared
set "CLOUDFLARED_EXE=cloudflared"
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    if exist "C:\Program Files (x86)\cloudflared\cloudflared.exe" (
        set "CLOUDFLARED_EXE=C:\Program Files (x86)\cloudflared\cloudflared.exe"
    ) else if exist "C:\Program Files\cloudflared\cloudflared.exe" (
        set "CLOUDFLARED_EXE=C:\Program Files\cloudflared\cloudflared.exe"
    ) else (
        echo [ERROR] No se encontro cloudflared.exe en las rutas estandar.
        pause
        exit /b 1
    )
)

set "TUNNEL_TOKEN=eyJhIjoiYjViODUyODI1ZWYzNWNhYWJhODEyZTE3MTNmN2I0MzciLCJ0IjoiMWVhMmE5M2MtMGY1Mi00MzU3LTk3MDAtOWQ5NDgxMDZhN2U2IiwicyI6Ik0ySTNOemt3WmpFdFlUTmhZaTAwWkRJMExXSTVNREl0TURGak9HRmlPV1l3TkdFeE1EWTFObUV4TlRJdFlUUm1NeTAwWVRFNExUbGpPR0V0TTJGaE5URmhORGRpWTJKbCJ9"

echo [1/2] Instalando Cloudflare Tunnel en el Service Control Manager de Windows...
"%CLOUDFLARED_EXE%" service install %TUNNEL_TOKEN%

if %errorlevel% neq 0 (
    echo [AVISO] Si el servicio ya estaba registrado, procediendo a iniciarlo...
)

echo [2/2] Iniciando el servicio de Windows...
net start cloudflared >nul 2>nul
sc start cloudflared >nul 2>nul

echo.
echo ===============================================================================
echo   SERVICIO INSTALADO Y ACTIVADO CON EXITO
echo ===============================================================================
echo Cloudflare Tunnel ahora se ejecuta de forma nativa e invisible con Windows.
echo.
pause
