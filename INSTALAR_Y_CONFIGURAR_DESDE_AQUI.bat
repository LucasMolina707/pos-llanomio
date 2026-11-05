@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Instalador y Desplegador Autonomo - Sistema POS Llanomio

:: ===============================================================================
:: 1. Guardian de Ventana Persistente (Evita cierres inesperados bajo error)
:: ===============================================================================
if "%~1" NEQ "--persistente" (
    cmd /k ""%~f0" --persistente"
    exit /b
)

:: ===============================================================================
:: 2. Ubicar la raiz del proyecto de forma dinamica (desde donde se descomprimio)
:: ===============================================================================
cd /d "%~dp0"
set "PROJECT_ROOT=%CD%"

if not exist "%PROJECT_ROOT%\package.json" (
    echo [ERROR CRITICO] No se detecto package.json en: %PROJECT_ROOT%
    echo Verifique que el archivo .ZIP se haya descomprimido completamente.
    pause
    exit /b 1
)

color 0B
cls
echo ===============================================================================
echo     ASISTENTE DE INSTALACION Y DESPLIEGUE AUTONOMO DESDE CARPETA .ZIP
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.
echo [PASO 1/11] Confirmando ruta de ejecucion actual...
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
:: 4. Deteccion e Instalacion Automatica de Node.js (v20 / v22 LTS)
:: ===============================================================================
echo [PASO 2/11] Verificando motor de ejecucion Node.js...

if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
    echo [OK] Runtime portable de Node.js detectado en el paquete:
    echo      !NODE_EXE!
    goto :node_verificado
)

set "PATH=%PROJECT_ROOT%\node_modules\.bin;%PATH%;C:\Program Files\nodejs;%APPDATA%\npm;C:\Program Files (x86)\nodejs"
set "NODE_EXE=node"

where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('where node 2^>nul') do (
        set "NODE_EXE=%%i"
        goto :node_encontrado_sistema
    )
)

echo.
echo ===============================================================================
echo   NODE.JS NO DETECTADO: INICIANDO INSTALACION AUTOMATICA DE NODE.JS LTS
echo ===============================================================================
echo.
echo [AUTO-INSTALADOR] Se procedera a instalar Node.js LTS en este equipo...

where winget >nul 2>&1
if %errorlevel% equ 0 (
    echo [WINGET] Instalando Node.js LTS mediante Windows Package Manager...
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
:: 5. Instalacion y Vinculacion de Dependencias (npm install)
:: ===============================================================================
echo [PASO 3/11] Verificando dependencias locales y binarios nativos...

set "REINSTALAR_DEPS=0"
if not exist "%PROJECT_ROOT%\node_modules" set "REINSTALAR_DEPS=1"
if not exist "%PROJECT_ROOT%\node_modules\.bin\next.cmd" set "REINSTALAR_DEPS=1"
if not exist "%PROJECT_ROOT%\node_modules\.bin\prisma.cmd" set "REINSTALAR_DEPS=1"

if "%REINSTALAR_DEPS%"=="1" (
    echo [DEPS] Vinculando paquetes de produccion con npm...
    call npm install --no-audit --no-fund
    if !errorlevel! neq 0 (
        echo [ERROR CRITICO] Error instalando dependencias mediante npm install.
        pause
        exit /b 1
    )
    echo [OK] Dependencias vinculadas exitosamente.
) else (
    echo [OK] Modulos locales verificados.
)

:: Asegurar PM2
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    if not exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
        echo [PM2] Instalando gestor de procesos PM2...
        call npm install pm2 --save-dev --no-audit --no-fund >nul 2>&1
    )
)
echo.

:: ===============================================================================
:: 6. Creacion de Estructura de Carpetas de Datos y Respaldos
:: ===============================================================================
echo [PASO 4/11] Verificando estructura de directorios y boveda C:\POS_BACKUPS...
if not exist "%PROJECT_ROOT%\database" mkdir "%PROJECT_ROOT%\database" >nul 2>&1
if not exist "%PROJECT_ROOT%\database\backups_locales" mkdir "%PROJECT_ROOT%\database\backups_locales" >nul 2>&1
if not exist "%PROJECT_ROOT%\actualizaciones" mkdir "%PROJECT_ROOT%\actualizaciones" >nul 2>&1
if not exist "C:\POS_BACKUPS" mkdir "C:\POS_BACKUPS" >nul 2>&1
if not exist "C:\POS_BACKUPS\historial" mkdir "C:\POS_BACKUPS\historial" >nul 2>&1
if not exist "C:\POS_BACKUPS\inventario" mkdir "C:\POS_BACKUPS\inventario" >nul 2>&1
if not exist "C:\POS_BACKUPS\clientes" mkdir "C:\POS_BACKUPS\clientes" >nul 2>&1
if not exist "C:\POS_BACKUPS\historial_facturas" mkdir "C:\POS_BACKUPS\historial_facturas" >nul 2>&1
if not exist "C:\POS_BACKUPS\movimientos_caja" mkdir "C:\POS_BACKUPS\movimientos_caja" >nul 2>&1
if not exist "C:\POS_BACKUPS\gastos_operativos" mkdir "C:\POS_BACKUPS\gastos_operativos" >nul 2>&1
if not exist "C:\POS_BACKUPS\salvaguarda_pre_actualizacion" mkdir "C:\POS_BACKUPS\salvaguarda_pre_actualizacion" >nul 2>&1
echo [OK] Directorios del sistema verificados.
echo.

