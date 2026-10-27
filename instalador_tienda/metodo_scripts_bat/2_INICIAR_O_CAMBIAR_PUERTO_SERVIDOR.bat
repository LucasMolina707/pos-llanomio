@echo off
chcp 65001 > nul
title POS LLANOMIO - Gestor de Servidor y Selector de Puertos Multi-Instancia
color 0A

:: 1. Posicionamiento en la raiz del proyecto
cd /d "%~dp0..\.."

:MENU
cls
echo ===============================================================================
echo        SISTEMA POS LOCAL LLANOMIO - CONTROL DEL SERVIDOR MULTI-INSTANCIA
echo ===============================================================================
echo.

:: Leer configuracion actual desde .env
set PUERTO_ACTUAL=3000
set PUERTO_PROXY=3000
set INSTANCE_ID=pos-llanomio
set DOMINIO_LOCAL=llanomio.local
set DB_NAME=llanomio.db
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if "%%A"=="PORT" set PUERTO_ACTUAL=%%B
        if "%%A"=="HTTP_PORT" set PUERTO_PROXY=%%B
        if "%%A"=="INSTANCE_ID" set INSTANCE_ID=%%B
        if "%%A"=="LOCAL_DOMAIN" set DOMINIO_LOCAL=%%B
        if "%%A"=="DATABASE_URL" set DB_NAME=%%B
    )
)

echo Estado de configuracion actual de esta instancia (.env):
echo   - Identificador Instancia PM2:       %INSTANCE_ID%
echo   - Puerto Servidor Principal Next.js: %PUERTO_ACTUAL%
echo   - Puerto Salida Red / Proxy HTTP:   %PUERTO_PROXY%
echo   - Dominio Local Wi-Fi (mDNS):        http://%DOMINIO_LOCAL%
echo   - Base de Datos Activa:              %DB_NAME%
echo.
echo Seleccione una opcion:
echo   [1] Iniciar servidor en el puerto actual (%PUERTO_ACTUAL%)
echo   [2] Re-escanear puertos libres y CAMBIAR puerto / dominio / base de datos
echo   [3] Ver estado y monitoreo de procesos (PM2)
echo   [4] Detener esta instancia del servidor
echo   [5] Salir
echo.
set /p OPCION=">> Ingrese su opcion [1-5]: "

if "%OPCION%"=="1" goto INICIAR_ACTUAL
if "%OPCION%"=="2" goto CAMBIAR_CONFIG
if "%OPCION%"=="3" goto VER_ESTADO
if "%OPCION%"=="4" goto DETENER_SERVIDOR
if "%OPCION%"=="5" goto SALIR

echo.
echo [ERROR] Opcion no valida. Intente de nuevo.
timeout /t 2 > nul
goto MENU

:CAMBIAR_CONFIG
cls
echo ===============================================================================
echo     RE-ESCANEO Y ASIGNACION INTERACTIVA DE PUERTOS, DOMINIO Y BASE DE DATOS
echo ===============================================================================
echo.
if exist "scripts\escanear-y-elegir-puertos.js" (
    call node scripts\escanear-y-elegir-puertos.js
) else (
    call node "%~dp0escanear-y-elegir-puertos.js"
)
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] El asistente de configuracion no pudo completar la asignacion.
    pause
    goto MENU
)

:: Releer configuracion recien guardada
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if "%%A"=="PORT" set PUERTO_ACTUAL=%%B
        if "%%A"=="HTTP_PORT" set PUERTO_PROXY=%%B
        if "%%A"=="INSTANCE_ID" set INSTANCE_ID=%%B
        if "%%A"=="LOCAL_DOMAIN" set DOMINIO_LOCAL=%%B
        if "%%A"=="DATABASE_URL" set DB_NAME=%%B
    )
)

:: Actualizar regla de firewall si es necesario
netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB" dir=in action=allow protocol=TCP localport=%PUERTO_ACTUAL%,%PUERTO_PROXY% >nul 2>nul

echo.
echo [OK] Nuevos parametros configurados:
echo      Instancia: %INSTANCE_ID% | Principal: %PUERTO_ACTUAL% | Dominio: %DOMINIO_LOCAL%
echo Procediendo a reiniciar los servicios con la nueva configuracion...
echo.

:INICIAR_ACTUAL
echo ===============================================================================
echo                INICIANDO SERVICIOS DE LA INSTANCIA: %INSTANCE_ID%
echo ===============================================================================
echo.

:: Detectar PM2
set PM2_CMD=pm2
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    if exist "node_modules\.bin\pm2.cmd" (
        set PM2_CMD=node_modules\.bin\pm2.cmd
    ) else (
        set PM2_CMD=npx pm2
    )
)

echo Deteniendo instancias previas de %INSTANCE_ID%...
call %PM2_CMD% delete %INSTANCE_ID% >nul 2>nul
call %PM2_CMD% delete %INSTANCE_ID%-mdns >nul 2>nul

echo Levantando procesos con PM2 en puerto %PUERTO_ACTUAL%...
call %PM2_CMD% start ecosystem.config.js
if %errorlevel% neq 0 (
    echo [AVISO] PM2 no pudo iniciar directamente en modo servicio.
    echo Levantando servidor directo con Node.js...
    start "POS LLANOMIO - %INSTANCE_ID%" cmd /k "cd /d %~dp0..\.. && node start-pos.js"
) else (
    call %PM2_CMD% save >nul 2>nul
    echo [OK] Servicios de la instancia %INSTANCE_ID% iniciados con exito.
)

echo.
echo Abriendo navegador en: http://localhost:%PUERTO_ACTUAL%/login
start http://localhost:%PUERTO_ACTUAL%/login
echo.
echo Presione cualquier tecla para volver al menu de administracion...
pause > nul
goto MENU

:VER_ESTADO
cls
echo ===============================================================================
echo                       ESTADO DE SERVICIOS EN PM2
echo ===============================================================================
echo.
set PM2_CMD=pm2
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    if exist "node_modules\.bin\pm2.cmd" (
        set PM2_CMD=node_modules\.bin\pm2.cmd
    ) else (
        set PM2_CMD=npx pm2
    )
)
call %PM2_CMD% status
echo.
pause
goto MENU

:DETENER_SERVIDOR
cls
echo ===============================================================================
echo             DETENIENDO SERVICIOS DE LA INSTANCIA: %INSTANCE_ID%
echo ===============================================================================
echo.
set PM2_CMD=pm2
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    if exist "node_modules\.bin\pm2.cmd" (
        set PM2_CMD=node_modules\.bin\pm2.cmd
    ) else (
        set PM2_CMD=npx pm2
    )
)
call %PM2_CMD% stop %INSTANCE_ID% >nul 2>nul
call %PM2_CMD% stop %INSTANCE_ID%-mdns >nul 2>nul
call %PM2_CMD% delete %INSTANCE_ID% >nul 2>nul
call %PM2_CMD% delete %INSTANCE_ID%-mdns >nul 2>nul
call %PM2_CMD% save >nul 2>nul

echo [OK] Los servicios de la instancia %INSTANCE_ID% fueron detenidos.
echo.
pause
goto MENU

:SALIR
exit /b 0
