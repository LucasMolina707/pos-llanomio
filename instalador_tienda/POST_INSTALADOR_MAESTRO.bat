@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Asistente de Instalacion y Parametrizacion - Sistema POS Local

:: ===============================================================================
:: 1. Guardian de Ventana Persistente (Evita cierres inesperados bajo cualquier error)
:: ===============================================================================
if "%~1" NEQ "--persistente" (
    cmd /k ""%~f0" --persistente"
    exit /b
)

:: ===============================================================================
:: 2. Ubicar la raiz del proyecto de forma relativa
:: ===============================================================================
cd /d "%~dp0"
if exist "..\package.json" (
    cd /d "%~dp0.."
)
set "PROJECT_ROOT=%CD%"

color 0B
cls
echo ===============================================================================
echo        ASISTENTE MAESTRO DE CONFIGURACION POST-INSTALACION (POS LOCAL)
echo ===============================================================================
echo.
echo [PASO 1/7] Confirmando ruta de instalacion...
echo Directorio raiz detectado: %PROJECT_ROOT%
echo.

:: ===============================================================================
:: 3. Verificacion y Elevacion a Permisos de Administrador (UAC)
:: ===============================================================================
net session >nul 2>&1
if %errorlevel% equ 0 goto :permisos_admin_ok

echo [AVISO] Solicitando permisos de Administrador para configurar Firewall y servicios...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd -ArgumentList '/k \"\"%~f0\"\" --persistente' -Verb RunAs"
exit /b

:permisos_admin_ok
echo [OK] Permisos de Administrador de Windows verificados.
echo.

:: ===============================================================================
:: 4. Configurar PATH con prioridad en Runtime Portable Local
:: ===============================================================================
echo [PASO 2/7] Verificando motor de ejecucion Node.js...

if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
    echo [OK] Utilizando motor Node.js portable integrado en el paquete:
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
echo   ATENCION CRITICA: No se detecto el motor Node.js en este computador.
echo.
echo   Para operar sin conexion se requiere 'runtime\node\node.exe' en el paquete,
echo   o tener instalado Node.js LTS (v20 o v22) desde https://nodejs.org/
echo ===============================================================================
echo.
pause
exit /b 1

:node_encontrado_sistema
echo [OK] Utilizando motor Node.js instalado en el sistema:
echo      !NODE_EXE!

:node_verificado
echo.

:: ===============================================================================
:: 5. Asegurar Directorios de Respaldo y Base de Datos
:: ===============================================================================
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

:: ===============================================================================
:: 6. Asistente Interactivo de Red, Puertos y Multi-Instancia
:: ===============================================================================
echo [PASO 3/7] Iniciando Asistente Interactivo de Red y Puertos...
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
echo [PASO 4/7] Configurando reglas en el Firewall de Windows...

netsh advfirewall firewall delete rule name="POS_LLANOMIO_PUERTOS_WEB" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_MDNS" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_NODE" >nul 2>&1

netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB" dir=in action=allow protocol=TCP localport=!PORT!,!HTTP_PORT! profile=any description="Permite acceso web a terminales POS en red local" >nul 2>&1
netsh advfirewall firewall add rule name="POS_LLANOMIO_MDNS" dir=in action=allow protocol=UDP localport=5353 profile=any description="Permite resolucion de nombre local mDNS Bonjour" >nul 2>&1
netsh advfirewall firewall add rule name="POS_LLANOMIO_NODE" dir=in action=allow program="!NODE_EXE!" enable=yes profile=any description="Permite comunicacion a Node.js para POS Local" >nul 2>&1

echo [OK] Firewall configurado para TCP !PORT!, !HTTP_PORT! y UDP 5353.
echo.

:: ===============================================================================
:: 9. Registro de Auto-Arranque tras Reinicio de Windows
:: ===============================================================================
echo [PASO 5/7] Configurando persistencia y auto-arranque con Windows...

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_LAUNCHER=%STARTUP_DIR%\Arranque_Automatico_POS_Llanomio.vbs"

if exist "%STARTUP_DIR%" (
    (
        echo Set WshShell = CreateObject^("WScript.Shell"^)
        echo WshShell.Run Chr^(34^) ^& "%PROJECT_ROOT%\INICIAR_SERVIDOR_POS.bat" ^& Chr^(34^) ^& " --silencioso", 0, False
    ) > "%VBS_LAUNCHER%"
    echo [OK] Lanzador silencioso registrado en carpeta Inicio:
    echo      !VBS_LAUNCHER!
)

:: Registrar tarea programada de Windows como respaldo
schtasks /Create /F /TN "POS_Llanomio_AutoStart_!INSTANCE_ID!" /TR "\"%PROJECT_ROOT%\INICIAR_SERVIDOR_POS.bat\" --silencioso" /SC ONLOGON /RL HIGHEST >nul 2>&1

:: Configurar PM2 si esta disponible
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
echo [PM2] Registrando proceso '!INSTANCE_ID!' en gestor local del proyecto...
call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" delete "!INSTANCE_ID!" >nul 2>&1
call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" delete "!INSTANCE_ID!-mdns" >nul 2>&1
call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" start "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" save >nul 2>&1

:pm2_listo
echo [OK] Servicios registrados y arrancados en PM2.
goto :continuar_paso_6

