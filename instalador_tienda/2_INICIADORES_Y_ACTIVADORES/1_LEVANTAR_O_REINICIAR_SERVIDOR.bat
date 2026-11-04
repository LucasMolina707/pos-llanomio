@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Levantar o Reiniciar Servidor POS - POS Llanomio

cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"

color 0A
cls
echo ===============================================================================
echo            LEVANTAR O REINICIAR SERVIDOR POS - RESCATE RAPIDO
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.

:: Detectar Node.js
if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
) else (
    set "PATH=%PROJECT_ROOT%\node_modules\.bin;%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"
    set "NODE_EXE=node"
)

:: Cargar variables de .env
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

echo [CONFIG] Parametros de ejecucion:
echo   - Puerto Next.js:    !PORT!
echo   - Puerto Proxy:      !HTTP_PORT!
echo   - Instancia:         !INSTANCE_ID!
echo   - Dominio mDNS:      !LOCAL_DOMAIN!
echo.

:: Gestion con PM2 si esta disponible
set "USAR_PM2=0"
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    set "PM2_CMD=pm2"
    set "USAR_PM2=1"
) else (
    if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
        set "PM2_CMD=%PROJECT_ROOT%\node_modules\.bin\pm2.cmd"
        set "USAR_PM2=1"
    )
)

if "%USAR_PM2%"=="1" (
    echo [PM2] Reiniciando servicios gestionados por PM2...
    call !PM2_CMD! restart "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
    if !errorlevel! neq 0 (
        echo [PM2] Instancia no activa, iniciando por primera vez...
        call !PM2_CMD! start "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
    )
    call !PM2_CMD! save >nul 2>&1
    echo [OK] Procesos PM2 levantados y guardados.
) else (
    echo [PROCESOS] PM2 no disponible. Verificando procesos en puerto [!PORT!]...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$conn = Get-NetTCPConnection -LocalPort !PORT! -ErrorAction SilentlyContinue; " ^
      "if ($conn) { $conn.OwningProcess | Sort-Object -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }" >nul 2>&1
    
    echo [PROCESOS] Iniciando servidor de produccion en segundo plano...
    start "Servidor_POS_Llanomio" /min "%NODE_EXE%" "%PROJECT_ROOT%\start-pos.js"
)

echo.
echo [SONDEO] Verificando respuesta HTTP en http://localhost:!PORT!/login...
set "SERVIDOR_LISTO=0"
for /L %%i in (1,1,15) do (
    if "!SERVIDOR_LISTO!"=="0" (
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
          "try { $r = Invoke-WebRequest -Uri 'http://localhost:!PORT!/login' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
        if !errorlevel! equ 0 (
            set "SERVIDOR_LISTO=1"
            echo [OK] Servidor web respondiendo correctamente en intento %%i/15.
        ) else (
            timeout /t 1 >nul
        )
    )
)

echo.
echo ===============================================================================
if "!SERVIDOR_LISTO!"=="1" (
    echo                EL SERVIDOR SE ENCUENTRA 100%% OPERATIVO
    echo ===============================================================================
    echo.
    echo   - Acceso Local:  http://localhost:!PORT!/login
    echo   - Acceso en Red: http://!LOCAL_DOMAIN!:!PORT!/login
    echo.
    set /p ABRIR_NAV="Desea abrir el POS en su navegador predeterminado? (S/N): "
    if /i "!ABRIR_NAV!"=="S" (
        start http://localhost:!PORT!/login
    )
) else (
    echo             ADVERTENCIA: EL SERVIDOR TARDA EN RESPONDER
    echo ===============================================================================
    echo.
    echo El proceso fue iniciado, pero la conexion HTTP aun no retorno codigo 200.
    echo Verifique los logs o ejecute '4_ESTADO_Y_DIAGNOSTICO_SERVIDOR.bat'.
    echo Puede intentar acceder manualmente en: http://localhost:!PORT!/login
)

echo.
echo Presione cualquier tecla para salir...
pause >nul
exit /b 0