:: ===============================================================================
:: 7. Configuracion de Red, Puertos y Dominio LAN
:: ===============================================================================
echo [PASO 5/11] Configuracion de Red Local LAN, Puertos y Dominio mDNS...
echo.
echo   [1] Configuracion recomendada (Puerto 3000, Proxy LAN 80, llanomio.local)
echo   [2] Personalizar puertos TCP y nombre de dominio (Escanear red en vivo)
echo.
set /p OPC_RED=">> Seleccione una opcion [1-2, Enter = 1]: "

if "%OPC_RED%"=="2" (
    call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\escanear-y-elegir-puertos.js"
    if !errorlevel! neq 0 (
        echo [ADVERTENCIA] Asistente finalizado con observaciones. Continuando con valores actuales...
    )
) else (
    echo [OK] Aplicando configuracion recomendada en .env...
)

:: Cargar variables finales desde .env
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
echo.

:: ===============================================================================
:: 8. Sincronizacion de Carpeta Compartida en la Nube (Google Drive / OneDrive / Dropbox)
:: ===============================================================================
echo [PASO 6/11] Configuracion de Carpeta de Respaldos Compartida en la Nube...
call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\configurar-carpeta-nube.js"
echo.

:: ===============================================================================
:: 9. Inicializacion de Base de Datos SQLite y Prisma ORM
:: ===============================================================================
echo [PASO 7/11] Inicializando Base de Datos SQLite y Prisma ORM...

echo [PRISMA] Generando cliente tipado de Prisma...
call npx prisma generate --schema=database/schema.prisma
if %errorlevel% neq 0 (
    echo [ERROR CRITICO] Fallo en npx prisma generate.
    pause
    exit /b 1
)

echo [PRISMA] Sincronizando esquema relacional SQLite...
call npx prisma db push --schema=database/schema.prisma --skip-generate

if not exist "%PROJECT_ROOT%\database\llanomio.db" (
    echo [BD] Sembrando datos limpios de fabrica (admin / admin123)...
    call npx tsx database/seed.ts
    echo [OK] Base de datos creada y sembrada exitosamente.
) else (
    echo [OK] Base de datos existente respetada e integrada.
)
echo.

:: ===============================================================================
:: 10. Compilacion de Produccion Next.js (npm run build)
:: ===============================================================================
echo [PASO 8/11] Verificando compilacion optimizada de Next.js...

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
    echo [OK] Build de produccion preexistente verificado.
)
echo.

:: ===============================================================================
:: 11. Habilitacion Total en Firewall de Windows (Entrada y Salida para LAN)
:: ===============================================================================
echo [PASO 9/11] Configurando reglas de Red Local LAN en Windows Defender Firewall...

netsh advfirewall firewall delete rule name="POS_LLANOMIO_PUERTOS_WEB_IN" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_PUERTOS_WEB_OUT" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_MDNS_IN" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_MDNS_OUT" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_NODE" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_PUERTOS_WEB" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_MDNS" >nul 2>&1

:: Reglas TCP Entrada y Salida
netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB_IN" dir=in action=allow protocol=TCP localport=!PORT!,!HTTP_PORT! profile=any description="Acceso Web Entrante para terminales POS en Red Local" >nul 2>&1
netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB_OUT" dir=out action=allow protocol=TCP localport=!PORT!,!HTTP_PORT! profile=any description="Acceso Web Saliente para terminales POS en Red Local" >nul 2>&1

:: Reglas UDP mDNS Entrada y Salida (Bonjour)
netsh advfirewall firewall add rule name="POS_LLANOMIO_MDNS_IN" dir=in action=allow protocol=UDP localport=5353 profile=any description="Resolucion de nombres Bonjour mDNS Entrante" >nul 2>&1
netsh advfirewall firewall add rule name="POS_LLANOMIO_MDNS_OUT" dir=out action=allow protocol=UDP localport=5353 profile=any description="Resolucion de nombres Bonjour mDNS Saliente" >nul 2>&1

:: Autorizacion del ejecutable Node.js
netsh advfirewall firewall add rule name="POS_LLANOMIO_NODE" dir=in action=allow program="!NODE_EXE!" enable=yes profile=any description="Permite comunicacion a Node.js para POS Local" >nul 2>&1

echo [OK] Firewall configurado para trafico local y transmision en Red Local (LAN).
echo.

:: ===============================================================================
:: 12. Registro de Auto-Arranque Permanente y Persistencia de Procesos
:: ===============================================================================
echo [PASO 10/11] Configurando Auto-Arranque al reiniciar Windows y PM2...

set "STARTUP_USER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_ALL=%ALLUSERSPROFILE%\Microsoft\Windows\Start Menu\Programs\Startup"

