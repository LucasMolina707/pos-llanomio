@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Asistente de Instalacion y Despliegue Maestro - Sistema POS Llanomio

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
echo [PASO 1/10] Confirmando ruta raiz del proyecto...
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
:: 4. Deteccion e Instalacion Automatica del Motor Node.js (v20 / v22 LTS)
:: ===============================================================================
echo [PASO 2/10] Verificando motor de ejecucion Node.js...

:: 1. Verificar runtime portable incluido
if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
    echo [OK] Runtime portable de Node.js detectado en el paquete:
    echo      !NODE_EXE!
    goto :node_verificado
)

:: 2. Verificar rutas estandar de instalacion de Node.js
set "PATH=%PROJECT_ROOT%\node_modules\.bin;%PATH%;C:\Program Files\nodejs;%APPDATA%\npm;C:\Program Files (x86)\nodejs"
set "NODE_EXE=node"

where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('where node 2^>nul') do (
        set "NODE_EXE=%%i"
        goto :node_encontrado_sistema
    )
)

:: 3. Si no existe, intentar auto-instalacion con winget o descarga directa MSI
echo.
echo ===============================================================================
echo   NODE.JS NO DETECTADO: INICIANDO INSTALACION AUTOMATICA DE NODE.JS LTS
echo ===============================================================================
echo.
echo [AUTO-INSTALADOR] Se procedera a instalar Node.js LTS en este equipo...

where winget >nul 2>&1
if %errorlevel% equ 0 (
    echo [WINGET] Descargando e instalando Node.js LTS mediante Windows Package Manager...
    call winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    if !errorlevel! equ 0 goto :recargar_path_post_node
)

echo [POWERSHELL] Descargando instalador oficial MSI de Node.js LTS desde nodejs.org...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url = 'https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi'; " ^
  "$dest = [System.IO.Path]::Combine($env:TEMP, 'nodejs_installer.msi'); " ^
  "Write-Host '[DESCARGA] Obteniendo archivo instalador...'; " ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
  "Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing; " ^
  "Write-Host '[INSTALACION] Ejecutando instalacion silenciosa...'; " ^
  "Start-Process msiexec.exe -ArgumentList '/i', ('\"' + $dest + '\"'), '/qn', '/norestart' -Wait;"

:recargar_path_post_node
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PROJECT_ROOT%\node_modules\.bin;%PATH%"

where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('where node 2^>nul') do (
        set "NODE_EXE=%%i"
        goto :node_encontrado_sistema
    )
)

if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_EXE=C:\Program Files\nodejs\node.exe"
    goto :node_encontrado_sistema
)

echo.
echo [ERROR CRITICO] No se logro completar la instalacion automatica de Node.js.
echo Por favor descargue e instale manualmente Node.js LTS desde https://nodejs.org
pause
exit /b 1

:node_encontrado_sistema
echo [OK] Motor Node.js operativo:
call "%NODE_EXE%" -v
echo [OK] Gestor de paquetes npm:
call npm -v

:node_verificado
echo.

:: ===============================================================================
:: 5. Instalacion y Verificacion de Dependencias (npm install)
:: ===============================================================================
echo [PASO 3/10] Verificando dependencias del proyecto (node_modules)...

set "REINSTALAR_DEPS=0"
if not exist "%PROJECT_ROOT%\node_modules" set "REINSTALAR_DEPS=1"
if not exist "%PROJECT_ROOT%\node_modules\.bin\next.cmd" set "REINSTALAR_DEPS=1"
if not exist "%PROJECT_ROOT%\node_modules\.bin\prisma.cmd" set "REINSTALAR_DEPS=1"

if "%REINSTALAR_DEPS%"=="1" (
    echo [DEPS] Instalando paquetes de produccion con npm...
    call npm install --no-audit --no-fund
    if !errorlevel! neq 0 (
        echo [ERROR CRITICO] Error instalando dependencias mediante npm install.
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas exitosamente.
) else (
    echo [OK] Carpeta node_modules y ejecutables locales verificados.
)

:: Asegurar PM2 para la orquestacion de servicios
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    if not exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
        echo [PM2] Instalando gestor de procesos PM2...
        call npm install pm2 --save-dev --no-audit --no-fund >nul 2>&1
    )
)
echo.

:: ===============================================================================
:: 6. Creacion de Carpetas de Datos y Respaldos Protegidos
:: ===============================================================================
echo [PASO 4/10] Creando directorios del sistema y copias de seguridad...
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
:: 7. Asistente Interactivo de Red, Puertos y Dominio
:: ===============================================================================
echo [PASO 5/10] Configuracion de Red, Puertos y Dominio LAN...
echo.
echo   [1] Usar configuracion estandar recomendada (Puerto 3000, Proxy LAN 80, llanomio.local)
echo   [2] Personalizar puertos TCP y nombre de dominio (Escanear red en vivo)
echo.
set /p OPC_RED=">> Seleccione una opcion [1-2, Enter = 1]: "