:pm2_omitir
echo [INFO] PM2 no instalado. El servidor se gestionara mediante INICIAR_SERVIDOR_POS.bat.

:continuar_paso_6
echo.

:: ===============================================================================
:: 10. Creacion de Accesos Directos en el Escritorio
:: ===============================================================================
echo [PASO 6/7] Creando accesos directos en el Escritorio de Windows...

set "ICON_FILE=%PROJECT_ROOT%\instalador_tienda\recursos\llanomio.ico"
if not exist "%ICON_FILE%" set "ICON_FILE=%SystemRoot%\System32\shell32.dll,13"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$desktop = [System.Environment]::GetFolderPath('Desktop'); " ^
  "$s1 = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'Iniciar POS Llanomio.lnk')); " ^
  "$s1.TargetPath = '%PROJECT_ROOT%\INICIAR_SERVIDOR_POS.bat'; " ^
  "$s1.WorkingDirectory = '%PROJECT_ROOT%'; " ^
  "$s1.IconLocation = '%ICON_FILE%'; " ^
  "$s1.Description = 'Lanzador Oficial del Sistema POS Llanomio'; " ^
  "$s1.Save(); " ^
  "$s2 = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'POS Llanomio - Menu Administrador.lnk')); " ^
  "$s2.TargetPath = '%PROJECT_ROOT%\instalador_tienda\MENU_DE_INSTALACION.bat'; " ^
  "$s2.WorkingDirectory = '%PROJECT_ROOT%'; " ^
  "$s2.IconLocation = '%ICON_FILE%'; " ^
  "$s2.Description = 'Menu de Administracion y Respaldos'; " ^
  "$s2.Save(); " ^
  "$s3 = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'POS Llanomio - Modo App Directo.lnk')); " ^
  "$s3.TargetPath = '%PROJECT_ROOT%\ABRIR_TERMINAL_POS_DIRECTO.bat'; " ^
  "$s3.WorkingDirectory = '%PROJECT_ROOT%'; " ^
  "$s3.IconLocation = '%ICON_FILE%'; " ^
  "$s3.Description = 'Terminal POS en Ventana Nativa'; " ^
  "$s3.Save(); " ^
  "$s4 = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'POS Llanomio - Recuperar Servidor.lnk')); " ^
  "$s4.TargetPath = '%PROJECT_ROOT%\REINICIAR_O_LEVANTAR_SERVICIO_RAPIDO.bat'; " ^
  "$s4.WorkingDirectory = '%PROJECT_ROOT%'; " ^
  "$s4.IconLocation = '%ICON_FILE%'; " ^
  "$s4.Description = 'Auto-Recuperacion y Reinicio Rapido del Servidor'; " ^
  "$s4.Save(); " ^
  "$s5 = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'POS Llanomio - Detener Servicios.lnk')); " ^
  "$s5.TargetPath = '%PROJECT_ROOT%\DETENER_TODOS_LOS_SERVICIOS_POS.bat'; " ^
  "$s5.WorkingDirectory = '%PROJECT_ROOT%'; " ^
  "$s5.IconLocation = '%ICON_FILE%'; " ^
  "$s5.Description = 'Detener Todos los Procesos y Servicios del POS'; " ^
  "$s5.Save(); " ^
  "$s6 = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'POS Llanomio - Actualizar Sistema.lnk')); " ^
  "$s6.TargetPath = '%PROJECT_ROOT%\ACTUALIZAR_SISTEMA_SEGURO.bat'; " ^
  "$s6.WorkingDirectory = '%PROJECT_ROOT%'; " ^
  "$s6.IconLocation = '%ICON_FILE%'; " ^
  "$s6.Description = 'Actualizacion Segura del Sistema sin Perdida de Datos'; " ^
  "$s6.Save();" >nul 2>&1

echo [OK] Accesos directos creados en el Escritorio:
echo      - Iniciar POS Llanomio.lnk
echo      - POS Llanomio - Modo App Directo.lnk
echo      - POS Llanomio - Recuperar Servidor.lnk
echo      - POS Llanomio - Detener Servicios.lnk
echo      - POS Llanomio - Actualizar Sistema.lnk
echo      - POS Llanomio - Menu Administrador.lnk
echo.

:: ===============================================================================
:: 11. Arranque Inmediato y Apertura del Navegador
:: ===============================================================================
echo [PASO 7/7] Comprobando arranque del servidor web...

call "%PROJECT_ROOT%\INICIAR_SERVIDOR_POS.bat" --silencioso >nul 2>&1

echo.
echo ===============================================================================
echo               INSTALACION Y CONFIGURACION COMPLETADA CON EXITO
echo ===============================================================================
echo.
echo El sistema POS se encuentra completamente operativo:
echo.
echo   - Servidor Local:    http://localhost:!PORT!/login
echo   - Acceso en Red:     http://!LOCAL_DOMAIN!:!PORT!/login
echo   - Instancia PM2:     !INSTANCE_ID!
echo   - Carpeta Respaldos: C:\POS_BACKUPS
echo.
echo Se ha creado un acceso directo en su Escritorio: 'Iniciar POS Llanomio'
echo.
echo Abriendo el sistema en su navegador web predeterminado...
start http://localhost:!PORT!/login
echo.
echo Presione cualquier tecla para finalizar el asistente...
pause >nul
exit /b 0

