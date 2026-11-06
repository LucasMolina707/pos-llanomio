@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Panel de Control Maestro - Sistema POS Llanomio

:: -------------------------------------------------------------------------------
:: 1. Deteccion de modo silencioso (para auto-arranque en Windows Startup)
:: -------------------------------------------------------------------------------
if "%~1"=="--iniciar-silencioso" (
    cd /d "%~dp0"
    set "PROJECT_ROOT=%CD%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"
if not exist "%PROJECT_ROOT%\.pm2" mkdir "%PROJECT_ROOT%\.pm2" >nul 2>&1
set "PM2_HOME=%PROJECT_ROOT%\.pm2"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"
    call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\5_ABRIR_POS_PANTALLA_COMPLETA.bat"
    exit /b 0
)

:: -------------------------------------------------------------------------------
:: 2. Guardian de Ventana Persistente
:: -------------------------------------------------------------------------------
if "%~1" NEQ "--persistente" (
    cmd /k ""%~f0" --persistente"
    exit /b
)

:: -------------------------------------------------------------------------------
:: 3. Ubicar la raiz del proyecto
:: -------------------------------------------------------------------------------
cd /d "%~dp0"
set "PROJECT_ROOT=%CD%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"
if not exist "%PROJECT_ROOT%\.pm2" mkdir "%PROJECT_ROOT%\.pm2" >nul 2>&1
set "PM2_HOME=%PROJECT_ROOT%\.pm2"

:MENU_MAESTRO
color 0B
cls

:: Cargar variables actuales desde .env
set "PORT=3000"
set "HTTP_PORT=3000"
set "INSTANCE_ID=pos-llanomio"
set "LOCAL_DOMAIN=llanomio.local"

if exist "%PROJECT_ROOT%\.env" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%PROJECT_ROOT%\.env") do (
        if "%%A"=="PORT" set "PORT=%%B"
        if "%%A"=="HTTP_PORT" set "HTTP_PORT=%%B"
        if "%%A"=="INSTANCE_ID" set "INSTANCE_ID=%%B"
        if "%%A"=="LOCAL_DOMAIN" set "LOCAL_DOMAIN=%%B"
    )
)

echo ===============================================================================
echo            PANEL DE CONTROL MAESTRO - SISTEMA POS LLANOMIO
echo ===============================================================================
echo Estado de Configuracion (.env):
echo   - Puerto Local:   !PORT!
echo   - Red LAN:        http://!LOCAL_DOMAIN!:!PORT!/login
echo   - Instancia:      !INSTANCE_ID!
echo.
echo [0] Instalacion y Despliegue Maestro desde Cero (Node.js, BD, Autoarranque)
echo [1] Iniciar / Levantar Servidor POS (1_INICIALIZAR_SITIO_POS)
echo [2] Abrir Terminal POS Pantalla Completa (5_ABRIR_POS_PANTALLA_COMPLETA)
echo [3] Reiniciar Sitio POS y Optimizar Velocidad (3_REINICIAR_SITIO_RAPIDO_POS)
echo [4] Reconfigurar Puertos TCP y Dominio Local de Red
echo [5] Copias de Seguridad y Restauracion de Base de Datos
echo [6] Aplicar Actualizacion Segura (Parche .ZIP o GitHub)
echo [7] Monitoreo y Servicio Zabbix Agent 2
echo [8] Detener y Pausar Servidor POS (2_DETENER_PAUSAR_SERVIDOR_POS)
echo [9] Activar Inicio Automatico con Windows (4_ACTIVAR_INICIO_AUTOMATICO_PC)
echo [X] Salir
echo ===============================================================================
echo.
set /p OPC_MAE=">> Seleccione una opcion [0-9 o X]: "

if "%OPC_MAE%"=="0" (
    call "%PROJECT_ROOT%\INSTALADOR_MAESTRO_UNICO_POS.bat"
    goto :MENU_MAESTRO
)
if "%OPC_MAE%"=="1" (
    call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\1_INICIALIZAR_SITIO_POS.bat"
    goto :MENU_MAESTRO
)
if "%OPC_MAE%"=="2" (
    call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\5_ABRIR_POS_PANTALLA_COMPLETA.bat"
    goto :MENU_MAESTRO
)
if "%OPC_MAE%"=="3" (
    call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\3_REINICIAR_SITIO_RAPIDO_POS.bat"
    goto :MENU_MAESTRO
)
if "%OPC_MAE%"=="4" (
    call "%PROJECT_ROOT%\instalador_tienda\1_INSTALACIONES\2_CONFIGURAR_PUERTOS_Y_DOMINIO.bat"
    goto :MENU_MAESTRO
)
if "%OPC_MAE%"=="5" (
    call "%PROJECT_ROOT%\instalador_tienda\3_ACTUALIZACIONES\3_RESPALDAR_Y_RESTAURAR_BASE_DATOS.bat"
    goto :MENU_MAESTRO
)
if "%OPC_MAE%"=="6" (
    call "%PROJECT_ROOT%\instalador_tienda\3_ACTUALIZACIONES\2_APLICAR_ACTUALIZACION_CLIENTE_SEGURO.bat"
    goto :MENU_MAESTRO
)
if "%OPC_MAE%"=="7" (
    call "%PROJECT_ROOT%\instalador_tienda\4_ZABBIX_MONITOREO\2_CONTROLAR_SERVICIO_ZABBIX.bat"
    goto :MENU_MAESTRO
)
if "%OPC_MAE%"=="8" (
    call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\2_DETENER_PAUSAR_SERVIDOR_POS.bat"
    goto :MENU_MAESTRO
)
if "%OPC_MAE%"=="9" (
    call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\4_ACTIVAR_INICIO_AUTOMATICO_PC.bat"
    goto :MENU_MAESTRO
)
if /i "%OPC_MAE%"=="X" exit /b 0

echo.
echo [ERROR] Opcion no valida. Seleccione un numero del 0 al 9.
timeout /t 2 >nul
goto :MENU_MAESTRO