if "%OPC_RED%"=="2" (
    call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\escanear-y-elegir-puertos.js"
    if !errorlevel! neq 0 (
        echo [ADVERTENCIA] El asistente finalizo con observaciones. Se continuara con defaults.
    )
) else (
    echo [OK] Aplicando configuracion estandar en .env...
)

:: Lectura de variables finales desde .env
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
echo Parametros confirmados:
echo   - Puerto Next.js:    !PORT!
echo   - Puerto Proxy:      !HTTP_PORT!
echo   - Instancia:         !INSTANCE_ID!
echo   - Dominio mDNS:      !LOCAL_DOMAIN!
echo.

:: ===============================================================================
:: 8. Inicializacion y Despliegue de Base de Datos SQLite (Prisma ORM)
:: ===============================================================================
echo [PASO 6/10] Configurando Base de Datos SQLite y Prisma ORM...

echo [PRISMA] Generando cliente tipado de Prisma...
call npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR CRITICO] Fallo en npx prisma generate.
    pause
    exit /b 1
)

:: Comprobar si existe la base de datos
if not exist "%PROJECT_ROOT%\database\llanomio.db" (
    echo [BD NUEVA] Creando esquema de base de datos desde cero...
    call npx prisma db push
    echo [BD NUEVA] Sembrando datos neutros de fabrica (Clean Slate)...
    call npx tsx database/seed.ts
    echo [OK] Base de datos creada y sembrada con exito.
) else (
    echo.
    echo Se detecto una base de datos existente en 'database\llanomio.db'.
    echo   [1] Conservar la base de datos actual (Recomendado para actualizar o mantener datos)
    echo   [2] Restablecer a Estado Puro de Fabrica Comercial (Clean Slate - Elimina pruebas y resetea folios)
    echo.
    set /p OPC_BD=">> Seleccione una opcion [1-2, Enter = 1]: "
    if "!OPC_BD!"=="2" (
        echo [RESET] Ejecutando restablecimiento integral de fabrica...
        call npx tsx scripts/reset-db-fabrica.ts
        echo [OK] Base de datos restablecida a Estado Puro de Fabrica.
    ) else (
        echo [OK] Base de datos actual conservada intacta.
    )
)
echo.

:: ===============================================================================
:: 9. Compilacion de Produccion Next.js (npm run build)
:: ===============================================================================
echo [PASO 7/10] Verificando compilacion optimizada de Next.js...

set "RECONSTRUIR_BUILD=0"
if not exist "%PROJECT_ROOT%\.next\BUILD_ID" set "RECONSTRUIR_BUILD=1"

if "%RECONSTRUIR_BUILD%"=="1" (
    echo [BUILD] Compilando aplicacion para produccion (npm run build)...
    call npm run build
    if !errorlevel! neq 0 (
        echo [ERROR CRITICO] Fallo en la compilacion de Next.js.
        pause
        exit /b 1
    )
    echo [OK] Build de produccion generado exitosamente.
) else (
    echo [OK] Build de produccion preexistente detectado y verificado.
)
echo.

:: ===============================================================================
:: 10. Configuracion de Reglas en Firewall de Windows
:: ===============================================================================
echo [PASO 8/10] Configurando reglas en el Firewall de Windows...

netsh advfirewall firewall delete rule name="POS_LLANOMIO_PUERTOS_WEB" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_MDNS" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_NODE" >nul 2>&1

netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB" dir=in action=allow protocol=TCP localport=!PORT!,!HTTP_PORT! profile=any description="Permite acceso web a terminales POS en red local" >nul 2>&1
netsh advfirewall firewall add rule name="POS_LLANOMIO_MDNS" dir=in action=allow protocol=UDP localport=5353 profile=any description="Permite resolucion de nombre local mDNS Bonjour" >nul 2>&1
netsh advfirewall firewall add rule name="POS_LLANOMIO_NODE" dir=in action=allow program="!NODE_EXE!" enable=yes profile=any description="Permite comunicacion a Node.js para POS Local" >nul 2>&1
echo [OK] Firewall configurado para puertos TCP [!PORT!, !HTTP_PORT!] y UDP 5353.
echo.

:: ===============================================================================
:: 11. Registro de Auto-Arranque al Reiniciar el PC (Schtasks + Startup + PM2)
:: ===============================================================================
echo [PASO 9/10] Configurando Auto-Arranque permanente en Windows y PM2...

