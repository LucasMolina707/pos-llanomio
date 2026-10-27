@echo off
chcp 65001 > nul
title POS LLANOMIO - Selector de Metodos de Instalacion
color 0B

:MENU
cls
echo ===============================================================================
echo                SISTEMA POS LOCAL LLANOMIO - INSTALADOR DE TIENDA
echo                         SELECTOR DE METODOS DE INSTALACION
echo ===============================================================================
echo.
echo Seleccione el metodo de instalacion que desea utilizar:
echo.
echo   [1] METODO 1: Scripts BAT Automatizados (RECOMENDADO para la Tienda)
echo       Asistentes visuales numerados para instalar, iniciar, respaldar y actualizar.
echo.
echo   [2] METODO 2: Clonacion e Instalacion desde GitHub
echo       Para computadores conectados a Internet usando Git y repositorios remotos.
echo.
echo   [3] METODO 3: Instalacion Portable desde Memoria USB / Archivo ZIP
echo       Para tiendas sin Git o con conectividad limitada.
echo.
echo   [4] METODO 4: Instalacion Manual por Comandos (CLI Node.js / Prisma)
echo       Manual detallado paso a paso para administradores de sistemas y soporte TI.
echo.
echo   [5] Salir
echo.
set /p OPC=">> Ingrese su opcion [1-5]: "

if "%OPC%"=="1" goto METODO_BAT
if "%OPC%"=="2" goto METODO_GITHUB
if "%OPC%"=="3" goto METODO_USB
if "%OPC%"=="4" goto METODO_CLI
if "%OPC%"=="5" goto SALIR

echo.
echo [ERROR] Opcion no valida.
timeout /t 2 > nul
goto MENU

:METODO_BAT
cls
echo Abriendo carpeta del Metodo Scripts BAT...
start "" "%~dp0metodo_scripts_bat"
goto MENU

:METODO_GITHUB
cls
echo Abriendo carpeta del Metodo GitHub...
start "" "%~dp0metodo_github"
goto MENU

:METODO_USB
cls
echo Abriendo carpeta del Metodo USB / ZIP...
start "" "%~dp0metodo_usb_zip"
goto MENU

:METODO_CLI
cls
echo Abriendo carpeta del Metodo Comandos...
start "" "%~dp0metodo_comandos"
goto MENU

:SALIR
exit /b 0
