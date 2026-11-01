@echo off
setlocal EnableDelayedExpansion
title POS LLANOMIO - Asistente de Configuracion Inicial Post-Instalacion
color 0B

:: ===============================================================================
:: 1. Verificacion y Auto-Elevacion a Permisos de Administrador (UAC)
:: ===============================================================================
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ===============================================================================
    echo         SOLICITANDO PERMISOS DE ADMINISTRADOR DE WINDOWS...
    echo ===============================================================================
    echo Este asistente requiere permisos elevados para configurar el Firewall de Windows,
    echo registrar los servicios en segundo plano y crear los accesos directos.
    echo.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:: ===============================================================================
:: 2. Ubicar la raiz del proyecto de forma relativa (100% independiente de unidad)
:: ===============================================================================
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."
set "APP_DIR=%CD%"

cls
echo ===============================================================================
echo       SISTEMA POS LLANOMIO - ASISTENTE DE CONFIGURACION POST-INSTALACION
echo ===============================================================================
echo.
echo Directorio base de ejecucion detectado:
echo %APP_DIR%
echo.

:: ===============================================================================
:: 3. Localizar Runtime de Node.js (Portable local o en PATH del sistema)
:: ===============================================================================
set "NODE_CMD="
if exist "%APP_DIR%\runtime\node.exe" (
    set "NODE_CMD=%APP_DIR%\runtime\node.exe"
    echo [RUNTIME] Utilizando runtime portable integrado: !NODE_CMD!
) else if exist "%APP_DIR%\node\node.exe" (
    set "NODE_CMD=%APP_DIR%\node\node.exe"
    echo [RUNTIME] Utilizando runtime local: !NODE_CMD!
) else (
    for /f "tokens=*" %%i in ('where node 2^>nul') do (
        if not defined NODE_CMD set "NODE_CMD=%%i"
    )
)

if not defined NODE_CMD (
    echo ===============================================================================
    echo   ATENCION: Node.js (LTS v20 o superior) no esta instalado o no se encuentra
    echo   en las variables de entorno PATH.
    echo.
    echo   Por favor instalelo desde: https://nodejs.org/
    echo   asegurandose de marcar la casilla 'Add to PATH' durante la instalacion.
    echo ===============================================================================
    echo.
    pause
    exit /b 1
)

echo [OK] Motor Node.js verificado: !NODE_CMD!
echo.

:: ===============================================================================
:: 4. Asegurar archivo .env inicial si no existe
:: ===============================================================================
if not exist ".env" (
    if exist ".env.example" (
        copy /Y ".env.example" ".env" >nul
        echo [OK] Archivo de variables .env inicializado desde .env.example.
    ) else (
        (
            echo NODE_ENV=production
            echo PORT=3000
            echo HTTP_PORT=3000
            echo LOCAL_DOMAIN=llanomio.local
            echo INSTANCE_ID=pos-llanomio
            echo DATABASE_URL="file:./database/llanomio.db"
            echo NEXTAUTH_SECRET=llanomio_secret_token_seguro_2026_pos_local
        ) > ".env"
        echo [OK] Archivo .env generado con valores de fabrica.
    )
)

:: ===============================================================================
:: 5. Asegurar estructura de base de datos y carpetas de respaldo
:: ===============================================================================
if not exist "database\backups_locales" mkdir "database\backups_locales" >nul 2>&1
if not exist "C:\POS_LLANOMIO_BACKUPS" mkdir "C:\POS_LLANOMIO_BACKUPS" >nul 2>&1
if not exist "C:\POS_LLANOMIO_BACKUPS\historial" mkdir "C:\POS_LLANOMIO_BACKUPS\historial" >nul 2>&1
if not exist "C:\POS_LLANOMIO_BACKUPS\inventario" mkdir "C:\POS_LLANOMIO_BACKUPS\inventario" >nul 2>&1
if not exist "C:\POS_LLANOMIO_BACKUPS\clientes" mkdir "C:\POS_LLANOMIO_BACKUPS\clientes" >nul 2>&1
if not exist "C:\POS_LLANOMIO_BACKUPS\historial_facturas" mkdir "C:\POS_LLANOMIO_BACKUPS\historial_facturas" >nul 2>&1
if not exist "C:\POS_LLANOMIO_BACKUPS\movimientos_caja" mkdir "C:\POS_LLANOMIO_BACKUPS\movimientos_caja" >nul 2>&1

:: ===============================================================================
:: 6. Ejecutar Asistente Interactivo de Red, Puertos e Instancia
:: ===============================================================================
echo.
echo ===============================================================================
echo   INICIANDO ASISTENTE INTERACTIVO DE PUERTOS, INSTANCIA Y DOMINIO LOCAL
echo ===============================================================================
echo.
"!NODE_CMD!" scripts\escanear-y-elegir-puertos.js
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] El asistente de configuracion finalizo con advertencias o fue cancelado.
)

:: ===============================================================================
:: 7. Leer variables configuradas en .env
:: ===============================================================================
set "PORT_NEXT=3000"
set "PORT_HTTP=3000"
set "INSTANCE_ID=pos-llanomio"
set "LOCAL_DOMAIN=llanomio.local"

