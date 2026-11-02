@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Sistema POS Local Llanomio - Control y Arranque del Servidor

:: -------------------------------------------------------------------------------
:: 1. Deteccion de modo silencioso (para auto-arranque en Startup o servicios)
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

:: Si es ejecucion silenciosa, saltar directo al arranque desatendido
if "%MODO_SILENCIOSO%"=="1" goto :arranque_silencioso_directo

:MENU_PRINCIPAL
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
echo           SISTEMA POS LOCAL LLANOMIO - CONTROL Y ARRANQUE DEL SERVIDOR
echo ===============================================================================
echo Estado actual (.env):
echo   - Puerto Servidor Next.js:   !PORT!
echo   - Puerto Salida Red / Proxy: !HTTP_PORT!
echo   - Dominio Local Wi-Fi:       !LOCAL_DOMAIN!
echo   - Instancia PM2:             !INSTANCE_ID!
echo.
echo [1] Iniciar servidor y abrir en navegador predeterminado
echo [2] Iniciar servidor en Ventana Nativa POS (Modo App sin navegador)
echo [3] Cambiar / Personalizar Puertos y Dominio Local (Escaner interactivo)
echo [4] Reiniciar servicios de PM2 forzadamente
echo [5] Salir
echo ===============================================================================
echo.
set /p OPCION_INICIO=">> Seleccione una opcion [1-5]: "

if "%OPCION_INICIO%"=="1" goto :opcion_navegador_normal
if "%OPCION_INICIO%"=="2" goto :opcion_modo_app
if "%OPCION_INICIO%"=="3" goto :opcion_personalizar_puertos
if "%OPCION_INICIO%"=="4" goto :opcion_reiniciar_pm2
if "%OPCION_INICIO%"=="5" exit /b 0

echo.
echo [ERROR] Opcion no valida. Por favor ingrese un numero del 1 al 5.
timeout /t 2 >nul
goto :MENU_PRINCIPAL

:: -------------------------------------------------------------------------------
:: OPCION 1: Iniciar servidor y abrir en navegador predeterminado
:: -------------------------------------------------------------------------------
:opcion_navegador_normal
cls
echo ===============================================================================
echo           INICIANDO SERVIDOR Y TERMINAL POS (NAVEGADOR ESTANDAR)
echo ===============================================================================
echo.
call :asegurar_servidor_levantado
echo.
echo Abriendo consola web: http://localhost:!PORT!/login
start http://localhost:!PORT!/login
echo.
echo El servidor se encuentra activo en segundo plano.
echo Presione cualquier tecla para volver al menu principal...
pause >nul
goto :MENU_PRINCIPAL

:: -------------------------------------------------------------------------------
:: OPCION 2: Iniciar servidor en Ventana Nativa POS (Modo App sin navegador)
:: -------------------------------------------------------------------------------
:opcion_modo_app
cls
echo ===============================================================================
echo         INICIANDO TERMINAL POS EN VENTANA NATIVA (MODO APLICACION)
echo ===============================================================================
echo.
call :asegurar_servidor_levantado
echo.
if exist "%PROJECT_ROOT%\ABRIR_TERMINAL_POS_DIRECTO.bat" (
    call "%PROJECT_ROOT%\ABRIR_TERMINAL_POS_DIRECTO.bat"
) else (
    start http://localhost:!PORT!/login
)
echo.
echo Ventana nativa POS iniciada.
echo Presione cualquier tecla para volver al menu principal...
pause >nul
goto :MENU_PRINCIPAL

:: -------------------------------------------------------------------------------
:: OPCION 3: Personalizar Puertos, Proxy y Dominio Local mDNS
:: -------------------------------------------------------------------------------
:opcion_personalizar_puertos
cls
echo ===============================================================================
echo       ASISTENTE INTERACTIVO DE PUERTOS, PROXY Y DOMINIO LOCAL
echo ===============================================================================
echo.
cd /d "%PROJECT_ROOT%"
call "!NODE_EXE!" "%PROJECT_ROOT%\scripts\escanear-y-elegir-puertos.js"
echo.

