@echo off
TITLE LLANOMIO POS - Paso 2: Iniciar Sistema y Servicio mDNS con PM2
COLOR 0A

:: Asegurar que el directorio de trabajo sea la raiz del proyecto
cd /d "%~dp0.."

echo ===============================================================================
echo                SISTEMA POS LOCAL LLANOMIO - INSTALADOR DE TIENDA
echo                    PASO 2: INICIO PERSISTENTE CON PM2 Y mDNS
echo ===============================================================================
echo.

:: 1. Detectar comando PM2 (Global o local npx)
set PM2_CMD=pm2
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    if exist "node_modules\.bin\pm2.cmd" (
        set PM2_CMD=node_modules\.bin\pm2.cmd
    ) else (
        set PM2_CMD=npx pm2
    )
)

echo [INFO] Utilizando ejecutor PM2: %PM2_CMD%

:: 2. Leer puertos configurados desde .env
set PORT_NEXT=3000
set PORT_HTTP=80
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if "%%A"=="PORT" set PORT_NEXT=%%B
        if "%%A"=="HTTP_PORT" set PORT_HTTP=%%B
        if "%%A"=="PORT_PROXY" set PORT_HTTP=%%B
    )
)

:: 3. Regla de Firewall de Windows para los puertos configurados (TCP)
echo [1/4] Verificando permisos de red local para los puertos TCP %PORT_HTTP% y %PORT_NEXT%...
netsh advfirewall firewall show rule name="POS_LLANOMIO_PUERTOS_WEB" >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Configurando regla de Firewall para permitir acceso en red local Wi-Fi...
    netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB" dir=in action=allow protocol=TCP localport=%PORT_HTTP%,%PORT_NEXT% >nul 2>nul
)

:: 4. Detener instancias previas si existen
echo [2/4] Verificando procesos previos en PM2...
call %PM2_CMD% delete pos-llanomio >nul 2>nul
call %PM2_CMD% delete pos-mdns-proxy >nul 2>nul

:: 5. Iniciar la aplicacion Next.js y el servicio mDNS/Proxy mediante ecosystem.config.js
echo [3/4] Levantando procesos en segundo plano con PM2...
call %PM2_CMD% start ecosystem.config.js
if %errorlevel% neq 0 (
    echo [ERROR] No se pudieron iniciar los procesos en PM2.
    pause
    exit /b 1
)

:: 6. Guardar configuracion de PM2 para restaurar tras reinicios
echo [4/4] Guardando estado de procesos para auto-inicio tras reiniciar el PC...
call %PM2_CMD% save

:: 7. Crear acceso directo en la carpeta de Inicio de Windows para auto-arranque desatendido
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set STARTUP_SCRIPT=%STARTUP_FOLDER%\Iniciar_LLANOMIO_Auto.bat

if exist "%STARTUP_FOLDER%" (
    echo @echo off > "%STARTUP_SCRIPT%"
    echo cd /d "%~dp0.." >> "%STARTUP_SCRIPT%"
    echo %PM2_CMD% resurrect >> "%STARTUP_SCRIPT%"
    echo [OK] Tarea de auto-arranque configurada en la carpeta Inicio de Windows.
)

echo.
echo ===============================================================================
echo                SISTEMA INICIADO EXITOSAMENTE EN SEGUNDO PLANO
echo ===============================================================================
echo.
echo Los servicios de LLANOMIO estan corriendo activamente:
echo   - Aplicacion Web Next.js: Puerto %PORT_NEXT%
echo   - Servidor Proxy LAN / HTTP: Puerto %PORT_HTTP%
echo   - Servicio mDNS (Bonjour): Anunciando llanomio.local en la red LAN
echo.
echo Direcciones de Acceso:
if "%PORT_HTTP%"=="80" (
    echo   1. Desde este computador principal:
    echo      - http://localhost
    echo      - http://llanomio.local
    echo.
    echo   2. Desde CUALQUIER Celular o Tablet conectado al Wi-Fi de la tienda:
    echo      - http://llanomio.local
) else (
    echo   1. Desde este computador principal:
    echo      - http://localhost:%PORT_HTTP%
    echo      - http://llanomio.local:%PORT_HTTP%
    echo.
    echo   2. Desde CUALQUIER Celular o Tablet conectado al Wi-Fi de la tienda:
    echo      - http://llanomio.local:%PORT_HTTP%
)
echo.
echo Estado de los procesos en PM2:
call %PM2_CMD% list
echo.
echo Puede cerrar esta ventana. El sistema continuara operando en segundo plano.
echo ===============================================================================
pause
