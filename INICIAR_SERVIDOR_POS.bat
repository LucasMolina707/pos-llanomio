@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Mi Empresa POS - Servidor Local

:: -------------------------------------------------------------------------------
:: 1. Guardian de Ventana Persistente (Evita cierres abruptos de ventana)
:: -------------------------------------------------------------------------------
set "MODO_SILENCIOSO=0"
if "%~1"=="--silencioso" set "MODO_SILENCIOSO=1"
if "%~2"=="--silencioso" set "MODO_SILENCIOSO=1"

if "%~1" NEQ "--persistente" if "%MODO_SILENCIOSO%"=="0" (
    cmd /k ""%~f0" --persistente"
    exit /b
)

:: -------------------------------------------------------------------------------
:: 2. Ubicar la raiz del proyecto de forma absoluta
:: -------------------------------------------------------------------------------
cd /d "%~dp0"
set "PROJECT_ROOT=%CD%"

if "%MODO_SILENCIOSO%"=="1" goto :iniciar_silencioso

color 0A
cls
echo ===============================================================================
echo                INICIANDO SISTEMA POS LOCAL (MODO PRODUCCION)
echo ===============================================================================
echo.
echo Directorio: %PROJECT_ROOT%
echo.

:iniciar_silencioso
:: -------------------------------------------------------------------------------
:: 3. Configurar PATH priorizando Node portable local
:: -------------------------------------------------------------------------------
if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
    if "%MODO_SILENCIOSO%"=="0" echo [RUNTIME] Motor Node.js portable local detectado y activado.
) else (
    set "PATH=%PROJECT_ROOT%\node_modules\.bin;%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"
    set "NODE_EXE=node"
    if "%MODO_SILENCIOSO%"=="0" echo [RUNTIME] Motor Node.js del sistema activado.
)

:: -------------------------------------------------------------------------------
:: 4. Cargar variables de entorno desde .env
:: -------------------------------------------------------------------------------
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

if "%MODO_SILENCIOSO%"=="0" (
    echo [CONFIG] Instancia:  !INSTANCE_ID!
    echo [CONFIG] Puerto Web: !PORT!
    echo [CONFIG] Dominio:    !LOCAL_DOMAIN!
    echo.
)

:: -------------------------------------------------------------------------------
:: 5. Verificar si el puerto ya esta escuchando
:: -------------------------------------------------------------------------------
if "%MODO_SILENCIOSO%"=="0" echo [RED] Comprobando disponibilidad del servicio en puerto !PORT!...

netstat -ano -p tcp | findstr /R /C:":!PORT! " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 goto :servidor_ya_activo

:: -------------------------------------------------------------------------------
:: 6. El servidor no esta activo: Levantarlo con PM2 o fallback directo
:: -------------------------------------------------------------------------------
if "%MODO_SILENCIOSO%"=="0" echo [ESTADO] El servidor esta apagado. Iniciando servicios en segundo plano...

where pm2 >nul 2>&1
if %errorlevel% equ 0 goto :arrancar_con_pm2_global

if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" goto :arrancar_con_pm2_local

goto :arrancar_con_node_directo

:arrancar_con_pm2_global
if "%MODO_SILENCIOSO%"=="0" echo [PM2] Iniciando con gestor global PM2...
call pm2 start ecosystem.config.js >nul 2>&1
call pm2 save >nul 2>&1
goto :esperar_y_abrir

:arrancar_con_pm2_local
if "%MODO_SILENCIOSO%"=="0" echo [PM2] Iniciando con gestor PM2 local del proyecto...
call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" start ecosystem.config.js >nul 2>&1
call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" save >nul 2>&1
goto :esperar_y_abrir

:arrancar_con_node_directo
if "%MODO_SILENCIOSO%"=="0" echo [FALLBACK] PM2 no disponible. Levantando servidor directamente con Node...
start "" /b "%NODE_EXE%" "%PROJECT_ROOT%\start-pos.js"
start "" /b "%NODE_EXE%" "%PROJECT_ROOT%\scripts\servidor-lan-mdns.js"
goto :esperar_y_abrir

:esperar_y_abrir
if "%MODO_SILENCIOSO%"=="0" echo [ESPERA] Aguardando 3 segundos para arranque de servicios...
timeout /t 3 /nobreak >nul 2>&1
goto :abrir_navegador

:servidor_ya_activo
if "%MODO_SILENCIOSO%"=="0" echo [OK] El servidor POS ya se encuentra activo y respondiendo.

:abrir_navegador
if "%MODO_SILENCIOSO%"=="0" (
    echo.
    echo ===============================================================================
    echo                   ACCESO A LA TERMINAL DE FACTURACION
    echo ===============================================================================
    echo.
    echo Abriendo la consola web: http://localhost:!PORT!/login
    echo.
    echo Direcciones alternativas:
    echo   - Celulares / Tablets en Wi-Fi: http://!LOCAL_DOMAIN!:!PORT!/login
    echo.
    echo NOTA: Esta ventana puede permanecer minimizada mientras utiliza el sistema.
    echo ===============================================================================
    echo.
)

start http://localhost:!PORT!/login

if "%MODO_SILENCIOSO%"=="1" exit /b 0

pause
exit /b 0

