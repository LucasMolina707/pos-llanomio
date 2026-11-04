@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Detener y Finalizar Servidor POS - POS Llanomio

cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"

color 0E
cls
echo ===============================================================================
echo            DETENER Y FINALIZAR TODOS LOS PROCESOS DEL POS
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.

:: Cargar variables de .env
set "PORT=3000"
set "HTTP_PORT=3000"
set "INSTANCE_ID=pos-llanomio"

if exist "%PROJECT_ROOT%\.env" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%PROJECT_ROOT%\.env") do (
        if "%%A"=="PORT" set "PORT=%%B"
        if "%%A"=="HTTP_PORT" set "HTTP_PORT=%%B"
        if "%%A"=="INSTANCE_ID" set "INSTANCE_ID=%%B"
    )
)

echo [1/3] Deteniendo servicios en PM2...
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    call pm2 stop "!INSTANCE_ID!" >nul 2>&1
    call pm2 stop "!INSTANCE_ID!-mdns" >nul 2>&1
    call pm2 stop "!INSTANCE_ID!-tunnel" >nul 2>&1
    call pm2 delete "!INSTANCE_ID!" >nul 2>&1
    call pm2 delete "!INSTANCE_ID!-mdns" >nul 2>&1
    call pm2 delete "!INSTANCE_ID!-tunnel" >nul 2>&1
    call pm2 save >nul 2>&1
    echo [OK] Procesos PM2 globales detenidos y eliminados de la memoria.
) else (
    if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" stop "!INSTANCE_ID!" >nul 2>&1
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" stop "!INSTANCE_ID!-mdns" >nul 2>&1
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" delete "!INSTANCE_ID!" >nul 2>&1
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" delete "!INSTANCE_ID!-mdns" >nul 2>&1
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" save >nul 2>&1
        echo [OK] Procesos PM2 locales detenidos y eliminados.
    )
)

echo.
echo [2/3] Liberando sockets y cerrando procesos huerfanos en puertos [!PORT!, !HTTP_PORT!]...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports = @(!PORT!, !HTTP_PORT!); " ^
  "foreach ($p in $ports) { " ^
  "  $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue; " ^
  "  if ($conns) { " ^
  "    $conns.OwningProcess | Sort-Object -Unique | ForEach-Object { " ^
  "      Write-Host ('   -> Cerrando proceso PID: ' + $_); " ^
  "      Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue; " ^
  "    } " ^
  "  } " ^
  "}"

echo.
echo [3/3] Verificando liberacion de puertos TCP...
netstat -ano | findstr /R ":!PORT! " >nul 2>&1
if %errorlevel% equ 0 (
    echo [ADVERTENCIA] El puerto !PORT! aun registra conexiones residuales. Se forzara el cierre...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr /R ":!PORT! "') do (
        taskkill /F /PID %%a >nul 2>&1
    )
) else (
    echo [OK] Puerto TCP !PORT! completamente liberado.
)

echo.
echo ===============================================================================
echo             TODOS LOS SERVICIOS DEL POS HAN SIDO DETENIDOS
echo ===============================================================================
echo No hay procesos activos del POS consumiendo memoria ni bloqueando puertos.
echo Para volver a encender el sistema, ejecute '1_LEVANTAR_O_REINICIAR_SERVIDOR.bat'
echo o utilice el acceso directo 'POS Llanomio - Panel de Control'.
echo.
echo Presione cualquier tecla para salir...
pause >nul
exit /b 0
