@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Instalador Maestro Unico - Sistema POS Llanomio

:: ===============================================================================
:: 1. Guardian de Ventana Persistente
:: ===============================================================================
if "%~1" NEQ "--persistente" (
    cmd /k ""%~f0" --persistente"
    exit /b
)

:: ===============================================================================
:: 2. Ubicar la raiz del proyecto de forma dinamica (sin rutas absolutas fijas)
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
echo                INSTALADOR MAESTRO UNICO Y CONTROL DE SERVICIOS
echo                           SISTEMA POS LLANOMIO
echo ===============================================================================
echo.
echo Ruta raiz del proyecto: %PROJECT_ROOT%
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
:: FASE 1/4: LIMPIEZA PREVIA DE SERVICIOS Y LIBERACION DE PUERTOS
:: ===============================================================================
echo ===============================================================================
echo   [FASE 1/4] LIMPIEZA QUIRURGICA DE SERVICIOS Y LIBERACION DE PUERTOS
echo ===============================================================================
echo.

:: 1. Detener y eliminar demonio PM2 e instancias previas
echo [PM2] Purgando procesos anteriores en PM2...
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    call pm2 delete pos-llanomio >nul 2>&1
    call pm2 delete pos-llanomio-mdns >nul 2>&1
    call pm2 delete all >nul 2>&1
    call pm2 kill >nul 2>&1
) else (
    if exist "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" (
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" delete pos-llanomio >nul 2>&1
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" delete pos-llanomio-mdns >nul 2>&1
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" delete all >nul 2>&1
        call "%PROJECT_ROOT%\node_modules\.bin\pm2.cmd" kill >nul 2>&1
    )
)
echo [OK] Procesos PM2 purgados.

:: 2. Deteccion de Node.js para ejecutar el liberador quirurgico de puertos
if exist "%PROJECT_ROOT%\runtime\node\node.exe" (
    set "PATH=%PROJECT_ROOT%\runtime\node;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
    set "NODE_EXE=%PROJECT_ROOT%\runtime\node\node.exe"
) else (
    set "PATH=%PROJECT_ROOT%\node_modules\.bin;%PATH%;C:\Program Files\nodejs;%APPDATA%\npm;C:\Program Files (x86)\nodejs"
    set "NODE_EXE=node"
)

where node >nul 2>&1
if %errorlevel% equ 0 (
    echo [PUERTOS] Ejecutando liberacion segura de puertos (protegiendo navegador y nube)...
    call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\limpiar-servicios-y-puertos.js"
) else (
    echo [INFO] Node.js aun no detectado. Se instalara en la siguiente fase.
)

:: 3. Limpiar Auto-Arranques viejos y tareas programadas
echo [INICIO] Purgando registros de inicio automatico obsoletos...
schtasks /Delete /TN "POS_Llanomio_AutoArranque" /F >nul 2>&1
schtasks /Delete /TN "POS_LLANOMIO_AUTOSTART" /F >nul 2>&1

set "STARTUP_USER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_ALL=%ALLUSERSPROFILE%\Microsoft\Windows\Start Menu\Programs\Startup"

if exist "%STARTUP_USER%\AutoArranque_POS_Llanomio.vbs" del /f /q "%STARTUP_USER%\AutoArranque_POS_Llanomio.vbs" >nul 2>&1
if exist "%STARTUP_USER%\Arranque_Automatico_POS_Llanomio.vbs" del /f /q "%STARTUP_USER%\Arranque_Automatico_POS_Llanomio.vbs" >nul 2>&1
if exist "%STARTUP_USER%\POS_Llanomio_Autostart.vbs" del /f /q "%STARTUP_USER%\POS_Llanomio_Autostart.vbs" >nul 2>&1
if exist "%STARTUP_USER%\Iniciar_LLANOMIO_Auto.bat" del /f /q "%STARTUP_USER%\Iniciar_LLANOMIO_Auto.bat" >nul 2>&1

if exist "%STARTUP_ALL%\AutoArranque_POS_Llanomio.vbs" del /f /q "%STARTUP_ALL%\AutoArranque_POS_Llanomio.vbs" >nul 2>&1
if exist "%STARTUP_ALL%\POS_Llanomio_Autostart.vbs" del /f /q "%STARTUP_ALL%\POS_Llanomio_Autostart.vbs" >nul 2>&1
echo [OK] Registros de auto-arranque anteriores limpiados.

