@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Diagnostico de Estado del Servidor - POS Llanomio

cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"
if not exist "%PROJECT_ROOT%\.tmp" mkdir "%PROJECT_ROOT%\.tmp" >nul 2>&1
set "TEMP=%PROJECT_ROOT%\.tmp"
set "TMP=%PROJECT_ROOT%\.tmp"

:DIAGNOSTICO_LOOP
color 0B
cls
echo ===============================================================================
echo            PANEL DE DIAGNOSTICO Y ESTADO DEL SERVIDOR POS
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.

:: 1. Cargar variables desde .env
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

echo [1. CONFIGURACION REGISTRADA (.env)]
echo   - Puerto Next.js:    !PORT!
echo   - Puerto Salida Red: !HTTP_PORT!
echo   - ID de Instancia:   !INSTANCE_ID!
echo   - Dominio mDNS:      !LOCAL_DOMAIN!
echo.

:: 2. Deteccion de IP Local en la Red LAN
echo [2. CONECTIVIDAD DE RED LAN]
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ips = Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*','Ethernet*','Local*' -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notmatch '^(169\.254|127\.)' }; " ^
  "if ($ips) { foreach ($ip in $ips) { Write-Host ('   - Direccion IP LAN (' + $ip.InterfaceAlias + '): http://' + $ip.IPAddress + ':!PORT!/login') } } else { Write-Host '   - No se detecto adaptador de red activo con IP privada.' }"
echo.

:: 3. Verificacion de Sockets TCP en Escucha
echo [3. ESTADO DE PUERTOS EN WINDOWS]
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$conn = Get-NetTCPConnection -LocalPort !PORT! -State Listen -ErrorAction SilentlyContinue; " ^
  "if ($conn) { Write-Host ('   [OK] Puerto TCP !PORT! en escucha (LISTENING) - Proceso PID: ' + $conn.OwningProcess) } else { Write-Host '   [ALERTA] Puerto TCP !PORT! cerrado o no responde.' }"
echo.

:: 4. Prueba de Respuesta HTTP
echo [4. PRUEBA DE CONEXION HTTP LOCAL]
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "try { " ^
  "  $sw = [System.Diagnostics.Stopwatch]::StartNew(); " ^
  "  $res = Invoke-WebRequest -Uri 'http://localhost:!PORT!/login' -UseBasicParsing -TimeoutSec 3; " ^
  "  $sw.Stop(); " ^
  "  Write-Host ('   [OK] Codigo HTTP: ' + $res.StatusCode + ' (' + $res.StatusDescription + ') - Tiempo de respuesta: ' + $sw.ElapsedMilliseconds + ' ms'); " ^
  "} catch { " ^
  "  Write-Host ('   [FALLO] No se pudo establecer comunicacion HTTP con el servidor: ' + $_.Exception.Message); " ^
  "}"
echo.

:: 5. Estado de la Base de Datos SQLite
echo [5. BASE DE DATOS SQLITE]
set "DB_FILE=%PROJECT_ROOT%\database\llanomio.db"
if exist "%DB_FILE%" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$f = Get-Item '%DB_FILE%'; " ^
      "$kb = [math]::Round($f.Length / 1KB, 2); " ^
      "Write-Host ('   [OK] Archivo detectado: database\llanomio.db (' + $kb + ' KB) - Ultima modificacion: ' + $f.LastWriteTime); " ^
      "if (Test-Path '%PROJECT_ROOT%\database\llanomio.db-wal') { Write-Host '   [INFO] Modo WAL activo (llanomio.db-wal presente).' }"
) else (
    echo   [ERROR CRITICO] No se encontro el archivo database\llanomio.db.
)
echo.

:: 6. Estado en Gestor PM2
echo [6. PROCESOS EN GESTOR PM2]
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    call pm2 jlist >nul 2>&1
    call pm2 describe !INSTANCE_ID! >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [OK] La aplicacion '!INSTANCE_ID!' esta registrada en PM2.
    ) else (
        echo   [AVISO] La aplicacion '!INSTANCE_ID!' no esta registrada en PM2.
    )
) else (
    echo   [INFO] PM2 global no instalado.
)
echo.

:: 7. Menu de Accion Rapida
echo ===============================================================================
echo [1] Actualizar y Refrescar Diagnostico
echo [2] Levantar / Reiniciar Servidor (Auto-recuperacion)
echo [3] Detener Servidor y Liberar Puertos
echo [4] Abrir POS en Pantalla Completa
echo [5] Salir
echo ===============================================================================
echo.
set /p OPC_DIAG=">> Ingrese una opcion [1-5]: "

if "%OPC_DIAG%"=="1" goto :DIAGNOSTICO_LOOP
if "%OPC_DIAG%"=="2" (
    call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\1_LEVANTAR_O_REINICIAR_SERVIDOR.bat"
    goto :DIAGNOSTICO_LOOP
)
if "%OPC_DIAG%"=="3" (
    call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\2_FINALIZAR_Y_DETENER_SERVIDOR.bat"
    goto :DIAGNOSTICO_LOOP
)
if "%OPC_DIAG%"=="4" (
    call "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\3_ABRIR_POS_PANTALLA_COMPLETA_SIN_NAVEGADOR.bat"
    goto :DIAGNOSTICO_LOOP
)
if "%OPC_DIAG%"=="5" exit /b 0

goto :DIAGNOSTICO_LOOP

