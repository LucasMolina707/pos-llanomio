@echo off
setlocal EnableExtensions EnableDelayedExpansion
title 1. Levantar o Reiniciar Servidor POS - POS Llanomio
color 0A

:: ===============================================================================
:: 1. Localizar la raiz del proyecto dinamicamente
:: ===============================================================================
cd /d "%~dp0"
set "SCRIPT_DIR=%CD%"

:: Subir 2 niveles para alcanzar la raiz (..\..)
cd /d "%SCRIPT_DIR%\..\.."
set "PROJECT_ROOT=%CD%"

if not exist "%PROJECT_ROOT%\package.json" (
    if exist "%SCRIPT_DIR%\package.json" (
        set "PROJECT_ROOT=%SCRIPT_DIR%"
    ) else (
        cd /d "%SCRIPT_DIR%\.."
        if exist "%CD%\package.json" set "PROJECT_ROOT=%CD%"
    )
)

cd /d "%PROJECT_ROOT%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"
if not exist "%PROJECT_ROOT%\.pm2" mkdir "%PROJECT_ROOT%\.pm2" >nul 2>&1
set "PM2_HOME=%PROJECT_ROOT%\.pm2"

cls
echo ===============================================================================
echo            1. LEVANTAR O REINICIAR SERVIDOR POS LOCAL LLANOMIO
echo ===============================================================================
echo.
echo Ubicacion del proyecto: %PROJECT_ROOT%
echo.

:: ===============================================================================
:: 2. Ejecutar Rutina Oficial de Recuperacion y Arranque
:: ===============================================================================
if exist "%PROJECT_ROOT%\INICIAR_O_RECUPERAR_SERVIDOR_POS.bat" (
    call "%PROJECT_ROOT%\INICIAR_O_RECUPERAR_SERVIDOR_POS.bat"
) else if exist "%PROJECT_ROOT%\RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat" (
    call "%PROJECT_ROOT%\RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat"
) else (
    echo [ERROR CRITICO] No se encontraron los iniciadores oficiales en %PROJECT_ROOT%.
    echo Intente ejecutar INSTALADOR_MAESTRO_UNICO_POS.bat para restaurar el entorno.
    pause
    exit /b 1
)

echo.
echo Presione cualquier tecla para abrir el POS o cerrar esta ventana...
pause >nul
exit /b 0
