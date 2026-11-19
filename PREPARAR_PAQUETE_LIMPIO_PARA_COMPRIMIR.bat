@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Preparar Paquete Limpio para Comprimir - POS Llanomio
color 0B
cd /d "%~dp0"
set "PROJECT_ROOT=%CD%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"

echo ===============================================================================
echo          PREPARAR PAQUETE LIMPIO DE FABRICA PARA COMPRIMIR EN ZIP
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.
echo Este asistente realizara las siguientes acciones automaticas:
echo   1. Detendra el servidor y liberara todos los puertos.
echo   2. Restablecera la base de datos a estado limpio de fabrica (admin/admin123).
echo   3. Purgara caches residuales, logs, temporales y carpetas de staging.
echo   4. Eliminara archivos desktop.ini generados por el explorador.
echo   5. Dejara el proyecto en estado optimo listo para comprimir en .zip.
echo.
set /p CONFIRMA=">> Desea continuar con la preparacion? [S/N, Enter = S]: "
if /i "%CONFIRMA%"=="N" (
    echo Operacion cancelada por el usuario.
    pause
    exit /b 0
)

echo.
node "%PROJECT_ROOT%\scripts\limpiar-para-comprimir.js"

echo.
echo Presione cualquier tecla para finalizar...
pause >nul
exit /b 0