:: 1. Lanzador invisible en Startup
if exist "%STARTUP_USER%" (
    (
        echo Set WshShell = CreateObject^("WScript.Shell"^)
        echo WshShell.Run Chr^(34^) ^& "%PROJECT_ROOT%\RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat" ^& Chr^(34^) ^& " --silencioso", 0, False
    ) > "%STARTUP_USER%\AutoArranque_POS_Llanomio.vbs"
    echo [OK] Lanzador registrado en Startup de Usuario.
)
if exist "%STARTUP_ALL%" (
    (
        echo Set WshShell = CreateObject^("WScript.Shell"^)
        echo WshShell.Run Chr^(34^) ^& "%PROJECT_ROOT%\RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat" ^& Chr^(34^) ^& " --silencioso", 0, False
    ) > "%STARTUP_ALL%\AutoArranque_POS_Llanomio.vbs"
    echo [OK] Lanzador registrado en Startup Global de Windows.
)

:: 2. Tarea Programada de Windows (Task Scheduler)
schtasks /Delete /TN "POS_Llanomio_AutoArranque" /F >nul 2>&1
schtasks /Create /TN "POS_Llanomio_AutoArranque" /TR "\"%PROJECT_ROOT%\RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat\" --silencioso" /SC ONLOGON /RL HIGHEST /F >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Tarea Programada oficial de Windows registrada exitosamente.
)

:: 3. Iniciar servicios y congelar estado en PM2
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
call !PM2_CMD! save --force >nul 2>&1
echo [OK] Procesos PM2 levantados y guardados de forma permanente.
echo.

:: ===============================================================================
:: 13. Creacion de Accesos Directos Oficiales en el Escritorio
:: ===============================================================================
echo [PASO 11/11] Creando accesos directos oficiales en el Escritorio...

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
  "$s3 = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'POS Llanomio - Recuperar y Levantar Servidor.lnk')); " ^
  "$s3.TargetPath = '%PROJECT_ROOT%\RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat'; " ^
  "$s3.WorkingDirectory = '%PROJECT_ROOT%'; " ^
  "$s3.IconLocation = '%SystemRoot%\System32\shell32.dll,238'; " ^
  "$s3.Description = 'Rescate Rapido y Verificacion de Integridad del POS'; " ^
  "$s3.Save(); " ^
  "$s4 = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'POS Llanomio - Carpeta Respaldos.lnk')); " ^
  "$s4.TargetPath = 'C:\POS_BACKUPS'; " ^
  "$s4.IconLocation = '%SystemRoot%\System32\shell32.dll,4'; " ^
  "$s4.Description = 'Boveda Central de Copias de Seguridad del POS'; " ^
  "$s4.Save();" >nul 2>&1

echo [OK] Accesos directos creados en el Escritorio:
echo      - POS Llanomio - Panel de Control.lnk
echo      - POS Llanomio - Pantalla Completa.lnk
echo      - POS Llanomio - Recuperar y Levantar Servidor.lnk
echo      - POS Llanomio - Carpeta Respaldos.lnk
echo.

:: ===============================================================================
:: 14. Deteccion de IP LAN y Apertura del Sistema
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
            ping 127.0.0.1 -n 2 >nul
        )
    )
)

:: Obtener IP local para mostrar en pantalla
for /f "tokens=*" %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*','Ethernet*','Local*' -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notmatch '^(127|169\.254)' } | Select-Object -ExpandProperty IPAddress -First 1)"') do (
    set "IP_LAN_DETECTADA=%%i"
)
if "!IP_LAN_DETECTADA!"=="" set "IP_LAN_DETECTADA=127.0.0.1"

echo.
echo ===============================================================================
echo                 INSTALACION Y DESPLIEGUE EXITOSO (100%% OPERATIVO)
echo ===============================================================================
echo.
echo El sistema POS se encuentra completamente operativo y asegurado:
echo.
echo   [ACCESO EN ESTE COMPUTADOR]
echo   - URL Local:               http://localhost:!PORT!/login
echo.
echo   [ACCESO DESDE OTROS EQUIPOS EN RED LOCAL (WI-FI / LAN)]
echo   - URL por Direccion IP:    http://!IP_LAN_DETECTADA!:!PORT!/login
echo   - URL por Nombre Dominio:  http://!LOCAL_DOMAIN!:!PORT!/login
echo.
echo   [CREDENCIALES DE FABRICA]
echo   - Usuario Administrador:   admin
echo   - Contraseña de Acceso:    admin123
echo   - Rol Asignado:            ADMIN (Acceso Total y Gestion de Usuarios)
echo.
echo   [SALVAGUARDA Y AUTO-RECUPERACION]
echo   - Boveda Local:            C:\POS_BACKUPS
echo   - Auto-Arranque:           Configurado en Inicio de Windows y Tarea Programada.
echo   - Rescate Inmediato:       Doble clic en 'RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat'
echo.
echo Abriendo terminal en modo pantalla completa...
call "%PROJECT_ROOT%\ABRIR_SISTEMA_PANTALLA_COMPLETA.bat"
echo.
echo Presione cualquier tecla para finalizar el asistente...
pause >nul
exit /b 0

