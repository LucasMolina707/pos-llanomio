@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Restablecer de Fabrica y Preparar para Comprimir - POS Llanomio
color 0E
cd /d "%~dp0"
set "PROJECT_ROOT=%CD%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"

echo ===============================================================================
echo        RESTABLECER A ESTADO DE FABRICA Y PREPARAR SISTEMA PARA COMPRIMIR
echo                               SISTEMA POS LLANOMIO
echo ===============================================================================
echo.
echo   [1] Restablecer Base de Datos a Estado Puro de Fabrica
echo       (Limpia ventas y movimientos, deja admin/admin123 y categoria YOANA)
echo.
echo   [2] Limpieza Integral y Preparacion para Comprimir en ZIP
echo       (Detiene el servidor, purga temporales, restaura BD de fabrica y
echo        optimiza el proyecto al 100%% para distribuirlo o comprimirlo)
echo.
echo   [3] Cancelar operacion
echo.
set /p OPCION=">> Seleccione una opcion [1-3, Enter = 1]: "
if "%OPCION%"=="" set "OPCION=1"
echo.

if "%OPCION%"=="3" (
    echo Operacion cancelada por el usuario.
    pause
    exit /b 0
)

if "%OPCION%"=="2" goto :opcion_limpieza_completa

:opcion_reset_db
echo [1/2] Liberando procesos y conexiones en el puerto 3000...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$c = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue; if ($c) { $c.OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }" >nul 2>&1

echo [2/2] Ejecutando restablecimiento y archivado historico...
node "%PROJECT_ROOT%\scripts\restablecer-db-fabrica.js"
goto :finalizar

:opcion_limpieza_completa
node "%PROJECT_ROOT%\scripts\limpiar-para-comprimir.js"
goto :finalizar

:finalizar
echo.
echo Presione cualquier tecla para salir...
pause >nul
exit /b 0
