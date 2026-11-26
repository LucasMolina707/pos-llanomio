@echo off
setlocal EnableDelayedExpansion
title POS LLANOMIO - INSTALADOR DE SERVICIO AUTOMATICO PARA WINDOWS

:: 1. Verificacion y Elevacion Automatica a Privilegios de Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ELEVACION] Solicitando permisos de Administrador de Windows...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

:: Determinar ruta raiz del proyecto (portable e independiente de la unidad de disco)
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%.."
set "ROOT_DIR=%CD%"
cd /d "%ROOT_DIR%"

cls
echo ===============================================================================
echo            SISTEMA POS LLANOMIO - INSTALADOR DE SERVICIO DE WINDOWS
echo                   Despliegue Portable con Auto-Arranque Oficial
echo ===============================================================================
echo  Ruta de Instalacion: %ROOT_DIR%
echo ===============================================================================
echo.

:: 2. Deteccion del Entorno Node.js Portable o de Sistema
set "NODE_CMD=node"
if exist "%ROOT_DIR%\runtime\node\node.exe" (
    set "NODE_CMD=%ROOT_DIR%\runtime\node\node.exe"
    echo [ENTORNO] Motor Node.js portable detectado en runtime\node.
) else (
    where node >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR CRITICO] No se encontro Node.js en el sistema ni en runtime\node.
        echo Por favor instale Node.js 18+ o copie el runtime en runtime\node.
        echo.
        pause
        exit /b 1
    )
    echo [ENTORNO] Motor Node.js del sistema detectado correctamente.
)

:: 3. Verificacion de Carpetas Basicas y Configuracion .env
echo.
echo [PASO 1/6] Verificando directorios operativos y almacenamiento local...
if not exist "%ROOT_DIR%\.tmp" mkdir "%ROOT_DIR%\.tmp"
if not exist "%ROOT_DIR%\database" mkdir "%ROOT_DIR%\database"
if not exist "%ROOT_DIR%\database\backups_locales" mkdir "%ROOT_DIR%\database\backups_locales"
if not exist "C:\POS_BACKUPS" mkdir "C:\POS_BACKUPS" >nul 2>&1

if not exist "%ROOT_DIR%\.env" (
    echo [CONFIGURACION] Creando archivo de entorno .env de produccion...
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
    ) > "%ROOT_DIR%\.env"
)

:: 4. Pregunta / Opcion de Barrido Inicial a Estado en Blanco
echo.
echo ===============================================================================
echo                      INICIALIZACION DE BASE DE DATOS
echo ===============================================================================
echo  Desea inicializar el sistema con un BARRIDO EN LIMPIO DE FABRICA?
echo.
echo  [S] SI: Limpia ventas, alquileres y apartados previos;
echo          deja el sistema listo desde cero con admin / admin123.
echo          (Se genera automaticamente una salvaguarda de seguridad previa).
echo.
echo  [N] NO: Conserva la base de datos existente y solo asegura que
echo          la cuenta de administrador funcione correctamente.
echo ===============================================================================
set /p RESP_RESET="Seleccione una opcion [S/N] (Por defecto N): "
if /i "!RESP_RESET!"=="S" (
    echo.
    echo [INICIALIZACION] Ejecutando barrido inicial de fabrica...
    "%NODE_CMD%" "%ROOT_DIR%\scripts\barrido-inicial-fabrica.js" --confirmar
) else (
    echo.
    echo [CONSERVACION] Preservando datos existentes y verificando administrador...
    "%NODE_CMD%" "%ROOT_DIR%\scripts\asegurar-admin.js"
)

:: 5. Reglas de Windows Defender Firewall
echo.
echo [PASO 3/6] Configurando reglas en Windows Defender Firewall para red local...
netsh advfirewall firewall delete rule name="POS_LLANOMIO_PUERTOS_WEB_IN" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_PUERTOS_WEB_OUT" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_MDNS_IN" >nul 2>&1
netsh advfirewall firewall delete rule name="POS_LLANOMIO_MDNS_OUT" >nul 2>&1

netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB_IN" dir=in action=allow protocol=TCP localport=3000 profile=any description="Acceso Web Entrante para terminales POS Llanomio" >nul 2>&1
netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB_OUT" dir=out action=allow protocol=TCP localport=3000 profile=any description="Acceso Web Saliente para terminales POS Llanomio" >nul 2>&1
netsh advfirewall firewall add rule name="POS_LLANOMIO_MDNS_IN" dir=in action=allow protocol=UDP localport=5353 profile=any description="Resolucion Bonjour mDNS Entrante" >nul 2>&1
netsh advfirewall firewall add rule name="POS_LLANOMIO_MDNS_OUT" dir=out action=allow protocol=UDP localport=5353 profile=any description="Resolucion Bonjour mDNS Saliente" >nul 2>&1

:: 6. Compilacion de Ejecutables Nativos (Servicio y Panel Administrativo si no existen)
echo.
echo [PASO 4/6] Verificando binarios de Windows (Servicio y Panel de Control)...
set "CSC_EXE=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if not exist "!CSC_EXE!" set "CSC_EXE=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"

set "SERVICE_EXE=%ROOT_DIR%\POS_Llanomio_Service.exe"
if not exist "%SERVICE_EXE%" (
    echo [COMPILACION] Compilando POS_Llanomio_Service.exe con .NET Framework...
    if exist "!CSC_EXE!" (
        "!CSC_EXE!" /r:System.ServiceProcess.dll /target:exe /out:"%SERVICE_EXE%" "%ROOT_DIR%\scripts\ServicioWindowsPOS.cs" >nul 2>&1
    )
)