:: 1. Purgar scripts de inicio obsoletos en Startup
set "STARTUP_USER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_ALL=%ALLUSERSPROFILE%\Microsoft\Windows\Start Menu\Programs\Startup"

if exist "%STARTUP_USER%\Iniciar_LLANOMIO_Auto.bat" del /f /q "%STARTUP_USER%\Iniciar_LLANOMIO_Auto.bat" >nul 2>&1
if exist "%STARTUP_USER%\Arranque_Automatico_POS_Llanomio.vbs" del /f /q "%STARTUP_USER%\Arranque_Automatico_POS_Llanomio.vbs" >nul 2>&1

:: 2. Generar y registrar lanzador VBS invisible para inicio de sesion de Windows
set "VBS_SCRIPT=%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\Arranque_Automatico_POS.vbs"

if exist "%STARTUP_USER%" (
    (
        echo Set WshShell = CreateObject^("WScript.Shell"^)
        echo WshShell.Run Chr^(34^) ^& "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\ARRANQUE_AUTOMATICO_SISTEMA.bat" ^& Chr^(34^) ^& " --abrir-pantalla", 0, False
    ) > "%STARTUP_USER%\POS_Llanomio_Autostart.vbs"
    echo [OK] Script registrado en Carpeta Startup del Usuario.
)
if exist "%STARTUP_ALL%" (
    (
        echo Set WshShell = CreateObject^("WScript.Shell"^)
        echo WshShell.Run Chr^(34^) ^& "%PROJECT_ROOT%\instalador_tienda\2_INICIADORES_Y_ACTIVADORES\ARRANQUE_AUTOMATICO_SISTEMA.bat" ^& Chr^(34^) ^& " --abrir-pantalla", 0, False
    ) > "%STARTUP_ALL%\POS_Llanomio_Autostart.vbs"
    echo [OK] Script registrado en Carpeta Startup Global del Equipo.
)

:: 3. Registrar Tarea Programada de Windows (Task Scheduler) con maximos privilegios
schtasks /delete /tn "POS_LLANOMIO_AUTOSTART" /f >nul 2>&1
schtasks /create /tn "POS_LLANOMIO_AUTOSTART" /tr "wscript.exe \"%VBS_SCRIPT%\"" /sc onlogon /rl highest /f >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Tarea Programada oficial de Windows registrada exitosamente.
) else (
    echo [INFO] Tarea Programada omitida; se utilizara el lanzador de Startup de Windows.
)

:: 4. Iniciar y registrar procesos con PM2
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    set "PM2_CMD=pm2"
) else (
    set "PM2_CMD=%PROJECT_ROOT%\node_modules\.bin\pm2.cmd"
)

echo [PM2] Inicializando y persistiendo procesos del POS...
call !PM2_CMD! delete "!INSTANCE_ID!" >nul 2>&1
call !PM2_CMD! delete "!INSTANCE_ID!-mdns" >nul 2>&1
call !PM2_CMD! start "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
call !PM2_CMD! save >nul 2>&1
echo [OK] Servicios iniciados y asegurados con PM2.
echo.

:: ===============================================================================
:: 12. Creacion de Accesos Directos Oficiales en el Escritorio
:: ===============================================================================
echo [PASO 10/10] Creando accesos directos oficiales en el Escritorio...

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
  "$s2.TargetPath = '%PROJECT_ROOT%\ABRIR_SISTEMA_PANTALLA_COMPLETA.bat'; " ^
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
:: 13. Comprobacion de Salud HTTP (Healthcheck) y Apertura del Sistema
:: ===============================================================================
echo [SONDEO] Esperando confirmacion del servidor web en http://localhost:!PORT!/login...
set "SERVIDOR_LISTO=0"
for /L %%i in (1,1,20) do (
    if "!SERVIDOR_LISTO!"=="0" (
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
          "try { $r = Invoke-WebRequest -Uri 'http://localhost:!PORT!/login' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
        if !errorlevel! equ 0 (
            set "SERVIDOR_LISTO=1"
            echo [OK] Servidor web activo y respondiendo exitosamente.
        ) else (
            timeout /t 1 >nul
        )
    )
)

echo.
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
echo   - Usuario Inicial:     admin
echo   - Clave Inicial:       admin123
echo.
echo [AUTO-ARRANQUE] Cada vez que el PC se reinicie o encienda, el sistema POS
echo iniciara automaticamente sus servicios en segundo plano y abrira el mostrador.
echo.
echo Abriendo el sistema en modo pantalla completa...
call "%PROJECT_ROOT%\ABRIR_SISTEMA_PANTALLA_COMPLETA.bat"
echo.
echo Presione cualquier tecla para finalizar el asistente...
pause >nul
exit /b 0
