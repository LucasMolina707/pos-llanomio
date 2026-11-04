@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Asistente de Instalacion Maestro - Sistema POS Llanomio

:: ===============================================================================
:: 1. Guardian de Ventana Persistente (Evita cierres inesperados bajo error)
:: ===============================================================================
if "%~1" NEQ "--persistente" (
    cmd /k ""%~f0" --persistente"
    exit /b
)

:: ===============================================================================
:: 2. Ubicar la raiz del proyecto de forma relativa (2 niveles arriba)
:: ===============================================================================
cd /d "%~dp0..\.."
set "PROJECT_ROOT=%CD%"

if not exist "%PROJECT_ROOT%\package.json" (
    echo [ERROR CRITICO] No se detecto package.json en la raiz: %PROJECT_ROOT%
    echo Verifique que la estructura de carpetas no haya sido alterada.
    pause
    exit /b 1
)

color 0B
cls
echo ===============================================================================
echo        ASISTENTE MAESTRO DE INSTALACION Y DESPLIEGUE DESDE CERO
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.
echo [PASO 1/7] Confirmando ruta raiz del proyecto...
echo Ruta detectada: %PROJECT_ROOT%
echo.

:: ===============================================================================
:: 3. Verificacion y Elevacion a Permisos de Administrador (UAC)
:: ===============================================================================
net session >nul 2>&1
if %errorlevel% equ 0 goto :permisos_admin_ok

echo [AVISO] Solicitando permisos de Administrador de Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/k \"\"%~f0\"\" --persistente' -Verb RunAs"
exit /b

:permisos_admin_ok
echo [OK] Permisos de Administrador de Windows verificados.
echo.

:: ===============================================================================
:: 4. Deteccion y Configuracion del Motor Node.js
:: ===============================================================================
echo [PASO 2/7] Verificando motor de ejecucion Node.js...

if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
    echo [OK] Runtime portable de Node.js detectado en el paquete:
    echo      !NODE_EXE!
    goto :node_verificado
)

set "PATH=%PROJECT_ROOT%\node_modules\.bin;%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"
set "NODE_EXE=node"

where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('where node 2^>nul') do (
        set "NODE_EXE=%%i"
        goto :node_encontrado_sistema
    )
)

:node_no_encontrado
echo.
echo ===============================================================================
echo   ATENCION: No se detecto el motor Node.js en este computador.
echo   Se requiere 'runtime\node\node.exe' en el paquete o Node.js v20/v22 instalado.
echo ===============================================================================
echo.
pause
exit /b 1

:node_encontrado_sistema
echo [OK] Motor Node.js instalado en el sistema detectado:
echo      !NODE_EXE!

:node_verificado
echo.

:: ===============================================================================
:: 5. Creacion de Carpetas de Datos y Respaldos Protegidos
:: ===============================================================================
echo [PASO 3/7] Preparando directorios de datos y copias de seguridad...
if not exist "%PROJECT_ROOT%\database" mkdir "%PROJECT_ROOT%\database" >nul 2>&1
if not exist "%PROJECT_ROOT%\database\backups_locales" mkdir "%PROJECT_ROOT%\database\backups_locales" >nul 2>&1
if not exist "%PROJECT_ROOT%\actualizaciones" mkdir "%PROJECT_ROOT%\actualizaciones" >nul 2>&1
if not exist "C:\POS_BACKUPS" mkdir "C:\POS_BACKUPS" >nul 2>&1
if not exist "C:\POS_BACKUPS\historial" mkdir "C:\POS_BACKUPS\historial" >nul 2>&1
if not exist "C:\POS_BACKUPS\inventario" mkdir "C:\POS_BACKUPS\inventario" >nul 2>&1
if not exist "C:\POS_BACKUPS\clientes" mkdir "C:\POS_BACKUPS\clientes" >nul 2>&1
if not exist "C:\POS_BACKUPS\historial_facturas" mkdir "C:\POS_BACKUPS\historial_facturas" >nul 2>&1
if not exist "C:\POS_BACKUPS\movimientos_caja" mkdir "C:\POS_BACKUPS\movimientos_caja" >nul 2>&1
if not exist "C:\POS_BACKUPS\salvaguarda_pre_actualizacion" mkdir "C:\POS_BACKUPS\salvaguarda_pre_actualizacion" >nul 2>&1
echo [OK] Directorios base verificados exitosamente.
echo.

:: ===============================================================================
:: 6. Asistente Interactivo de Red, Puertos y Dominio
:: ===============================================================================
echo [PASO 4/7] Ejecutando Asistente de Puertos y Red LAN...
echo.

call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\escanear-y-elegir-puertos.js"
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] El asistente finalizo con observaciones. Se continuara con defaults.
)
echo.

:: ===============================================================================
:: 7. Lectura de Variables de Entorno desde .env
:: ===============================================================================
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

:: ===============================================================================
:: 8. Configuracion de Reglas en Firewall de Windows
:: ===============================================================================
echo [PASO 5/7] Configurando reglas en el Firewall de Windows...

netsh advfirewall firewall delete rule name="POS_LLANOMIO_PUERTOS_WEB" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_MDNS" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_NODE" >nul 2>&1

netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB" dir=in action=allow protocol=TCP localport=!PORT!,!HTTP_PORT! profile=any description="Permite acceso web a terminales POS en red local" >nul 2>&1
netsh advfirewall firewall add rule name="POS_LLANOMIO_MDNS" dir=in action=allow protocol=UDP localport=5353 profile=any description="Permite resolucion de nombre local mDNS Bonjour" >nul 2>&1
netsh advfirewall firewall add rule name="POS_LLANOMIO_NODE" dir=in action=allow program="!NODE_EXE!" enable=yes profile=any description="Permite comunicacion a Node.js para POS Local" >nul 2>&1

echo [OK] Firewall configurado para puertos TCP [!PORT!, !HTTP_PORT!] y UDP 5353.
echo.

:: ===============================================================================
:: 9. Registro de Persistencia y Auto-Arranque con Windows
:: ===============================================================================
echo [PASO 6/7] Configurando inicio automatico con Windows y PM2...

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_LAUNCHER=%STARTUP_DIR%\Arranque_Automatico_POS_Llanomio.vbs"

if exist "%STARTUP_DIR%" (
    (
        echo Set WshShell = CreateObject^("WScript.Shell"^)
        echo WshShell.Run Chr^(34^) ^& "%PROJECT_ROOT%\CONTROL_GENERAL_POS.bat" ^& Chr^(34^) ^& " --iniciar-silencioso", 0, False
    ) > "%VBS_LAUNCHER%"
    echo [OK] Script de auto-inicio registrado en Startup de Windows.
)

:: Intentar inicializar PM2
where pm2 >nul 2>&1
if %errorlevel% equ 0 goto :pm2_global_setup

if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" goto :pm2_local_setup

goto :pm2_omitir

:pm2_global_setup
echo [PM2] Registrando proceso '!INSTANCE_ID!' en gestor global...
call pm2 delete "!INSTANCE_ID!" >nul 2>&1
call pm2 delete "!INSTANCE_ID!-mdns" >nul 2>&1
call pm2 start "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
call pm2 save >nul 2>&1
goto :pm2_listo

:pm2_local_setup
echo [PM2] Registrando proceso '!INSTANCE_ID!' en gestor local...
call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" delete "!INSTANCE_ID!" >nul 2>&1
call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" delete "!INSTANCE_ID!-mdns" >nul 2>&1
call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" start "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" save >nul 2>&1

:pm2_listo
echo [OK] Servicios iniciados y asegurados con PM2.
goto :continuar_accesos

:pm2_omitir
echo [INFO] PM2 no disponible globalmente; el servidor se gestionara mediante CONTROL_GENERAL_POS.bat.

:continuar_accesos
echo.

:: ===============================================================================
:: 10. Creacion de Accesos Directos en el Escritorio
:: ===============================================================================
echo [PASO 7/7] Creando accesos directos oficiales en el Escritorio...

set "ICON_FILE=%PROJECT_ROOT%\instalador_tienda\recursos\llanomio.ico"
if not exist "%ICON_FILE%" set "ICON_FILE=%SystemRoot%\System32\shell32.dll,13"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [System.Environment]::GetFolderPath('Desktop'); " ^
  "$s1 = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'POS Llanomio - Panel de Control.lnk')); " ^
  "$s1.TargetPath = '%PROJECT_ROOT%\CONTROL_GENERAL_POS.bat'; " ^
  "$s1.WorkingDirectory = '%PROJECT_ROOT%'; " ^
  "$s1.IconLocation = '%ICON_FILE%'; " ^
  "$s1.Description = 'Panel de Control Maestro del Sistema POS Llanomio'; " ^
  "$s1.Save(); " ^
  "$s2 = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'POS Llanomio - Pantalla Completa.lnk')); " ^
  "$s2.TargetPath = '%PROJECT_ROOT%\ABRIR_POS_PANTALLA_COMPLETA.bat'; " ^
  "$s2.WorkingDirectory = '%PROJECT_ROOT%'; " ^
  "$s2.IconLocation = '%ICON_FILE%'; " ^
  "$s2.Description = 'Terminal POS Llanomio en Modo Aplicacion Pantalla Completa'; " ^
  "$s2.Save(); " ^
  "$s3 = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'POS Llanomio - Carpeta Respaldos.lnk')); " ^
  "$s3.TargetPath = 'C:\POS_BACKUPS'; " ^
  "$s3.IconLocation = '%SystemRoot%\System32\shell32.dll,4'; " ^
  "$s3.Description = 'Carpeta Central de Copias de Seguridad del POS'; " ^
  "$s3.Save();" >nul 2>&1

echo [OK] Accesos directos creados en el Escritorio:
echo      - POS Llanomio - Panel de Control.lnk
echo      - POS Llanomio - Pantalla Completa.lnk
echo      - POS Llanomio - Carpeta Respaldos.lnk
echo.

:: ===============================================================================
:: 11. Resumen y Apertura Inicial del Navegador
:: ===============================================================================
echo ===============================================================================
echo                 INSTALACION COMPLETADA EXITOSAMENTE
echo ===============================================================================
echo.
echo El sistema POS se encuentra completamente instalado y operativo:
echo.
echo   - URL Local Principal: http://localhost:!PORT!/login
echo   - URL Red LAN:         http://!LOCAL_DOMAIN!:!PORT!/login
echo   - Instancia PM2:       !INSTANCE_ID!
echo   - Carpeta Respaldos:   C:\POS_BACKUPS
echo.
echo Abriendo el sistema en su navegador web predeterminado...
start http://localhost:!PORT!/login
echo.
echo Presione cualquier tecla para finalizar el asistente...
pause >nul
exit /b 0

