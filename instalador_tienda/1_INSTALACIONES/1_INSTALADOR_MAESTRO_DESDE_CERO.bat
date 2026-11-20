@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Instalador Maestro Desde Cero - Sistema POS Llanomio
color 0B

:: ===============================================================================
:: 1. Localizar la raiz del proyecto de forma dinamica y resiliente
:: ===============================================================================
cd /d "%~dp0"
set "SCRIPT_DIR=%CD%"

:: Subir 2 niveles para alcanzar la raiz del proyecto POS (..\..)
cd /d "%SCRIPT_DIR%\..\.."
set "PROJECT_ROOT=%CD%"

:: Validar si package.json existe en la raiz calculada
if exist "%PROJECT_ROOT%\package.json" goto :raiz_encontrada

:: Si no se encontro en ..\.., intentar en el directorio del script
if exist "%SCRIPT_DIR%\package.json" (
    set "PROJECT_ROOT=%SCRIPT_DIR%"
    goto :raiz_encontrada
)

:: Buscar un nivel arriba
cd /d "%SCRIPT_DIR%\.."
if exist "%CD%\package.json" (
    set "PROJECT_ROOT=%CD%"
    goto :raiz_encontrada
)

echo [ERROR CRITICO] No se pudo localizar la carpeta raiz del proyecto POS Llanomio.
echo Directorio actual: %CD%
echo Verifique que la carpeta no haya sido fragmentada al descomprimir.
echo.
pause
exit /b 1

:raiz_encontrada
cd /d "%PROJECT_ROOT%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"

:: ===============================================================================
:: 2. Verificacion y Elevacion de Permisos de Administrador de Windows (UAC)
:: ===============================================================================
net session >nul 2>&1
if %errorlevel% equ 0 goto :admin_confirmado

echo ===============================================================================
echo   SOLICITANDO PERMISOS DE ADMINISTRADOR DE WINDOWS...
echo ===============================================================================
echo El instalador requiere permisos elevados para configurar puertos, firewall y PM2.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/k \"\"%~f0\"\" --elevado' -Verb RunAs"
exit /b

:admin_confirmado
cls
echo ===============================================================================
echo        1. INSTALADOR MAESTRO DESDE CERO - SISTEMA POS LOCAL LLANOMIO
echo ===============================================================================
echo.
echo Raiz del sistema detectada: %PROJECT_ROOT%
echo Iniciando proceso completo de instalacion, servicios y base de datos...
echo.

:: ===============================================================================
:: 3. Invocar al Instalador Maestro Unico de la Raiz
:: ===============================================================================
if exist "%PROJECT_ROOT%\INSTALADOR_MAESTRO_UNICO_POS.bat" (
    call "%PROJECT_ROOT%\INSTALADOR_MAESTRO_UNICO_POS.bat" --persistente
) else (
    echo [ERROR CRITICO] No se encontro INSTALADOR_MAESTRO_UNICO_POS.bat en %PROJECT_ROOT%.
    echo Asegurese de haber descomprimido el paquete completo.
    pause
    exit /b 1
)

echo.
echo Instalacion maestro finalizada. Presione una tecla para cerrar esta ventana...
pause >nul
exit /b 0
