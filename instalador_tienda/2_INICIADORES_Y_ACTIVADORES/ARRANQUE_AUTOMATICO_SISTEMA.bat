@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Arranque Automatico de Servicios - POS Llanomio

:: ===============================================================================
:: GUARDIAN DE RUTA: Ubicar dinamicamente la raiz del proyecto
:: ===============================================================================
cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"

:: Asegurar Node.js y npm en el PATH del entorno actual
if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
) else (
    set "PATH=%PROJECT_ROOT%\node_modules\.bin;%PATH%;C:\Program Files\nodejs;%APPDATA%\npm;C:\Program Files (x86)\nodejs"
    set "NODE_EXE=node"
)

:: Cargar variables desde .env
set "PORT=3000"
set "HTTP_PORT=3000"
set "INSTANCE_ID=pos-llanomio"
set "LOCAL_DOMAIN=llanomio.local"

if exist "%PROJECT_ROOT%\.env" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%PROJECT_ROOT%\.env") do (
        if "%%A"=="PORT" set "PORT=%%B"
        if "%%A"=="HTTP_PORT" set "HTTP_PORT=%%B"
        if "%%A"=="INSTANCE_ID" set "INSTANCE_ID=%%B"
        if "%%A"=="LOCAL_DOMAIN" set "LOCAL_DOMAIN=%%B"
    )
)

:: Detectar PM2
set "USAR_PM2=0"
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    set "PM2_CMD=pm2"
    set "USAR_PM2=1"
) else (
    if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
        set "PM2_CMD=%PROJECT_ROOT%\node_modules\.bin\pm2.cmd"
        set "USAR_PM2=1"
    )
)

:: ===============================================================================
:: 1. VERIFICAR Y LEVANTAR SERVICIOS (PM2 O NATIVO)
:: ===============================================================================
if "%USAR_PM2%"=="1" (
    call !PM2_CMD! ping >nul 2>&1
    call !PM2_CMD! describe "!INSTANCE_ID!" >nul 2>&1
    if !errorlevel! equ 0 (
        call !PM2_CMD! restart "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
    ) else (
        call !PM2_CMD! start "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
    )
    call !PM2_CMD! save >nul 2>&1
) else (
    :: Si no hay PM2, comprobar si ya responde el puerto; si no, levantar start-pos.js
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "try { $r = Invoke-WebRequest -Uri 'http://localhost:!PORT!/login' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if !errorlevel! neq 0 (
        start "Servidor_POS_Llanomio" /min "%NODE_EXE%" "%PROJECT_ROOT%\start-pos.js"
    )
)

:: ===============================================================================
:: 2. ESPERAR A QUE EL SERVIDOR RESPONDA HTTP 200
:: ===============================================================================
set "LISTO=0"
for /L %%i in (1,1,25) do (
    if "!LISTO!"=="0" (
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
          "try { $r = Invoke-WebRequest -Uri 'http://localhost:!PORT!/login' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
        if !errorlevel! equ 0 (
            set "LISTO=1"
        ) else (
            ping 127.0.0.1 -n 2 >nul
        )
    )
)

:: ===============================================================================
:: 3. ABRIR TERMINAL EN MODO PANTALLA COMPLETA SI SE SOLICITA
:: ===============================================================================
if "%~1"=="--abrir-pantalla" (
    call "%PROJECT_ROOT%\ABRIR_SISTEMA_PANTALLA_COMPLETA.bat"
)

exit /b 0

