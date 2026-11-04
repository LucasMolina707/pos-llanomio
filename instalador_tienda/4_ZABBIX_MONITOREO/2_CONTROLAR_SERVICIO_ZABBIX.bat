@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Control y Monitoreo del Servicio Zabbix Agent 2 - POS Llanomio

:: Verificacion UAC
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Solicitando permisos de Administrador para gestionar el servicio Zabbix...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

set "ZBX_DIR=C:\Program Files\Zabbix Agent 2"
set "ZBX_CONF=%ZBX_DIR%\zabbix_agent2.conf"
set "ZBX_EXE=%ZBX_DIR%\zabbix_agent2.exe"
set "ZBX_LOG=%ZBX_DIR%\zabbix_agent2.log"

:MENU_ZABBIX
color 0B
cls
echo ===============================================================================
echo          CENTRO DE CONTROL DEL SERVICIO ZABBIX AGENT 2 (MONITOREO)
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.
sc query "Zabbix Agent 2" | findstr "STATE"
echo.
echo [1] Consultar Estado Detallado del Servicio
echo [2] Iniciar Servicio Zabbix Agent 2
echo [3] Detener Servicio Zabbix Agent 2
echo [4] Reiniciar Servicio Zabbix Agent 2
echo [5] Ejecutar Test de Metricas Locales (pos.status, pos.db.size, pos.node.processes)
echo [6] Ver Ultimas Lineas del Archivo de Log (zabbix_agent2.log)
echo [7] Salir
echo.
echo ===============================================================================
echo.
set /p OPC_ZBX=">> Seleccione una opcion [1-7]: "

if "%OPC_ZBX%"=="1" goto :ESTADO_SERVICIO
if "%OPC_ZBX%"=="2" goto :INICIAR_SERVICIO
if "%OPC_ZBX%"=="3" goto :DETENER_SERVICIO
if "%OPC_ZBX%"=="4" goto :REINICIAR_SERVICIO
if "%OPC_ZBX%"=="5" goto :TEST_METRICAS
if "%OPC_ZBX%"=="6" goto :VER_LOGS
if "%OPC_ZBX%"=="7" exit /b 0

echo Opcion invalida.
timeout /t 2 >nul
goto :MENU_ZABBIX

:ESTADO_SERVICIO
echo.
echo [ESTADO DEL SERVICIO]
sc query "Zabbix Agent 2"
echo.
pause
goto :MENU_ZABBIX

:INICIAR_SERVICIO
echo.
echo [INICIANDO] Levantando servicio Zabbix Agent 2...
net start "Zabbix Agent 2"
echo.
pause
goto :MENU_ZABBIX

:DETENER_SERVICIO
echo.
echo [DETENIENDO] Apagando servicio Zabbix Agent 2...
net stop "Zabbix Agent 2"
echo.
pause
goto :MENU_ZABBIX

:REINICIAR_SERVICIO
echo.
echo [REINICIANDO] Reiniciando servicio Zabbix Agent 2...
net stop "Zabbix Agent 2" >nul 2>&1
timeout /t 1 >nul
net start "Zabbix Agent 2"
echo.
pause
goto :MENU_ZABBIX

:TEST_METRICAS
echo.
echo [PRUEBA DE METRICAS DEL POS EN VIVO]
if not exist "%ZBX_EXE%" (
    echo [ERROR] No se encontro el ejecutable en %ZBX_EXE%
    pause
    goto :MENU_ZABBIX
)

echo Evaluando 'pos.status' (Estado web del POS: 1=OK, 0=Caido):
"%ZBX_EXE%" -c "%ZBX_CONF%" -t pos.status
echo.
echo Evaluando 'pos.db.size' (Tamano de la base de datos en bytes):
"%ZBX_EXE%" -c "%ZBX_CONF%" -t pos.db.size
echo.
echo Evaluando 'pos.node.processes' (Procesos Node.js en memoria):
"%ZBX_EXE%" -c "%ZBX_CONF%" -t pos.node.processes
echo.
pause
goto :MENU_ZABBIX

:VER_LOGS
echo.
echo [ULTIMAS LINEAS DEL ARCHIVO DE LOG]
if not exist "%ZBX_LOG%" (
    echo [INFO] Archivo de log no encontrado en %ZBX_LOG%
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content '%ZBX_LOG%' -Tail 30"
)
echo.
pause
goto :MENU_ZABBIX
