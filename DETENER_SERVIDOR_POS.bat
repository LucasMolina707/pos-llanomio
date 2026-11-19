@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Detener Servidor POS - POS Llanomio
color 0C

cd /d "%~dp0"
set "PROJECT_ROOT=%CD%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"

echo ===============================================================================
echo                     DETENER Y PAUSAR SERVIDOR POS LLANOMIO
echo ===============================================================================
echo.

:: 1. Respaldo preventivo en caliente antes del apagado
echo [1/3] Generando salvaguarda preventiva en caliente...
if exist "%PROJECT_ROOT%\database\llanomio.db" (
    if not exist "%PROJECT_ROOT%\database\backups_locales" mkdir "%PROJECT_ROOT%\database\backups_locales" >nul 2>&1
    copy /y "%PROJECT_ROOT%\database\llanomio.db" "%PROJECT_ROOT%\database\backups_locales\llanomio_PRE_DETENCION.db" >nul 2>&1
    echo [OK] Copia preventiva de seguridad creada en database\backups_locales.
)

:: 2. Detener y purgar procesos en PM2
echo.
echo [2/3] Deteniendo orquestador de procesos PM2...
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    call pm2 stop all >nul 2>&1
    call pm2 delete all >nul 2>&1
    call pm2 kill >nul 2>&1
    echo [OK] Servicios detenidos exitosamente en PM2 global.
) else (
    if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" stop all >nul 2>&1
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" delete all >nul 2>&1
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" kill >nul 2>&1
        echo [OK] Servicios detenidos en PM2 local.
    )
)

:: 3. Liberar puertos de forma segura (protegiendo navegadores y sincronizadores)
echo.
echo [3/3] Liberando puertos de servidor (protegiendo navegadores y nube)...
if exist "%PROJECT_ROOT%\scripts\limpiar-servicios-y-puertos.js" (
    if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
        call "%PROJECT_ROOT%\runtime\node\node.exe" "%PROJECT_ROOT%\scripts\limpiar-servicios-y-puertos.js"
    ) else (
        call node "%PROJECT_ROOT%\scripts\limpiar-servicios-y-puertos.js"
    )
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$c = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue; if ($c) { $c.OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }" >nul 2>&1
)

echo.
echo ===============================================================================
echo        EL SERVIDOR POS SE ENCUENTRA DETENIDO Y LOS PUERTOS LIBERADOS
echo ===============================================================================
echo.
echo Para volver a inicializarlo, ejecute INICIAR_O_RECUPERAR_SERVIDOR_POS.bat
echo o el acceso directo "Iniciar Servidor POS" en el Escritorio.
echo.
if "%~1" NEQ "--silencioso" pause
exit /b 0
