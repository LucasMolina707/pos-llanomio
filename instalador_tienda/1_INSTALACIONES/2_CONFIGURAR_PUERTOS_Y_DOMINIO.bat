@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Configuracion de Puertos y Dominio de Red - POS Llanomio

cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"

color 0B
cls
echo ===============================================================================
echo            RECONFIGURACION DE PUERTOS Y DOMINIO DE RED LOCAL
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.
echo Este asistente le permite escanear su red local, detectar puertos libres y
echo asignar un nuevo puerto TCP o nombre de dominio (mDNS) para su servidor POS.
echo.

:: Detectar Node.js
if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
) else (
    set "NODE_EXE=node"
)

where %NODE_EXE% >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR CRITICO] No se detecto el motor Node.js para ejecutar el asistente.
    pause
    exit /b 1
)

:: Ejecutar el asistente interactivo
call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\escanear-y-elegir-puertos.js"
if %errorlevel% neq 0 (
    echo.
    echo [AVISO] El asistente fue cancelado o finalizo con observaciones.
    pause
    exit /b 0
)

:: Leer variables actualizadas de .env
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

echo.
echo [ACTUALIZACION] Variables reconfiguradas en .env:
echo   - Puerto Next.js:    !PORT!
echo   - Puerto Proxy HTTP: !HTTP_PORT!
echo   - Instancia:         !INSTANCE_ID!
echo   - Dominio mDNS:      !LOCAL_DOMAIN!
echo.

:: Actualizar regla de Firewall si se tienen permisos de Administrador
net session >nul 2>&1
if %errorlevel% equ 0 (
    echo [FIREWALL] Actualizando regla en Firewall de Windows para puerto [!PORT!, !HTTP_PORT!]...
    netsh advfirewall firewall delete rule name="POS_LLANOMIO_PUERTOS_WEB" >nul 2>&1
    netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB" dir=in action=allow protocol=TCP localport=!PORT!,!HTTP_PORT! profile=any description="Permite acceso web a terminales POS en red local" >nul 2>&1
    echo [OK] Firewall actualizado exitosamente.
) else (
    echo [INFO] Para actualizar el Firewall de Windows ejecute este script como Administrador.
)

:: Reiniciar servicios en caliente si PM2 esta presente
echo.
echo [SERVICIOS] Reiniciando procesos en caliente para aplicar los nuevos puertos...
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    call pm2 restart "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
    call pm2 save >nul 2>&1
    echo [OK] Procesos reiniciados en PM2 con las nuevas variables.
) else (
    if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" restart "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" save >nul 2>&1
        echo [OK] Procesos locales reiniciados en PM2 con las nuevas variables.
    ) else (
        echo [INFO] Si tiene el servidor corriendo en una ventana de comandos, detengalo y vuelva a iniciarlo.
    )
)

echo.
echo ===============================================================================
echo                     RECONFIGURACION FINALIZADA CON EXITO
echo ===============================================================================
echo   - Nueva URL Local: http://localhost:!PORT!/login
echo   - Nueva URL Red:   http://!LOCAL_DOMAIN!:!PORT!/login
echo.
set /p ABRIR_NAV="Desea probar y abrir la nueva direccion en su navegador? (S/N): "
if /i "!ABRIR_NAV!"=="S" (
    start http://localhost:!PORT!/login
)

echo.
echo Presione cualquier tecla para regresar...
pause >nul
exit /b 0

