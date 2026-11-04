@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Instalador y Configurador de Zabbix Agent 2 - POS Llanomio

:: ===============================================================================
:: 1. Verificacion y Auto-Elevacion UAC a Administrador
:: ===============================================================================
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Solicitando permisos de Administrador para instalar servicio de Zabbix...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:: ===============================================================================
:: 2. Ubicar la raiz del proyecto y directorio del script
:: ===============================================================================
cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"
set "SCRIPT_DIR=%~dp0"
set "BIN_DIR=%SCRIPT_DIR%bin"

if not exist "%BIN_DIR%" mkdir "%BIN_DIR%" >nul 2>&1

color 0B
cls
echo ===============================================================================
echo        INSTALACION Y CONFIGURACION DE MONITOREO ZABBIX AGENT 2
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.
echo Este asistente instala el Agente 2 de Zabbix para monitoreo 24/7 en tiempo real
echo del estado de salud del Sistema POS, tamano de base de datos y procesos activos.
echo.

:: Detectar variables del .env del POS
set "PORT=3000"
if exist "%PROJECT_ROOT%\.env" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%PROJECT_ROOT%\.env") do (
        if "%%A"=="PORT" set "PORT=%%B"
    )
)

:: ===============================================================================
:: 3. Solicitud Interactiva de Parametros Zabbix
:: ===============================================================================
set "DEFAULT_SERVER=127.0.0.1"
set "DEFAULT_HOSTNAME=POS-LLANOMIO-%COMPUTERNAME%"
set "DEFAULT_PORT=10050"

echo Configure los parametros de conexion con su Servidor Zabbix:
echo.
set /p ZBX_SERVER="IP o Dominio del Servidor Zabbix [Por defecto: %DEFAULT_SERVER%]: "
if "!ZBX_SERVER!"=="" set "ZBX_SERVER=%DEFAULT_SERVER%"

set /p ZBX_HOST="Nombre de este Equipo en Zabbix (Hostname) [Por defecto: %DEFAULT_HOSTNAME%]: "
if "!ZBX_HOST!"=="" set "ZBX_HOST=%DEFAULT_HOSTNAME%"

set /p ZBX_PORT="Puerto de Escucha del Agente [Por defecto: %DEFAULT_PORT%]: "
if "!ZBX_PORT!"=="" set "ZBX_PORT=%DEFAULT_PORT%"

echo.
echo Parametros confirmados:
echo   - Servidor Zabbix: !ZBX_SERVER!
echo   - Hostname Agente: !ZBX_HOST!
echo   - Puerto Agente:   !ZBX_PORT!
echo   - Puerto POS Local: !PORT!
echo.

:: ===============================================================================
:: 4. Obtencion del Instalador MSI de Zabbix Agent 2
:: ===============================================================================
set "MSI_FILE="
for %%f in ("%BIN_DIR%\*.msi") do (
    set "MSI_FILE=%%f"
    goto :msi_encontrado
)

:descargar_msi
echo [DESCARGA] No se encontro instalador MSI local en '%BIN_DIR%'.
echo Descargando Zabbix Agent 2 LTS oficial para Windows x64...
set "MSI_FILE=%BIN_DIR%\zabbix_agent2.msi"
set "MSI_URL=https://cdn.zabbix.com/zabbix/binaries/stable/7.0/7.0.0/zabbix_agent2-7.0.0-windows-amd64-openssl.msi"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
  "try { " ^
  "  Write-Host '   -> Conectando con cdn.zabbix.com...'; " ^
  "  (New-Object System.Net.WebClient).DownloadFile('%MSI_URL%', '%MSI_FILE%'); " ^
  "  Write-Host '   [OK] Descarga completada exitosamente.'; " ^
  "} catch { " ^
  "  Write-Host ('   [ERROR] Fallo la descarga automatica: ' + $_.Exception.Message); " ^
  "  exit 1; " ^
  "}"

if %errorlevel% neq 0 (
    echo.
    echo [ADVERTENCIA] No fue posible descargar el instalador automaticamente.
    echo Puede descargar manualmente el instalador MSI de Zabbix Agent 2 para Windows y
    echo colocarlo en la carpeta:
    echo %BIN_DIR%\zabbix_agent2.msi
    echo.
    pause
    exit /b 1
)

:msi_encontrado
echo [OK] Instalador MSI localizado: !MSI_FILE!
echo.

:: ===============================================================================
:: 5. Instalacion Desatendida Silenciosa
:: ===============================================================================
echo [INSTALACION] Instalando Zabbix Agent 2 de forma desatendida...

msiexec.exe /i "!MSI_FILE!" /qn /norestart ^
  SERVER="!ZBX_SERVER!" ^
  SERVERACTIVE="!ZBX_SERVER!" ^
  HOSTNAME="!ZBX_HOST!" ^
  LISTENPORT="!ZBX_PORT!" ^
  ENABLEPATH=1

if %errorlevel% neq 0 (
    echo [ERROR] La instalacion del MSI devolvio codigo de salida: %errorlevel%
    pause
    exit /b 1
)
echo [OK] Paquete MSI de Zabbix Agent 2 instalado correctamente.
echo.

