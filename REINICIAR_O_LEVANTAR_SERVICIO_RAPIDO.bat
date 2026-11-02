@echo off
setlocal EnableExtensions EnableDelayedExpansion
title POS Llanomio - Rescate y Auto-Recuperacion Rapida

:: -------------------------------------------------------------------------------
:: 1. Deteccion de modo silencioso (cuando es invocado por otro script)
:: -------------------------------------------------------------------------------
set "MODO_SILENCIOSO=0"
if "%~1"=="--silencioso" set "MODO_SILENCIOSO=1"
if "%~2"=="--silencioso" set "MODO_SILENCIOSO=1"

:: -------------------------------------------------------------------------------
:: 2. Ubicar la raiz del proyecto de forma absoluta
:: -------------------------------------------------------------------------------
cd /d "%~dp0"
set "PROJECT_ROOT=%CD%"

:: -------------------------------------------------------------------------------
:: 3. Configurar PATH con prioridad en Node portable
:: -------------------------------------------------------------------------------
if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
) else (
    set "PATH=%PROJECT_ROOT%\node_modules\.bin;%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"
    set "NODE_EXE=node"
)

:: -------------------------------------------------------------------------------
:: 4. Cargar variables de entorno desde .env
:: -------------------------------------------------------------------------------
set "PORT=3000"
set "INSTANCE_ID=pos-llanomio"

if exist "%PROJECT_ROOT%\.env" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%PROJECT_ROOT%\.env") do (
        if "%%A"=="PORT" set "PORT=%%B"
        if "%%A"=="INSTANCE_ID" set "INSTANCE_ID=%%B"
    )
)

if "%MODO_SILENCIOSO%"=="0" (
    color 0E
    cls
    echo ===============================================================================
    echo          RESCATE Y AUTO-RECUPERACION RAPIDA DEL SERVIDOR POS
    echo ===============================================================================
    echo.
    echo Directorio: %PROJECT_ROOT%
    echo Comprobando disponibilidad del servicio en puerto TCP !PORT!...
)

:: -------------------------------------------------------------------------------
:: 5. Verificar si el puerto ya esta escuchando
:: -------------------------------------------------------------------------------
netstat -ano -p tcp | findstr /R /C:":!PORT! " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    if "%MODO_SILENCIOSO%"=="0" echo [OK] El servicio ya responde correctamente en el puerto !PORT!.
    goto :lanzar_sistema
)

if "%MODO_SILENCIOSO%"=="0" echo [AVISO] El puerto !PORT! no esta activo. Reactivando servicios...

:: -------------------------------------------------------------------------------
:: 6. Reactivacion forzada con PM2 o fallback directo de Node
:: -------------------------------------------------------------------------------
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    call pm2 restart !INSTANCE_ID! >nul 2>&1
    if %errorlevel% neq 0 (
        call pm2 start "%PROJECT_ROOT%\ecosystem.config.js" >nul 2>&1
    )
    call pm2 save >nul 2>&1
    goto :bucle_espera_puerto
)

if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
    call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" restart !INSTANCE_ID! >nul 2>&1
    if %errorlevel% neq 0 (
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" start "%PROJECT_ROOT%\ecosystem.config.js" >nul 2>&1
    )
    call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" save >nul 2>&1
    goto :bucle_espera_puerto
)

:: Fallback directo a Node
start "" /b "%NODE_EXE%" "%PROJECT_ROOT%\start-pos.js"
start "" /b "%NODE_EXE%" "%PROJECT_ROOT%\scripts\servidor-lan-mdns.js"

:bucle_espera_puerto
if "%MODO_SILENCIOSO%"=="0" echo Aguardando activacion del socket TCP...
timeout /t 2 /nobreak >nul 2>&1

:: Bucle de verificacion de 3 reintentos
set "INTENTO=1"
:verificar_puerto_loop
netstat -ano -p tcp | findstr /R /C:":!PORT! " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto :lanzar_sistema

if !INTENTO! lss 4 (
    set /a INTENTO+=1
    timeout /t 2 /nobreak >nul 2>&1
    goto :verificar_puerto_loop
)

:lanzar_sistema
if "%MODO_SILENCIOSO%"=="0" (
    echo.
    echo ===============================================================================
    echo                     SERVICIO RESTABLECIDO CON EXITO
    echo ===============================================================================
    echo.
    echo Abriendo la consola POS: http://localhost:!PORT!/login
    echo.
)

start http://localhost:!PORT!/login

if "%MODO_SILENCIOSO%"=="1" exit /b 0

timeout /t 3 >nul 2>&1
exit /b 0

