@echo off
chcp 65001 > nul
title POS LLANOMIO - Instalador Maestro desde GitHub
color 0B

echo ===============================================================================
echo                SISTEMA POS LOCAL LLANOMIO - INSTALADOR MAESTRO
echo ===============================================================================
echo.
echo Este asistente guiara la instalacion completa del servidor POS en este computador.
echo No se impondran puertos predeterminados: se escaneara el sistema en busca de
echo puertos libres y usted podra elegir exactamente que puerto asignar.
echo.
echo Presione cualquier tecla para iniciar la preparacion del sistema...
pause > nul
echo.

:: 1. Posicionamiento dinamico en la raiz del repositorio
cd /d "%~dp0..\.."

:: 2. Verificacion de Node.js
echo [1/8] Verificando instalacion de Node.js en este equipo...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [ERROR CRITICO] Node.js no esta instalado o no se encuentra en el PATH.
    echo Por favor descargue e instale Node.js LTS (v20 o superior) desde https://nodejs.org/
    echo y vuelva a ejecutar este instalador.
    echo.
    pause
    exit /b 1
)
node -v
echo [OK] Node.js detectado correctamente.
echo.

:: 3. Verificacion de Git
echo [2/8] Verificando instalacion de Git...
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [AVISO] Git no se encuentra en el PATH. Para recibir actualizaciones automaticas
    echo se recomienda instalar Git para Windows desde https://git-scm.com/
) else (
    echo [OK] Git detectado correctamente.
)
echo.

:: 4. Creacion de directorios de respaldo portables
echo [3/8] Preparando directorios locales y de respaldo...
set "CARPETA_RESPALDO=%SYSTEMDRIVE%\POS_LLANOMIO_BACKUPS"
if not exist "%CARPETA_RESPALDO%" mkdir "%CARPETA_RESPALDO%" 2>nul
if not exist "%CARPETA_RESPALDO%" set "CARPETA_RESPALDO=%USERPROFILE%\POS_LLANOMIO_BACKUPS"
if not exist "%CARPETA_RESPALDO%" mkdir "%CARPETA_RESPALDO%" 2>nul

if not exist "database\backups_locales" (
    mkdir "database\backups_locales"
    echo [CREADO] Carpeta local de respaldos: database\backups_locales
)
echo [OK] Directorios listos (%CARPETA_RESPALDO%).
echo.

:: 5. Inicializacion preliminar de .env si no existe
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [INFO] Archivo .env base creado a partir de .env.example.
    ) else (
        echo # Configuracion de Entorno POS LLANOMIO > .env
        echo DATABASE_URL="file:./llanomio.db" >> .env
        echo NODE_ENV="production" >> .env
        echo JWT_SECRET="pos-llanomio-secreto-seguro-token-local-2026" >> .env
        echo APP_NAME="Sistema POS Local LLANOMIO" >> .env
        echo CARPETA_RESPALDO_DEFAULT="%CARPETA_RESPALDO%" >> .env
        echo [INFO] Archivo .env base generado.
    )
)

:: 6. Escaneo Real y Seleccion Interactiva de Puertos
echo [4/8] Iniciando Asistente de Escaneo y Seleccion de Puertos Libres...
echo -------------------------------------------------------------------------------
if exist "scripts\escanear-y-elegir-puertos.js" (
    call node scripts\escanear-y-elegir-puertos.js
) else (
    call node "%~dp0escanear-y-elegir-puertos.js"
)
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Ocurrio un inconveniente durante la seleccion de puertos.
    pause
    exit /b 1
)
echo.

:: 7. Leer puertos seleccionados desde .env
set PUERTO_APP=3000
set PUERTO_HTTP=3000
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%A in (".env") do (
        if "%%A"=="PORT" set PUERTO_APP=%%B
        if "%%A"=="HTTP_PORT" set PUERTO_HTTP=%%B
    )
)

