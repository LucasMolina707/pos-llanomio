@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Asistente de Instalacion y Despliegue Maestro - POS Llanomio

:: ===============================================================================
:: 1. Guardian de Ventana Persistente
:: ===============================================================================
if "%~1" NEQ "--persistente" (
    cmd /k ""%~f0" --persistente"
    exit /b
)

:: ===============================================================================
:: 2. Ubicar la raiz del proyecto
:: ===============================================================================
cd /d "%~dp0"
set "PROJECT_ROOT=%CD%"

:: ===============================================================================
:: 3. Verificacion y Elevacion a Administrador (UAC)
:: ===============================================================================
net session >nul 2>&1
if %errorlevel% equ 0 goto :ejecutar_instalador

echo ===============================================================================
echo   SOLICITANDO ELEVACION A PERMISOS DE ADMINISTRADOR DE WINDOWS...
echo ===============================================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/k \"\"%PROJECT_ROOT%\instalador_tienda\1_INSTALACIONES\1_INSTALADOR_MAESTRO_DESDE_CERO.bat\"\" --persistente' -Verb RunAs"
exit /b

:ejecutar_instalador
call "%PROJECT_ROOT%\instalador_tienda\1_INSTALACIONES\1_INSTALADOR_MAESTRO_DESDE_CERO.bat" --persistente
exit /b %errorlevel%