:: ===============================================================================
:: 6. Inyeccion de UserParameters Especificos para POS Llanomio
:: ===============================================================================
echo [CONFIGURACION] Configurando metricas del POS Llanomio (UserParameters)...

set "ZBX_CONF_DIR=C:\Program Files\Zabbix Agent 2"
set "ZBX_CONF_FILE=%ZBX_CONF_DIR%\zabbix_agent2.conf"
set "ZBX_CONF_D=%ZBX_CONF_DIR%\zabbix_agent2.d"

if not exist "%ZBX_CONF_D%" mkdir "%ZBX_CONF_D%" >nul 2>&1

:: Crear archivo de parametros exclusivo para el POS
set "POS_ZBX_CONF=%ZBX_CONF_D%\pos_llanomio.conf"

(
    echo ### PARAMETROS DE MONITOREO POS LLANOMIO ###
    echo # 1. Estado del Servidor POS (1=En linea / 0=Caido^)
    echo UserParameter=pos.status,powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:!PORT!/login' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { Write-Output 1 } else { Write-Output 0 } } catch { Write-Output 0 }"
    echo.
    echo # 2. Tamano en Bytes de la Base de Datos SQLite (database\llanomio.db^)
    echo UserParameter=pos.db.size,powershell -NoProfile -Command "if (Test-Path '%PROJECT_ROOT%\database\llanomio.db') { (Get-Item '%PROJECT_ROOT%\database\llanomio.db').Length } else { Write-Output 0 }"
    echo.
    echo # 3. Cantidad de Procesos Node.js Activos en el Sistema
    echo UserParameter=pos.node.processes,powershell -NoProfile -Command "(Get-Process node -ErrorAction SilentlyContinue).Count"
) > "%POS_ZBX_CONF%"

echo [OK] Archivo de metricas creado en:
echo      %POS_ZBX_CONF%

:: Asegurar que el conf principal incluya Include=.\zabbix_agent2.d\*.conf
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "if (Test-Path '%ZBX_CONF_FILE%') { " ^
  "  $c = Get-Content '%ZBX_CONF_FILE%' -Raw; " ^
  "  if ($c -notmatch 'Include=.*zabbix_agent2\.d') { " ^
  "    Add-Content -Path '%ZBX_CONF_FILE%' -Value 'Include=C:\Program Files\Zabbix Agent 2\zabbix_agent2.d\*.conf'; " ^
  "  } " ^
  "}" >nul 2>&1

echo.

:: ===============================================================================
:: 7. Apertura de Puertos en Firewall de Windows
:: ===============================================================================
echo [FIREWALL] Configurando reglas de Firewall para Zabbix Agent (TCP 10050 y 10051)...

netsh advfirewall firewall delete rule name="Zabbix_Agent_2_Inbound" >nul 2>&1
netsh advfirewall firewall delete rule name="Zabbix_Agent_2_Outbound" >nul 2>&1

netsh advfirewall firewall add rule name="Zabbix_Agent_2_Inbound" dir=in action=allow protocol=TCP localport=!ZBX_PORT! profile=any description="Permite sondeo pasivo del servidor Zabbix" >nul 2>&1
netsh advfirewall firewall add rule name="Zabbix_Agent_2_Outbound" dir=out action=allow protocol=TCP remoteport=10051 profile=any description="Permite envio de metricas activas al servidor Zabbix" >nul 2>&1

echo [OK] Reglas de Firewall aplicadas.
echo.

:: ===============================================================================
:: 8. Inicio y Configuracion del Servicio Windows
:: ===============================================================================
echo [SERVICIO] Iniciando servicio Zabbix Agent 2 en Windows...

sc config "Zabbix Agent 2" start= auto >nul 2>&1
net stop "Zabbix Agent 2" >nul 2>&1
net start "Zabbix Agent 2" >nul 2>&1

echo [OK] Servicio Zabbix Agent 2 iniciado y configurado en arranque automatico.
echo.

:: ===============================================================================
:: 9. Prueba Local Inmediata de UserParameters
:: ===============================================================================
echo [TEST] Comprobando lectura local de las 3 metricas del POS:
echo.

set "ZBX_BIN=C:\Program Files\Zabbix Agent 2\zabbix_agent2.exe"
if exist "%ZBX_BIN%" (
    echo Probando pos.status...
    "%ZBX_BIN%" -c "%ZBX_CONF_FILE%" -t pos.status
    echo.
    echo Probando pos.db.size...
    "%ZBX_BIN%" -c "%ZBX_CONF_FILE%" -t pos.db.size
    echo.
    echo Probando pos.node.processes...
    "%ZBX_BIN%" -c "%ZBX_CONF_FILE%" -t pos.node.processes
)

echo.
echo ===============================================================================
echo           INSTALACION Y CONFIGURACION DE ZABBIX EXITOSA
echo ===============================================================================
echo Datos para registrar este equipo en la Interfaz Web de su Servidor Zabbix:
echo   - Host name:         !ZBX_HOST!
echo   - Interface Type:    Agent
echo   - IP Address:        [IP local de esta maquina]
echo   - Port:              !ZBX_PORT!
echo   - Monitoreo Activo:  pos.status, pos.db.size, pos.node.processes
echo.
echo Presione cualquier tecla para finalizar...
pause >nul
exit /b 0
