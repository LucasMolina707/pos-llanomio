@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Panel de Control Maestro - Sistema POS Llanomio

:: -------------------------------------------------------------------------------
:: 1. Deteccion de modo silencioso (para auto-arranque en Windows Startup)
:: -------------------------------------------------------------------------------
if "%~1"=="--iniciar-silencioso" (
    cd /d "%~dp0"
    set "PROJECT_ROOT=%CD%"
    call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\3_ABRIR_POS_PANTALLA_COMPLETA_SIN_NAVEGADOR.bat"
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
echo [1] Iniciar / Levantar Servidor POS (Abre Navegador Web)
echo [2] Abrir POS en Modo Aplicacion Nativa (Pantalla Completa sin Navegador)
echo [3] Diagnostico de Red, Puertos y Base de Datos en Tiempo Real
echo [4] Reconfigurar Puertos TCP y Dominio Local de Red
echo [5] Copias de Seguridad y Restauracion de Base de Datos
echo [6] Aplicar Actualizacion Segura (Parche .ZIP o GitHub)
echo [7] Monitoreo y Servicio Zabbix Agent 2
echo [8] Detener Todos los Procesos y Liberar Recursos
echo [9] Salir
echo ===============================================================================
echo.
set /p OPC_MAE=">> Seleccione una opcion [1-9]: "

if "%OPC_MAE%"=="1" (
    call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\1_LEVANTAR_O_REINICIAR_SERVIDOR.bat"
    goto :MENU_MAESTRO
)
if "%OPC_MAE%"=="2" (
    call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\3_ABRIR_POS_PANTALLA_COMPLETA_SIN_NAVEGADOR.bat"
    goto :MENU_MAESTRO
)
if "%OPC_MAE%"=="3" (
    call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\4_ESTADO_Y_DIAGNOSTICO_SERVIDOR.bat"
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
    call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\2_FINALIZAR_Y_DETENER_SERVIDOR.bat"
    goto :MENU_MAESTRO
)
if "%OPC_MAE%"=="9" exit /b 0

echo.
echo [ERROR] Opcion no valida. Seleccione un numero del 1 al 9.
timeout /t 2 >nul
goto :MENU_MAESTRO