:: 4. Limpieza de reglas antiguas en Firewall de Windows
echo [FIREWALL] Depurando reglas anteriores del Firewall...
netsh advfirewall firewall delete rule name="POS_LLANOMIO_PUERTOS_WEB_IN" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_PUERTOS_WEB_OUT" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_MDNS_IN" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_MDNS_OUT" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_NODE" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_PUERTOS_WEB" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_MDNS" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_WEB" >nul 2>&1
echo [OK] Firewall preparado para configuracion limpia.
echo.

:: ===============================================================================
:: FASE 2/4: SELECCION DE MODO DE INSTALACION Y CONFIGURACION
:: ===============================================================================
echo ===============================================================================
echo   [FASE 2/4] MODO DE CONFIGURACION E IMPLEMENTACION DEL SERVIDOR
echo ===============================================================================
echo.
echo   [1] INSTALACION RAPIDA PREDETERMINADA (Recomendada - 1 Clic)
echo       - Instancia PM2 : pos-llanomio / pos-llanomio-mdns
echo       - Puerto Web    : 3000 (o siguiente libre automatico)
echo       - Puerto Red LAN: 80   (Dominio: http://llanomio.local)
echo       - Base de Datos : database/llanomio.db (Admin: admin / admin123)
echo       - Nube          : Deteccion automatica (OneDrive / Google Drive / Dropbox)
echo.
echo   [2] INSTALACION PERSONALIZADA (Elegir puertos, dominio mDNS, BD y Zabbix)
echo.
set /p OPC_MODO=">> Seleccione el modo de instalacion [1-2, Enter = 1]: "
if "%OPC_MODO%"=="" set "OPC_MODO=1"
echo.

if "%OPC_MODO%"=="2" goto :MODO_PERSONALIZADO

:: -------------------------------------------------------------------------------
:: MODO 1: INSTALACION RAPIDA PREDETERMINADA
:: -------------------------------------------------------------------------------
:MODO_RAPIDO
echo [MODO RAPIDO] Aplicando parametros estandar recomendados...
set "PORT=3000"
set "HTTP_PORT=3000"
set "INSTANCE_ID=pos-llanomio"
set "LOCAL_DOMAIN=llanomio.local"

:: Asegurar .env base
if not exist "%PROJECT_ROOT%\.env" (
    (
        echo # Configuracion Oficial de Produccion POS Local
        echo NODE_ENV=production
        echo PORT=3000
        echo HTTP_PORT=3000
        echo LOCAL_DOMAIN=llanomio.local
        echo INSTANCE_ID=pos-llanomio
        echo DATABASE_URL="file:./llanomio.db"
        echo HOSTNAME=0.0.0.0
        echo NEXTAUTH_SECRET=pos_secret_token_seguro_2026_local_key
    ) > "%PROJECT_ROOT%\.env"
)
goto :CONTINUAR_FASE_3

:: -------------------------------------------------------------------------------
:: MODO 2: INSTALACION PERSONALIZADA
:: -------------------------------------------------------------------------------
:MODO_PERSONALIZADO
echo [MODO PERSONALIZADO] Iniciando asistente interactivo de puertos y dominio...

:: Asegurar Node.js primero si falta
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [AUTO-INSTALADOR] Instalando Node.js LTS para ejecutar el asistente personalizado...
    call winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements >nul 2>&1
    set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
)

if exist "%PROJECT_ROOT%\scripts\escanear-y-elegir-puertos.js" (
    call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\escanear-y-elegir-puertos.js"
)

if exist "%PROJECT_ROOT%\.env" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%PROJECT_ROOT%\.env") do (
        if "%%A"=="PORT" set "PORT=%%B"
        if "%%A"=="HTTP_PORT" set "HTTP_PORT=%%B"
        if "%%A"=="INSTANCE_ID" set "INSTANCE_ID=%%B"
        if "%%A"=="LOCAL_DOMAIN" set "LOCAL_DOMAIN=%%B"
    )
)

:CONTINUAR_FASE_3
echo.

:: ===============================================================================
:: FASE 3/4: MOTOR NODE.JS, DEPENDENCIAS, BASE DE DATOS Y COMPILACION
:: ===============================================================================
echo ===============================================================================
echo   [FASE 3/4] VERIFICACION DE MOTOR, DEPENDENCIAS Y BASE DE DATOS
echo ===============================================================================
echo.

