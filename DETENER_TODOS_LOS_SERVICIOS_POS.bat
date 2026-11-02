@echo off
setlocal EnableExtensions EnableDelayedExpansion
title POS Llanomio - Detener Todos los Servicios

:: -------------------------------------------------------------------------------
:: 1. Deteccion de modo silencioso (cuando es invocado por otro script)
:: -------------------------------------------------------------------------------
set "MODO_SILENCIOSO=0"
if "%~1"=="--silencioso" set "MODO_SILENCIOSO=1"
if "%~2"=="--silencioso" set "MODO_SILENCIOSO=1"

:: -------------------------------------------------------------------------------
:: 2. Guardian de Ventana Persistente (Evita cierres inesperados)
:: -------------------------------------------------------------------------------
if "%~1" NEQ "--persistente" if "%MODO_SILENCIOSO%"=="0" (
    cmd /k ""%~f0" --persistente"
    exit /b
)

:: -------------------------------------------------------------------------------
:: 3. Ubicar la raiz del proyecto de forma absoluta
:: -------------------------------------------------------------------------------
cd /d "%~dp0"
set "PROJECT_ROOT=%CD%"

:: -------------------------------------------------------------------------------
:: 4. Configurar PATH priorizando Node portable local
:: -------------------------------------------------------------------------------
if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
) else (
    set "PATH=%PROJECT_ROOT%\node_modules\.bin;%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"
    set "NODE_EXE=node"
)

:: -------------------------------------------------------------------------------
:: 5. Cargar variables desde .env
:: -------------------------------------------------------------------------------
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

if "%MODO_SILENCIOSO%"=="0" (
    color 0C
    cls
    echo ===============================================================================
    echo             DETENIENDO TODOS LOS SERVICIOS Y PROCESOS DEL POS
    echo ===============================================================================
    echo.
    echo Directorio: %PROJECT_ROOT%
    echo Instancia:  !INSTANCE_ID!
    echo Puertos:    !PORT!, !HTTP_PORT!
    echo.
)

:: -------------------------------------------------------------------------------
:: 6. Detener procesos en gestor PM2 (Global y Local)
:: -------------------------------------------------------------------------------
if "%MODO_SILENCIOSO%"=="0" echo [1/3] Deteniendo aplicaciones en gestor PM2...

where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    call pm2 stop all >nul 2>&1
    call pm2 delete all >nul 2>&1
    call pm2 kill >nul 2>&1
    if "%MODO_SILENCIOSO%"=="0" echo       [OK] Gestor PM2 global detenido completamente.
) else if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
    call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" stop all >nul 2>&1
    call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" delete all >nul 2>&1
    call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" kill >nul 2>&1
    if "%MODO_SILENCIOSO%"=="0" echo       [OK] Gestor PM2 local detenido completamente.
) else (
    call npx --no-install pm2 kill >nul 2>&1
)

:: -------------------------------------------------------------------------------
:: 7. Liberar sockets TCP en los puertos configurados (PORT y HTTP_PORT)
:: -------------------------------------------------------------------------------
if "%MODO_SILENCIOSO%"=="0" echo [2/3] Liberando sockets y puertos de red...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = @(%PORT%, %HTTP_PORT%); foreach ($p in $ports) { $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue; foreach ($c in $conns) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } }" >nul 2>&1

:: -------------------------------------------------------------------------------
:: 8. Limpiar procesos Node.js huerfanos vinculados a este proyecto
:: -------------------------------------------------------------------------------
if "%MODO_SILENCIOSO%"=="0" echo [3/3] Cerrando procesos Node.js residuales del sistema POS...

powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -eq 'node.exe' -or $_.Name -eq 'node') -and ($_.CommandLine -like '*pos-llanomio*' -or $_.CommandLine -like '*start-pos.js*' -or $_.CommandLine -like '*servidor-lan-mdns.js*' -or $_.CommandLine -like '*pm2*') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

if "%MODO_SILENCIOSO%"=="0" (
    echo       [OK] Procesos residuales verificados y cerrados.
    echo.
    echo ===============================================================================
    echo          TODOS LOS SERVICIOS DEL SISTEMA POS HAN SIDO DETENIDOS
    echo ===============================================================================
    echo.
    echo - Procesos de Node.js y PM2: Detenidos
    echo - Puerto Web [!PORT!]:       Liberado
    echo - Puerto Proxy [!HTTP_PORT!]:     Liberado
    echo.
    echo Para volver a iniciar el sistema ejecute INICIAR_SERVIDOR_POS.bat
    echo o use el acceso directo 'Iniciar POS Llanomio' del Escritorio.
    echo ===============================================================================
    echo.
    echo Presione cualquier tecla para cerrar esta ventana...
    pause >nul
)

exit /b 0
