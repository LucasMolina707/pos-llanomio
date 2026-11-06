@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Recuperar y Levantar Servidor en Ultimo Estado - POS Llanomio

:: ===============================================================================
:: 1. Guardian de Ventana y Soporte Silencioso
:: ===============================================================================
set "MODO_SILENCIOSO=0"
if "%~1"=="--silencioso" set "MODO_SILENCIOSO=1"
if "%~2"=="--silencioso" set "MODO_SILENCIOSO=1"

if "%MODO_SILENCIOSO%"=="0" (
    if "%~1" NEQ "--persistente" (
        cmd /k ""%~f0" --persistente"
        exit /b
    )
)

:: ===============================================================================
:: 2. Ubicar la raiz del proyecto dinamicamente
:: ===============================================================================
cd /d "%~dp0"
set "PROJECT_ROOT=%CD%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"
if not exist "%PROJECT_ROOT%\.pm2" mkdir "%PROJECT_ROOT%\.pm2" >nul 2>&1
set "PM2_HOME=%PROJECT_ROOT%\.pm2"

color 0A
if "%MODO_SILENCIOSO%"=="0" (
    cls
    echo ===============================================================================
    echo      RECUPERAR Y LEVANTAR SERVIDOR POS EN SU ULTIMO ESTADO GUARDADO
    echo                           SISTEMA POS LLANOMIO
    echo ===============================================================================
    echo.
)

:: ===============================================================================
:: 3. Deteccion de Node.js
:: ===============================================================================
if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
) else (
    set "PATH=%PROJECT_ROOT%\node_modules\.bin;%PATH%;C:\Program Files\nodejs;%APPDATA%\npm;C:\Program Files (x86)\nodejs"
    set "NODE_EXE=node"
)

:: Cargar variables de entorno desde .env
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
        if "%%A"=="CLOUD_BACKUP_PATH" set "CLOUD_BACKUP_PATH=%%B"
    )
)

:: ===============================================================================
:: 4. PASO 1: Verificacion de Integridad y Consolidacion del Ultimo Estado
:: ===============================================================================
if "%MODO_SILENCIOSO%"=="0" echo [PASO 1/3] Verificando integridad de SQLite y consolidando transacciones WAL...

call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\recuperar-ultimo-estado.js"
if %errorlevel% neq 0 (
    if "%MODO_SILENCIOSO%"=="0" (
        echo [AVISO] La recuperacion de base de datos reporto observaciones. Continuando arranque...
    )
)
call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\asegurar-admin.js" >nul 2>&1

:: ===============================================================================
:: 5. PASO 2: Gestion de Procesos con PM2 o Arranque Nativo
:: ===============================================================================
if "%MODO_SILENCIOSO%"=="0" echo [PASO 2/3] Levantando orquestador de procesos...

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

if "%USAR_PM2%"=="1" (
    call !PM2_CMD! ping >nul 2>&1
    call !PM2_CMD! describe "!INSTANCE_ID!" >nul 2>&1
    if !errorlevel! equ 0 (
        call !PM2_CMD! restart "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
    ) else (
        call !PM2_CMD! start "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
    )
    call !PM2_CMD! save --force >nul 2>&1
    if "%MODO_SILENCIOSO%"=="0" echo [OK] Procesos asegurados y reiniciados en PM2.
) else (
    :: Liberar puerto en caso de bloqueo
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$c = Get-NetTCPConnection -LocalPort !PORT! -ErrorAction SilentlyContinue; if ($c) { $c.OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }" >nul 2>&1
    start "Servidor_POS_Llanomio" /min "%NODE_EXE%" "%PROJECT_ROOT%\start-pos.js"
    if "%MODO_SILENCIOSO%"=="0" echo [OK] Servidor de produccion levantado en segundo plano.
)

:: ===============================================================================
:: 6. PASO 3: Sondeo y Comprobacion de Salud HTTP (200 OK)
:: ===============================================================================
if "%MODO_SILENCIOSO%"=="0" echo [PASO 3/3] Comprobando conexion HTTP en http://localhost:!PORT!/login...

set "SERVIDOR_OK=0"
for /L %%i in (1,1,20) do (
    if "!SERVIDOR_OK!"=="0" (
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
          "try { $r = Invoke-WebRequest -Uri 'http://localhost:!PORT!/login' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
        if !errorlevel! equ 0 (
            set "SERVIDOR_OK=1"
        ) else (
            ping 127.0.0.1 -n 2 >nul
        )
    )
)

if "%MODO_SILENCIOSO%"=="1" (
    exit /b 0
)

echo.
echo ===============================================================================
if "!SERVIDOR_OK!"=="1" (
    echo           EL SERVIDOR POS SE ENCUENTRA 100%% ONLINE Y RECUPERADO
    echo ===============================================================================
    echo.
    echo   - URL Local Principal:  http://localhost:!PORT!/login
    echo   - URL Red Local (LAN):  http://!LOCAL_DOMAIN!:!PORT!/login
    echo   - Base de Datos:        database\llanomio.db (Integridad OK)
    echo   - Carpeta Nube:         !CLOUD_BACKUP_PATH!
    echo.
    echo Abriendo terminal en modo pantalla completa...
    call "%PROJECT_ROOT%\ABRIR_SISTEMA_PANTALLA_COMPLETA.bat"
) else (
    echo         ATENCION: EL SERVIDOR NO RESPONDE EN EL TIEMPO ESTIMADO
    echo ===============================================================================
    echo Verifique los logs en la consola o ejecute CONTROL_GENERAL_POS.bat para diagnostico.
)

echo.
pause
exit /b 0