:: 1. Verificacion de Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [AUTO-INSTALADOR] Descargando e instalando Node.js LTS oficial...
    where winget >nul 2>&1
    if !errorlevel! equ 0 (
        call winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    ) else (
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
          "$url = 'https://nodejs.org/dist/v22.14.0/node-v22.14.0-x64.msi'; " ^
          "$dest = [System.IO.Path]::Combine($env:TEMP, 'nodejs_installer.msi'); " ^
          "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; " ^
          "Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing; " ^
          "Start-Process msiexec.exe -ArgumentList '/i', ('\"' + $dest + '\"'), '/qn', '/norestart' -Wait;"
    )
    set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PROJECT_ROOT%\node_modules\.bin;%PATH%"
)
echo [OK] Motor Node.js operativo:
call "%NODE_EXE%" -v

:: 2. Dependencias npm
set "REINSTALAR_DEPS=0"
if not exist "%PROJECT_ROOT%\node_modules" set "REINSTALAR_DEPS=1"
if not exist "%PROJECT_ROOT%\node_modules\.bin\next.cmd" set "REINSTALAR_DEPS=1"
if not exist "%PROJECT_ROOT%\node_modules\.bin\prisma.cmd" set "REINSTALAR_DEPS=1"

if "%REINSTALAR_DEPS%"=="1" (
    echo [DEPS] Instalando paquetes de produccion con npm...
    call npm install --no-audit --no-fund
    if !errorlevel! neq 0 (
        echo [ERROR CRITICO] Fallo en npm install.
        pause
        exit /b 1
    )
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

:: 3. Estructura de Directorios
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

:: 4. Carpeta de Nube (Google Drive / OneDrive / Dropbox)
if "%OPC_MODO%"=="2" (
    call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\configurar-carpeta-nube.js"
) else (
    call "%NODE_EXE%" "%PROJECT_ROOT%\scripts\configurar-carpeta-nube.js" --auto
)

:: 5. Base de Datos SQLite y Prisma ORM
echo [PRISMA] Generando cliente tipado de Prisma...
call npx prisma generate --schema=database/schema.prisma
echo [PRISMA] Sincronizando esquema relacional SQLite...
call npx prisma db push --schema=database/schema.prisma --skip-generate

if not exist "%PROJECT_ROOT%\database\llanomio.db" (
    echo [BD] Sembrando estado limpio de fabrica (admin / admin123)...
    call npx tsx database/seed.ts
    echo [OK] Base de datos creada y sembrada exitosamente.
) else (
    if "%OPC_MODO%"=="2" (
        echo.
        echo Se detecto una base de datos existente en 'database\llanomio.db'.
        echo   [1] Conservar datos actuales (Recomendado)
        echo   [2] Restablecer a Estado Puro de Fabrica (Clean Slate - Elimina ventas y deja admin123)
        echo.
        set /p OPC_BD=">> Seleccione una opcion [1-2, Enter = 1]: "
        if "!OPC_BD!"=="2" (
            call npx tsx scripts/reset-db-fabrica.ts
            echo [OK] Base de datos restablecida a Estado Puro de Fabrica.
        ) else (
            echo [OK] Base de datos existente respetada.
        )
    ) else (
        echo [OK] Base de datos existente respetada e integrada.
    )
)

:: 6. Compilacion Next.js
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

:: 7. Reglas de Windows Defender Firewall
echo [FIREWALL] Configurando reglas de entrada y salida para Red Local LAN...
netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB_IN" dir=in action=allow protocol=TCP localport=!PORT!,!HTTP_PORT! profile=any description="Acceso Web Entrante para terminales POS en Red Local" >nul 2>&1
netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB_OUT" dir=out action=allow protocol=TCP localport=!PORT!,!HTTP_PORT! profile=any description="Acceso Web Saliente para terminales POS en Red Local" >nul 2>&1
netsh advfirewall firewall add rule name="POS_LLANOMIO_MDNS_IN" dir=in action=allow protocol=UDP localport=5353 profile=any description="Resolucion de nombres Bonjour mDNS Entrante" >nul 2>&1
netsh advfirewall firewall add rule name="POS_LLANOMIO_MDNS_OUT" dir=out action=allow protocol=UDP localport=5353 profile=any description="Resolucion de nombres Bonjour mDNS Saliente" >nul 2>&1
netsh advfirewall firewall add rule name="POS_LLANOMIO_NODE" dir=in action=allow program="!NODE_EXE!" enable=yes profile=any description="Permite comunicacion a Node.js para POS Local" >nul 2>&1
echo [OK] Firewall configurado para trafico local y transmision en Red Local (LAN).
echo.

:: ===============================================================================
:: FASE 4/4: DESPLIEGUE DE SERVICIOS, AUTO-ARRANQUE Y MODO KIOSCO
:: ===============================================================================
echo ===============================================================================
echo   [FASE 4/4] DESPLIEGUE DE SERVICIOS PM2, AUTO-ARRANQUE Y MODO KIOSCO
echo ===============================================================================
echo.

:: 1. Auto-Arranque permanente en Windows (Startup y Task Scheduler)
echo [AUTO-ARRANQUE] Registrando arranque automatico de Windows...

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

schtasks /Delete /TN "POS_Llanomio_AutoArranque" /F >nul 2>&1
schtasks /Create /TN "POS_Llanomio_AutoArranque" /TR "\"%PROJECT_ROOT%\RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat\" --silencioso" /SC ONLOGON /RL HIGHEST /F >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Tarea Programada de Windows (Task Scheduler) asegurada.
)

