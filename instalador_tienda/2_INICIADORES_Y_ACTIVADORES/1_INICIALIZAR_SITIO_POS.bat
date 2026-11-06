@echo off
setlocal EnableExtensions EnableDelayedExpansion
title 1. Inicializar Sitio POS (Levantar si Cayo) - POS Llanomio
color 0A

cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"

echo ===============================================================================
echo            1. INICIALIZAR Y LEVANTAR SERVIDOR POS LLANOMIO
echo ===============================================================================
echo.

call "%PROJECT_ROOT%\RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat"

echo.
echo Presione cualquier tecla para abrir el POS o cierre esta ventana...
pause >nul
call "%PROJECT_ROOT%\ABRIR_SISTEMA_PANTALLA_COMPLETA.bat"
exit /b 0

