@echo off
chcp 65001 > nul
title POS LLANOMIO - Gestor de Servidor y Selector de Puertos
color 0A

:: 1. Posicionamiento en la raiz del proyecto
cd /d "%~dp0..\.."

:MENU
cls
echo ===============================================================================
echo                SISTEMA POS LOCAL LLANOMIO - CONTROL DEL SERVIDOR
echo ===============================================================================
echo.

:: Leer puertos actuales desde .env
set PUERTO_ACTUAL=3000
set PUERTO_PROXY=3000
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if "%%A"=="PORT" set PUERTO_ACTUAL=%%B
        if "%%A"=="HTTP_PORT" set PUERTO_PROXY=%%B
    )
)

echo Estado de configuracion actual (.env):
echo   - Puerto Servidor Principal Next.js: %PUERTO_ACTUAL%
echo   - Puerto Salida Red / Proxy HTTP:   %PUERTO_PROXY%
echo.
echo Seleccione una opcion:
echo   [1] Iniciar servidor en el puerto actual (%PUERTO_ACTUAL%)
echo   [2] Escanear puertos libres y CAMBIAR el puerto de salida
echo   [3] Ver estado y monitoreo de procesos (PM2)
echo   [4] Detener servidor completamente
echo   [5] Salir
echo.
set /p OPCION=">> Ingrese su opcion [1-5]: "

if "%OPCION%"=="1" goto INICIAR_ACTUAL
if "%OPCION%"=="2" goto CAMBIAR_PUERTO
if "%OPCION%"=="3" goto VER_ESTADO
if "%OPCION%"=="4" goto DETENER_SERVIDOR
if "%OPCION%"=="5" goto SALIR

echo.
echo [ERROR] Opcion no valida. Intente de nuevo.
timeout /t 2 > nul
goto MENU

:CAMBIAR_PUERTO
cls
echo ===============================================================================
echo            RE-ESCANEO Y ASIGNACION INTERACTIVA DE PUERTOS LIBRES
echo ===============================================================================
echo.
if exist "scripts\escanear-y-elegir-puertos.js" (
    call node scripts\escanear-y-elegir-puertos.js
) else (
    call node "%~dp0escanear-y-elegir-puertos.js"
)
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] El asistente de puertos no pudo completar la asignacion.
    pause
    goto MENU
)

:: Releer puertos recien guardados
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if "%%A"=="PORT" set PUERTO_ACTUAL=%%B
        if "%%A"=="HTTP_PORT" set PUERTO_PROXY=%%B
    )
)

:: Actualizar regla de firewall si es necesario
netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB" dir=in action=allow protocol=TCP localport=%PUERTO_ACTUAL%,%PUERTO_PROXY% >nul 2>nul

echo.
echo [OK] Nuevos puertos configurados: Principal=%PUERTO_ACTUAL%, Proxy=%PUERTO_PROXY%
echo Procediendo a reiniciar el servidor con los nuevos puertos...
echo.

:INICIAR_ACTUAL
echo ===============================================================================
echo                   INICIANDO SERVICIOS DE POS LLANOMIO
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

echo Deteniendo instancias previas...
call %PM2_CMD% delete pos-llanomio >nul 2>nul
call %PM2_CMD% delete pos-mdns-proxy >nul 2>nul

echo Levantando procesos con PM2 en puerto %PUERTO_ACTUAL%...
call %PM2_CMD% start ecosystem.config.js
if %errorlevel% neq 0 (
    echo [AVISO] PM2 no pudo iniciar directamente en modo servicio.
    echo Levantando servidor directo con Node.js...
    start "POS LLANOMIO SERVIDOR DIRECTO" cmd /k "cd /d %~dp0..\.. && node start-pos.js"
) else (
    call %PM2_CMD% save >nul 2>nul
    echo [OK] Servicios iniciados con PM2 en segundo plano.
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
echo                      DETENIENDO SERVICIOS DEL POS
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
call %PM2_CMD% stop pos-llanomio >nul 2>nul
call %PM2_CMD% stop pos-mdns-proxy >nul 2>nul
call %PM2_CMD% delete pos-llanomio >nul 2>nul
call %PM2_CMD% delete pos-mdns-proxy >nul 2>nul
call %PM2_CMD% save >nul 2>nul

echo [OK] Todos los servicios del POS fueron detenidos.
echo.
pause
goto MENU

:SALIR
exit /b 0