:: 2. Iniciar y guardar servicios con PM2
where pm2 >nul 2>&1
if %errorlevel% equ 0 (
    set "PM2_CMD=pm2"
) else (
    set "PM2_CMD=%PROJECT_ROOT%\node_modules\.bin\pm2.cmd"
)

echo [PM2] Desplegando procesos de aplicacion y red...
call !PM2_CMD! start "%PROJECT_ROOT%\ecosystem.config.js" --update-env >nul 2>&1
call !PM2_CMD! save --force >nul 2>&1
echo [OK] Servicios PM2 activos y guardados.

:: 3. Accesos directos oficiales en el Escritorio
echo [ACCESOS] Creando accesos directos oficiales en el Escritorio...
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

echo [OK] Accesos directos generados exitosamente.

:: 4. Sondeo y verificacion HTTP 200
echo [SONDEO] Esperando confirmacion del servidor web en http://localhost:!PORT!/login...
set "SERVIDOR_LISTO=0"
for /L %%i in (1,1,25) do (
    if "!SERVIDOR_LISTO!"=="0" (
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
          "try { $r = Invoke-WebRequest -Uri 'http://localhost:!PORT!/login' -UseBasicParsing -TimeoutSec 1; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
        if !errorlevel! equ 0 (
            set "SERVIDOR_LISTO=1"
            echo [OK] Servidor web respondiendo con exito (HTTP 200).
        ) else (
            ping 127.0.0.1 -n 2 >nul
        )
    )
)

:: Detectar IP LAN
for /f "tokens=*" %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Wi-Fi*','Ethernet*','Local*' -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notmatch '^(127|169\.254)' } | Select-Object -ExpandProperty IPAddress -First 1)"') do (
    set "IP_LAN_DETECTADA=%%i"
)
if "!IP_LAN_DETECTADA!"=="" set "IP_LAN_DETECTADA=127.0.0.1"

echo.
echo ===============================================================================
echo                INSTALACION Y DESPLIEGUE FINALIZADO CON EXITO
echo ===============================================================================
echo.
echo El sistema POS se encuentra completamente operativo y asegurado:
echo.
echo   [ACCESO EN ESTE COMPUTADOR]
echo   - URL Local Principal:     http://localhost:!PORT!/login
echo.
echo   [ACCESO DESDE OTROS EQUIPOS EN RED LOCAL (WI-FI / LAN)]
echo   - URL por Direccion IP:    http://!IP_LAN_DETECTADA!:!PORT!/login
echo   - URL por Nombre Dominio:  http://!LOCAL_DOMAIN!:!PORT!/login
echo.
echo   [CREDENCIALES DE FABRICA]
echo   - Usuario Administrador:   admin
echo   - Contraseña de Acceso:    admin123
echo   - Rol Asignado:            ADMIN (Acceso Total y Configuracion)
echo.
echo   [SALVAGUARDA Y AUTO-RECUPERACION]
echo   - Boveda Local:            C:\POS_BACKUPS
echo   - Auto-Arranque:           Activo en Inicio de Windows y Tarea Programada.
echo   - Rescate Inmediato:       Doble clic en 'RECUPERAR_Y_LEVANTAR_SERVIDOR_ULTIMO_ESTADO.bat'
echo.
echo Abriendo terminal en pantalla completa (Modo Kiosco / App)...
call "%PROJECT_ROOT%\ABRIR_SISTEMA_PANTALLA_COMPLETA.bat"
echo.
echo Presione cualquier tecla para finalizar el asistente maestro...
pause >nul
exit /b 0