if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if "%%A"=="PORT" set "PORT_NEXT=%%B"
        if "%%A"=="HTTP_PORT" set "PORT_HTTP=%%B"
        if "%%A"=="INSTANCE_ID" set "INSTANCE_ID=%%B"
        if "%%A"=="LOCAL_DOMAIN" set "LOCAL_DOMAIN=%%B"
    )
)

:: ===============================================================================
:: 8. Configurar Reglas de Firewall de Windows
:: ===============================================================================
echo.
echo [FIREWALL] Configurando reglas de red local en Firewall de Windows...
netsh advfirewall firewall delete rule name="POS_LLANOMIO_PUERTOS_WEB" >nul 2>&1
netsh advfirewall firewall delete rule name="LLANOMIO_POS_MDNS" >nul 2>&1

netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB" dir=in action=allow protocol=TCP localport=!PORT_NEXT!,!PORT_HTTP! profile=any description="Permite acceso web a LLANOMIO POS en red local" >nul 2>&1
netsh advfirewall firewall add rule name="LLANOMIO_POS_MDNS" dir=in action=allow protocol=UDP localport=5353 profile=any description="Permite resolucion de nombre llanomio.local via mDNS" >nul 2>&1
netsh advfirewall firewall add rule name="LLANOMIO_NODE_APP" dir=in action=allow program="!NODE_CMD!" enable=yes profile=any description="Permite comunicacion a Node.js para LLANOMIO POS" >nul 2>&1

echo [OK] Firewall de Windows configurado para puertos TCP !PORT_NEXT!, !PORT_HTTP! y UDP 5353.

:: ===============================================================================
:: 9. Configurar y arrancar PM2
:: ===============================================================================
echo.
echo [SERVICIOS] Configurando gestor de procesos en segundo plano (PM2)...
set "PM2_CMD=pm2"
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%APP_DIR%\node_modules\.bin\pm2.cmd" (
        set "PM2_CMD=%APP_DIR%\node_modules\.bin\pm2.cmd"
    ) else (
        echo [PM2] PM2 no detectado globalmente. Instalando PM2...
        call npm install -g pm2 >nul 2>&1
        where pm2 >nul 2>&1
        if !errorlevel! equ 0 (
            set "PM2_CMD=pm2"
        ) else (
            set "PM2_CMD=npx --no-install pm2"
        )
    )
)

echo [PM2] Reiniciando procesos de la instancia !INSTANCE_ID!...
call !PM2_CMD! delete "!INSTANCE_ID!" >nul 2>&1
call !PM2_CMD! delete "!INSTANCE_ID!-mdns" >nul 2>&1
call !PM2_CMD! start ecosystem.config.js
call !PM2_CMD! save

:: ===============================================================================
:: 10. Configurar inicio automatico con Windows en carpeta Startup
:: ===============================================================================
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if exist "%STARTUP_FOLDER%" (
    (
        echo @echo off
        echo cd /d "%APP_DIR%"
        echo start "" /min "!PM2_CMD!" resurrect
    ) > "%STARTUP_FOLDER%\Iniciar_POS_Llanomio_Servicio.bat"
    echo [OK] Script de arranque automatico registrado en Inicio de Windows.
)

:: ===============================================================================
:: 11. Crear Accesos Directos en el Escritorio de Windows con Icono
:: ===============================================================================
echo.
echo [ACCESO DIRECTO] Creando accesos directos en el Escritorio...
set "ICON_PATH=%APP_DIR%\instalador_tienda\recursos\llanomio.ico"
if not exist "%ICON_PATH%" (
    set "ICON_PATH=%SystemRoot%\System32\shell32.dll,13"
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [System.Environment]::GetFolderPath('Desktop'); " ^
  "$s1 = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'POS Llanomio.lnk')); " ^
  "$s1.TargetPath = 'http://localhost:!PORT_NEXT!'; " ^
  "$s1.IconLocation = '%ICON_PATH%'; " ^
  "$s1.Description = 'Acceso directo a la Terminal POS Llanomio'; " ^
  "$s1.Save(); " ^
  "$s2 = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'POS Llanomio - Menu Administrador.lnk')); " ^
  "$s2.TargetPath = '%APP_DIR%\instalador_tienda\MENU_DE_INSTALACION.bat'; " ^
  "$s2.WorkingDirectory = '%APP_DIR%'; " ^
  "$s2.IconLocation = '%ICON_PATH%'; " ^
  "$s2.Description = 'Menu de Administracion y Respaldos POS Llanomio'; " ^
  "$s2.Save();" >nul 2>&1

echo [OK] Accesos directos creados exitosamente en el Escritorio.

:: ===============================================================================
:: 12. Apertura del navegador y mensaje final
:: ===============================================================================
echo.
echo ===============================================================================
echo                 INSTALACION Y CONFIGURACION COMPLETADA CON EXITO
echo ===============================================================================
echo.
echo El servidor POS esta ejecutandose en segundo plano:
echo  - Servidor Local:    http://localhost:!PORT_NEXT!
echo  - Nombre mDNS LAN:   http://!LOCAL_DOMAIN!:!PORT_NEXT!
echo  - Instancia PM2:     !INSTANCE_ID!
echo  - Directorio:        %APP_DIR%
echo  - Carpeta Respaldos: C:\POS_LLANOMIO_BACKUPS
echo.
echo Abriendo la consola web en su navegador predeterminado...
start http://localhost:!PORT_NEXT!
echo.
pause