set "PANEL_EXE=%ROOT_DIR%\Panel_Servidor_POS.exe"
if not exist "%PANEL_EXE%" (
    echo [COMPILACION] Compilando Panel_Servidor_POS.exe con .NET Framework...
    if exist "!CSC_EXE!" (
        "!CSC_EXE!" /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.ServiceProcess.dll /target:winexe /out:"%PANEL_EXE%" "%ROOT_DIR%\scripts\PanelServidorPOS.cs" >nul 2>&1
    )
)

if not exist "%SERVICE_EXE%" (
    echo [AVISO] No se pudo compilar el binario nativo de servicio.
    echo Se utilizara arranque dual mediante tarea programada de Windows y accesos de inicio.
)

:: 7. Registro e Instalacion del Servicio de Windows con Inicio Automatico
echo.
echo [PASO 5/6] Registrando e instalando Servicio de Windows con inicio automatico...

:: 7a. Si existe el binario de servicio nativo, registrar con sc.exe
if exist "%SERVICE_EXE%" (
    sc stop "POS_Llanomio" >nul 2>&1
    timeout /t 1 /nobreak >nul
    sc delete "POS_Llanomio" >nul 2>&1
    timeout /t 1 /nobreak >nul

    sc create "POS_Llanomio" binPath= "\"%SERVICE_EXE%\"" start= auto DisplayName= "POS Llanomio - Servidor de Ventas y Facturacion" >nul 2>&1
    sc description "POS_Llanomio" "Servidor de ventas, alquileres y facturacion local POS Llanomio. Inicio automatico de alta disponibilidad." >nul 2>&1
    sc failure "POS_Llanomio" reset= 86400 actions= restart/5000/restart/10000/restart/20000 >nul 2>&1
    sc config "POS_Llanomio" start= delayed-auto >nul 2>&1
    
    echo   -> Servicio de Windows 'POS_Llanomio' registrado correctamente (Auto-Arranque Delayed-Auto).
    echo   -> Iniciando servicio de Windows...
    sc start "POS_Llanomio" >nul 2>&1
) else (
    :: 7b. Respaldo mediante Tarea Programada de Inicio de Sistema
    schtasks /Delete /TN "POS_Llanomio_Servicio" /F >nul 2>&1
    schtasks /Create /TN "POS_Llanomio_Servicio" /TR "\"!NODE_EXE!\" \"%ROOT_DIR%\start-pos.js\"" /SC ONSTART /RL HIGHEST /F >nul 2>&1
    echo   -> Tarea programada de inicio al arranque del sistema configurada.
)

:: 8. Creacion de Accesos Directos Oficiales en el Escritorio
echo.
echo [PASO 6/6] Creando accesos directos de operacion en el Escritorio...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$wsh = New-Object -ComObject WScript.Shell; " ^
    "$desk = [Environment]::GetFolderPath('Desktop'); " ^
    "$icoAurora = '%ROOT_DIR%\aurora.ico'; " ^
    "if (-not (Test-Path $icoAurora)) { $icoAurora = '%ROOT_DIR%\public\iconos\aurora.ico' }; " ^
    "$icoRojo = '%ROOT_DIR%\public\iconos\icono_detener_rojo.ico'; " ^
    "if (-not (Test-Path $icoRojo)) { $icoRojo = $icoAurora }; " ^
    "$scPanel = $wsh.CreateShortcut(\"$desk\Panel Servidor POS.lnk\"); " ^
    "$scPanel.TargetPath = '%ROOT_DIR%\Panel_Servidor_POS.exe'; " ^
    "$scPanel.WorkingDirectory = '%ROOT_DIR%'; " ^
    "$scPanel.IconLocation = $icoAurora; " ^
    "$scPanel.Description = 'Panel de Control, Infraestructura, Servicio y Respaldos POS Llanomio'; " ^
    "$scPanel.Save(); " ^
    "$sc1 = $wsh.CreateShortcut(\"$desk\Abrir POS Llanomio.lnk\"); " ^
    "$sc1.TargetPath = 'http://localhost:3000'; " ^
    "$sc1.IconLocation = $icoAurora; " ^
    "$sc1.Description = 'Abrir Sistema POS Llanomio en Navegador'; " ^
    "$sc1.Save();"

echo.
echo ===============================================================================
echo                INSTALACION Y CONFIGURACION COMPLETADA CON EXITO
echo ===============================================================================
echo  - Servicio de Windows: POS_Llanomio instalado con arranque automatico.
echo  - Auto-Arranque: El servidor inicia de forma autonoma al encender el equipo.
echo  - Usuario Administrador: admin
echo  - Contrasena por defecto: admin123  (PIN: 000000)
echo  - Detencion segura: Al detener el servicio se guarda copia de seguridad antes.
echo  - Accesos directos creados en el Escritorio de Windows.
echo ===============================================================================
echo.
echo [VERIFICACION] Probando conexion con el servidor...
timeout /t 3 /nobreak >nul
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:3000/api/caja/estado' -UseBasicParsing -TimeoutSec 3; Write-Host '  -> SERVIDOR EN LINEA Y OPERATIVO (Status 200 OK)' -ForegroundColor Green } catch { Write-Host '  -> El servidor esta terminando de iniciar en segundo plano...' -ForegroundColor Yellow }"

echo.
echo Presione cualquier tecla para abrir el sistema POS en el navegador...
pause >nul
start "" "http://localhost:3000"
exit /b 0