:: Recargar variables actualizadas tras la ejecucion
if exist "%PROJECT_ROOT%\.env" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%PROJECT_ROOT%\.env") do (
        if "%%A"=="PORT" set "PORT=%%B"
        if "%%A"=="HTTP_PORT" set "HTTP_PORT=%%B"
        if "%%A"=="INSTANCE_ID" set "INSTANCE_ID=%%B"
        if "%%A"=="LOCAL_DOMAIN" set "LOCAL_DOMAIN=%%B"
    )
)

echo Actualizando servicios en segundo plano con la nueva configuracion...
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    call pm2 restart all --update-env >nul 2>&1
    call pm2 save >nul 2>&1
    echo [OK] Procesos PM2 actualizados y reiniciados.
) else if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
    call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" restart all --update-env >nul 2>&1
    call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" save >nul 2>&1
    echo [OK] Procesos PM2 locales actualizados y reiniciados.
)

echo.
echo Presione cualquier tecla para volver al menu principal...
pause >nul
goto :MENU_PRINCIPAL

:: -------------------------------------------------------------------------------
:: OPCION 4: Reiniciar servicios PM2 forzadamente
:: -------------------------------------------------------------------------------
:opcion_reiniciar_pm2
cls
echo ===============================================================================
echo                  REINICIANDO SERVICIOS EN SEGUNDO PLANO
echo ===============================================================================
echo.
if exist "%PROJECT_ROOT%\REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat" (
    call "%PROJECT_ROOT%\REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat"
) else (
    where pm2 >nul 2>&1
    if %errorlevel% equ 0 (
        call pm2 restart all
    ) else if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" restart all
    )
)
echo.
echo Presione cualquier tecla para volver al menu principal...
pause >nul
goto :MENU_PRINCIPAL

:: -------------------------------------------------------------------------------
:: SUBRUTINA: Asegurar que el servidor este levantado y respondiendo en el puerto
:: -------------------------------------------------------------------------------
:asegurar_servidor_levantado
netstat -ano -p tcp | findstr /R /C:":!PORT! " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] El servidor ya se encuentra activo en el puerto !PORT!.
    exit /b 0
)

echo [INFO] El servidor esta apagado. Levantando procesos en segundo plano...
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    call pm2 start "%PROJECT_ROOT%\ecosystem.config.js" >nul 2>&1
    call pm2 save >nul 2>&1
    goto :esperar_conexion
)

if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
    call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" start "%PROJECT_ROOT%\ecosystem.config.js" >nul 2>&1
    call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" save >nul 2>&1
    goto :esperar_conexion
)

:: Fallback con Node directo
start "" /b "%NODE_EXE%" "%PROJECT_ROOT%\start-pos.js"
start "" /b "%NODE_EXE%" "%PROJECT_ROOT%\scripts\servidor-lan-mdns.js"

:esperar_conexion
echo Aguardando 3 segundos mientras inicia el servidor...
timeout /t 3 /nobreak >nul 2>&1
exit /b 0

:: -------------------------------------------------------------------------------
:: ARRANQUE SILENCIOSO (Modo Startup o Segundo Plano)
:: -------------------------------------------------------------------------------
:arranque_silencioso_directo
set "PORT=3000"
set "INSTANCE_ID=pos-llanomio"

if exist "%PROJECT_ROOT%\.env" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%PROJECT_ROOT%\.env") do (
        if "%%A"=="PORT" set "PORT=%%B"
        if "%%A"=="INSTANCE_ID" set "INSTANCE_ID=%%B"
    )
)

netstat -ano -p tcp | findstr /R /C:":!PORT! " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 exit /b 0

where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    call pm2 start "%PROJECT_ROOT%\ecosystem.config.js" >nul 2>&1
    call pm2 save >nul 2>&1
    exit /b 0
)

if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
    call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" start "%PROJECT_ROOT%\ecosystem.config.js" >nul 2>&1
    call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" save >nul 2>&1
    exit /b 0
)

start "" /b "%NODE_EXE%" "%PROJECT_ROOT%\start-pos.js"
start "" /b "%NODE_EXE%" "%PROJECT_ROOT%\scripts\servidor-lan-mdns.js"
exit /b 0