:: 8. Apertura automatica en el Firewall de Windows para el puerto elegido
echo [5/8] Verificando regla de red en Firewall de Windows (Puertos TCP %PUERTO_APP%, %PUERTO_HTTP%)...
netsh advfirewall firewall show rule name="POS_LLANOMIO_PUERTOS_WEB" >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Registrando regla de entrada en Firewall de Windows...
    netsh advfirewall firewall add rule name="POS_LLANOMIO_PUERTOS_WEB" dir=in action=allow protocol=TCP localport=%PUERTO_APP%,%PUERTO_HTTP% >nul 2>nul
    if %errorlevel% equ 0 (
        echo [OK] Regla de Firewall creada con exito.
    ) else (
        echo [AVISO] No se pudo crear la regla de Firewall automaticamente (se requieren permisos de Administrador).
        echo        Si otros dispositivos no pueden conectarse por Wi-Fi, ejecute el script 6_ABRIR_FIREWALL_LAN_ADMIN.bat.
    )
) else (
    echo [OK] Regla de Firewall preexistente detectada.
)
echo.

:: 9. Instalacion de dependencias npm
echo [6/8] Instalando dependencias del sistema (npm install)...
echo Esto puede tomar 1 o 2 minutos mientras se descargan las librerias...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR CRITICO] Fallo la instalacion de dependencias con npm install.
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas exitosamente.
echo.

:: 10. Estructura de Base de Datos SQLite y Seed inicial
echo [7/8] Configurando Base de Datos SQLite (Prisma ORM)...
call npx prisma generate
call npx prisma db push --skip-generate
if %errorlevel% neq 0 (
    echo.
    echo [ERROR CRITICO] Fallo la sincronizacion de la base de datos con Prisma.
    pause
    exit /b 1
)

:: Verificar si la base de datos requiere sembrado de fabrica
if not exist "database\llanomio.db" (
    echo [INFO] Creando datos de fabrica y usuario Administrador inicial...
    call npm run db:seed
) else (
    echo [INFO] Sincronizando datos de inicio en la base de datos...
    call npm run db:seed
)
echo [OK] Base de datos SQLite lista y sincronizada.
echo.

:: 11. Compilacion de produccion
echo [8/8] Compilando aplicacion Next.js para produccion (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR CRITICO] Fallo la compilacion de la aplicacion Next.js.
    pause
    exit /b 1
)
echo [OK] Compilacion completada con 0 errores.
echo.

:: 12. Arranque del Servidor
echo ===============================================================================
echo                INSTALACION FINALIZADA SATISFACTORIAMENTE
echo ===============================================================================
echo.
echo Configuracion de salida:
echo   - Servidor Principal: Puerto TCP %PUERTO_APP%
echo   - Salida Red / Proxy: Puerto TCP %PUERTO_HTTP%
echo   - Base de Datos:      database\llanomio.db (Limpia y estructurada)
echo   - Usuario Administrador Inicial: admin
echo   - Contrasena Inicial:            admin123
echo.

:: Detectar PM2
set PM2_CMD=pm2
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    if exist "node_modules\.bin\pm2.cmd" (
        set PM2_CMD=node_modules\.bin\pm2.cmd
    ) else (
        set PM2_CMD=npx pm2
    )
)

echo Iniciando servicios en segundo plano con PM2...
call %PM2_CMD% delete pos-llanomio >nul 2>nul
call %PM2_CMD% delete pos-mdns-proxy >nul 2>nul
call %PM2_CMD% start ecosystem.config.js
call %PM2_CMD% save >nul 2>nul

echo [OK] Servidor POS activo en segundo plano.
echo.
echo Abriendo navegador en la direccion local: http://localhost:%PUERTO_APP%/login
start http://localhost:%PUERTO_APP%/login

echo.
echo Puede administrar el servidor, cambiar puertos o detenerlo en cualquier momento
echo utilizando el script: 2_INICIAR_O_CAMBIAR_PUERTO_SERVIDOR.bat
echo ===============================================================================
echo.
pause
