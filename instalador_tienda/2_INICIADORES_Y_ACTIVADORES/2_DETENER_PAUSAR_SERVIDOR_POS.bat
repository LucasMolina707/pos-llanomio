@echo off
setlocal EnableExtensions EnableDelayedExpansion
title 2. Detener y Pausar Servidor POS - POS Llanomio
color 0C

cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"

echo ===============================================================================
echo                2. DETENER Y PAUSAR SERVIDOR POS LLANOMIO
echo ===============================================================================
echo.

:: 1. Respaldo rápido en caliente antes de apagar
echo [1/3] Generando salvaguarda preventiva en caliente...
if exist "%PROJECT_ROOT%\database\llanomio.db" (
    if not exist "%PROJECT_ROOT%\database\backups_locales" mkdir "%PROJECT_ROOT%\database\backups_locales" >nul 2>&1
    copy /y "%PROJECT_ROOT%\database\llanomio.db" "%PROJECT_ROOT%\database\backups_locales\llanomio_PRE_DETENCION.db" >nul 2>&1
    echo [OK] Copia preventiva de seguridad creada.
)

:: 2. Detener procesos en PM2
echo.
echo [2/3] Deteniendo y pausando orquestador de procesos...
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    call pm2 stop all >nul 2>&1
    echo [OK] Servicios detenidos exitosamente en PM2.
) else (
    if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" stop all >nul 2>&1
        echo [OK] Servicios detenidos en PM2 local.
    )
)

:: 3. Liberar puertos
echo.
echo [3/3] Liberando puertos de servidor (protegiendo navegador y sincronizadores)...
if exist "%PROJECT_ROOT%\scripts\limpiar-servicios-y-puertos.js" (
    node "%PROJECT_ROOT%\scripts\limpiar-servicios-y-puertos.js"
)

echo.
echo ===============================================================================
echo        EL SERVIDOR POS SE ENCUENTRA DETENIDO Y PAUSADO DE FORMA SEGURA
echo ===============================================================================
echo Para volver a inicializarlo, ejecute el Boton 1 (Inicializar Sitio POS).
echo.
pause
exit /b 0

