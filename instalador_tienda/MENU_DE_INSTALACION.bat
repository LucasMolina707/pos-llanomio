@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Sistema POS Local - Menu de Administracion y Mantenimiento
color 0B

:: ===============================================================================
:: 1. Guardian de Ventana Persistente (Evita cierres inesperados)
:: ===============================================================================
if "%~1" NEQ "--persistente" (
    cmd /k ""%~f0" --persistente"
    exit /b
)

:: ===============================================================================
:: 2. Ubicacion del Proyecto y Runtime
:: ===============================================================================
cd /d "%~dp0"
if exist "..\package.json" (
    cd /d "%~dp0.."
)
set "PROJECT_ROOT=%CD%"

if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
) else (
    set "PATH=%PROJECT_ROOT%\node_modules\.bin;%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"
    set "NODE_EXE=node"
)

:: Validacion de Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    if not exist "%PROJECT_ROOT%\runtime\node\node.exe" (
        cls
        color 0C
        echo ===============================================================================
        echo                     ATENCION: NODE.JS NO ENCONTRADO
        echo ===============================================================================
        echo.
        echo Node.js no esta instalado ni se encuentra en runtime\node\node.exe.
        echo Descarguelo desde https://nodejs.org/ e instalelo con la opcion 'Add to PATH'.
        echo.
        pause
        exit /b 1
    )
)

:: Verificacion de PM2
set "PM2_CMD=pm2"
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
        set "PM2_CMD=%PROJECT_ROOT%\node_modules\.bin\pm2.cmd"
    ) else (
        set "PM2_CMD=npx --no-install pm2"
    )
)

:MENU
cls
echo ===============================================================================
echo                SISTEMA POS LOCAL - MENU DE CONTROL Y MANTENIMIENTO
echo ===============================================================================
echo.
echo Directorio: %PROJECT_ROOT%
echo Motor:      !NODE_EXE!
echo.
echo Seleccione una opcion:
echo.
echo   [1] Iniciar / Levantar Servidor POS (Abre navegador en puerto activo)
echo.
echo   [2] Asistente Maestro Post-Instalacion (Firewall, Puertos, Accesos y PM2)
echo.
echo   [3] Asistente Interactivo de Red y Puertos (escanear y cambiar puertos)
echo.
echo   [4] Preparar Paquete Limpio para Instalador .exe (npm run preparar:instalador)
echo.
echo   [5] Ver Estado de Servicios en Segundo Plano (PM2 Status)
echo.
echo   [6] Detener Todos los Servicios del POS
echo.
echo   [7] Reiniciar Servicios del POS
echo.
echo   [8] Abrir Carpeta de Respaldos (C:\POS_BACKUPS)
echo.
echo   [9] Salir
echo.
set /p OPC=">> Ingrese su opcion [1-9]: "

if "%OPC%"=="1" goto INICIAR_SERVIDOR
if "%OPC%"=="2" goto POST_INSTALADOR
if "%OPC%"=="3" goto ASISTENTE_PUERTOS
if "%OPC%"=="4" goto PREPARAR_PAQUETE
if "%OPC%"=="5" goto ESTADO_PM2
if "%OPC%"=="6" goto DETENER_SERVICIOS
if "%OPC%"=="7" goto REINICIAR_SERVICIOS
if "%OPC%"=="8" goto ABRIR_BACKUPS
if "%OPC%"=="9" goto SALIR

echo.
echo [ERROR] Opcion no valida.
timeout /t 2 > nul
goto MENU

:INICIAR_SERVIDOR
cls
call "%PROJECT_ROOT%\INICIAR_SERVIDOR_POS.bat"
goto MENU

:POST_INSTALADOR
cls
call "%PROJECT_ROOT%\instalador_tienda\POST_INSTALADOR_MAESTRO.bat" --persistente
goto MENU

:ASISTENTE_PUERTOS
cls
cd /d "%PROJECT_ROOT%"
call "!NODE_EXE!" scripts\escanear-y-elegir-puertos.js
echo.
echo Presione cualquier tecla para volver al menu principal...
pause >nul
goto MENU

:PREPARAR_PAQUETE
cls
cd /d "%PROJECT_ROOT%"
call "!NODE_EXE!" scripts\preparar-paquete-instalador.js
echo.
echo Presione cualquier tecla para volver al menu principal...
pause >nul
goto MENU

:ESTADO_PM2
cls
cd /d "%PROJECT_ROOT%"
echo ===============================================================================
echo                       ESTADO DE PROCESOS EN SEGUNDO PLANO
echo ===============================================================================
echo.
call !PM2_CMD! status
echo.
echo Presione cualquier tecla para volver al menu principal...
pause >nul
goto MENU

:DETENER_SERVICIOS
cls
echo Deteniendo procesos del POS...
call !PM2_CMD! stop all >nul 2>&1
echo [OK] Servicios detenidos.
timeout /t 2 > nul
goto MENU

:REINICIAR_SERVICIOS
cls
echo Reiniciando procesos del POS...
call !PM2_CMD! restart all >nul 2>&1
echo [OK] Servicios reiniciados.
timeout /t 2 > nul
goto MENU

:ABRIR_BACKUPS
cls
if not exist "C:\POS_BACKUPS" mkdir "C:\POS_BACKUPS" 2>nul
explorer.exe "C:\POS_BACKUPS"
goto MENU

:SALIR
exit /b 0
